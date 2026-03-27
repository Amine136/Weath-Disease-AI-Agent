const DOT_STYLES = {
  recommended: "bg-green-500",
  warning: "bg-amber-500",
  prevention: "bg-green-500",
};

export default function TreatmentList({ title, items, mode = "treatment" }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">{title}</p>

      <ul className="space-y-2.5">
        {items.map((item, idx) => {
          const label = typeof item === "string" ? item : item.label;
          const type = typeof item === "string" ? "prevention" : item.type;

          return (
            <li key={idx} className="flex items-start gap-2.5">
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DOT_STYLES[type] || DOT_STYLES.recommended}`}
              />
              <span className="text-sm text-gray-700 leading-relaxed">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
