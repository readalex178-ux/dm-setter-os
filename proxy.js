// DM Setter OS — Local AI Proxy
// Run this alongside npm run dev to bridge browser → LM Studio
// Usage: node proxy.js

const http = require("http");
const https = require("https");

const PROXY_PORT = 3000;

const server = http.createServer((req, res) => {
  // Allow all CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Read request body
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = {}; }

    const isAnthropic = req.url.startsWith("/anthropic");
    const isLocal = req.url.startsWith("/local");

    if (isLocal) {
      // Forward to LM Studio
      const lmUrl = parsed._lmUrl || "http://127.0.0.1:1234";
      const lmPath = req.url.replace("/local", "");
      delete parsed._lmUrl;

      const options = {
        hostname: "127.0.0.1",
        port: 1234,
        path: lmPath,
        method: req.method,
        headers: { "Content-Type": "application/json" },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (e) => {
        console.error("LM Studio error:", e.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: "Could not reach LM Studio: " + e.message }));
      });

      proxyReq.write(JSON.stringify(parsed));
      proxyReq.end();

    } else if (isAnthropic) {
      // Forward to Anthropic
      const anthropicPath = req.url.replace("/anthropic", "");
      const apiKey = req.headers["x-api-key"] || "";

      const options = {
        hostname: "api.anthropic.com",
        port: 443,
        path: anthropicPath,
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (e) => {
        console.error("Anthropic error:", e.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: "Could not reach Anthropic: " + e.message }));
      });

      proxyReq.write(body);
      proxyReq.end();

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Unknown route. Use /local/... or /anthropic/..." }));
    }
  });
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`\n✅ DM Setter OS proxy running at http://127.0.0.1:${PROXY_PORT}`);
  console.log(`   Local AI  → http://127.0.0.1:${PROXY_PORT}/local/v1/chat/completions`);
  console.log(`   Anthropic → http://127.0.0.1:${PROXY_PORT}/anthropic/v1/messages`);
  console.log(`\n   In app Settings set URL to: http://127.0.0.1:${PROXY_PORT}/local`);
  console.log(`   Keep this running alongside npm run dev\n`);
});
