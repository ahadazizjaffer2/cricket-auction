import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";

const CATEGORY_STYLES = {
  Diamond: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  Platinum: "text-slate-200 border-slate-300/40 bg-slate-300/10",
  Gold: "text-gold border-gold/40 bg-gold/10",
  Silver: "text-zinc-200 border-zinc-300/40 bg-zinc-300/10",
  Bronze: "text-orange-300 border-orange-400/40 bg-orange-400/10",
};

function CategoryBadge({ category }) {
  const cls = CATEGORY_STYLES[category] || "text-cream/60 border-cream/30 bg-cream/5";
  return (
    <span className={"rounded-full border px-2 py-0.5 text-xs font-display tracking-wide " + cls}>
      {category}
    </span>
  );
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-2xl border border-pitch-line bg-pitch-surface px-10 py-12">
        <p className="font-display text-5xl text-gold mb-3">🏏</p>
        <h2 className="font-display text-4xl text-cream mb-2">Results Coming Soon</h2>
        <p className="text-sm text-cream/50 max-w-xs">
          The auction results will be published here shortly. Check back in a bit!
        </p>
      </div>
    </div>
  );
}

function TeamCard({ team, rank }) {
  const budgetRemaining = team.budgetTotal - team.budgetSpent;
  const isOverBudget = budgetRemaining < 0;

  return (
    <div className="rounded-xl border border-pitch-line bg-pitch-surface p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {rank <= 2 && (
            <span className="font-display text-2xl">{rank === 1 ? "🥇" : "🥈"}</span>
          )}
          <h2 className="font-display text-2xl text-cream">{team.name}</h2>
        </div>
        <div className="text-right">
          <p className={"font-display text-xl tabular " + (isOverBudget ? "text-ball" : "text-gold")}>
            {team.budgetSpent} <span className="text-sm text-cream/40">/ {team.budgetTotal} pts spent</span>
          </p>
        </div>
      </div>

      {team.captain && (
        <p className="text-xs text-cream/40 mb-3">Captain: {team.captain}</p>
      )}

      <ul className="mt-3 space-y-2">
        {(team.players || []).map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-cream/80 truncate">{p.name}</span>
              <CategoryBadge category={p.category} />
            </div>
            <span className="font-display text-lg text-gold tabular flex-shrink-0">{p.price} pts</span>
          </li>
        ))}
        {(!team.players || team.players.length === 0) && (
          <li className="text-sm text-cream/30">No players recorded.</li>
        )}
      </ul>
    </div>
  );
}

export async function getStaticProps() {
  try {
    const filePath = path.join(process.cwd(), "public", "results.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return { props: { teams: data.teams || null } };
  } catch {
    return { props: { teams: null } };
  }
}

export default function Results({ teams }) {
  const hasResults = teams && teams.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Image src="/rovers-logo.png" width={60} height={180} alt="Rovers Cricket" />
        </Link>
        <h1 className="font-display text-3xl">Auction Results</h1>
        <Link
          href="/rules"
          className="rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/50 hover:text-cream transition-colors"
        >
          Rules
        </Link>
      </header>

      {!hasResults ? (
        <ComingSoon />
      ) : (
        <div className="space-y-5">
          {teams.map((team, i) => (
            <TeamCard key={team.name} team={team} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
