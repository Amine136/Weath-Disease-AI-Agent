import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import UploadZone from "./UploadZone";

const SUGGESTIONS = [
  "Check if this leaf looks healthy",
  "What should I do if I see rust?",
  "Is today's weather safe for treatment?",
];

export default function ChatPanel({
  messages,
  isLoading,
  imageFile,
  onImageSelect,
  onImageRemove,
  onSend,
  onViewReport,
}) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="max-w-md rounded-[28px] border border-emerald-100 bg-white/80 px-7 py-8 shadow-[0_18px_60px_rgba(125,152,83,0.12)] backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-lime-400 shadow-lg shadow-green-500/20">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-800">Wheat Crop Assistant</h3>
              <p className="mx-auto max-w-xs text-sm leading-6 text-slate-500">
                Upload a leaf photo or ask a simple question. I’ll help you understand crop health, weather pressure, and next steps.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInputText(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onViewReport={
              msg.type === "report" ? () => onViewReport?.(msg.reportData) : null
            }
          />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-emerald-100 bg-white/80 backdrop-blur-xl">
        <UploadZone
          imageFile={imageFile}
          onImageSelect={onImageSelect}
          onImageRemove={onImageRemove}
          disabled={isLoading}
        />

        <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you see in the field or ask for help..."
            rows={1}
            disabled={isLoading}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !imageFile)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-lime-500 text-white shadow-lg shadow-green-600/20 transition-all hover:from-green-700 hover:to-lime-600 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-600/30"
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
