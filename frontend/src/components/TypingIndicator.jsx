export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 1 7.107 9.889l-.001.003A7.5 7.5 0 0 1 12 21a7.5 7.5 0 0 1-7.499-8.108A7.5 7.5 0 0 1 12 3z" />
        </svg>
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
      </div>
    </div>
  );
}
