import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import https from "https";
import http from "http";

const JSON_BACKUP = "./dm-setter-conversations.json";
const DB_FILE = "./dm-setter.db";

let db: any = null;
let jsonBackup: any[] = [];

try {
  if (fs.existsSync(JSON_BACKUP)) {
    jsonBackup = JSON.parse(fs.readFileSync(JSON_BACKUP, "utf8"));
  }
} catch {}

function persistJSON(entry: any) {
  jsonBackup = [entry, ...jsonBackup].slice(0, 200);
  try { fs.writeFileSync(JSON_BACKUP, JSON.stringify(jsonBackup, null, 2)); } catch {}
}

async function getDB() {
  if (db) return db;
  try {
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs();
    db = fs.existsSync(DB_FILE)
      ? new SQL.Database(fs.readFileSync(DB_FILE))
      : new SQL.Database();

    db.run("CREATE TABLE IF NOT EXISTS prospects (id TEXT PRIMARY KEY, name TEXT, handle TEXT, stage TEXT DEFAULT 'New Lead', lead_score INTEGER DEFAULT 0, call_readiness INTEGER DEFAULT 0, intent_level TEXT, intent_confidence INTEGER DEFAULT 0, motivation TEXT, concerns TEXT, income_goal TEXT, source TEXT, platform TEXT, unread INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))");
    db.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, prospect_id TEXT, sender TEXT, content TEXT, sent_at TEXT DEFAULT (datetime('now')))");
    db.run("CREATE TABLE IF NOT EXISTS bant_scores (id TEXT PRIMARY KEY, prospect_id TEXT, need INTEGER, timeline INTEGER, authority INTEGER, budget INTEGER, total INTEGER, verdict TEXT, notes TEXT, scored_at TEXT DEFAULT (datetime('now')))");
    db.run("CREATE TABLE IF NOT EXISTS kpi_log (id TEXT PRIMARY KEY, date TEXT UNIQUE, dms_sent INTEGER DEFAULT 0, dms_received INTEGER DEFAULT 0, new_leads INTEGER DEFAULT 0, follow_ups_sent INTEGER DEFAULT 0, calls_booked INTEGER DEFAULT 0, calls_completed INTEGER DEFAULT 0, no_shows INTEGER DEFAULT 0, objections_handled INTEGER DEFAULT 0, hours_worked REAL DEFAULT 0, notes TEXT DEFAULT '')");
    db.run("CREATE TABLE IF NOT EXISTS objections (id TEXT PRIMARY KEY, prospect_name TEXT, type TEXT, handled INTEGER DEFAULT 1, logged_at TEXT DEFAULT (datetime('now')))");
    db.run("CREATE TABLE IF NOT EXISTS training_sessions (id TEXT PRIMARY KEY, scenario_name TEXT, scenario_type TEXT, difficulty TEXT, turns INTEGER DEFAULT 0, grade TEXT, summary TEXT, strengths TEXT DEFAULT '[]', improvements TEXT DEFAULT '[]', bant_breakdown TEXT, completed_at TEXT DEFAULT (datetime('now')))");

    persistDB();
    console.log("[DM Setter OS] SQLite ready:", DB_FILE);
  } catch (e: any) {
    console.warn("[DM Setter OS] SQLite unavailable:", e.message);
    db = null;
  }
  return db;
}

function persistDB() {
  if (!db) return;
  try { fs.writeFileSync(DB_FILE, Buffer.from(db.export())); } catch {}
}

function qAll(sql: string, params: any[] = []): any[] {
  if (!db) return [];
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch { return []; }
}

function dbRun(sql: string, params: any[] = []) {
  if (!db) return;
  try { db.run(sql, params); } catch (e: any) { console.warn("DB:", e.message); }
}

function readBody(req: any): Promise<string> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", (c: any) => { body += c; });
    req.on("end", () => resolve(body));
  });
}

