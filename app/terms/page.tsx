import type { Metadata } from "next";
import type { ReactNode } from "react";
import Footer from "../_components/Footer";

export const metadata: Metadata = {
  title: "Ticket Terms and Refund Policy",
  description:
    "Ticket Terms and Refund Policy for Dine at Night — tickets, age limit, delivery, refunds, transfers, support and entry.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Ticket Terms and Refund Policy — Dine At Night",
    description: "The terms that apply when you buy a ticket to Dine at Night, including our refund policy.",
    url: "/terms",
  },
};

const SUPPORT_EMAIL = "contact@dineatnight.com";

function Email() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#00FF41] underline underline-offset-2">
      {SUPPORT_EMAIL}
    </a>
  );
}

/**
 * Ticket Terms and Refund Policy, word for word as supplied by the client (Nov 2026).
 * Linked from the checkout's "Before you check out" box (TICKET_TERMS_URL) and the
 * footer. Section ids are stable anchors.
 */
const POLICY: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "tickets",
    title: "Tickets",
    body: (
      <>
        Tickets are sold through{" "}
        <a href="https://dineatnight.com" className="text-[#00FF41] underline underline-offset-2">
          dineatnight.com
        </a>{" "}
        for Dine at Night, held at Federal Palace, Lagos, on 17 December 2026. We offer three tiers: Night Market Pass
        (₦14,500), After Dark (₦17,000) and VIP (₦50,000). Each ticket admits one person.
      </>
    ),
  },
  {
    id: "age-limit",
    title: "Age limit",
    body: (
      <>
        Dine at Night is strictly 18+. Guests may be asked to show valid ID at the entrance. We may refuse entry to
        anyone under 18, without refund.
      </>
    ),
  },
  {
    id: "delivery",
    title: "Delivery",
    body: (
      <>
        After payment, you receive an email with a QR code. Show it at the entrance. Each code works once, so please
        don&apos;t share it.
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        You can request a full refund up to 7 days before the event by emailing <Email />. After that, tickets are not
        refundable, but you may transfer yours to another person aged 18 or over by emailing us their name.
      </>
    ),
  },
  {
    id: "always-refunded",
    title: "Always refunded",
    body: (
      <>
        We refund in full if we cancel or reschedule the event, if you are charged twice, or if payment goes through
        and no ticket is issued.
      </>
    ),
  },
  {
    id: "refund-timing",
    title: "Refund timing",
    body: <>Refunds go back to the original payment method and show in your account within 7 days.</>,
  },
  {
    id: "support",
    title: "Support",
    body: (
      <>
        Email <Email />. We reply within 48 hours.
      </>
    ),
  },
  {
    id: "entry",
    title: "Entry",
    body: (
      <>
        Entry is subject to venue rules and capacity. We may refuse entry for unsafe or disorderly behaviour, without
        refund.
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <>
        We may update line-ups, vendors and timings. Material changes will be posted on our website and Instagram.
      </>
    ),
  },
];

/**
 * Kept from the previous terms: the new policy has no privacy section, but checkout's
 * "Privacy Notice" link (PRIVACY_NOTICE_URL = /terms#data-protection) and the optional
 * sponsor-sharing consent checkbox rely on this wording. Replace once a separate
 * Privacy Notice exists.
 */
const DATA_PROTECTION = [
  "Dine At Night collects personal information, including names, email addresses and phone numbers, for ticket processing, event administration, guest communication and security purposes.",
  "Personal information may be shared with authorised ticketing providers and event service providers where reasonably necessary to facilitate the event.",
  "Where guests provide separate, optional marketing consent, Dine At Night may share their email addresses and phone numbers with the selected event sponsors and partners identified in its Privacy Notice for marketing and promotional purposes.",
  "Guests may withdraw marketing consent at any time without affecting the validity of their purchased tickets.",
  "Personal information will be handled in accordance with applicable Nigerian data protection legislation and Dine At Night's Privacy Notice.",
];

const headingStyle = { color: "#FFFF00", textShadow: "0 0 12px rgba(255,255,0,0.35)" };

export default function TermsPage() {
  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HEADER ── */}
      <section className="relative px-6 md:px-16 pt-32 pb-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <p
            className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] mb-4"
            style={{ color: "#00FF41", textShadow: "0 0 12px rgba(0,255,65,0.5)" }}
          >
            Dine At Night
          </p>
          <h1
            className="text-4xl sm:text-6xl uppercase tracking-tight leading-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px #FFFF00",
              textShadow: "0 0 40px rgba(255,255,0,0.3)",
            }}
          >
            Ticket Terms and Refund Policy
          </h1>
        </div>
      </section>

      <section className="relative z-10 px-6 md:px-16 pb-20">
        <div className="max-w-3xl mx-auto space-y-10">
          <p className="text-gray-300 leading-relaxed">
            Dine at Night is operated by Those Who Dine Nigeria Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          </p>

          <ol className="space-y-6">
            {POLICY.map((item, i) => (
              <li key={item.id} id={item.id} className="scroll-mt-28 flex gap-4">
                <span className="font-mono text-sm pt-1 flex-shrink-0" style={{ color: "#FFFF00" }}>
                  {i + 1}.
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest mb-1.5" style={headingStyle}>
                    {item.title}
                  </h2>
                  <p className="text-gray-300 leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <section id="data-protection" className="scroll-mt-28 border-t border-white/8 pt-10">
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest mb-4" style={headingStyle}>
              Personal Information &amp; Data Protection
            </h2>
            <ul className="space-y-3">
              {DATA_PROTECTION.map((clause, j) => (
                <li key={j} className="flex gap-3 text-gray-300 leading-relaxed">
                  <span className="text-gray-600 flex-shrink-0">•</span>
                  <span>{clause}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-xl border border-white/8 p-5 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Questions or refund requests</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FFFF00] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <p className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
            Dine At Night — For Those Who Dine After Dark.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
