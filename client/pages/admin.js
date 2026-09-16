import { useState } from "react";
import { useAuctionState } from "../lib/useAuctionState";
import PlayerBlock from "../components/PlayerBlock";
import TeamsBoard from "../components/TeamsBoard";

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function Admin() {
  const { state, connected, clockOffset, socket } = useAuctionState();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [csvText, setCsvText] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [cfgDraft, setCfgDraft] = useState(null);

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

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["budgetTotal", "Budget per team"],
              ["squadSize", "Squad size (incl. captain)"],
              ["timerSeconds", "Timer (seconds)"],
              ["minIncrement", "Min increment"],
              ["basePriceDefault", "Base price (reserve calc)"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-cream/50">{label}</span>
                <input
                  type="number"
                  value={cfg[key]}
                  onChange={(e) => setCfgDraft({ ...cfg, [key]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-cream"
                />
              </label>
            ))}
          </div>
          <button
            onClick={async () => {
              await call("admin:updateConfig", cfg);
              setCfgDraft(null);
            }}
            className="rounded-lg bg-grass/30 border border-grass px-4 py-2 text-sm"
          >
            Save config
          </button>

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

          <button
            onClick={() => call("admin:start")}
            className="w-full rounded-lg bg-grass px-4 py-3 font-display text-xl text-pitch-bg"
          >
            Start auction
          </button>
        </section>
      )}

      {/* Live controls */}
      {phase !== "setup" && (
        <>
          <PlayerBlock state={state} clockOffset={clockOffset} />

          <div className="mt-4 flex flex-wrap gap-2">
            {phase === "live" && (
              <button onClick={() => call("admin:pause")} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
                Pause
              </button>
            )}
            {phase === "paused" && (
              <button onClick={() => call("admin:resume")} className="rounded-lg bg-grass/30 border border-grass px-4 py-2 text-sm">
                Resume
              </button>
            )}
            {phase === "live" && (
              <>
                <button onClick={() => call("admin:skipToPool")} className="rounded-lg border border-pitch-line px-4 py-2 text-sm">
                  Skip → unsold pool
                </button>
                <button onClick={() => call("admin:forceUnsoldFinal")} className="rounded-lg border border-ball/60 px-4 py-2 text-sm text-ball">
                  Mark permanently unsold
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (confirm("Reset the whole auction? This clears all sales.")) call("admin:reset");
              }}
              className="rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/50"
            >
              Reset auction
            </button>
          </div>

          {phase === "live" && (
            <div className="mt-3 rounded-xl border border-pitch-line bg-pitch-surface p-3">
              <p className="text-xs text-cream/40 mb-2">Force-sell current player to:</p>
              <div className="flex flex-wrap gap-2">
                {state.teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => call("admin:forceSell", { teamId: t.id })}
                    className="rounded-lg bg-gold/20 border border-gold/50 px-3 py-1.5 text-sm"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
