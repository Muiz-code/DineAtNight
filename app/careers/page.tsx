import type { Metadata } from "next";
import { Briefcase, CalendarClock, Clock, Mail, MapPin } from "lucide-react";
import Footer from "../_components/Footer";
import HeroCarousel from "../_components/HeroCarousel";
import NeonMarquee from "../_components/NeonMarquee";
import SectionFadeIn from "../_components/SectionFadeIn";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the team behind Dine At Night, Lagos's premier nighttime food market. See our open roles and how to apply.",
  keywords: [
    "Dine At Night careers", "Dine At Night jobs", "Lagos social media manager job",
    "food event jobs Lagos", "Lagos events jobs", "part-time social media job Nigeria",
    "creative jobs Lagos", "nightlife brand jobs Nigeria",
  ],
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers — Dine At Night",
    description:
      "We're growing the team behind Lagos's premier nighttime food market. See our open roles.",
    url: "/careers",
  },
};

const APPLY_EMAIL = "contact@dineatnight.com";

interface Role {
  title: string;
  location: string;
  type: string;
  start: string;
  intro: string;
  responsibilities: string[];
  profile: string;
  note?: string;
}

const ROLES: Role[] = [
  {
    title: "Social Media Manager",
    location: "Lagos / Remote",
    type: "Part-time",
    start: "ASAP",
    intro:
      "Following two sold-out events, we're growing our team ahead of our next flagship event in December. We're looking for a Social Media Manager to take ownership of Dine at Night's social presence and help us build a strong, consistent and culturally relevant online community.",
    responsibilities: [
      "Own the day-to-day management of our Instagram and TikTok accounts",
      "Develop and manage our social media strategy, content calendar and posting cadence",
      "Plan, schedule and publish content consistently",
      "Create engaging, social-first content around Dine at Night, food, nightlife and Lagos culture",
      "Write captions and develop creative social concepts",
      "Manage community engagement, including comments and DMs",
      "Identify relevant trends and opportunities for the brand to tap into",
      "Support social coverage around events, activations and key announcements",
      "Track performance and use insights to improve our content strategy",
      "Work closely with the founding team on campaigns, partnerships and event marketing",
    ],
    profile:
      "Someone who is creative, proactive, organised and genuinely understands social media. You should have a strong understanding of Instagram and TikTok, know what makes content feel culturally relevant rather than overly branded, and be comfortable taking ownership rather than waiting to be told what to post. Experience managing a brand or event account is a plus, but we're equally interested in someone with a great eye, strong ideas and examples of social content they've created.",
    note: "This is initially a part-time role, but as Dine at Night grows, there is potential for more opportunities and a bigger role within the team.",
  },
];

const META_ICONS = {
  location: <MapPin className="w-3.5 h-3.5" />,
  type: <Clock className="w-3.5 h-3.5" />,
  start: <CalendarClock className="w-3.5 h-3.5" />,
};

