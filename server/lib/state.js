const fs = require("fs");
const path = require("path");
const { parseCsv, toCsv } = require("./csv");

const CONFIG_PATH = path.join(__dirname, "..", "config.json");
const DEFAULT_PLAYERS_CSV = path.join(__dirname, "..", "data", "players.sample.csv");

function loadRawConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

function loadPlayersFromCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  return rows.map((row, idx) => ({
    id: "p" + (idx + 1),
    name: row.name || "Player " + (idx + 1),
    category: row.category || "",
    basePrice: Math.max(1, parseInt(row.baseprice, 10) || 1),
    status: "pool", // pool | active | sold | unsold_final
    order: idx,
    soldTo: null,
    soldPrice: null,
  }));
}

class AuctionEngine {
  constructor() {
    this.cfg = loadRawConfig();
    this.playersCsvPath = DEFAULT_PLAYERS_CSV;
    this.reset(true);
  }

  // ---------- setup / lifecycle ----------

  reset(initial = false) {
    this.players = loadPlayersFromCsv(this.playersCsvPath);
    this.teams = this.cfg.teams.map((t) => ({
      id: t.id,
      name: t.name,
      budgetTotal: this.cfg.budgetTotal,
      budgetRemaining: this.cfg.budgetTotal,
      squad: [], // [{playerId, name, price}]
    }));
    this.pool = []; // ids available to be randomly drawn
    this.auction = {
      phase: "setup", // setup | active | complete
      paused: false,
      currentPlayerId: null,
      log: [],
    };
    this.computeTeamTargets();
    if (!initial) this._log("Auction reset.");
  }

  // Distributes the loaded players as evenly as possible across teams.
  // e.g. 25 players / 4 teams -> three teams get 6, one gets 7.
  // 26 players / 4 teams -> two teams get 6, two get 7.
  computeTeamTargets() {
    const n = this.teams.length;
    if (n === 0) return;
    const total = this.players.length;
    const base = Math.floor(total / n);
    const remainder = total % n;
    this.teams.forEach((t, idx) => {
      t.targetSlots = base + (idx < remainder ? 1 : 0);
    });
  }

  loadPlayersCsvFromBuffer(buffer) {
    const text = buffer.toString("utf8");
    const rows = parseCsv(text);
    if (rows.length === 0) throw new Error("CSV has no rows.");
    this.players = rows.map((row, idx) => ({
      id: "p" + (idx + 1),
      name: row.name || "Player " + (idx + 1),
      category: row.category || "",
      basePrice: Math.max(1, parseInt(row.baseprice, 10) || 1),
      status: "pool",
      order: idx,
      soldTo: null,
      soldPrice: null,
    }));
    this.computeTeamTargets();
    this._log(`Loaded ${this.players.length} players from uploaded CSV.`);
  }

  updateConfig(partial) {
    const allowed = ["budgetTotal"];
    for (const k of allowed) {
      if (partial[k] !== undefined && !Number.isNaN(Number(partial[k]))) {
        this.cfg[k] = Number(partial[k]);
      }
    }
    if (this.auction.phase === "setup") {
      this.teams.forEach((t) => {
        t.budgetTotal = this.cfg.budgetTotal;
        t.budgetRemaining = this.cfg.budgetTotal;
      });
    }
    this._log("Config updated.");
  }

  updateTeams(teamsInput) {
    if (this.auction.phase !== "setup") {
      return { ok: false, error: "Teams can only be edited before the auction starts." };
    }
    if (!Array.isArray(teamsInput) || teamsInput.length !== this.teams.length) {
      return { ok: false, error: "Expected " + this.teams.length + " teams." };
    }
    const names = teamsInput.map((t) => String(t.name || "").trim());
    if (names.some((n) => n.length === 0)) return { ok: false, error: "Every team needs a name." };

    teamsInput.forEach((_, idx) => {
      this.teams[idx].name = names[idx];
    });
    this.cfg.teams = this.teams.map((t) => ({ id: t.id, name: t.name }));
    this._log("Team names updated.");
    return { ok: true };
  }

  // ---------- auth ----------

  checkAdminPassword(pw) {
    return pw === this.cfg.adminPassword;
  }

  // ---------- auction flow ----------

  startAuction() {
    if (this.auction.phase !== "setup" && this.auction.phase !== "complete") {
      return { ok: false, error: "Auction already running." };
    }
    if (this.players.length === 0) return { ok: false, error: "No players loaded." };

    this.players.forEach((p) => {
      p.status = "pool";
      p.soldTo = null;
      p.soldPrice = null;
    });
    this.teams.forEach((t) => {
      t.budgetRemaining = this.cfg.budgetTotal;
      t.squad = [];
    });
    this.computeTeamTargets();

    this.pool = this.players.map((p) => p.id);
    this.auction.phase = "active";
    this.auction.paused = false;
    this.auction.currentPlayerId = null;
    this.auction.log = [];
    this._log(`Auction started with ${this.pool.length} players in the pool.`);
    return { ok: true };
  }

