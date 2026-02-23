// "use client";

// import { useRef, useState } from "react";
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from "@/lib/firebase";
// import { UploadCloud, X, ImageIcon } from "lucide-react";

// interface ImageUploadProps {
//   value: string;
//   onChange: (url: string) => void;
//   folder: string;        // e.g. "vendors" or "vendors/logos"
//   hint?: string;
//   required?: boolean;
//   square?: boolean;      // true = 1:1 preview, false = 16:9 preview
// }

// export default function ImageUpload({
//   value,
//   onChange,
//   folder,
//   hint,
//   required,
//   square = false,
// }: ImageUploadProps) {
//   const inputRef = useRef<HTMLInputElement>(null);
//   const [progress, setProgress] = useState(0);
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState("");

//   const upload = (file: File) => {
//     if (!file.type.startsWith("image/")) {
//       setError("Please select an image file.");
//       return;
//     }
//     if (file.size > 10 * 1024 * 1024) {
//       setError("Image must be under 10 MB.");
//       return;
//     }

//     setError("");
//     setUploading(true);
//     setProgress(0);

//     const ext = file.name.split(".").pop() ?? "jpg";
//     const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
//     const storageRef = ref(storage, `${folder}/${filename}`);
//     const task = uploadBytesResumable(storageRef, file);

//     task.on(
//       "state_changed",
//       (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
//       (err) => {
//         console.error("[ImageUpload]", err);
//         setError("Upload failed. Please try again.");
//         setUploading(false);
//       },
//       async () => {
//         const url = await getDownloadURL(task.snapshot.ref);
//         onChange(url);
//         setUploading(false);
//         setProgress(0);
//       },
//     );
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) upload(file);
//     // reset input so the same file can be re-selected
//     e.target.value = "";
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     const file = e.dataTransfer.files?.[0];
//     if (file) upload(file);
//   };

//   const clear = (ev: React.MouseEvent) => {
//     ev.stopPropagation();
//     onChange("");
//     setError("");
//   };

//   const previewClass = square
//     ? "w-full aspect-square"
//     : "w-full aspect-video";

//   // ── Has an image ──────────────────────────────────────────────────────
//   if (value && !uploading) {
//     return (
//       <div className="relative group">
//         {/* eslint-disable-next-line @next/next/no-img-element */}
//         <img
//           src={value}
//           alt="preview"
//           className={`${previewClass} object-cover rounded-lg border border-white/10`}
//         />
//         {/* Change / Remove overlay */}
//         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
//           <button
//             type="button"
//             onClick={() => inputRef.current?.click()}
//             className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/25 transition-all"
//           >
//             Change
//           </button>
//           <button
//             type="button"
//             onClick={clear}
//             className="w-8 h-8 rounded-full bg-[#FF3333]/20 border border-[#FF3333]/40 flex items-center justify-center text-[#FF3333] hover:bg-[#FF3333]/40 transition-all"
//           >
//             <X className="w-3.5 h-3.5" />
//           </button>
//         </div>
//         <input
//           ref={inputRef}
//           type="file"
//           accept="image/*"
//           className="hidden"
//           onChange={handleFileChange}
//           required={required && !value}
//         />
//         {hint && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
//       </div>
//     );
//   }

//   // ── Upload zone ───────────────────────────────────────────────────────
//   return (
//     <div>
//       <div
//         className={`relative ${previewClass} rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:border-[#FFFF00]/40 hover:bg-[#FFFF00]/[0.02] group`}
//         onClick={() => !uploading && inputRef.current?.click()}
//         onDrop={handleDrop}
//         onDragOver={(e) => e.preventDefault()}
//       >
//         {uploading ? (
//           <>
//             {/* Progress ring */}
//             <div className="relative w-12 h-12">
//               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
//                 <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
//                 <circle
//                   cx="18" cy="18" r="15" fill="none"
//                   stroke="#FFFF00" strokeWidth="3" strokeLinecap="round"
//                   strokeDasharray={`${progress * 0.942} 94.2`}
//                   style={{ transition: "stroke-dasharray 0.2s" }}
//                 />
//               </svg>
//               <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#FFFF00]">
//                 {progress}%
//               </span>
//             </div>
//             <p className="text-gray-500 text-xs uppercase tracking-widest">Uploading…</p>
//           </>
//         ) : (
//           <>
//             <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-600 group-hover:text-[#FFFF00] group-hover:border-[#FFFF00]/30 transition-all">
//               <UploadCloud className="w-5 h-5" />
//             </div>
//             <div className="text-center px-4">
//               <p className="text-gray-400 text-xs font-medium">
//                 <span className="text-[#FFFF00]">Click to upload</span> or drag & drop
//               </p>
//               <p className="text-gray-700 text-[10px] mt-0.5">PNG, JPG, WEBP — max 10 MB</p>
//             </div>
//           </>
//         )}
//         <input
//           ref={inputRef}
//           type="file"
//           accept="image/*"
//           className="hidden"
//           onChange={handleFileChange}
//           required={required && !value}
//         />
//       </div>

//       {error && (
//         <div className="flex items-center gap-2 mt-1.5">
//           <ImageIcon className="w-3 h-3 text-[#FF3333] flex-shrink-0" />
//           <p className="text-[#FF3333] text-xs">{error}</p>
//         </div>
//       )}
//       {hint && !error && <p className="text-gray-700 text-xs mt-1">{hint}</p>}
//     </div>
//   );
// }
