const RISK_STYLES = {
  low:    "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high:   "bg-red-100 text-red-800",
};

const RISK_BAR_COLOR = {
  low:    "bg-green-500",
  medium: "bg-amber-500",
  high:   "bg-red-500",
};

export default function DiagnosisCard({ diagnosis, confidence, risk }) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Diagnosis</p>
          <p className="text-base font-semibold text-slate-900">{diagnosis}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${RISK_STYLES[risk] || RISK_STYLES.medium}`}>
          {risk} risk
        </span>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Confidence</span>
          <span className="text-xs font-semibold text-slate-700">{confidence.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full animate-fill ${RISK_BAR_COLOR[risk] || "bg-gray-400"}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
