"use client";

import { useRef, useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { UploadCloud, X, Camera, Film, AlertCircle } from "lucide-react";

interface MediaUploadProps {
  value: string;
  mediaType: "photo" | "video";
  onChange: (url: string) => void;
  folder: string;    // e.g. "gallery"
  hint?: string;
  required?: boolean;
}

const ACCEPTED = {
  photo: { accept: "image/*", maxMB: 10, label: "PNG, JPG, WEBP" },
  video: { accept: "video/*", maxMB: 100, label: "MP4, MOV, WEBM" },
};

export default function MediaUpload({
  value,
  mediaType,
  onChange,
  folder,
  hint,
  required,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const { accept, maxMB, label } = ACCEPTED[mediaType];
  const isImage = mediaType === "photo";

  const upload = (file: File) => {
    const typeOk = isImage ? file.type.startsWith("image/") : file.type.startsWith("video/");
    if (!typeOk) {
      setError(`Please select a ${isImage ? "image" : "video"} file.`);
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File must be under ${maxMB} MB.`);
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    const ext = file.name.split(".").pop() ?? (isImage ? "jpg" : "mp4");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `${folder}/${filename}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error("[MediaUpload]", err);
        setError("Upload failed. Please try again.");
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setUploading(false);
        setProgress(0);
      },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const clear = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onChange("");
    setError("");
  };

  const Icon = isImage ? Camera : Film;
  const accentColor = "#00FF41";

  // ── Has media ─────────────────────────────────────────────────────────
  if (value && !uploading) {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-white/10">
        <div className="aspect-video">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <video src={value} className="w-full h-full object-cover" muted playsInline controls />
          )}
        </div>
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/25 transition-all"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={clear}
            className="w-8 h-8 rounded-full bg-[#FF3333]/20 border border-[#FF3333]/40 flex items-center justify-center text-[#FF3333] hover:bg-[#FF3333]/40 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        {hint && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
      </div>
    );
  }

  // ── Upload zone ───────────────────────────────────────────────────────
  return (
    <div>
      <div
        className="relative w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
        style={{
          borderColor: dragging ? `${accentColor}80` : "rgba(255,255,255,0.1)",
          background: dragging ? `${accentColor}06` : "transparent",
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
      >
        {uploading ? (
          <>
            <div className="relative w-12 h-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={accentColor} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${progress * 0.942} 94.2`}
                  style={{ transition: "stroke-dasharray 0.2s" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: accentColor }}>
                {progress}%
              </span>
            </div>
            <p className="text-gray-500 text-xs uppercase tracking-widest">Uploading…</p>
          </>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-all"
              style={{
                borderColor: dragging ? `${accentColor}50` : "rgba(255,255,255,0.1)",
                color: dragging ? accentColor : "rgba(255,255,255,0.3)",
              }}
            >
              {dragging ? <UploadCloud className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <div className="text-center px-4">
              <p className="text-gray-400 text-xs font-medium">
                <span style={{ color: accentColor }}>Click to upload</span> or drag & drop
              </p>
              <p className="text-gray-700 text-[10px] mt-0.5">{label} — max {maxMB} MB</p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
          required={required && !value}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-1.5">
          <AlertCircle className="w-3 h-3 text-[#FF3333] shrink-0" />
          <p className="text-[#FF3333] text-xs">{error}</p>
        </div>
      )}
      {hint && !error && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
    </div>
  );
}
