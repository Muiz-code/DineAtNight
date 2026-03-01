export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="h-8 w-36 bg-white/5 rounded-lg animate-pulse mb-3" />
        <div className="h-4 w-60 bg-white/5 rounded animate-pulse mb-12" />
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-xl bg-white/5 animate-pulse"
              style={{ aspectRatio: i % 3 === 0 ? "1/1.4" : i % 3 === 1 ? "1/0.7" : "1/1" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
