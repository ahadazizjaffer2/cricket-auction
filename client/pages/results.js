import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";

const CATEGORY_STYLES = {
  Diamond:  { badge: "text-sky-300 border-sky-400/40 bg-sky-400/10",    bar: "bg-sky-400" },
  Platinum: { badge: "text-slate-200 border-slate-300/40 bg-slate-300/10", bar: "bg-slate-300" },
  Gold:     { badge: "text-gold border-gold/40 bg-gold/10",             bar: "bg-gold" },
  Silver:   { badge: "text-zinc-300 border-zinc-300/40 bg-zinc-300/10", bar: "bg-zinc-300" },
  Bronze:   { badge: "text-orange-300 border-orange-400/40 bg-orange-400/10", bar: "bg-orange-400" },
  Unlisted: { badge: "text-cream/50 border-cream/20 bg-cream/5",        bar: "bg-cream/20" },
};

function CategoryBadge({ category }) {
  const styles = CATEGORY_STYLES[category] || CATEGORY_STYLES.Unlisted;
  return (
    <span className={"rounded-full border px-2 py-0.5 text-xs font-display tracking-wide flex-shrink-0 " + styles.badge}>
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

function TeamCard({ team }) {
  const budgetRemaining = team.budgetTotal - team.budgetSpent;
  const isOverBudget = budgetRemaining < 0;
  const spentPct = Math.min(100, Math.round((team.budgetSpent / team.budgetTotal) * 100));

  return (
    <div className="rounded-2xl border border-pitch-line bg-pitch-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-cream leading-none">{team.name}</h2>
          {team.captain && (
            <p className="text-xs text-cream/40 mt-0.5 uppercase tracking-wide">
              Captain · {team.captain}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={"font-display text-2xl tabular " + (isOverBudget ? "text-ball" : "text-gold")}>
            {team.budgetSpent}
            <span className="text-sm text-cream/30 font-body"> / {team.budgetTotal} pts</span>
          </p>
          <p className="text-xs text-cream/30 mt-0.5">{budgetRemaining} pts remaining</p>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mx-5 mb-4 h-1 rounded-full bg-pitch-line overflow-hidden">
        <div
          className={"h-full rounded-full " + (isOverBudget ? "bg-ball" : "bg-grass")}
          style={{ width: spentPct + "%" }}
        />
      </div>

      {/* Players */}
      <ul className="divide-y divide-pitch-line border-t border-pitch-line">
        {(team.players || []).map((p, i) => {
          const barColor = (CATEGORY_STYLES[p.category] || CATEGORY_STYLES.Unlisted).bar;
          return (
            <li key={i} className="flex items-center gap-3 px-5 py-2.5">
              <span className={"w-1 h-6 rounded-full flex-shrink-0 " + barColor} />
              <span className="flex-1 text-sm text-cream/90">{p.name}</span>
              <CategoryBadge category={p.category} />
              <span className="font-display text-lg text-gold tabular w-16 text-right">{p.price} pts</span>
            </li>
          );
        })}
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
        <div className="space-y-4">
          {teams.map((team) => (
            <TeamCard key={team.name} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
