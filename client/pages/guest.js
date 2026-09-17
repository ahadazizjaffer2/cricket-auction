import { useAuctionState } from "../lib/useAuctionState";
import PlayerBlock from "../components/PlayerBlock";
import TeamsBoard from "../components/TeamsBoard";
import Image from "next/image";

export default function Guest() {
  const { state, connected } = useAuctionState();

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
        <a href="https://insg-cricket-auction.vercel.app/" target="_blank" rel="noreferrer"><Image src="/rovers-logo.png" width={60} height={180} /></a>
        <h1 className="font-display text-3xl">Live Auction Board</h1>
        <span className={"h-2 w-2 rounded-full " + (connected ? "bg-grass" : "bg-ball")} title={connected ? "Live" : "Reconnecting"} />
      </header>

      <PlayerBlock state={state} />

      {state.auction.phase === "active" && (
        <p className="mt-2 text-center text-xs text-cream/30">{state.poolCount} player(s) left in the pool</p>
      )}

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
