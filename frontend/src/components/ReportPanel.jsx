import { useMemo, useRef, useState } from "react";
import DiagnosisCard from "./DiagnosisCard";
import WeatherStrip from "./WeatherStrip";

function sanitizePdfText(text) {
  return String(text)
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfLine(line, maxChars = 88) {
  if (!line) return [""];

  const words = line.split(/\s+/);
  const wrapped = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) wrapped.push(current);
    current = word;
  }

  if (current) wrapped.push(current);
  return wrapped.length ? wrapped : [line];
}

function buildPdf(reportText) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const lineHeight = 16;
  const fontSize = 11;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  const lines = sanitizePdfText(reportText)
    .split("\n")
    .flatMap((line) => wrapPdfLine(line));

  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  for (const pageLines of pages) {
    const contentStream = [
      "BT",
      `/F1 ${fontSize} Tf`,
      `${margin} ${pageHeight - margin} Td`,
      `${lineHeight} TL`,
    ];

    pageLines.forEach((line, index) => {
      if (index === 0) {
        contentStream.push(`(${line}) Tj`);
      } else {
        contentStream.push("T*");
        contentStream.push(`(${line}) Tj`);
      }
    });
    contentStream.push("ET");

    const stream = contentStream.join("\n");
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  const pagesId = addObject(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
  );

  pageIds.forEach((pageId) => {
    objects[pageId - 1] = objects[pageId - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
  });

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function cleanReportLine(line) {
  return String(line)
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\*\s*/, "")
    .replace(/^[•-]\s*/, "")
    .trim();
}

function extractDiagnosticHighlights(report) {
  const source = report.fullReport || report.summary || "";
  const lines = source
    .split("\n")
    .map(cleanReportLine)
    .filter(Boolean);

  const highlights = [];
  let inDiagnosisBlock = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("treatment plan") ||
      lower.includes("immediate interventions") ||
      lower.includes("prevention") ||
      lower.includes("cultural & long-term management")
    ) {
      break;
    }

    if (
      lower.includes("diagnosis") ||
      lower.includes("risk assessment") ||
      lower.includes("environmental") ||
      lower.includes("field context") ||
      lower.includes("visual indicators") ||
      lower.includes("primary risks")
    ) {
      inDiagnosisBlock = true;
      continue;
    }

    if (!inDiagnosisBlock) {
      continue;
    }

    if (line.length > 6) {
      highlights.push(line);
    }

    if (highlights.length >= 5) {
      break;
    }
  }

  return highlights;
}

function normalizeReportText(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*---+\s*$/gm, "")
    .trim();
}

function extractSectionText(source, sectionName, stopNames = []) {
  const text = normalizeReportText(source);
  if (!text) return "";

  const lines = text.split("\n");
  const target = sectionName.toLowerCase();
  const stops = stopNames.map((item) => item.toLowerCase());

  let collecting = false;
  const collected = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (!collecting) {
      if (lower === target || lower.includes(target)) {
        collecting = true;
      }
      continue;
    }

    if (
      stops.some((stop) => lower === stop || lower.includes(stop)) ||
      lower.startsWith("ai agronomic report") ||
      lower.startsWith("date:")
    ) {
      break;
    }

    collected.push(rawLine);
  }

  return collected.join("\n").trim();
}

