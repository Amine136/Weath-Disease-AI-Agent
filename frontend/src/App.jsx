import { useEffect, useRef, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import ReportPanel from "./components/ReportPanel";
import { useApi } from "./hooks/useApi";
// To use mock data for testing, swap the import above with:
// import { useMockApi as useApi } from "./hooks/useMockApi";

const DEFAULT_LOCATION = {
  latitude: "36.8065",
  longitude: "10.1815",
};

// Sidebar icon component
function SidebarIcon({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
        active
          ? "border-green-600 bg-green-600 text-white shadow-lg shadow-green-600/20"
          : "border-transparent bg-white/70 text-slate-400 hover:border-emerald-100 hover:bg-white hover:text-slate-600"
      }`}
    >
      {icon}
    </button>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [reportWidth, setReportWidth] = useState(360);
  const reportPanelRef = useRef(null);
  const appRef = useRef(null);
  const dragStateRef = useRef(null);
  const sessionIdRef = useRef("session-" + Date.now().toString(36));

  // Make session ID accessible to the API hook
  if (!window.__sessionId) window.__sessionId = sessionIdRef.current;

  const { sendMessage } = useApi();

  const handleSend = async (text) => {
    if (isLoading) return;

    // Build user message object
    const userMsg = {
      role: "user",
      content: text,
      type: "text",
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : null,
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMsg]);

    const currentImage = imageFile;
    setImageFile(null);
    setIsLoading(true);

    try {
      const response = await sendMessage(text, currentImage, sessionIdRef.current, location);

      if (response.type === "report") {
        // Store report data
        const reportData = {
          summary: response.message,
          diagnosis: response.diagnosis,
          confidence: response.confidence,
          risk: response.risk,
          weather: response.weather,
          treatment: response.treatment,
          prevention: response.prevention,
          fullReport: response.full_report || response.message,
        };
        setReport(reportData);

        // Add agent message with report type
        const agentMsg = {
          role: "agent",
          content: response.message,
          type: "report",
          reportData,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // Direct message
        const agentMsg = {
          role: "agent",
          content: response.message,
          type: "direct",
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch (err) {
      const errorMsg = {
        role: "agent",
        content: "Sorry, something went wrong. Please try again.",
        type: "direct",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (reportData) => {
    if (reportData) {
      setReport(reportData);
    }

    if (reportPanelRef.current) {
      reportPanelRef.current.scrollTop = 0;
      // Brief highlight flash
      reportPanelRef.current.classList.add("ring-2", "ring-green-500/30");
      setTimeout(() => {
        reportPanelRef.current?.classList.remove("ring-2", "ring-green-500/30");
      }, 1200);
    }
  };

  const handleCloseReport = () => {
    setReport(null);
  };

  const handleImageSelect = (file) => {
    setImageFile(file);
  };

  const handleImageRemove = () => {
    setImageFile(null);
  };

  const handleLocationChange = (field, value) => {
    setLocation((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      const appBounds = appRef.current?.getBoundingClientRect();
      if (!dragState || !appBounds) return;

      const minWidth = 300;
      const maxWidth = Math.min(560, appBounds.width - 380);
      const nextWidth = appBounds.right - event.clientX;
      setReportWidth(Math.min(Math.max(nextWidth, minWidth), maxWidth));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      document.body.classList.remove("resize-active");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("resize-active");
    };
  }, []);

  const handleResizeStart = (event) => {
    dragStateRef.current = { startX: event.clientX };
    document.body.classList.add("resize-active");
  };

  return (
    <div
      ref={appRef}
      className="h-screen w-screen flex overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(191,219,143,0.24),_transparent_26%),linear-gradient(180deg,_#f8fbf3_0%,_#f3f8ee_48%,_#eef5e6_100%)] text-slate-800"
    >
      {/* Sidebar */}
      <div className="w-[220px] bg-white/75 backdrop-blur-xl border-r border-emerald-100/80 flex flex-col items-center py-5 gap-3 shrink-0 shadow-[0_10px_40px_rgba(109,140,74,0.08)]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-4 px-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-600 to-lime-500 flex items-center justify-center shadow-lg shadow-green-600/20">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 12a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-11 0a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm11-11a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-11 0a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-semibold text-slate-700">Wheat</p>
            <p className="text-[10px] text-slate-400">Helper</p>
          </div>
        </div>

        <div className="w-full px-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-center">
            <div className="mx-auto mb-2 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Live</p>
          </div>
        </div>

        <div className="h-px w-10 bg-gradient-to-r from-transparent via-emerald-200 to-transparent my-1" />

        <div className="w-full px-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/80 px-3 py-3 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Location
            </p>
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-slate-400">
                  Latitude
                </span>
                <input
                  type="text"
                  value={location.latitude}
                  onChange={(event) => handleLocationChange("latitude", event.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-medium tabular-nums text-slate-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-medium text-slate-400">
                  Longitude
                </span>
                <input
                  type="text"
                  value={location.longitude}
                  onChange={(event) => handleLocationChange("longitude", event.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-medium tabular-nums text-slate-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="w-full px-4">
          <div className="grid grid-cols-1 gap-2">
            {/* Nav icons */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2">
              <SidebarIcon
                label="Chat"
                active={true}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                }
              />
              <span className="text-sm font-medium text-slate-600">Chat</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/55 px-3 py-2">
              <SidebarIcon
                label="History"
                active={false}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
              />
              <span className="text-sm font-medium text-slate-500">History</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/55 px-3 py-2">
              <SidebarIcon
                label="Settings"
                active={false}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                }
              />
              <span className="text-sm font-medium text-slate-500">Settings</span>
            </div>
          </div>
        </div>

        <div className="mt-auto w-full px-4 pb-1">
          <div className="rounded-2xl bg-slate-900 px-3 py-3 text-center text-[10px] leading-relaxed text-slate-200 shadow-lg shadow-slate-900/10">
            Add a leaf photo for faster guidance.
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        imageFile={imageFile}
        onImageSelect={handleImageSelect}
        onImageRemove={handleImageRemove}
        onSend={handleSend}
        onViewReport={handleViewReport}
      />

      {/* Report Panel */}
      {report && (
        <>
          <button
            type="button"
            aria-label="Resize report panel"
            onPointerDown={handleResizeStart}
            className="hidden md:flex w-3 shrink-0 cursor-col-resize items-center justify-center bg-gradient-to-r from-transparent via-gray-200/70 to-transparent transition-colors hover:via-green-300/80"
          >
            <span className="h-14 w-1 rounded-full bg-gray-300" />
          </button>
          <div
            ref={reportPanelRef}
            className="transition-[width] duration-300"
            style={{ width: `${reportWidth}px` }}
          >
            <ReportPanel report={report} onClose={handleCloseReport} />
          </div>
        </>
      )}
    </div>
  );
}
