export default function MessageBubble({ message, onViewReport }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1.5">
        <div className="max-w-[75%] flex flex-col items-end gap-1.5">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Uploaded wheat image"
              className="w-40 h-40 object-cover rounded-xl border border-gray-200"
            />
          )}
          {message.content && (
            <div className="bg-green-700 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Agent message
  return (
    <div className="flex items-start gap-2 px-4 py-1.5">
      {/* Agent avatar */}
      <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>

      <div className="max-w-[75%] flex flex-col gap-1.5">
        <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed">
          {message.content}
        </div>

        {message.type === "report" && onViewReport && (
          <button
            onClick={onViewReport}
            className="self-start flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors pulse-highlight"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
            </svg>
            View full report →
          </button>
        )}
      </div>
    </div>
  );
}