  // Randomly draws the next player from the pool and puts them on the block.
  // If the current player was already resolved (sold / permanently unsold),
  // clear them off the block first so guests saw the result before it moves on.
  nextPlayer() {
    if (this.auction.phase !== "active") return { ok: false, error: "Auction is not active." };
    if (this.auction.paused) return { ok: false, error: "Auction is paused." };
    if (this.auction.currentPlayerId) {
      const current = this.players.find((p) => p.id === this.auction.currentPlayerId);
      if (current && current.status === "active") {
        return { ok: false, error: "Resolve the current player first (sell, skip, or mark unsold)." };
      }
      this.auction.currentPlayerId = null;
    }
    if (this.pool.length === 0) {
      this.auction.phase = "complete";
      this._log("Auction complete — no players left in the pool.");
      return { ok: true, complete: true };
    }
    const idx = Math.floor(Math.random() * this.pool.length);
    const playerId = this.pool.splice(idx, 1)[0];
    const player = this.players.find((p) => p.id === playerId);
    player.status = "active";
    this.auction.currentPlayerId = player.id;
    this._log(`${player.name} is on the block (base ${player.basePrice}).`);
    return { ok: true };
  }

  pauseAuction() {
    if (this.auction.phase !== "active") return { ok: false, error: "Not active." };
    this.auction.paused = true;
    this._log("Auction paused.");
    return { ok: true };
  }

  resumeAuction() {
    if (this.auction.phase !== "active") return { ok: false, error: "Not active." };
    this.auction.paused = false;
    this._log("Auction resumed.");
    return { ok: true };
  }

  confirmSale({ teamId, price }) {
    if (this.auction.phase !== "active" || this.auction.paused) {
      return { ok: false, error: "Auction is not active." };
    }
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player || player.status !== "active") return { ok: false, error: "No player on the block." };
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: "Unknown team." };

    const amt = Number(price);
    if (!Number.isFinite(amt) || amt < 0) return { ok: false, error: "Enter a valid price." };
    if (team.squad.length >= team.targetSlots) {
      return { ok: false, error: `${team.name}'s squad is already full (${team.targetSlots} players).` };
    }

    player.status = "sold";
    player.soldTo = team.id;
    player.soldPrice = amt;
    team.budgetRemaining -= amt; // allowed to go negative — tracked, not blocked
    team.squad.push({ playerId: player.id, name: player.name, price: amt });

    const overBudget = team.budgetRemaining < 0;
    this._log(
      `SOLD: ${player.name} to ${team.name} for ${amt}.` +
        (overBudget ? ` ${team.name} is now ${team.budgetRemaining} pts (over budget).` : "")
    );
    return { ok: true, overBudget, budgetRemaining: team.budgetRemaining };
  }

  // Returns the current player to the pool without recording a sale
  // (e.g. the room wants to come back to them later).
  skipPlayer() {
    if (this.auction.phase !== "active") return { ok: false, error: "Not active." };
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player || player.status !== "active") return { ok: false, error: "No player on the block." };
    player.status = "pool";
    this.pool.push(player.id);
    this.auction.currentPlayerId = null;
    this._log(`${player.name} skipped — back in the pool.`);
    return { ok: true };
  }

  forceUnsoldFinal() {
    if (this.auction.phase !== "active") return { ok: false, error: "Not active." };
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player || player.status !== "active") return { ok: false, error: "No player on the block." };
    player.status = "unsold_final";
    this._log(`${player.name} permanently marked unsold by admin.`);
    return { ok: true };
  }

  // ---------- output ----------

  _log(text) {
    this.auction.log.unshift({ ts: Date.now(), text });
    this.auction.log = this.auction.log.slice(0, 40);
  }

  getPublicState() {
    return {
      cfg: {
        budgetTotal: this.cfg.budgetTotal,
      },
      teams: this.teams.map((t) => ({
        id: t.id,
        name: t.name,
        budgetTotal: t.budgetTotal,
        budgetRemaining: t.budgetRemaining,
        squad: t.squad,
        targetSlots: t.targetSlots,
        slotsRemaining: (t.targetSlots ?? 0) - t.squad.length,
      })),
      players: this.players,
      poolCount: this.pool.length,
      auction: this.auction,
    };
  }

  exportResultsJson() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        teams: this.teams.map((t) => ({
          name: t.name,
          budgetTotal: t.budgetTotal,
          budgetSpent: t.budgetTotal - t.budgetRemaining,
          budgetRemaining: t.budgetRemaining,
          squad: t.squad,
        })),
        unsoldFinal: this.players.filter((p) => p.status === "unsold_final").map((p) => p.name),
      },
      null,
      2
    );
  }

  exportResultsCsv() {
    const rows = this.players
      .filter((p) => p.status === "sold")
      .map((p) => {
        const team = this.teams.find((t) => t.id === p.soldTo);
        return {
          player: p.name,
          category: p.category,
          team: team ? team.name : "",
          price: p.soldPrice,
        };
      });
    return toCsv(rows, ["player", "category", "team", "price"]);
  }
}

module.exports = { AuctionEngine };