function splitParagraphs(text) {
  return normalizeReportText(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function RichReportSection({ title, text, fallbackItems = [] }) {
  const paragraphs = splitParagraphs(text);

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

      {paragraphs.length > 0 ? (
        <div className="space-y-3">
          {paragraphs.map((paragraph, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl bg-emerald-50/50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {paragraph}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {fallbackItems.map((item, index) => {
            const label = typeof item === "string" ? item : item.label;
            return (
              <li key={`${title}-fallback-${index}`} className="flex items-start gap-3 rounded-2xl bg-emerald-50/50 px-3 py-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-sm leading-relaxed text-slate-700">{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ReportPanel({ report, onClose }) {
  if (!report) return null;

  const [actionState, setActionState] = useState({ type: "", message: "" });
  const actionTimerRef = useRef(null);
  const diagnosticHighlights = useMemo(
    () => extractDiagnosticHighlights(report),
    [report],
  );
  const fullReportText = report.fullReport || report.summary || "";
  const treatmentSection = useMemo(
    () =>
      extractSectionText(fullReportText, "Treatment Plan", [
        "Prevention",
      ]) ||
      extractSectionText(fullReportText, "Immediate Interventions", [
        "Cultural & Long-Term Management",
        "Prevention",
      ]),
    [fullReportText],
  );
  const preventionSection = useMemo(
    () =>
      extractSectionText(fullReportText, "Prevention", []) ||
      extractSectionText(fullReportText, "Cultural & Long-Term Management", [
        "Operational Safety",
      ]),
    [fullReportText],
  );

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shareText = useMemo(() => {
    const treatmentLines = (report.treatment || [])
      .map((item) => `- ${typeof item === "string" ? item : item.label}`)
      .join("\n");
    const preventionLines = (report.prevention || [])
      .map((item) => `- ${item}`)
      .join("\n");

    return [
      "AI Agronomic Report",
      today,
      "",
      `Diagnosis: ${report.diagnosis}`,
      `Confidence: ${report.confidence.toFixed(1)}%`,
      `Risk: ${report.risk}`,
      "",
      `Temperature: ${report.weather.temp_c}°C`,
      `Wind: ${report.weather.wind_kmh} km/h`,
      `Rain: ${report.weather.rain_mm} mm`,
      `Spray status: ${report.weather.spray_safe ? "Safe to spray" : "Do not spray"}`,
      "",
      "Treatment Plan",
      treatmentLines,
      "",
      "Prevention",
      preventionLines,
      "",
      report.fullReport || report.summary || "",
    ].join("\n");
  }, [report, today]);

  const showActionState = (type, message) => {
    setActionState({ type, message });
    window.clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(() => {
      setActionState({ type: "", message: "" });
    }, 2600);
  };

  const handleExportPdf = () => {
    try {
      const pdfText = [
        "AI Agronomic Report",
        today,
        "",
        `Diagnosis: ${report.diagnosis}`,
        `Confidence: ${report.confidence.toFixed(1)}%`,
        `Risk: ${report.risk}`,
        "",
        `Temperature: ${report.weather.temp_c} C`,
        `Wind: ${report.weather.wind_kmh} km/h`,
        `Rain: ${report.weather.rain_mm} mm`,
        `Spray status: ${report.weather.spray_safe ? "Safe to spray" : "Do not spray"}`,
        "",
        "Treatment Plan",
        ...(report.treatment || []).map((item) => `- ${typeof item === "string" ? item : item.label}`),
        "",
        "Prevention",
        ...(report.prevention || []).map((item) => `- ${item}`),
        "",
        report.fullReport || report.summary || "",
      ].join("\n");

      const blob = buildPdf(pdfText);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agronomic-report-${today.toLowerCase().replaceAll(/[,\s]+/g, "-")}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showActionState("success", "PDF downloaded.");
    } catch (error) {
      showActionState("error", "PDF export failed. Try again.");
    }
  };

  const handleShare = async () => {
    const sharePayload = {
      title: "AI Agronomic Report",
      text: shareText,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        showActionState("success", "Report shared.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      showActionState("success", "Report copied to clipboard.");
    } catch (error) {
      showActionState("error", "Share failed. Try again.");
    }
  };

  return (
    <div className="animate-slide-in flex h-full w-full shrink-0 flex-col border-l border-emerald-100 bg-[#f7fbf3]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-emerald-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI Agronomic Report</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">{today}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* PDF button */}
          <button
            onClick={handleExportPdf}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            title="Export PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
            </svg>
          </button>
          {/* Share button */}
          <button
            onClick={handleShare}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            title="Share"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186m0 2.186a2.25 2.25 0 1 0 0 2.186" />
            </svg>
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            title="Close panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {actionState.message && (
        <div className={`mx-5 mt-4 rounded-2xl border px-3 py-2 text-xs ${
          actionState.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {actionState.message}
        </div>
      )}

      {/* Content */}
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
        <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Diagnostic Conclusion
          </p>
          <p className="text-sm leading-7 text-slate-700">
            {report.summary}
          </p>
          {diagnosticHighlights.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {diagnosticHighlights.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-2xl bg-emerald-50/50 px-3 py-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-sm leading-relaxed text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DiagnosisCard
          diagnosis={report.diagnosis}
          confidence={report.confidence}
          risk={report.risk}
        />

        <WeatherStrip weather={report.weather} />

        <RichReportSection
          title="Treatment Plan"
          text={treatmentSection}
          fallbackItems={report.treatment || []}
        />

        <RichReportSection
          title="Prevention"
          text={preventionSection}
          fallbackItems={report.prevention || []}
        />
      </div>
    </div>
  );
}
