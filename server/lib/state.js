const fs = require("fs");
const path = require("path");
const { parseCsv, toCsv } = require("./csv");

const CONFIG_PATH = path.join(__dirname, "..", "config.json");
const DEFAULT_PLAYERS_CSV = path.join(__dirname, "..", "data", "players.sample.csv");

// The 5 recognised tiers. "Unlisted" is not a real tier — players with an
// unrecognised / blank category land there, and the admin can still choose
// to run them at any point (they just show up as a selectable option).
const KNOWN_TIERS = ["Diamond", "Platinum", "Gold", "Silver", "Bronze"];
const UNLISTED_TIER = "Unlisted";
const ALL_TIERS = [...KNOWN_TIERS, UNLISTED_TIER];

// Both "bronze" and "emerging" (and "emerging players") in the CSV are
// treated as the same tier: Bronze.
function normalizeTier(rawCategory) {
  const t = String(rawCategory || "").trim().toLowerCase();
  if (t === "bronze" || t === "emerging" || t === "emerging players") return "Bronze";
  const match = KNOWN_TIERS.find((tier) => tier.toLowerCase() === t);
  return match || null;
}

function loadRawConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

function rowsToPlayers(rows) {
  return rows.map((row, idx) => {
    const rawCategory = row.category || "";
    const matchedTier = normalizeTier(rawCategory);
    return {
      id: "p" + (idx + 1),
      name: row.name || "Player " + (idx + 1),
      // Show canonical tier name (fixes casing); fall back to raw text so
      // mis-typed categories are visible on screen.
      category: matchedTier || rawCategory || UNLISTED_TIER,
      tier: matchedTier || UNLISTED_TIER,
      basePrice: Math.max(1, parseInt(row.baseprice, 10) || 1),
      status: "pool", // pool | active | sold | unsold_final
      order: idx,
      soldTo: null,
      soldPrice: null,
    };
  });
}

function loadPlayersFromCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  return rowsToPlayers(parseCsv(text));
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
      squad: [],
    }));
    this.pool = [];
    this.auction = {
      phase: "setup",   // setup | active | complete
      paused: false,
      currentPlayerId: null,
      currentTier: null,
      // tierPending = true means the admin needs to choose which tier to run next.
      // This is true right after the auction starts AND after each tier is exhausted.
      tierPending: false,
      log: [],
    };
    this.computeTeamTargets();
    if (!initial) this._log("Auction reset.");
  }

  // Every team gets the same cap so no slots are pre-assigned by index.
  computeTeamTargets() {
    const n = this.teams.length;
    if (n === 0) return;
    const total = this.players.length;
    const base = Math.floor(total / n);
    const remainder = total % n;
    const cap = remainder > 0 ? base + 1 : base;
    this.teams.forEach((t) => { t.targetSlots = cap; });
  }

  loadPlayersCsvFromBuffer(buffer) {
    const text = buffer.toString("utf8");
    const rows = parseCsv(text);
    if (rows.length === 0) throw new Error("CSV has no rows.");
    this.players = rowsToPlayers(rows);
    this.computeTeamTargets();
    const unlisted = this.players.filter((p) => p.tier === UNLISTED_TIER).length;
    this._log(
      `Loaded ${this.players.length} players from uploaded CSV.` +
        (unlisted > 0
          ? ` ${unlisted} didn't match a known tier — check the Unlisted group before starting.`
          : "")
    );
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

  // ---------- tier helpers ----------

  // Tiers that currently have at least one player still in the pool.
  _availableTiers() {
    return ALL_TIERS.filter((tier) =>
      this.pool.some((id) => this.players.find((p) => p.id === id)?.tier === tier)
    );
  }

  _tierHasPool(tier) {
    return this.pool.some((id) => this.players.find((p) => p.id === id)?.tier === tier);
  }

  // Called right after a sale or a permanent-unsold. If the current tier's
  // pool is now empty, check if any other tiers remain; if so, let the admin
  // choose what's next. If nothing is left at all, complete the auction.
  _maybeCloseTier() {
    if (this._tierHasPool(this.auction.currentTier)) return; // tier still has players

    const remaining = this._availableTiers();
    if (remaining.length > 0) {
      this.auction.tierPending = true;
      this._log(
        `${this.auction.currentTier} round complete. Choose the next tier to continue.`
      );
    } else {
      this.auction.phase = "complete";
      this._log(`${this.auction.currentTier} round complete — auction finished, no players left.`);
    }
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
    this.auction.currentTier = null;
    // Admin must pick which tier to start with.
    this.auction.tierPending = true;
    this.auction.log = [];
    this._log(
      `Auction started with ${this.pool.length} players. Choose a tier to begin.`
    );
    return { ok: true };
  }

  // Admin explicitly picks which tier to run next.
  // `tier` must be one of the available tiers (has remaining pool players).
  startNextTier(tier) {
    if (this.auction.phase !== "active") return { ok: false, error: "Not active." };
    if (!this.auction.tierPending) return { ok: false, error: "Current tier isn't finished yet." };
    if (!tier) return { ok: false, error: "No tier specified." };

    const available = this._availableTiers();
    if (!available.includes(tier)) {
      return {
        ok: false,
        error: `"${tier}" is not available. Choose from: ${available.join(", ")}.`,
      };
    }

    this.auction.currentTier = tier;
    this.auction.tierPending = false;
    this._log(`${tier} round begins.`);
    return { ok: true, tier };
  }

  // Randomly draws the next player FROM THE CURRENT TIER ONLY.
  nextPlayer() {
    if (this.auction.phase !== "active") return { ok: false, error: "Auction is not active." };
    if (this.auction.paused) return { ok: false, error: "Auction is paused." };
    if (this.auction.tierPending) {
      return { ok: false, error: `Choose a tier first.` };
    }
    if (this.auction.currentPlayerId) {
      const current = this.players.find((p) => p.id === this.auction.currentPlayerId);
      if (current && current.status === "active") {
        return { ok: false, error: "Resolve the current player first (sell, skip, or mark unsold)." };
      }
      this.auction.currentPlayerId = null;
    }

    const tierPoolIds = this.pool.filter(
      (id) => this.players.find((p) => p.id === id)?.tier === this.auction.currentTier
    );
    if (tierPoolIds.length === 0) {
      // Defensive — _maybeCloseTier should already have caught this.
      this._maybeCloseTier();
      return { ok: false, error: `No players left in ${this.auction.currentTier}.` };
    }

    const pick = tierPoolIds[Math.floor(Math.random() * tierPoolIds.length)];
    this.pool = this.pool.filter((id) => id !== pick);
    const player = this.players.find((p) => p.id === pick);
    player.status = "active";
    this.auction.currentPlayerId = player.id;
    this._log(`${player.name} (${player.tier}) is on the block (base ${player.basePrice}).`);
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
    team.budgetRemaining -= amt;
    team.squad.push({ playerId: player.id, name: player.name, price: amt });

    const overBudget = team.budgetRemaining < 0;
    this._log(
      `SOLD: ${player.name} to ${team.name} for ${amt}.` +
        (overBudget ? ` ${team.name} is now ${team.budgetRemaining} pts (over budget).` : "")
    );
    this._maybeCloseTier();
    return { ok: true, overBudget, budgetRemaining: team.budgetRemaining };
  }

  // Returns the current player to the pool. Stays in the same tier's pool,
  // so skipping never triggers tier-close.
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
    this._maybeCloseTier();
    return { ok: true };
  }

  // ---------- output ----------

  _log(text) {
    this.auction.log.unshift({ ts: Date.now(), text });
    this.auction.log = this.auction.log.slice(0, 40);
  }

  _tierSummary() {
    return ALL_TIERS.map((tier) => ({
      tier,
      total: this.players.filter((p) => p.tier === tier).length,
      remaining: this.players.filter((p) => p.tier === tier && p.status === "pool").length,
    })).filter((t) => t.total > 0);
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
      tiers: this._tierSummary(),
      // Tiers that still have players in the pool — used by the UI to render
      // the tier-picker buttons when tierPending is true.
      availableTiers: this._availableTiers(),
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
