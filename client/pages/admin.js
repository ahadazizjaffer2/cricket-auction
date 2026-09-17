import { useEffect, useState } from "react";
import { useAuctionState } from "../lib/useAuctionState";
import PlayerBlock from "../components/PlayerBlock";
import TeamsBoard from "../components/TeamsBoard";

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function Admin() {
  const { state, connected, socket } = useAuctionState();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [cfgDraft, setCfgDraft] = useState(null);
  const [teamsDraft, setTeamsDraft] = useState(null);
  const [teamsMsg, setTeamsMsg] = useState("");
  const [saleTeamId, setSaleTeamId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleMsg, setSaleMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (state && !teamsDraft) {
      setTeamsDraft(state.teams.map((t) => ({ id: t.id, name: t.name })));
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  function login(e) {
    e.preventDefault();
    if (!socket) return;
    socket.emit("auth:admin", password, (res) => {
      if (res.ok) setAuthed(true);
      else setAuthError("Wrong password.");
    });
  }

  function call(event, payload) {
    return new Promise((resolve) => socket.emit(event, payload, resolve));
  }

  async function uploadCsv() {
    setUploadMsg("Uploading…");
    const res = await fetch(SERVER_URL + "/players/upload", {
      method: "POST",
      headers: { "Content-Type": "text/csv", "x-admin-password": password },
      body: csvText,
    });
    const data = await res.json();
    setUploadMsg(data.ok ? "Players loaded." : "Error: " + data.error);
  }

  async function saveTeams() {
    setTeamsMsg("Saving…");
    const res = await call("admin:updateTeams", teamsDraft);
    setTeamsMsg(res.ok ? "Saved." : "Error: " + res.error);
  }

  async function submitSale(e) {
    e.preventDefault();
    setSaleMsg("");
    if (!saleTeamId || salePrice === "") {
      setSaleMsg("Pick a team and enter a price.");
      return;
    }
    const res = await call("admin:confirmSale", { teamId: saleTeamId, price: Number(salePrice) });
    if (!res.ok) {
      setSaleMsg(res.error);
    } else {
      setSaleMsg(res.overBudget ? `Sold — note: that team is now ${res.budgetRemaining} pts (over budget).` : "");
      setSaleTeamId("");
      setSalePrice("");
    }
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
        <h1 className="font-display text-4xl mb-6">Admin</h1>
        <form onSubmit={login} className="space-y-3">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-pitch-line bg-pitch-surface px-4 py-3 text-cream"
          />
          {authError && <p className="text-sm text-ball">{authError}</p>}
          <button className="w-full rounded-lg bg-gold px-4 py-3 font-display text-xl text-pitch-bg">
            Enter
          </button>
        </form>
      </div>
    );
  }

  const cfg = cfgDraft || state.cfg;
  const phase = state.auction.phase;
  const currentPlayer = state.players.find((p) => p.id === state.auction.currentPlayerId);
  const currentResolved = currentPlayer && currentPlayer.status !== "active";
  const canDrawNext = phase === "active" && !state.auction.paused && !currentPlayer;
  const canAct = phase === "active" && !state.auction.paused && currentPlayer && !currentResolved;

  async function runAction(event) {
    setActionMsg("");
    const res = await call(event);
    if (!res.ok) setActionMsg(res.error);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin console</h1>
        <span className={"h-2 w-2 rounded-full " + (connected ? "bg-grass" : "bg-ball")} />
      </header>

      {/* Setup */}
      {phase === "setup" && (
        <section className="mb-8 rounded-xl border border-pitch-line bg-pitch-surface p-4 space-y-4">
          <h2 className="font-display text-2xl">Setup</h2>

          <label className="block text-sm max-w-xs">
            <span className="text-cream/50">Budget per team</span>
            <input
              type="number"
              value={cfg.budgetTotal}
              onChange={(e) => setCfgDraft({ ...cfg, budgetTotal: e.target.value })}
              className="mt-1 w-full rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-cream"
            />
          </label>
          <button
            onClick={async () => {
              await call("admin:updateConfig", cfg);
              setCfgDraft(null);
            }}
            className="rounded-lg bg-grass/30 border border-grass px-4 py-2 text-sm"
          >
            Save config
          </button>

          <hr className="border-pitch-line" />

          {/* Team names */}
          <div>
            <h3 className="font-display text-xl mb-1">Teams</h3>
            <p className="text-xs text-cream/40 mb-2">Team names shown to everyone. Editable until the auction starts.</p>
            <div className="space-y-2">
              {teamsDraft &&
                teamsDraft.map((t, idx) => (
                  <input
                    key={t.id}
                    value={t.name}
                    onChange={(e) => {
                      const next = [...teamsDraft];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setTeamsDraft(next);
                    }}
                    placeholder="Team name"
                    className="w-full rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-cream"
                  />
                ))}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <button onClick={saveTeams} className="rounded-lg bg-gold px-4 py-2 text-sm text-pitch-bg">
                Save teams
              </button>
              <span className="text-xs text-cream/40">{teamsMsg}</span>
            </div>
          </div>

          <hr className="border-pitch-line" />

          <div>
            <p className="text-sm text-cream/50 mb-1">
              {state.players.length} players currently loaded. Paste a new CSV to replace them
              (columns: <code>name,category,basePrice</code>).
            </p>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"name,category,basePrice\nVirat,Batsman,2\nBumrah,Bowler,2"}
              className="w-full rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-cream font-mono"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={uploadCsv}
                disabled={!csvText.trim()}
                className="rounded-lg bg-gold px-4 py-2 text-sm text-pitch-bg disabled:opacity-40"
              >
                Upload players
              </button>
              <span className="text-xs text-cream/40">{uploadMsg}</span>
            </div>
          </div>

          <div className="rounded-lg bg-pitch-bg/60 p-3">
            <p className="text-xs text-cream/40 mb-2">
              Squad size auto-splits evenly across teams ({state.players.length} players / {state.teams.length} teams):
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {state.teams.map((t) => (
                <span key={t.id} className="rounded-full border border-pitch-line px-3 py-1">
                  {t.name || "Team"}: <span className="text-gold">{t.targetSlots}</span>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => call("admin:start")}
            className="w-full rounded-lg bg-grass px-4 py-3 font-display text-xl text-pitch-bg"
          >
            Start auction
          </button>
        </section>
      )}

      {/* Active controls */}
      {phase !== "setup" && (
        <>
          <PlayerBlock state={state} />

          {phase === "active" && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runAction("admin:nextPlayer")}
                  disabled={!canDrawNext}
                  className="rounded-lg bg-grass px-4 py-2 font-display text-lg text-pitch-bg disabled:opacity-30"
                >
                  Next player
                </button>
                {!state.auction.paused ? (
                  <button onClick={() => runAction("admin:pause")} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
                    Pause
                  </button>
                ) : (
                  <button onClick={() => runAction("admin:resume")} className="rounded-lg bg-grass/30 border border-grass px-4 py-2 text-sm">
                    Resume
                  </button>
                )}
                {canAct && (
                  <>
                    <button onClick={() => runAction("admin:skipPlayer")} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
                      Skip → back to pool
                    </button>
                    <button onClick={() => runAction("admin:forceUnsoldFinal")} className="rounded-lg border border-ball/60 px-4 py-2 text-sm text-ball">
                      Mark permanently unsold
                    </button>
                  </>
                )}
              </div>
              {actionMsg && <p className="text-sm text-ball">{actionMsg}</p>}

              {canAct && (
                <form onSubmit={submitSale} className="rounded-xl border border-pitch-line bg-pitch-surface p-3 space-y-2">
                  <p className="text-xs text-cream/40">Record the winning bid from the room:</p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={saleTeamId}
                      onChange={(e) => setSaleTeamId(e.target.value)}
                      className="rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-cream"
                    >
                      <option value="">Winning team…</option>
                      {state.teams.map((t) => (
                        <option key={t.id} value={t.id} disabled={t.slotsRemaining <= 0}>
                          {t.name} {t.slotsRemaining <= 0 ? "(full)" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      placeholder="Final price"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="w-32 rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-sm text-cream"
                    />
                    <button className="rounded-lg bg-gold px-4 py-2 text-sm text-pitch-bg">Confirm sale</button>
                  </div>
                  {saleTeamId &&
                    salePrice !== "" &&
                    (() => {
                      const t = state.teams.find((x) => x.id === saleTeamId);
                      const after = t ? t.budgetRemaining - Number(salePrice) : null;
                      return after !== null && after < 0 ? (
                        <p className="text-xs text-ball">
                          Heads up: this leaves {t.name} at {after} pts (over budget). You can still confirm.
                        </p>
                      ) : null;
                    })()}
                  {saleMsg && <p className="text-xs text-cream/60">{saleMsg}</p>}
                </form>
              )}
            </div>
          )}

          <button
            onClick={() => {
              if (confirm("Reset the whole auction? This clears all sales.")) call("admin:reset");
            }}
            className="mt-3 rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/50"
          >
            Reset auction
          </button>
        </>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">Teams</h2>
        <TeamsBoard state={state} />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">Export results</h2>
        <div className="flex gap-3">
          <a href={SERVER_URL + "/export.csv"} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
            Download CSV
          </a>
          <a href={SERVER_URL + "/export.json"} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
            Download JSON
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-cream/80 mb-3">Activity log</h2>
        <ul className="space-y-1 text-sm text-cream/50">
          {state.auction.log.slice(0, 20).map((entry, i) => (
            <li key={entry.ts + "-" + i}>{entry.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
