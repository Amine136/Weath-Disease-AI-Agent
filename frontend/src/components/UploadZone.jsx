import { useRef, useState } from "react";

export default function UploadZone({ imageFile, onImageSelect, onImageRemove, disabled }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && /\.(jpe?g|png)$/i.test(file.name)) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onImageSelect(file);
    e.target.value = "";
  };

  if (imageFile) {
    return (
      <div className="mx-3 mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
        </svg>
        <span className="text-green-800 truncate flex-1">{imageFile.name}</span>
        <button
          onClick={onImageRemove}
          disabled={disabled}
          className="text-green-600 hover:text-red-500 transition-colors p-0.5 rounded disabled:opacity-40"
          aria-label="Remove image"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        mx-3 mt-2 border-2 border-dashed rounded-lg px-4 py-3 text-center text-sm cursor-pointer
        transition-colors duration-150
        ${isDragOver
          ? "border-green-400 bg-green-50 text-green-700"
          : "border-gray-200 bg-gray-50/50 text-gray-400 hover:border-gray-300 hover:text-gray-500"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <span>Drop an image here or click to upload</span>
      </div>
    </div>
  );
}
