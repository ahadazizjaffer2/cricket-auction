import { useEffect, useState } from "react";
import { useAuctionState } from "../lib/useAuctionState";
import PlayerBlock from "../components/PlayerBlock";
import TeamsBoard from "../components/TeamsBoard";

const SESSION_KEY = "auction_captain_session";

export default function Captain() {
  const { state, connected, clockOffset, socket } = useAuctionState();
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(null); // null | {teamId, teamName}
  const [authError, setAuthError] = useState("");
  const [bidError, setBidError] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  // try to restore a session on load / reconnect
  useEffect(() => {
    if (!socket || !connected) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && !authed) {
      const { teamId: tId, pin: p } = JSON.parse(saved);
      socket.emit("auth:captain", { teamId: tId, pin: p }, (res) => {
        if (res.ok) setAuthed({ teamId: res.teamId, teamName: res.teamName });
      });
    }
  }, [socket, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitLogin(e) {
    e.preventDefault();
    setAuthError("");
    if (!socket) return;
    socket.emit("auth:captain", { teamId, pin }, (res) => {
      if (res.ok) {
        setAuthed({ teamId: res.teamId, teamName: res.teamName });
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ teamId, pin }));
      } else {
        setAuthError(res.error || "Could not sign in.");
      }
    });
  }

  function placeBid(amount) {
    setBidError("");
    if (!socket) return;
    socket.emit("bid:place", { amount }, (res) => {
      if (!res.ok) setBidError(res.error || "Bid failed.");
    });
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-cream/50">{connected ? "Loading…" : "Connecting…"}</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="font-display text-4xl mb-1">Captain sign-in</h1>
        <p className="text-sm text-cream/50 mb-6">Pick your team and enter your PIN.</p>
        <form onSubmit={submitLogin} className="space-y-3">
          <select
            required
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-lg border border-pitch-line bg-pitch-surface px-4 py-3 text-cream"
          >
            <option value="">Choose your team…</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            required
            inputMode="numeric"
            placeholder="4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-lg border border-pitch-line bg-pitch-surface px-4 py-3 text-cream tracking-widest"
          />
          {authError && <p className="text-sm text-ball">{authError}</p>}
          <button className="w-full rounded-lg bg-gold px-4 py-3 font-display text-xl text-pitch-bg">
            Enter
          </button>
        </form>
      </div>
    );
  }

  const myTeam = state.teams.find((t) => t.id === authed.teamId);
  const isMyTurn = state.auction.phase === "live";
  const currentBid = state.auction.currentBid;
  const minNext = currentBid + (state.cfg.minIncrement || 1);
  const squadFull = myTeam && myTeam.slotsRemaining <= 0;
  const iAmTopBidder = state.auction.currentBidTeamId === authed.teamId;

  const quickAmounts = [minNext, currentBid + 2, currentBid + 5].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cream/40">Captain</p>
          <h1 className="font-display text-3xl">{authed.teamName}</h1>
        </div>
        <span className={"h-2 w-2 rounded-full " + (connected ? "bg-grass" : "bg-ball")} />
      </header>

      <PlayerBlock state={state} clockOffset={clockOffset} />

      <div className="mt-4 rounded-xl border border-pitch-line bg-pitch-surface p-4">
        <div className="flex justify-between text-sm text-cream/60">
          <span>Your budget</span>
          <span className="tabular">
            {myTeam.budgetRemaining} / {myTeam.budgetTotal} pts
          </span>
        </div>
        <div className="flex justify-between text-sm text-cream/60 mt-1">
          <span>Squad slots left</span>
          <span className="tabular">{myTeam.slotsRemaining}</span>
        </div>
      </div>

      {isMyTurn && !squadFull && !iAmTopBidder && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => placeBid(amt)}
                className="rounded-lg bg-grass/20 border border-grass px-3 py-3 font-display text-xl text-cream hover:bg-grass/30"
              >
                {amt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customAmount) placeBid(Number(customAmount));
              setCustomAmount("");
            }}
            className="flex gap-2"
          >
            <input
              type="number"
              min={minNext}
              placeholder={`Custom (min ${minNext})`}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-cream"
            />
            <button className="rounded-lg bg-gold px-4 py-2 font-display text-lg text-pitch-bg">
              Bid
            </button>
          </form>
        </div>
      )}

      {iAmTopBidder && isMyTurn && (
        <p className="mt-4 text-center text-sm text-gold">You&apos;re the top bidder.</p>
      )}
      {squadFull && <p className="mt-4 text-center text-sm text-cream/40">Your squad is full.</p>}
      {bidError && <p className="mt-2 text-center text-sm text-ball">{bidError}</p>}

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">All teams</h2>
        <TeamsBoard state={state} highlightTeamId={authed.teamId} />
      </section>
    </div>
  );
}
