const DOT_STYLES = {
  recommended: "bg-green-500",
  warning: "bg-amber-500",
  prevention: "bg-green-500",
};

export default function TreatmentList({ title, items, mode = "treatment" }) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>

      <ul className="space-y-2.5">
        {items.map((item, idx) => {
          const label = typeof item === "string" ? item : item.label;
          const type = typeof item === "string" ? "prevention" : item.type;

          return (
            <li key={idx} className="flex items-start gap-3 rounded-2xl bg-emerald-50/50 px-3 py-2.5">
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DOT_STYLES[type] || DOT_STYLES.recommended}`}
              />
              <span className="text-sm leading-relaxed text-slate-700">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
