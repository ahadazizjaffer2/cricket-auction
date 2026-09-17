export default function TeamsBoard({ state, highlightTeamId }) {
  const { teams } = state;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {teams.map((t) => (
        <div
          key={t.id}
          className={
            "rounded-xl border p-4 " +
            (t.id === highlightTeamId
              ? "border-gold bg-gold/10"
              : "border-pitch-line bg-pitch-surface")
          }
        >
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-2xl">{t.name}</h3>
            <p className={"font-display text-xl tabular " + (t.budgetRemaining < 0 ? "text-ball" : "text-gold")}>
              {t.budgetRemaining}
              <span className="text-sm text-cream/40"> / {t.budgetTotal} pts</span>
            </p>
          </div>
          <p className="text-xs text-cream/40 mt-0.5">
            {t.squad.length} / {t.targetSlots} bought
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {t.squad.length === 0 && <li className="text-cream/30">No players yet</li>}
            {t.squad.map((s) => (
              <li key={s.playerId} className="flex justify-between text-cream/80">
                <span>{s.name}</span>
                <span className="tabular text-gold/90">{s.price}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
