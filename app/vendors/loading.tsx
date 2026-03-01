export default function VendorsLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-3" />
        <div className="h-4 w-72 bg-white/5 rounded animate-pulse mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="aspect-video bg-white/5 animate-pulse" />
              <div className="p-5 space-y-2">
                <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
