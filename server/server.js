require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { AuctionEngine } = require("./lib/state");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(express.text({ type: "text/csv", limit: "2mb" }));

const engine = new AuctionEngine();

// ---------- REST: export & CSV upload ----------

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/export.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=auction-results.json");
  res.send(engine.exportResultsJson());
});

app.get("/export.csv", (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=auction-results.csv");
  res.send(engine.exportResultsCsv());
});

app.post("/players/upload", (req, res) => {
  const pw = req.header("x-admin-password");
  if (!engine.checkAdminPassword(pw)) return res.status(401).json({ ok: false, error: "Bad admin password." });
  try {
    engine.loadPlayersCsvFromBuffer(Buffer.from(req.body, "utf8"));
    io.emit("state:update", engine.getPublicState());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

function broadcastState() {
  io.emit("state:update", engine.getPublicState());
}

io.on("connection", (socket) => {
  socket.emit("state:update", engine.getPublicState());
  socket.data.role = null;

  socket.on("auth:admin", (password, cb) => {
    const ok = engine.checkAdminPassword(password);
    if (ok) socket.data.role = "admin";
    cb && cb({ ok });
  });

  function requireAdmin(cb) {
    if (socket.data.role !== "admin") {
      cb && cb({ ok: false, error: "Not authenticated as admin." });
      return false;
    }
    return true;
  }

  socket.on("admin:start", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.startAuction();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:nextPlayer", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.nextPlayer();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:startNextTier", (payload, cb) => {
    if (!requireAdmin(cb)) return;
    const tier = (payload || {}).tier;
    const r = engine.startNextTier(tier);
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:confirmSale", (payload, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.confirmSale(payload || {});
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:skipPlayer", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.skipPlayer();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:forceUnsoldFinal", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.forceUnsoldFinal();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:pause", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.pauseAuction();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:resume", (_, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.resumeAuction();
    cb && cb(r);
    broadcastState();
  });

  socket.on("admin:reset", (_, cb) => {
    if (!requireAdmin(cb)) return;
    engine.reset();
    cb && cb({ ok: true });
    broadcastState();
  });

  socket.on("admin:updateConfig", (partial, cb) => {
    if (!requireAdmin(cb)) return;
    engine.updateConfig(partial || {});
    cb && cb({ ok: true });
    broadcastState();
  });

  socket.on("admin:updateTeams", (teamsInput, cb) => {
    if (!requireAdmin(cb)) return;
    const r = engine.updateTeams(teamsInput || []);
    cb && cb(r);
    broadcastState();
  });

  socket.on("disconnect", () => {});
});

server.listen(PORT, () => {
  console.log(`Cricket auction server (physical-bidding) listening on :${PORT}`);
});
