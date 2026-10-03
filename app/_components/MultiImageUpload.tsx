"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { ImagePlus, X, AlertCircle } from "lucide-react";

/**
 * Multi-image uploader (vendor menu pictures, product pictures).
 * Images are shown on the public site exactly as uploaded. Files go to
 * Firebase Storage under `folder` with random names (e.g. "vendors/menus").
 */

const MAX_MB = 10;

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  addLabel: string; // e.g. "Add menu pictures"
  hint: string; // e.g. "Photo or screenshot of your menu"
  itemLabel: string; // e.g. "Menu page" (alt text / aria labels)
  max?: number;
}

export default function MultiImageUpload({
  value,
  onChange,
  folder,
  addLabel,
  hint,
  itemLabel,
  max = 6,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0); // files in flight
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  // Keep a live copy so concurrent uploads append to the latest list
  const latest = useRef(value);
  latest.current = value;

  const uploadOne = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const task = uploadBytesResumable(ref(storage, `${folder}/${filename}`), file, {
        contentType: file.type,
      });
      task.on("state_changed", undefined, reject, async () => {
        resolve(await getDownloadURL(task.snapshot.ref));
      });
    });

  const handleFiles = async (files: FileList | File[]) => {
    setError("");
    const room = max - latest.current.length;
    const list = Array.from(files);
    if (room <= 0) {
      setError(`You can add up to ${max} pictures.`);
      return;
    }
    const accepted = list.filter((f) => f.type.startsWith("image/") && f.size <= MAX_MB * 1024 * 1024).slice(0, room);
    if (accepted.length < list.length) {
      setError(
        list.length > room
          ? `Only ${room} more picture${room === 1 ? "" : "s"} allowed.`
          : `Images only, each under ${MAX_MB} MB.`,
      );
    }
    for (const file of accepted) {
      setUploading((n) => n + 1);
      try {
        const url = await uploadOne(file);
        // Newest upload first
        onChange([url, ...latest.current]);
      } catch (err) {
        console.error("[MultiImageUpload]", err);
        setError("An upload failed. Please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-white/5">
              <Image src={url} alt={`${itemLabel} ${i + 1}`} fill sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#FF3333] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 px-4 transition-all select-none"
          style={{
            borderColor: dragging ? "#FFFF00" : "rgba(255,255,255,0.1)",
            background: dragging ? "rgba(255,255,0,0.04)" : "rgba(255,255,255,0.01)",
          }}
        >
          <ImagePlus className="w-7 h-7" style={{ color: dragging ? "#FFFF00" : "rgba(255,255,255,0.25)" }} />
          <p className="text-xs font-bold" style={{ color: dragging ? "#FFFF00" : "rgba(255,255,255,0.45)" }}>
            {uploading > 0 ? `Uploading ${uploading}…` : addLabel}
          </p>
          <p className="text-gray-700 text-[10px] text-center">
            {hint} · up to {max} · {MAX_MB} MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-[#FF3333] text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
