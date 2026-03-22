import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  const { status, email } = await searchParams;

  const isSuccess = status === "success";
  const isInvalid = status === "invalid";

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Corner accents */}
        <div className="relative rounded-2xl border px-8 py-10 space-y-5"
          style={{
            background: "linear-gradient(135deg, #0a0a0a, #050505)",
            borderColor: isSuccess ? "rgba(255,255,0,0.2)" : "rgba(255,255,255,0.06)",
            boxShadow: isSuccess ? "0 0 60px rgba(255,255,0,0.05)" : "none",
          }}
        >
          <span className="absolute top-0 left-0 w-5 h-5"
            style={{ borderTop: `2px solid ${isSuccess ? "#FFFF00" : "#333"}`, borderLeft: `2px solid ${isSuccess ? "#FFFF00" : "#333"}` }}
          />
          <span className="absolute bottom-0 right-0 w-5 h-5"
            style={{ borderBottom: `2px solid ${isSuccess ? "#FFFF00" : "#333"}`, borderRight: `2px solid ${isSuccess ? "#FFFF00" : "#333"}` }}
          />

          {/* Icon */}
          <div className="flex justify-center">
            {isSuccess ? (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,255,0,0.08)", border: "1px solid rgba(255,255,0,0.2)" }}>
                ✓
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                ✕
              </div>
            )}
          </div>

          {/* Heading */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2"
              style={{ color: isSuccess ? "#FFFF00" : "#444" }}>
              Dine At Night
            </p>
            <h1 className="text-2xl font-bold uppercase tracking-wide"
              style={{ color: isSuccess ? "#FFFF00" : "#888" }}>
              {isSuccess ? "Unsubscribed" : isInvalid ? "Invalid Link" : "Something went wrong"}
            </h1>
          </div>

          {/* Message */}
          <p className="text-gray-500 text-sm leading-relaxed">
            {isSuccess
              ? <>
                  {email && <><span className="text-gray-300">{email}</span> has been </>}
                  removed from our mailing list. You won&apos;t receive any further newsletters.
                </>
              : isInvalid
              ? "This unsubscribe link is invalid or has expired. If you meant to unsubscribe, contact us directly."
              : "We couldn't process your unsubscribe request. Please try again or contact us."}
          </p>

          {/* Signature */}
          {isSuccess && (
            <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,0,0.08)" }}>
              <p className="text-gray-600 text-xs">Stay hungry. Stay out late.</p>
              <p className="text-xs font-bold tracking-widest mt-0.5" style={{ color: "rgba(255,255,0,0.4)" }}>
                — Dine At Night
              </p>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/home"
            className="inline-block px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-black transition-all"
            style={{ background: "#FFFF00" }}
          >
            Back to Site →
          </Link>
        </div>
      </div>
    </main>
  );
}
