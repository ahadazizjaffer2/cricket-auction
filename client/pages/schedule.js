import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser — trims every value to avoid whitespace mismatches
// ─────────────────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const [headerLine, ...lines] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!headerLine) return [];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
  return lines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

async function fetchMatches(url) {
  const res = await fetch(url + "&t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("fetch failed");
  return parseCsv(await res.text());
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === "live") return (
    <span className="flex items-center gap-1.5 rounded-full border border-grass/50 bg-grass/10 px-3 py-0.5 text-xs font-display tracking-wide text-grass uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-grass animate-pulse" />
      Live
    </span>
  );
  if (status === "completed") return (
    <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-display tracking-wide text-gold uppercase">
      Full Time
    </span>
  );
  return (
    <span className="rounded-full border border-pitch-line px-3 py-0.5 text-xs font-display tracking-wide text-cream/40 uppercase">
      Upcoming
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single match card
// ─────────────────────────────────────────────────────────────────────────────
function MatchCard({ match }) {
  const { match: label, team1, team2, batting_first, score1, score2, overs1, overs2, winner, motm, status } = match;

  const isLive      = status === "live";
  const isCompleted = status === "completed";
  const isUpcoming  = !isLive && !isCompleted;

  // Batting first defaults to team1 if not specified
  const bfName = (batting_first && batting_first.trim()) ? batting_first.trim() : team1;
  const chName  = bfName === team1 ? team2 : team1;

  const bfScore  = bfName === team1 ? score1 : score2;
  const bfOvers  = bfName === team1 ? overs1 : overs2;
  const chScore  = bfName === team1 ? score2 : score1;
  const chOvers  = bfName === team1 ? overs2 : overs1;

  // 2nd innings only when chasing team's overs > 0
  const inSecondInnings = isLive && parseInt(chOvers || "0") > 0;

  const firstRuns = parseInt(bfScore) || 0;
  const target    = firstRuns + 1;

  return (
    <div className={"rounded-2xl border overflow-hidden bg-pitch-surface " + (isLive ? "border-grass/40" : isCompleted ? "border-gold/30" : "border-pitch-line")}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <p className="text-xs text-cream/40 uppercase tracking-wide">{label}</p>
        <StatusBadge status={status} />
      </div>

      {/* Upcoming */}
      {isUpcoming && (
        <div className="px-5 pb-5 flex items-center justify-center gap-4">
          <span className="font-display text-2xl text-cream">{team1}</span>
          <span className="text-cream/30 font-display text-xl">vs</span>
          <span className="font-display text-2xl text-cream">{team2}</span>
        </div>
      )}

      {/* Live / Completed */}
      {!isUpcoming && (
        <div className="px-5 pb-5 space-y-3">

          {isLive && batting_first && (
            <p className="text-xs text-grass/70 uppercase tracking-wide">
              {inSecondInnings ? "2nd Innings" : "1st Innings"}
            </p>
          )}

          {/* Batting first */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-cream">{bfName}</span>
              {isLive && !inSecondInnings && (
                <span className="text-xs text-grass rounded-full border border-grass/40 px-2 py-0.5">batting</span>
              )}
            </div>
            <div className="text-right">
              {bfScore ? (
                <>
                  <span className="font-display text-2xl text-cream tabular">{bfScore}</span>
                  {bfOvers && <span className="text-xs text-cream/40 ml-1">({bfOvers} ov)</span>}
                </>
              ) : <span className="text-cream/30 text-sm">yet to bat</span>}
            </div>
          </div>

          {/* Chasing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-cream">{chName}</span>
              {isLive && inSecondInnings && (
                <span className="text-xs text-grass rounded-full border border-grass/40 px-2 py-0.5">batting</span>
              )}
            </div>
            <div className="text-right">
              {chScore ? (
                <>
                  <span className="font-display text-2xl text-cream tabular">{chScore}</span>
                  {chOvers && <span className="text-xs text-cream/40 ml-1">({chOvers} ov)</span>}
                </>
              ) : <span className="text-cream/30 text-sm">yet to bat</span>}
            </div>
          </div>

          {/* Target */}
          {isLive && inSecondInnings && firstRuns > 0 && (() => {
            const chRuns = parseInt(chScore) || 0;
            const needed = target - chRuns;
            if (needed <= 0) {
              return (
                <p className="text-xs text-grass text-center pt-1 font-display">
                  {chName} have won! 🎉
                </p>
              );
            }
            return (
              <p className="text-xs text-gold/70 text-center pt-1">
                {chName} need <span className="text-gold font-display text-sm">{needed}</span> more run{needed !== 1 ? "s" : ""} to win
              </p>
            );
          })()}

          {/* Result */}
          {isCompleted && (
            <div className="pt-2 border-t border-pitch-line">
              {winner && <p className="text-sm text-gold font-display text-center">🏆 {winner} won</p>}
              {motm && (
                <p className="text-xs text-cream/40 text-center mt-0.5">
                  🏅 Man of the Match · <span className="text-cream/70">{motm}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// getStaticProps — minimal, just signals the page exists
// ─────────────────────────────────────────────────────────────────────────────
export async function getStaticProps() {
  return { props: {}, revalidate: 30 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — client-side polling every 30s for live updates without refresh
// ─────────────────────────────────────────────────────────────────────────────
const POLL_MS = 45_000;
const SHEET_URL = process.env.NEXT_PUBLIC_SCHEDULE_SHEET_URL || "";

export default function Schedule() {
  const [matches, setMatches]         = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!SHEET_URL) { setLoading(false); return; }

    async function poll() {
      try {
        const fresh = await fetchMatches(SHEET_URL);
        setMatches(fresh);
        setLastUpdated(new Date());
      } catch { /* keep showing last known data */ }
      finally { setLoading(false); }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const hasMatches = matches && matches.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Image src="/rovers-logo.png" width={60} height={180} alt="Rovers Cricket" />
        </Link>
        <h1 className="font-display text-3xl">Schedule</h1>
        <Link href="/results" className="rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/50 hover:text-cream transition-colors">
          Squads
        </Link>
      </header>

      <p className="text-xs text-cream/30 text-center mb-6">
        Live scores will be updated here as matches are played.
      </p>

      {!SHEET_URL && (
        <div className="rounded-xl border border-ball/40 bg-ball/10 p-5 text-center">
          <p className="text-sm text-ball">Schedule sheet not configured yet.</p>
        </div>
      )}

      {SHEET_URL && loading && (
        <div className="rounded-xl border border-pitch-line bg-pitch-surface p-8 text-center">
          <p className="text-sm text-cream/40">Loading schedule…</p>
        </div>
      )}

      {SHEET_URL && !loading && !hasMatches && (
        <div className="rounded-xl border border-pitch-line bg-pitch-surface p-8 text-center">
          <p className="font-display text-2xl text-cream/60">No matches yet</p>
          <p className="text-sm text-cream/30 mt-1">Check back soon.</p>
        </div>
      )}

      <div className="space-y-4">
        {matches.map((m, i) => <MatchCard key={i} match={m} />)}
      </div>

      {hasMatches && (
        <p className="mt-8 text-center text-xs text-cream/20">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s` : "Auto-refreshes every 30s"}
        </p>
      )}
    </div>
  );
}
