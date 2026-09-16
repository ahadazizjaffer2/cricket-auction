import { useAuctionState } from "../lib/useAuctionState";
import PlayerBlock from "../components/PlayerBlock";
import TeamsBoard from "../components/TeamsBoard";

export default function Guest() {
  const { state, connected, clockOffset } = useAuctionState();

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-cream/50">{connected ? "Loading…" : "Connecting…"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Live Auction Board</h1>
        <span className={"h-2 w-2 rounded-full " + (connected ? "bg-grass" : "bg-ball")} title={connected ? "Live" : "Reconnecting"} />
      </header>

      <PlayerBlock state={state} clockOffset={clockOffset} />

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">Teams</h2>
        <TeamsBoard state={state} />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">Recent activity</h2>
        <ul className="space-y-1 text-sm text-cream/60">
          {state.auction.log.slice(0, 12).map((entry, i) => (
            <li key={entry.ts + "-" + i}>{entry.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
