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
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Diagnosis</p>
          <p className="text-sm font-semibold text-gray-900">{diagnosis}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${RISK_STYLES[risk] || RISK_STYLES.medium}`}>
          {risk} risk
        </span>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Confidence</span>
          <span className="text-xs font-semibold text-gray-700">{confidence.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full animate-fill ${RISK_BAR_COLOR[risk] || "bg-gray-400"}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
