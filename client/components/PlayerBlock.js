const TIER_STYLES = {
  Diamond: "bg-sky-400/15 border-sky-400/40 text-sky-300",
  Platinum: "bg-slate-300/15 border-slate-300/40 text-slate-200",
  Gold: "bg-gold/15 border-gold/40 text-gold",
  Silver: "bg-zinc-300/15 border-zinc-300/40 text-zinc-200",
  Bronze: "bg-orange-400/15 border-orange-400/40 text-orange-300",
  Emerging: "bg-emerald-400/15 border-emerald-400/40 text-emerald-300",
  Unlisted: "bg-cream/10 border-cream/30 text-cream/60",
};

function TierBadge({ tier }) {
  if (!tier) return null;
  const cls = TIER_STYLES[tier] || TIER_STYLES.Unlisted;
  return (
    <span className={"inline-block rounded-full border px-3 py-1 text-xs font-display tracking-wide " + cls}>
      {tier.toUpperCase()} ROUND
    </span>
  );
}

export default function PlayerBlock({ state }) {
  const { auction, players, teams } = state;
  const player = players.find((p) => p.id === auction.currentPlayerId);
  const soldTeam = player && player.status === "sold" ? teams.find((t) => t.id === player.soldTo) : null;

  if (auction.phase === "setup") {
    return (
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface p-6 text-center">
        <p className="font-display text-3xl text-cream/80">Auction hasn&apos;t started yet</p>
        <p className="mt-1 text-sm text-cream/50">Waiting for the admin to begin.</p>
      </div>
    );
  }

  if (auction.phase === "complete") {
    return (
      <div className="rounded-2xl border border-gold/40 bg-pitch-surface p-6 text-center">
        <p className="font-display text-4xl text-gold">Auction complete</p>
        <p className="mt-1 text-sm text-cream/60">Every player has found a team.</p>
      </div>
    );
  }

  if (auction.paused) {
    return (
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface p-6 text-center">
        <p className="font-display text-3xl text-cream/70">Auction paused</p>
        <p className="mt-1 text-sm text-cream/50">Back shortly.</p>
      </div>
    );
  }

  if (auction.tierPending && !player) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-pitch-surface p-6 text-center">
        {auction.currentTier && <TierBadge tier={auction.currentTier} />}
        <p className="font-display text-3xl text-gold mt-3">
          {auction.currentTier ? `${auction.currentTier} round complete!` : "Auction started!"}
        </p>
        <p className="mt-1 text-sm text-cream/50">Waiting for the admin to choose the next tier.</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface p-6 text-center">
        <TierBadge tier={auction.currentTier} />
        <p className="font-display text-2xl text-cream/70 mt-3">Bringing up the next player…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pitch-line bg-pitch-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-cream/40">
          {player.status !== "active" ? "Result" : "On the auction floor"}
        </p>
        <TierBadge tier={player.tier || auction.currentTier} />
      </div>
      <h2 className="font-display text-6xl leading-none text-cream mt-2">{player.name}</h2>
      <p className="mt-1 text-sm text-cream/60">{player.category} · base {player.basePrice} pts</p>

      {soldTeam ? (
        <div className="mt-5 rounded-xl bg-gold/10 border border-gold/40 px-4 py-3 text-center">
          <p className="font-display text-3xl text-gold">SOLD — {soldTeam.name}</p>
          <p className="text-sm text-cream/70 mt-0.5">for {player.soldPrice} pts</p>
        </div>
      ) : player.status === "unsold_final" ? (
        <div className="mt-5 rounded-xl bg-ball/10 border border-ball/40 px-4 py-3 text-center">
          <p className="font-display text-3xl text-ball">UNSOLD</p>
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-pitch-bg/60 px-4 py-3 text-center">
          <p className="text-sm text-cream/50">Bidding is happening live in the room.</p>
        </div>
      )}

      {auction.tierPending && (
        <p className="mt-3 text-center text-xs text-gold/80">
          {auction.currentTier} round complete — waiting for the admin to choose the next tier.
        </p>
      )}
    </div>
  );
}