function sendJSON(res: any, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function dmSetterPlugin() {
  return {
    name: "dm-setter-api",
    async buildStart() { await getDB(); },
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url: string = req.url || "";

        if (url.startsWith("/api/") || url.startsWith("/local/") || url.startsWith("/anthropic/")) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access");
          if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
        }

        // LM Studio proxy
        if (url.startsWith("/local/")) {
          const body = await readBody(req);
          const pr = http.request(
            { hostname: "127.0.0.1", port: 1234, path: url.replace("/local", ""), method: req.method, headers: { "Content-Type": "application/json" } },
            (p2: any) => { res.writeHead(p2.statusCode, { "Content-Type": "application/json" }); p2.pipe(res); }
          );
          pr.on("error", () => { res.writeHead(502); res.end(JSON.stringify({ error: "LM Studio unreachable" })); });
          if (body) pr.write(body);
          pr.end();
          return;
        }

        // Anthropic proxy
        if (url.startsWith("/anthropic/")) {
          const body = await readBody(req);
          const pr = https.request(
            { hostname: "api.anthropic.com", port: 443, path: url.replace("/anthropic", ""), method: req.method, headers: { "Content-Type": "application/json", "x-api-key": req.headers["x-api-key"] || "", "anthropic-version": req.headers["anthropic-version"] || "2023-06-01" } },
            (p2: any) => { res.writeHead(p2.statusCode, { "Content-Type": "application/json" }); p2.pipe(res); }
          );
          pr.on("error", () => { res.writeHead(502); res.end(JSON.stringify({ error: "Anthropic unreachable" })); });
          if (body) pr.write(body);
          pr.end();
          return;
        }

        // GET /api/health — lets extension verify app is running
        if (req.method === "GET" && url === "/api/health") {
          sendJSON(res, { ok: true, version: "1.0", timestamp: new Date().toISOString() });
          return;
        }

        // POST /api/save-conversation
        if (req.method === "POST" && url === "/api/save-conversation") {
          try {
            await getDB();
            const payload = JSON.parse(await readBody(req));
            const { prospect, messages, bantScore } = payload;
            const pid = "p_" + Date.now();
            const source = prospect.source || (prospect.platform + " (Extension)");

            dbRun(
              "INSERT INTO prospects (id,name,handle,stage,lead_score,call_readiness,intent_level,intent_confidence,motivation,concerns,income_goal,source,platform) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,handle=excluded.handle,stage=excluded.stage,lead_score=excluded.lead_score,call_readiness=excluded.call_readiness,updated_at=datetime('now')",
              [pid, prospect.name, prospect.handle || "", prospect.stage || "New Lead", prospect.leadScore || 0, prospect.callReadiness || 0, prospect.intentLevel || "Curious", prospect.intentConfidence || 0, prospect.motivation || "", prospect.concerns || "", prospect.incomeGoal || "", source, prospect.platform || "instagram"]
            );

            messages.forEach((m: any, i: number) => {
              dbRun("INSERT OR IGNORE INTO messages (id,prospect_id,sender,content) VALUES (?,?,?,?)",
                ["msg_" + Date.now() + "_" + i, pid, m.sender, m.content]);
            });

            if (bantScore) {
              dbRun("INSERT INTO bant_scores (id,prospect_id,need,timeline,authority,budget,total,verdict,notes) VALUES (?,?,?,?,?,?,?,?,?)",
                ["bant_" + pid, pid, bantScore.need || 0, bantScore.timeline || 0, bantScore.authority || 0, bantScore.budget || 0, bantScore.total || 0, bantScore.verdict || "", JSON.stringify(bantScore.notes || [])]);
            }

            persistDB();
            persistJSON({ id: pid, savedAt: new Date().toISOString(), prospect: { ...prospect, id: pid }, messages });

            // Auto-increment KPI for today — every saved conversation = 1 DM sent + 1 new lead
            const today = new Date().toISOString().slice(0, 10);
            const existing = qAll("SELECT * FROM kpi_log WHERE date=?", [today]);
            if (existing.length === 0) {
              dbRun("INSERT INTO kpi_log (id,date,dms_sent,dms_received,new_leads) VALUES (?,?,1,1,1)",
                ["kpi_" + today, today]);
            } else {
              dbRun("UPDATE kpi_log SET dms_sent=dms_sent+1, dms_received=dms_received+1, new_leads=new_leads+1 WHERE date=?", [today]);
            }

            // Auto-increment calls_booked if prospect is call-ready
            if ((prospect.callReadiness || 0) >= 70) {
              dbRun("UPDATE kpi_log SET calls_booked=calls_booked+1 WHERE date=?", [today]);
            }

            persistDB();
            console.log("[DM Setter OS] Saved: " + prospect.name + " (" + messages.length + " msgs) -> SQLite + KPI updated");
            sendJSON(res, { success: true, id: pid });
          } catch (e: any) {
            sendJSON(res, { error: e.message }, 500);
          }
          return;
        }

        // GET /api/conversations
        if (req.method === "GET" && url === "/api/conversations") {
          await getDB();
          const prospects = qAll("SELECT * FROM prospects ORDER BY updated_at DESC LIMIT 100");
          const conversations = prospects.map((p: any) => ({
            id: p.id, savedAt: p.updated_at,
            prospect: { name: p.name, handle: p.handle, stage: p.stage, leadScore: p.lead_score, callReadiness: p.call_readiness, intentLevel: p.intent_level, intentConfidence: p.intent_confidence, motivation: p.motivation, concerns: p.concerns, incomeGoal: p.income_goal, source: p.source, platform: p.platform },
            messages: qAll("SELECT * FROM messages WHERE prospect_id=? ORDER BY sent_at ASC", [p.id]),
          }));
          sendJSON(res, { conversations });
          return;
        }

        // DELETE /api/conversations/:id
        if (req.method === "DELETE" && url.startsWith("/api/conversations/")) {
          const id = url.split("/")[3];
          await getDB();
          dbRun("DELETE FROM messages WHERE prospect_id=?", [id]);
          dbRun("DELETE FROM prospects WHERE id=?", [id]);
          dbRun("DELETE FROM bant_scores WHERE prospect_id=?", [id]);
          persistDB();
          sendJSON(res, { success: true });
          return;
        }

        // POST /api/kpi
        if (req.method === "POST" && url === "/api/kpi") {
          const b = JSON.parse(await readBody(req));
          await getDB();
          dbRun("INSERT INTO kpi_log (id,date,dms_sent,dms_received,new_leads,follow_ups_sent,calls_booked,calls_completed,no_shows,objections_handled,hours_worked,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET dms_sent=excluded.dms_sent,dms_received=excluded.dms_received,new_leads=excluded.new_leads,follow_ups_sent=excluded.follow_ups_sent,calls_booked=excluded.calls_booked,calls_completed=excluded.calls_completed,no_shows=excluded.no_shows,objections_handled=excluded.objections_handled,hours_worked=excluded.hours_worked,notes=excluded.notes",
            ["kpi_" + b.date, b.date, b.dmsSent || 0, b.dmsReceived || 0, b.newLeads || 0, b.followUpsSent || 0, b.callsBooked || 0, b.callsCompleted || 0, b.noShows || 0, b.objectionsHandled || 0, b.hoursWorked || 0, b.notes || ""]);
          persistDB();
          sendJSON(res, { success: true });
          return;
        }

        // GET /api/kpi
        if (req.method === "GET" && url === "/api/kpi") {
          await getDB();
          sendJSON(res, { kpiLog: qAll("SELECT * FROM kpi_log ORDER BY date DESC LIMIT 90") });
          return;
        }

        // POST /api/objection
        if (req.method === "POST" && url === "/api/objection") {
          const b = JSON.parse(await readBody(req));
          await getDB();
          dbRun("INSERT INTO objections (id,prospect_name,type,handled) VALUES (?,?,?,?)",
            ["obj_" + Date.now(), b.prospectName || "", b.type, b.handled ? 1 : 0]);
          persistDB();
          sendJSON(res, { success: true });
          return;
        }

        // GET /api/objections
        if (req.method === "GET" && url === "/api/objections") {
          await getDB();
          sendJSON(res, { stats: qAll("SELECT type, COUNT(*) as count FROM objections GROUP BY type ORDER BY count DESC") });
          return;
        }

        // POST /api/training-session
        if (req.method === "POST" && url === "/api/training-session") {
          const b = JSON.parse(await readBody(req));
          await getDB();
          dbRun("INSERT INTO training_sessions (id,scenario_name,scenario_type,difficulty,turns,grade,summary,strengths,improvements,bant_breakdown) VALUES (?,?,?,?,?,?,?,?,?,?)",
            ["ts_" + Date.now(), b.scenarioName, b.scenarioType, b.difficulty, b.turns, b.feedback?.grade, b.feedback?.summary, JSON.stringify(b.feedback?.strengths || []), JSON.stringify(b.feedback?.improvements || []), b.feedback?.bantBreakdown || ""]);
          persistDB();
          sendJSON(res, { success: true });
          return;
        }

        // GET /api/training-sessions
        if (req.method === "GET" && url === "/api/training-sessions") {
          await getDB();
          const rows = qAll("SELECT * FROM training_sessions ORDER BY completed_at DESC LIMIT 50");
          sendJSON(res, { sessions: rows.map((r: any) => ({ ...r, strengths: JSON.parse(r.strengths || "[]"), improvements: JSON.parse(r.improvements || "[]") })) });
          return;
        }

        // GET /api/export
        if (req.method === "GET" && url === "/api/export") {
          await getDB();
          res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=dm-setter-export.json" });
          res.end(JSON.stringify({ exportedAt: new Date().toISOString(), prospects: qAll("SELECT * FROM prospects"), kpiLog: qAll("SELECT * FROM kpi_log"), objections: qAll("SELECT * FROM objections"), trainingSessions: qAll("SELECT * FROM training_sessions") }, null, 2));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [react(), dmSetterPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
