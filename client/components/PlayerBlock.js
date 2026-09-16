import { useCountdown } from "../lib/useAuctionState";

export default function PlayerBlock({ state, clockOffset }) {
  const { auction, players, teams, cfg } = state;
  const player = players.find((p) => p.id === auction.currentPlayerId);
  const bidTeam = teams.find((t) => t.id === auction.currentBidTeamId);
  const msLeft = useCountdown(auction.timerEndsAt, clockOffset);
  const secLeft = msLeft === null ? null : Math.ceil(msLeft / 1000);
  const pct = msLeft === null ? 0 : Math.min(100, (msLeft / (cfg.timerSeconds * 1000)) * 100);

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

  if (!player) {
    return (
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface p-6 text-center">
        <p className="font-display text-2xl text-cream/70">
          {auction.phase === "paused" ? "Auction paused" : "Loading next player…"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pitch-line bg-pitch-surface p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cream/40">On the block · Round {auction.round}</p>
          <h2 className="font-display text-5xl leading-none text-cream mt-1">{player.name}</h2>
          <p className="mt-1 text-sm text-cream/60">{player.category || "—"} · base {player.basePrice} pts</p>
        </div>
        {secLeft !== null && auction.phase === "live" && (
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#26382C" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={secLeft <= 4 ? "#B23A2E" : "#D6A94B"}
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - pct / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.2s linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-xl tabular">
              {secLeft}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between rounded-xl bg-pitch-bg/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-cream/40">Current bid</p>
          <p className="font-display text-4xl text-gold tabular">{auction.currentBid} pts</p>
        </div>
        <p className="text-sm text-cream/70">{bidTeam ? bidTeam.name : "No bids yet"}</p>
      </div>

      {auction.phase === "paused" && (
        <p className="mt-3 text-center text-sm text-cream/50">Bidding is paused by the admin.</p>
      )}
    </div>
  );
}
