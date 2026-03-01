export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Heading skeleton */}
        <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse mb-3" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse mb-12" />
        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="aspect-square bg-white/5 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
