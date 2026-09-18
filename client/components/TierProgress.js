export default function TierProgress({ state }) {
  const { tiers, auction } = state;
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((t) => {
        const isCurrent = t.tier === auction.currentTier;
        const done = t.remaining === 0;
        return (
          <span
            key={t.tier}
            className={
              "rounded-full border px-3 py-1 text-xs font-display tracking-wide " +
              (isCurrent
                ? "border-gold bg-gold/15 text-gold"
                : done
                ? "border-pitch-line text-cream/30 line-through"
                : "border-pitch-line text-cream/50")
            }
          >
            {t.tier} {done ? "✓" : `(${t.remaining}/${t.total})`}
          </span>
        );
      })}
    </div>
  );
}
