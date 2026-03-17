"use client";

import { useRef, useState, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { UploadCloud, X, ImageIcon, Crop as CropIcon } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  hint?: string;
  required?: boolean;
  square?: boolean;
  compact?: boolean;
}

function centerAspectCrop(width: number, height: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height,
  );
}

export default function ImageUpload({
  value,
  onChange,
  folder,
  hint,
  required,
  square = false,
  compact = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const aspect = square ? 1 : 16 / 9;

  const openCropper = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError("");
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerAspectCrop(w, h, aspect));
  }, [aspect]);

  const uploadBlob = (blob: Blob, ext: string) => {
    setUploading(true);
    setProgress(0);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `${folder}/${filename}`);
    const task = uploadBytesResumable(storageRef, blob);
    task.on(
      "state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error("[ImageUpload]", err);
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

  const applyCrop = () => {
    if (!imgRef.current || !crop || !pendingFile) return;
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: ((crop.x ?? 0) / 100) * img.width * scaleX,
      y: ((crop.y ?? 0) / 100) * img.height * scaleY,
      width: ((crop.width ?? 100) / 100) * img.width * scaleX,
      height: ((crop.height ?? 100) / 100) * img.height * scaleY,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, pixelCrop.width, pixelCrop.height,
    );

    const ext = pendingFile.name.split(".").pop() ?? "jpg";
    const mime = pendingFile.type || "image/jpeg";

    canvas.toBlob((blob) => {
      if (!blob) { setError("Crop failed."); return; }
      setCropSrc(null);
      setPendingFile(null);
      uploadBlob(blob, ext);
    }, mime, 0.92);
  };

  const cancelCrop = () => {
    setCropSrc(null);
    setPendingFile(null);
    setCrop(undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropper(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openCropper(file);
  };

  const clear = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onChange("");
    setError("");
  };

  const previewClass = compact ? "w-full h-24" : square ? "w-full aspect-square" : "w-full aspect-video";

  return (
    <>
      {/* ── Crop modal ─────────────────────────────────────── */}
      {cropSrc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <CropIcon className="w-4 h-4 text-[#FFFF00]" />
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  Crop Image
                </span>
              </div>
              <button type="button" onClick={cancelCrop} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40 max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                aspect={aspect}
                minWidth={20}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="crop-preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "55vh", maxWidth: "100%" }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-white/8">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-wide hover:border-white/25 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                style={{ background: "#FFFF00", color: "#000" }}
              >
                Crop & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Has an image ─────────────────────────────────────── */}
      {value && !uploading ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="preview"
            className={`${previewClass} object-cover rounded-lg border border-white/10`}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/25 transition-all"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clear}
              className="w-8 h-8 rounded-full bg-[#FF3333]/20 border border-[#FF3333]/40 flex items-center justify-center text-[#FF3333] hover:bg-[#FF3333]/40 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} required={required && !value} />
          {hint && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
        </div>
      ) : (
        /* ── Upload zone ─────────────────────────────────────── */
        <div>
          <div
            className={`relative ${previewClass} rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group`}
            style={{
              borderColor: dragging ? "rgba(255,255,0,0.6)" : "rgba(255,255,255,0.1)",
              background: dragging ? "rgba(255,255,0,0.04)" : "transparent",
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
                      stroke="#FFFF00" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${progress * 0.942} 94.2`}
                      style={{ transition: "stroke-dasharray 0.2s" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#FFFF00]">
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
                    borderColor: dragging ? "rgba(255,255,0,0.4)" : "rgba(255,255,255,0.1)",
                    color: dragging ? "#FFFF00" : "rgba(255,255,255,0.3)",
                  }}
                >
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-center px-4">
                  <p className="text-gray-400 text-xs font-medium">
                    <span className="text-[#FFFF00]">Click to upload</span> or drag & drop
                  </p>
                  <p className="text-gray-700 text-[10px] mt-0.5">PNG, JPG, WEBP — max 10 MB</p>
                </div>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} required={required && !value} />
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-1.5">
              <ImageIcon className="w-3 h-3 text-[#FF3333] flex-shrink-0" />
              <p className="text-[#FF3333] text-xs">{error}</p>
            </div>
          )}
          {hint && !error && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
        </div>
      )}
    </>
  );
}