export default function CareersPage() {
  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center h-[50vh] pt-28 pb-16 px-6 text-center overflow-hidden">
        <HeroCarousel accent="#FF3333" />

        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,51,51,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <p
            className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] mb-4"
            style={{
              color: "#00FF41",
              textShadow: "0 0 12px rgba(0,255,65,0.5)",
            }}
          >
            We Are Hiring
          </p>
          <h1
            className="text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px #FF3333",
              textShadow: "0 0 40px rgba(255,51,51,0.3)",
            }}
          >
            Careers
          </h1>
          <p className="mt-6 text-gray-300 text-lg sm:text-xl max-w-2xl leading-relaxed">
            Help us build Nigeria&apos;s first night food market — from behind
            the scenes.
          </p>
        </div>
      </section>

      <NeonMarquee />

      {/* ── OPEN ROLES ── */}
      <section className="relative z-10 px-6 md:px-16 pt-14 pb-16">
        <div className="max-w-3xl mx-auto">
          <SectionFadeIn>
            <div className="flex items-center gap-3 mb-10">
              <Briefcase className="w-5 h-5" style={{ color: "#FFFF00" }} />
              <h2
                className="text-2xl uppercase tracking-widest font-bold"
                style={{
                  color: "#FFFF00",
                  textShadow: "0 0 15px rgba(255,255,0,0.5)",
                }}
              >
                Open Roles
              </h2>
            </div>
          </SectionFadeIn>

          {ROLES.length === 0 ? (
            <SectionFadeIn>
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p className="text-gray-400 text-sm leading-relaxed">
                  No open roles right now — but we&apos;re always happy to hear
                  from great people. Send us a note at{" "}
                  <a
                    href={`mailto:${APPLY_EMAIL}`}
                    className="text-[#00FF41] hover:underline"
                  >
                    {APPLY_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </SectionFadeIn>
          ) : (
            <div className="space-y-10">
              {ROLES.map((role) => (
                <SectionFadeIn key={role.title}>
                  <article
                    className="relative rounded-2xl border p-6 sm:p-9"
                    style={{
                      borderColor: "rgba(255,51,51,0.2)",
                      background: "linear-gradient(135deg, #080808, #030303)",
                      boxShadow: "0 0 40px rgba(255,51,51,0.06)",
                    }}
                  >
                    {/* Corner accents */}
                    <span
                      className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
                      style={{
                        borderTop: "2px solid #FF3333",
                        borderLeft: "2px solid #FF3333",
                      }}
                    />
                    <span
                      className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                      style={{
                        borderBottom: "2px solid #FF3333",
                        borderRight: "2px solid #FF3333",
                      }}
                    />

                    <h3
                      className="text-2xl sm:text-3xl font-bold uppercase tracking-wide"
                      style={{
                        color: "#FFFF00",
                        textShadow: "0 0 15px rgba(255,255,0,0.4)",
                      }}
                    >
                      {role.title}
                    </h3>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2.5 mt-5">
                      {(
                        [
                          ["location", role.location],
                          ["type", role.type],
                          ["start", role.start],
                        ] as const
                      ).map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-widest"
                          style={{
                            borderColor: "rgba(0,255,65,0.25)",
                            color: "rgba(0,255,65,0.85)",
                            background: "rgba(0,255,65,0.04)",
                          }}
                        >
                          {META_ICONS[key]}
                          {value}
                        </span>
                      ))}
                    </div>

                    <p className="mt-7 text-gray-300 text-sm sm:text-base leading-relaxed">
                      {role.intro}
                    </p>

                    {/* What you'll do */}
                    <h4
                      className="mt-9 mb-4 text-sm font-bold uppercase tracking-[0.2em]"
                      style={{
                        color: "#FF3333",
                        textShadow: "0 0 12px rgba(255,51,51,0.4)",
                      }}
                    >
                      What you&apos;ll do
                    </h4>
                    <ul className="space-y-2.5">
                      {role.responsibilities.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span
                            className="mt-1.5 text-[8px] shrink-0"
                            style={{
                              color: "#FFFF00",
                              textShadow: "0 0 8px rgba(255,255,0,0.7)",
                            }}
                          >
                            ●
                          </span>
                          <span className="text-gray-400 text-sm leading-relaxed">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Who we're looking for */}
                    <h4
                      className="mt-9 mb-4 text-sm font-bold uppercase tracking-[0.2em]"
                      style={{
                        color: "#FF3333",
                        textShadow: "0 0 12px rgba(255,51,51,0.4)",
                      }}
                    >
                      Who we&apos;re looking for
                    </h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {role.profile}
                    </p>

                    {role.note && (
                      <div
                        className="mt-7 rounded-xl border p-4"
                        style={{
                          borderColor: "rgba(0,255,65,0.15)",
                          background: "rgba(0,255,65,0.03)",
                        }}
                      >
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {role.note}
                        </p>
                      </div>
                    )}

                    {/* Apply */}
                    <div className="mt-9 pt-7 border-t border-white/8">
                      <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        <span
                          className="font-bold uppercase tracking-widest text-xs"
                          style={{ color: "#FF3333" }}
                        >
                          To apply:{" "}
                        </span>
                        Send us your CV/portfolio, examples of accounts or
                        content you&apos;ve worked on, and a short introduction
                        about yourself.
                      </p>
                      <a
                        href={`mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(
                          `Application: ${role.title}`,
                        )}`}
                        className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm text-black transition-all duration-300 hover:brightness-110"
                        style={{
                          background: "#00FF41",
                          boxShadow: "0 0 30px rgba(0,255,65,0.4)",
                        }}
                      >
                        <Mail className="w-4 h-4" />
                        Apply Now
                      </a>
                      <p className="mt-4 text-xs text-gray-600">
                        Or email us directly at{" "}
                        <span className="text-gray-500">{APPLY_EMAIL}</span>
                      </p>
                    </div>
                  </article>
                </SectionFadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
