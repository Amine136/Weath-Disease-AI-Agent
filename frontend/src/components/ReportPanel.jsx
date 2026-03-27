import { useMemo, useRef, useState } from "react";
import DiagnosisCard from "./DiagnosisCard";
import WeatherStrip from "./WeatherStrip";
import TreatmentList from "./TreatmentList";

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

export default function ReportPanel({ report, onClose }) {
  if (!report) return null;

  const [actionState, setActionState] = useState({ type: "", message: "" });
  const actionTimerRef = useRef(null);

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
    <div className="w-full shrink-0 border-l border-gray-200 bg-white flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">AI Agronomic Report</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* PDF button */}
          <button
            onClick={handleExportPdf}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Export PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
            </svg>
          </button>
          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Share"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186m0 2.186a2.25 2.25 0 1 0 0 2.186" />
            </svg>
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {actionState.message && (
        <div className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs ${
          actionState.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {actionState.message}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        <DiagnosisCard
          diagnosis={report.diagnosis}
          confidence={report.confidence}
          risk={report.risk}
        />

        <WeatherStrip weather={report.weather} />

        <TreatmentList
          title="Treatment Plan"
          items={report.treatment}
          mode="treatment"
        />

        <TreatmentList
          title="Prevention"
          items={report.prevention}
          mode="prevention"
        />
      </div>
    </div>
  );
}
