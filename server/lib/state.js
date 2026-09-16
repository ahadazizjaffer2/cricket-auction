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
    status: "queued", // queued | active | sold | unsold_pool
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
      pin: t.pin,
      budgetTotal: this.cfg.budgetTotal,
      budgetRemaining: this.cfg.budgetTotal,
      squad: [], // [{playerId, name, price}]
    }));
    this.auction = {
      phase: "setup", // setup | live | paused | complete
      currentPlayerId: null,
      currentBid: 0,
      currentBidTeamId: null,
      timerEndsAt: null,
      queue: [],
      unsoldPool: [],
      round: 1,
      log: [],
    };
    if (!initial) this._log("Auction reset.");
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
      status: "queued",
      order: idx,
      soldTo: null,
      soldPrice: null,
    }));
    this._log(`Loaded ${this.players.length} players from uploaded CSV.`);
  }

  updateConfig(partial) {
    const allowed = ["budgetTotal", "squadSize", "timerSeconds", "minIncrement", "basePriceDefault"];
    for (const k of allowed) {
      if (partial[k] !== undefined && !Number.isNaN(Number(partial[k]))) {
        this.cfg[k] = Number(partial[k]);
      }
    }
    // re-apply budgets if not yet started
    if (this.auction.phase === "setup") {
      this.teams.forEach((t) => {
        t.budgetTotal = this.cfg.budgetTotal;
        t.budgetRemaining = this.cfg.budgetTotal;
      });
    }
    this._log("Config updated.");
  }

  // ---------- auth ----------

  checkAdminPassword(pw) {
    return pw === this.cfg.adminPassword;
  }

  authenticateCaptain(teamId, pin) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: "No such team." };
    if (String(team.pin) !== String(pin)) return { ok: false, error: "Wrong PIN." };
    return { ok: true, teamId: team.id, teamName: team.name };
  }

  // ---------- auction flow ----------

  auctionSlots() {
    return Math.max(1, this.cfg.squadSize - 1);
  }

  startAuction() {
    if (this.auction.phase !== "setup" && this.auction.phase !== "complete") {
      return { ok: false, error: "Auction already running." };
    }
    if (this.players.length === 0) return { ok: false, error: "No players loaded." };

    // reset player/team state but keep loaded players & config
    this.players.forEach((p) => {
      p.status = "queued";
      p.soldTo = null;
      p.soldPrice = null;
    });
    this.teams.forEach((t) => {
      t.budgetRemaining = this.cfg.budgetTotal;
      t.squad = [];
    });

    this.auction.queue = this.players.map((p) => p.id);
    this.auction.unsoldPool = [];
    this.auction.round = 1;
    this.auction.phase = "live";
    this.auction.log = [];
    this._log("Auction started.");
    this._activateNext();
    return { ok: true };
  }

  pauseAuction() {
    if (this.auction.phase !== "live") return { ok: false, error: "Not live." };
    this.auction.phase = "paused";
    this._pausedRemainingMs = this.auction.timerEndsAt ? this.auction.timerEndsAt - Date.now() : null;
    this._log("Auction paused.");
    return { ok: true };
  }

  resumeAuction() {
    if (this.auction.phase !== "paused") return { ok: false, error: "Not paused." };
    this.auction.phase = "live";
    const remaining = this._pausedRemainingMs ?? this.cfg.timerSeconds * 1000;
    this.auction.timerEndsAt = Date.now() + Math.max(1000, remaining);
    this._log("Auction resumed.");
    return { ok: true };
  }

  _activateNext() {
    if (this.auction.queue.length === 0) {
      if (this.auction.unsoldPool.length > 0) {
        this.auction.round += 1;
        this._log(`Round ${this.auction.round}: revisiting ${this.auction.unsoldPool.length} unsold player(s).`);
        this.auction.queue = this.auction.unsoldPool;
        this.auction.unsoldPool = [];
      } else {
        this.auction.phase = "complete";
        this.auction.currentPlayerId = null;
        this.auction.currentBid = 0;
        this.auction.currentBidTeamId = null;
        this.auction.timerEndsAt = null;
        this._log("Auction complete — all players sold.");
        return;
      }
    }

    const nextId = this.auction.queue.shift();
    const player = this.players.find((p) => p.id === nextId);
    if (!player) {
      this._activateNext(); // skip missing, defensive
      return;
    }
    player.status = "active";
    this.auction.currentPlayerId = player.id;
    this.auction.currentBid = player.basePrice;
    this.auction.currentBidTeamId = null;
    this.auction.timerEndsAt = Date.now() + this.cfg.timerSeconds * 1000;
    this._log(`${player.name} is on the block (base ${player.basePrice}).`);
  }

  maxAllowedBid(team) {
    const auctionSlots = this.auctionSlots();
    const slotsRemaining = auctionSlots - team.squad.length;
    if (slotsRemaining <= 0) return null; // squad full
    const reserveForRest = (slotsRemaining - 1) * this.cfg.basePriceDefault;
    return team.budgetRemaining - reserveForRest;
  }

  placeBid(teamId, amount) {
    if (this.auction.phase !== "live") return { ok: false, error: "Bidding is not open." };
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: "Unknown team." };
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player) return { ok: false, error: "No active player." };

    const amt = Number(amount);
    if (!Number.isFinite(amt)) return { ok: false, error: "Invalid amount." };
    if (amt <= this.auction.currentBid) return { ok: false, error: "Bid must be higher than the current bid." };
    if (amt < player.basePrice) return { ok: false, error: "Bid must meet the base price." };

    const max = this.maxAllowedBid(team);
    if (max === null) return { ok: false, error: "Your squad is already full." };
    if (amt > max) return { ok: false, error: `Max bid right now is ${max} (must leave enough for remaining slots).` };
    if (teamId === this.auction.currentBidTeamId) return { ok: false, error: "You're already the top bidder." };

    this.auction.currentBid = amt;
    this.auction.currentBidTeamId = teamId;
    this.auction.timerEndsAt = Date.now() + this.cfg.timerSeconds * 1000;
    this._log(`${team.name} bids ${amt} for ${player.name}.`);
    return { ok: true };
  }

  // called periodically (server interval, or admin-driven tick) to resolve expired timers
  tick() {
    if (this.auction.phase !== "live") return;
    if (!this.auction.timerEndsAt) return;
    if (Date.now() < this.auction.timerEndsAt) return;
    this._resolveCurrentPlayer();
  }

  _resolveCurrentPlayer() {
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player) return;

    if (this.auction.currentBidTeamId) {
      const team = this.teams.find((t) => t.id === this.auction.currentBidTeamId);
      player.status = "sold";
      player.soldTo = team.id;
      player.soldPrice = this.auction.currentBid;
      team.budgetRemaining -= this.auction.currentBid;
      team.squad.push({ playerId: player.id, name: player.name, price: this.auction.currentBid });
      this._log(`SOLD: ${player.name} to ${team.name} for ${this.auction.currentBid}.`);
    } else {
      player.status = "unsold_pool";
      this.auction.unsoldPool.push(player.id);
      this._log(`${player.name} went unsold — moved to the retry pool.`);
    }
    this._activateNext();
  }

  // ---------- admin overrides ----------

  forceSell(teamId) {
    if (this.auction.phase !== "live") return { ok: false, error: "Not live." };
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: "Unknown team." };
    this.auction.currentBidTeamId = teamId;
    if (this.auction.currentBid < this.players.find((p) => p.id === this.auction.currentPlayerId).basePrice) {
      this.auction.currentBid = this.players.find((p) => p.id === this.auction.currentPlayerId).basePrice;
    }
    this._resolveCurrentPlayer();
    return { ok: true };
  }

  forceUnsoldFinal() {
    if (this.auction.phase !== "live") return { ok: false, error: "Not live." };
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player) return { ok: false, error: "No active player." };
    player.status = "unsold_final";
    this._log(`${player.name} permanently marked unsold by admin.`);
    this._activateNext();
    return { ok: true };
  }

  skipToPool() {
    if (this.auction.phase !== "live") return { ok: false, error: "Not live." };
    const player = this.players.find((p) => p.id === this.auction.currentPlayerId);
    if (!player) return { ok: false, error: "No active player." };
    this.auction.currentBidTeamId = null;
    this._resolveCurrentPlayer();
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
        squadSize: this.cfg.squadSize,
        auctionSlots: this.auctionSlots(),
        timerSeconds: this.cfg.timerSeconds,
        minIncrement: this.cfg.minIncrement,
        basePriceDefault: this.cfg.basePriceDefault,
      },
      teams: this.teams.map((t) => ({
        id: t.id,
        name: t.name,
        budgetTotal: t.budgetTotal,
        budgetRemaining: t.budgetRemaining,
        squad: t.squad,
        slotsRemaining: this.auctionSlots() - t.squad.length,
      })),
      players: this.players,
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
