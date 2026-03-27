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
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active
          ? "bg-green-700 text-white"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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

  const handleViewReport = () => {
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
    <div ref={appRef} className="h-screen w-screen flex overflow-hidden bg-white">
      {/* Sidebar */}
      <div className="w-[52px] bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2 shrink-0">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 12a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-11 0a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm11-11a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-11 0a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z"/>
          </svg>
        </div>

        {/* Nav icons */}
        <SidebarIcon
          label="Chat"
          active={true}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          }
        />
        <SidebarIcon
          label="History"
          active={false}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
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
      </div>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        imageFile={imageFile}
        location={location}
        onImageSelect={handleImageSelect}
        onImageRemove={handleImageRemove}
        onLocationChange={handleLocationChange}
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
