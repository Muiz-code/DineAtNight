import type { Metadata } from "next";
import Footer from "../_components/Footer";

export const metadata: Metadata = {
  title: "Ticketing Terms & Conditions",
  description:
    "Ticketing Terms & Conditions for Dine At Night events — tickets, refunds, conduct, photography and how we handle your personal information.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Ticketing Terms & Conditions — Dine At Night",
    description: "The terms that apply when you buy a ticket to a Dine At Night event.",
    url: "/terms",
  },
};

/**
 * Ticketing Terms & Conditions for all Dine At Night events — adapted from the
 * Part II document ("DAN 2 T&C's.pdf") to apply generally (no event date/venue).
 * Linked from the checkout's "Before you check out" box (TICKET_TERMS_URL) and
 * the footer. Section ids are stable anchors — /terms#data-protection is used
 * as the Privacy Notice link until a separate Privacy Notice exists.
 */
const SECTIONS: { id: string; title: string; clauses: string[] }[] = [
  {
    id: "ticket-purchase",
    title: "Ticket Purchase & Admission",
    clauses: [
      "All guests must possess a valid ticket to gain entry to the event.",
      "Tickets must be purchased through Dine At Night's official ticketing platform or authorised sales channels.",
      "Each ticket permits one admission only and may not be duplicated or used more than once.",
      "Guests may be required to present a valid means of identification alongside their ticket.",
      "Dine At Night reserves the right to refuse admission where a ticket is invalid, fraudulent or has already been redeemed.",
    ],
  },
  {
    id: "refunds-transfers",
    title: "Ticket Refunds & Transfers",
    clauses: [
      "All ticket purchases are final. Tickets are non-refundable except where required by applicable law or where the event is cancelled.",
      "Tickets may not be resold for commercial gain without prior written authorisation from Dine At Night.",
      "Ticket transfers may be permitted at the organiser's discretion, subject to the ticketing platform's transfer procedures.",
      "Dine At Night is not responsible for tickets purchased through unauthorised third parties.",
    ],
  },
  {
    id: "event-changes",
    title: "Event Changes & Cancellation",
    clauses: [
      "Dine At Night reserves the right to make reasonable changes to the event programme, participating vendors, performers, entertainment and scheduled activities.",
      "In the event of postponement, existing tickets will remain valid for the rescheduled date, subject to applicable consumer rights.",
      "If the event is cancelled, ticket holders will be informed of the applicable refund process.",
      "Dine At Night shall not be responsible for additional personal expenses incurred by guests, including transportation and accommodation, except where liability cannot legally be excluded.",
    ],
  },
  {
    id: "conduct-safety",
    title: "Guest Conduct & Safety",
    clauses: [
      "All attendees are expected to behave respectfully towards fellow guests, vendors, performers and event staff.",
      "Harassment, violence, discrimination, threatening behaviour and any activity that compromises the safety or enjoyment of others will not be tolerated.",
      "Dine At Night reserves the right to refuse entry or remove individuals whose behaviour poses a safety risk or substantially breaches these Terms & Conditions.",
      "Guests must comply with reasonable safety instructions issued by event staff and security personnel.",
      "Dangerous items, weapons and illegal substances are strictly prohibited.",
    ],
  },
  {
    id: "food-drinks-vendors",
    title: "Food, Drinks & Vendors",
    clauses: [
      "Unless expressly stated otherwise, ticket prices cover admission only. Food, beverages, merchandise and other purchases are charged separately.",
      "Food and beverage vendors operate independently and are responsible for the preparation, pricing and sale of their products.",
      "Guests with food allergies or dietary restrictions are responsible for informing vendors before making purchases and confirming the suitability of their orders.",
      "Food and drink availability may vary throughout the event, and individual products may sell out.",
    ],
  },
  {
    id: "photography",
    title: "Photography, Videography & Media",
    clauses: [
      "Photography and videography will take place throughout Dine At Night for event documentation, publicity and promotional purposes.",
      "Guests may appear incidentally in event photography, crowd footage and recap content shared across Dine At Night's website, social media channels and promotional materials.",
      "Where required by applicable law, Dine At Night will obtain additional consent before using identifiable individuals in dedicated promotional or advertising content.",
      "Guests who have concerns about photography or filming may contact the event team.",
    ],
  },
  {
    id: "belongings-liability",
    title: "Personal Belongings & Liability",
    clauses: [
      "Guests are responsible for safeguarding their personal belongings throughout the event.",
      "Dine At Night is not responsible for lost, stolen or damaged personal property except where such loss results from the organiser's negligence or other circumstances for which liability cannot legally be excluded.",
      "Guests attend and participate in event activities at their own risk, subject to the organiser's legal responsibilities regarding health and safety.",
    ],
  },
  {
    id: "data-protection",
    title: "Personal Information & Data Protection",
    clauses: [
      "Dine At Night collects personal information, including names, email addresses and phone numbers, for ticket processing, event administration, guest communication and security purposes.",
      "Personal information may be shared with authorised ticketing providers and event service providers where reasonably necessary to facilitate the event.",
      "Where guests provide separate, optional marketing consent, Dine At Night may share their email addresses and phone numbers with the selected event sponsors and partners identified in its Privacy Notice for marketing and promotional purposes.",
      "Guests may withdraw marketing consent at any time without affecting the validity of their purchased tickets.",
      "Personal information will be handled in accordance with applicable Nigerian data protection legislation and Dine At Night's Privacy Notice.",
    ],
  },
  {
    id: "general",
    title: "General Conditions",
    clauses: [
      "Dine At Night reserves the right to enforce reasonable event rules necessary to maintain safety, security and an enjoyable guest experience.",
      "Any changes to these Terms & Conditions will be communicated where they materially affect ticket holders' rights or obligations.",
      "These Terms & Conditions are governed by the applicable laws of the Federal Republic of Nigeria.",
    ],
  },
];

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
            Ticketing Terms &amp; Conditions
          </h1>
        </div>
      </section>

      <section className="relative z-10 px-6 md:px-16 pb-20">
        <div className="max-w-3xl mx-auto space-y-10">
          <p className="text-gray-300 leading-relaxed">
            These Terms &amp; Conditions apply to all Dine At Night events. By purchasing a ticket to a Dine At Night
            event, you acknowledge and agree to the following Terms &amp; Conditions.
          </p>

          {/* Contents */}
          <nav aria-label="Contents" className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Contents</p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-gray-400 hover:text-[#FFFF00] transition-colors">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2
                className="text-lg sm:text-xl font-bold uppercase tracking-widest mb-4"
                style={{ color: "#FFFF00", textShadow: "0 0 12px rgba(255,255,0,0.35)" }}
              >
                {i + 1}. {s.title}
              </h2>
              <ol className="space-y-3">
                {s.clauses.map((clause, j) => (
                  <li key={j} className="flex gap-3 text-gray-300 leading-relaxed">
                    <span className="text-gray-600 font-mono text-sm pt-0.5 flex-shrink-0">
                      {i + 1}.{j + 1}.
                    </span>
                    <span>{clause}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <div className="rounded-xl border border-white/8 p-5 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">For enquiries, please contact</p>
            <a href="mailto:contact@dineatnight.com" className="text-[#FFFF00] underline underline-offset-2">
              contact@dineatnight.com
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
