import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";

const matchSections = [
  {
    number: "1",
    title: "Tournament Format",
    items: [
      "Played in a Round-Robin League Format.",
      "Each team plays one match against every other team.",
      "With 5 teams, each team plays a total of 4 league matches.",
    ],
    sub: [
      { label: "Win", value: "2 pts" },
      { label: "Tie", value: "1 pt each" },
      { label: "Loss", value: "0 pts" },
    ],
    after: [
      "Teams are ranked by total points after all league matches.",
      "The 1st and 2nd ranked teams qualify for the Final.",
      "In case of equal points, ranking is decided by Net Run Rate (NRR).",
    ],
  },
  {
    number: "2",
    title: "Match Format",
    items: [
      "Each match consists of 4 overs per team.",
      "Each team consists of 7 players.",
      "All players must follow the tournament rules.",
    ],
  },
  {
    number: "3",
    title: "Power Play — 1st Over",
    items: [
      "The first over is the Bowling Power Play.",
      "Only 1 fielder is allowed on the boundary during the first over.",
      "All other fielding restrictions will be managed by match officials.",
    ],
  },
  {
    number: "4",
    title: "Bronze Category Over",
    items: [
      "An over must be bowled by a player from the Bronze Category.",
      "One batsman in the top 3 must also be a player from the Bronze Category.",
    ],
  },
  {
    number: "5",
    title: "Challenge Over",
    items: [
      "The batsman must first call for the Challenge Over before it begins.",
      "The batsman announces the number of runs they believe they can score that over.",
      "After the call, the bowler will be selected.",
      "If the batsman scores the announced runs or more → that over's runs are doubled (2×).",
      "If the batsman fails to reach the target → no runs are awarded for that over.",
      "The decision is based on the official score.",
    ],
  },
  {
    number: "6",
    title: "Boundary Rules",
    items: [
      "Ball touches the ground before the boundary → 4 runs.",
      "Ball reaches the boundary without touching the ground → 6 runs.",
      "Ball goes directly to the boundary after touching the net → 6 runs.",
    ],
  },
  {
    number: "7",
    title: "General Regulations",
    items: [
      "The umpire's decision is final and binding.",
      "Any dispute or misconduct may result in disciplinary action or disqualification.",
      "Teams must report to the ground on time.",
    ],
  },
];


function Section({ sec }) {
  return (
    <section className="rounded-xl border border-pitch-line bg-pitch-surface p-5">
      <h2 className="font-display text-2xl text-gold mb-3">
        {sec.number}. {sec.title}
      </h2>

      <ul className="space-y-2">
        {sec.items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-cream/80">
            <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-grass mt-[6px]" />
            {item}
          </li>
        ))}
      </ul>

      {sec.sub && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {sec.sub.map((s) => (
            <div key={s.label} className="rounded-lg border border-pitch-line bg-pitch-bg px-3 py-2 text-center">
              <p className="font-display text-lg text-gold">{s.value}</p>
              <p className="text-xs text-cream/40">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {sec.after && (
        <ul className="mt-3 space-y-2">
          {sec.after.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-cream/80">
              <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-grass mt-[6px]" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {sec.formula && (
        <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-center">
          <p className="font-mono text-sm text-gold">{sec.formula}</p>
        </div>
      )}

      {sec.reserveTable && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {sec.reserveTable.map((r) => (
            <div key={r.players} className="rounded-lg border border-pitch-line bg-pitch-bg px-2 py-2 text-center">
              <p className="font-display text-lg text-gold">{r.reserve}</p>
              <p className="text-xs text-cream/40">{r.players} player{r.players !== 1 ? "s" : ""} left</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Rules() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Image src="/rovers-logo.png" width={60} height={180} alt="Rovers Cricket" />
        </Link>
        <h1 className="font-display text-3xl">Rules &amp; Regulations</h1>
        <a
          href="/Rover InterPatrol Cricket Rules.pdf"
          download="Rover InterPatrol Cricket Rules.pdf"
          className="flex items-center gap-1.5 rounded-lg border border-pitch-line px-4 py-2 text-sm text-cream/60 hover:text-cream hover:border-grass transition-colors"
        >
          <Download size={14} />
          Rules PDF
        </a>
      </header>

      <div className="space-y-4">
        {matchSections.map((sec) => (
          <Section key={sec.number + sec.title} sec={sec} />
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-cream/30">
        Umpire&apos;s decision is final. Good luck and play fair!
      </p>
    </div>
  );
}
