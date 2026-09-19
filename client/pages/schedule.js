import Image from "next/image";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// PASTE YOUR GOOGLE SHEET PUBLISHED-CSV URL HERE
// Sheet → File → Share → Publish to web → CSV → copy link
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_CSV_URL = process.env.NEXT_PUBLIC_SCHEDULE_SHEET_URL || "";

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser (no dependencies)
// ─────────────────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const [headerLine, ...lines] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
  return lines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-grass/50 bg-grass/10 px-3 py-0.5 text-xs font-display tracking-wide text-grass uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-grass animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-display tracking-wide text-gold uppercase">
        Full Time
      </span>
    );
  }
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
  const {
    match: label,
    team1, team2,
    batting_first,
    score1, score2,
    overs1, overs2,
    winner, motm,
    status,
  } = match;

  const isLive      = status === "live";
  const isCompleted = status === "completed";
  const isUpcoming  = !isLive && !isCompleted;

  // Who batted first?
  const team1BattedFirst = batting_first === team1;
  const battingFirstScore  = team1BattedFirst ? score1  : score2;
  const battingFirstOvers  = team1BattedFirst ? overs1  : overs2;
  const battingFirstName   = team1BattedFirst ? team1   : team2;
  const chasingScore       = team1BattedFirst ? score2  : score1;
  const chasingOvers       = team1BattedFirst ? overs2  : overs1;
  const chasingName        = team1BattedFirst ? team2   : team1;

  // Target = first innings runs + 1
  const firstRuns = parseInt(battingFirstScore) || 0;
  const target    = firstRuns + 1;

  // Determine innings phase (only relevant when live)
  // If chasing team has started scoring or overs, it's 2nd innings
  const inSecondInnings = isLive && (parseInt(chasingOvers) > 0 || parseInt(chasingScore) > 0);

  return (
    <div className={
      "rounded-2xl border overflow-hidden " +
      (isLive ? "border-grass/40" : isCompleted ? "border-gold/30" : "border-pitch-line") +
      " bg-pitch-surface"
    }>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <p className="text-xs text-cream/40 uppercase tracking-wide">{label}</p>
        <StatusBadge status={status} />
      </div>

      {/* Upcoming — simple vs display */}
      {isUpcoming && (
        <div className="px-5 pb-5 flex items-center justify-center gap-4">
          <span className="font-display text-2xl text-cream">{team1}</span>
          <span className="text-cream/30 font-display text-xl">vs</span>
          <span className="font-display text-2xl text-cream">{team2}</span>
        </div>
      )}

      {/* Live / Completed — full scorecard */}
      {!isUpcoming && (
        <div className="px-5 pb-5 space-y-3">
          {/* Innings label */}
          {isLive && (
            <p className="text-xs text-grass/70 uppercase tracking-wide">
              {inSecondInnings ? "2nd Innings" : "1st Innings"}
            </p>
          )}

          {/* Batting first row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-cream">{battingFirstName}</span>
              {isLive && !inSecondInnings && (
                <span className="text-xs text-grass rounded-full border border-grass/40 px-2 py-0.5">batting</span>
              )}
            </div>
            <div className="text-right">
              {battingFirstScore ? (
                <>
                  <span className="font-display text-2xl text-cream tabular">{battingFirstScore}</span>
                  {battingFirstOvers && (
                    <span className="text-xs text-cream/40 ml-1">({battingFirstOvers} ov)</span>
                  )}
                </>
              ) : (
                <span className="text-cream/30 text-sm">yet to bat</span>
              )}
            </div>
          </div>

          {/* Chasing row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-cream">{chasingName}</span>
              {isLive && inSecondInnings && (
                <span className="text-xs text-grass rounded-full border border-grass/40 px-2 py-0.5">batting</span>
              )}
            </div>
            <div className="text-right">
              {chasingScore ? (
                <>
                  <span className="font-display text-2xl text-cream tabular">{chasingScore}</span>
                  {chasingOvers && (
                    <span className="text-xs text-cream/40 ml-1">({chasingOvers} ov)</span>
                  )}
                </>
              ) : (
                <span className="text-cream/30 text-sm">yet to bat</span>
              )}
            </div>
          </div>

          {/* Target line during 2nd innings */}
          {isLive && inSecondInnings && firstRuns > 0 && (
            <p className="text-xs text-gold/70 text-center pt-1">
              {chasingName} need <span className="text-gold font-display text-sm">{target}</span> to win
            </p>
          )}

          {/* Divider + result */}
          {isCompleted && winner && (
            <div className="pt-2 border-t border-pitch-line">
              <p className="text-sm text-gold font-display text-center">
                🏆 {winner} won
              </p>
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
// getStaticProps — fetches sheet CSV, rebuilds every 30 seconds (ISR)
// ─────────────────────────────────────────────────────────────────────────────
export async function getStaticProps() {
  if (!SHEET_CSV_URL) {
    return { props: { matches: [], error: "no_url" }, revalidate: 30 };
  }
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet fetch failed");
    const csv  = await res.text();
    const matches = parseCsv(csv);
    return { props: { matches, error: null }, revalidate: 30 };
  } catch (e) {
    return { props: { matches: [], error: "fetch_failed" }, revalidate: 30 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Schedule({ matches, error }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Image src="/rovers-logo.png" width={60} height={180} alt="Rovers Cricket" />
        </Link>
        <h1 className="font-display text-3xl">Match Schedule</h1>
        <Link
          href="/results"
          className="rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/50 hover:text-cream transition-colors"
        >
          Results
        </Link>
      </header>

      {error === "no_url" && (
        <div className="rounded-xl border border-ball/40 bg-ball/10 p-5 text-center">
          <p className="text-sm text-ball">Schedule sheet not configured yet.</p>
        </div>
      )}

      {error === "fetch_failed" && (
        <div className="rounded-xl border border-ball/40 bg-ball/10 p-5 text-center">
          <p className="text-sm text-ball">Couldn&apos;t load the schedule right now. Try refreshing.</p>
        </div>
      )}

      {!error && matches.length === 0 && (
        <div className="rounded-xl border border-pitch-line bg-pitch-surface p-8 text-center">
          <p className="font-display text-2xl text-cream/60">No matches yet</p>
          <p className="text-sm text-cream/30 mt-1">Check back soon.</p>
        </div>
      )}

      <div className="space-y-4">
        {matches.map((m, i) => (
          <MatchCard key={i} match={m} />
        ))}
      </div>

      {matches.length > 0 && (
        <p className="mt-8 text-center text-xs text-cream/20">
          Updates automatically every 30 seconds.
        </p>
      )}
    </div>
  );
}
