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

  if (!player) {
    return (
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface p-6 text-center">
        <p className="font-display text-2xl text-cream/70">Bringing up the next player…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pitch-line bg-pitch-surface p-6">
      <p className="text-xs uppercase tracking-wide text-cream/40">
        {player.status !== "active" ? "Result" : "On the auction floor"}
      </p>
      <h2 className="font-display text-6xl leading-none text-cream mt-1">{player.name}</h2>
      <p className="mt-1 text-sm text-cream/60">{player.category || "—"} · base {player.basePrice} pts</p>

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
    </div>
  );
}
