// DM Setter OS — Local API Server
// Receives conversations from the Chrome extension and serves them to the app
// Run alongside npm run dev: node api.cjs
//
// The extension POSTs to http://localhost:3001/api/save-conversation
// The app reads saved conversations from localStorage via the shared storage key

const http = require("http");

const PORT = 3001;
const savedConversations = []; // in-memory store, also written to a file

// Load any previously saved conversations
const fs = require("fs");
const STORE_FILE = "./dm-setter-conversations.json";

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      savedConversations.push(...data);
      console.log(`Loaded ${data.length} saved conversations from disk.`);
    }
  } catch (e) {
    console.warn("Could not load store:", e.message);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(savedConversations.slice(-100), null, 2));
  } catch (e) {
    console.warn("Could not save store:", e.message);
  }
}

loadStore();

const server = http.createServer((req, res) => {
  // CORS — allow requests from Chrome extension and localhost app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    try {
      // POST /api/save-conversation — from Chrome extension
      if (req.method === "POST" && req.url === "/api/save-conversation") {
        const payload = JSON.parse(body);
        const { prospect, messages } = payload;

        if (!prospect || !messages) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Missing prospect or messages" }));
          return;
        }

        const entry = {
          id: `ext_${Date.now()}`,
          savedAt: new Date().toISOString(),
          prospect: {
            name: prospect.name || "Unknown",
            handle: prospect.handle || "",
            stage: prospect.stage || "New Lead",
            leadScore: prospect.leadScore || 0,
            callReadiness: prospect.callReadiness || 0,
            intentLevel: prospect.intentLevel || "Curious",
            intentConfidence: prospect.intentConfidence || 0,
            motivation: prospect.motivation || "",
            concerns: prospect.concerns || "",
            incomeGoal: prospect.incomeGoal || "",
            source: "Instagram (Extension)",
            platform: "instagram",
          },
          messages: messages.map((m, i) => ({
            id: `msg_${Date.now()}_${i}`,
            sender: m.sender,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
        };

        savedConversations.unshift(entry); // newest first
        if (savedConversations.length > 100) savedConversations.pop();
        saveStore();

        console.log(`✅ Saved conversation: ${prospect.name} (${messages.length} messages)`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, id: entry.id, name: entry.prospect.name }));
        return;
      }

      // GET /api/conversations — the app polls this to get saved conversations
      if (req.method === "GET" && req.url === "/api/conversations") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ conversations: savedConversations }));
        return;
      }

      // GET /api/conversations/:id/messages
      if (req.method === "GET" && req.url.startsWith("/api/conversations/")) {
        const id = req.url.split("/")[3];
        const conv = savedConversations.find(c => c.id === id);
        if (!conv) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(conv));
        return;
      }

      // DELETE /api/conversations/:id
      if (req.method === "DELETE" && req.url.startsWith("/api/conversations/")) {
        const id = req.url.split("/")[3];
        const idx = savedConversations.findIndex(c => c.id === id);
        if (idx >= 0) { savedConversations.splice(idx, 1); saveStore(); }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (e) {
      console.error("API error:", e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n✅ DM Setter OS API running at http://127.0.0.1:${PORT}`);
  console.log(`   POST /api/save-conversation  — Chrome extension saves here`);
  console.log(`   GET  /api/conversations      — App reads saved conversations`);
  console.log(`\n   Conversations saved to: ${STORE_FILE}`);
  console.log(`   Keep this running alongside npm run dev and proxy.cjs\n`);
});
