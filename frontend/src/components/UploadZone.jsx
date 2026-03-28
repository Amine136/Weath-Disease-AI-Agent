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
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 px-4 py-3 text-sm shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Image ready</p>
          <span className="mt-1 block truncate text-emerald-900">{imageFile.name}</span>
        </div>
        <button
          onClick={onImageRemove}
          disabled={disabled}
          className="rounded-xl p-1 text-green-600 transition-colors hover:bg-white hover:text-red-500 disabled:opacity-40"
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
        mx-4 mt-3 rounded-2xl border-2 border-dashed px-4 py-4 text-center text-sm cursor-pointer
        transition-all duration-150
        ${isDragOver
          ? "border-green-400 bg-green-50 text-green-700 shadow-sm"
          : "border-emerald-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-slate-600"
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
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-slate-700">Drop an image here or click to upload</p>
          <p className="mt-1 text-xs text-slate-400">Accepted formats: JPG, JPEG, PNG</p>
        </div>
      </div>
    </div>
  );
}
