import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import UploadZone from "./UploadZone";

export default function ChatPanel({
  messages,
  isLoading,
  imageFile,
  location,
  onImageSelect,
  onImageRemove,
  onLocationChange,
  onSend,
  onViewReport,
}) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text && !imageFile) return;
    if (isLoading) return;

    onSend(text);
    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Wheat Crop Assistant</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Upload a photo of your wheat leaves or ask any question about wheat crop health.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onViewReport={msg.type === "report" ? onViewReport : null}
          />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white shrink-0">
        <div className="grid grid-cols-2 gap-2 px-3 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Latitude</span>
            <input
              type="text"
              value={location?.latitude ?? ""}
              onChange={(e) => onLocationChange("latitude", e.target.value)}
              disabled={isLoading}
              placeholder="36.8065"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Longitude</span>
            <input
              type="text"
              value={location?.longitude ?? ""}
              onChange={(e) => onLocationChange("longitude", e.target.value)}
              disabled={isLoading}
              placeholder="10.1815"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 disabled:opacity-50"
            />
          </label>
        </div>

        <UploadZone
          imageFile={imageFile}
          onImageSelect={onImageSelect}
          onImageRemove={onImageRemove}
          disabled={isLoading}
        />

        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your wheat issue or ask a question..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !imageFile)}
            className="shrink-0 w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-600/30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
