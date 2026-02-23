"use client";

import { useRef } from "react";
import { motion, useInView, animate, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import VendorModal from "../_components/VendorModal";
import { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Users,
  Clapperboard,
  Globe,
  Star,
  Landmark,
  TrendingUp,
  X,
} from "lucide-react";

const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const Counter = ({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(v) {
          if (ref.current)
            ref.current.textContent = Math.floor(v).toLocaleString() + suffix;
        },
      });
      return () => controls.stop();
    }
  }, [value, suffix, isInView]);

  return <span ref={ref} />;
};

interface TeamPerson {
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
}

interface TeamGroup {
  name: string;
  role: string;
  desc: string;
  color: string;
  glow: string;
  icon: React.ReactNode;
  modalDesc: string;
  members: TeamPerson[];
}

const teamMembers: TeamGroup[] = [
  {
    name: "The Organizers",
    role: "Founders & Creative Direction",
    desc: "The team behind Dine At Night is a group of passionate Lagos creatives who saw a gap in the city's nightlife — great food with no great setting. They built the night.",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    icon: <Crown className="w-10 h-10" />,
    modalDesc:
      "Four women who dared to imagine a Lagos night market that actually hits different. They conceived Dine At Night over late-night conversations, built it from zero, and continue to shape every edition with relentless vision and energy.",
    members: [
      {
        name: "Ajibola",
        title: "Co-Founder & Creative Lead",
        bio: "Ajibola is the creative engine behind Dine At Night. From brand identity to event aesthetics, her eye for detail transforms every edition into a fully immersive visual experience.",
        imageUrl: "",
      },
      {
        name: "Tami",
        title: "Co-Founder & Operations",
        bio: "Tami keeps the wheels turning. From vendor logistics to day-of execution, she makes sure every moving part of DAN runs without a hitch — every single time.",
        imageUrl: "",
      },
      {
        name: "Temi",
        title: "Co-Founder & Partnerships",
        bio: "Temi is the connector. She builds the relationships that bring sponsors, collaborators, and the right brands into the DAN ecosystem — and keeps them coming back.",
        imageUrl: "",
      },
      {
        name: "Zena",
        title: "Co-Founder & Marketing",
        bio: "Zena owns the voice of Dine At Night. From social media to community building, she's the reason Lagos can't stop talking about DAN long after the night ends.",
        imageUrl: "",
      },
    ],
  },
  {
    name: "Vendor Relations",
    role: "Curation & Partnerships",
    desc: "Our vendor team hand-picks every stall. Every vendor at DAN meets strict quality standards — because your night deserves only the best.",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    icon: <Users className="w-10 h-10" />,
    modalDesc:
      "Our vendor relations team is obsessed with quality. They scout, vet, and support every vendor on the DAN floor — ensuring that every bite at our events is genuinely worth talking about.",
    members: [
      {
        name: "Scouting",
        title: "Vendor Discovery",
        bio: "Constantly out in Lagos finding hidden food gems, emerging vendors, and cult-favourite spots that belong on the DAN stage.",
        imageUrl: "",
      },
      {
        name: "Standards",
        title: "Quality & Compliance",
        bio: "Every vendor goes through a rigorous quality check. This team ensures DAN's reputation for excellence is earned at every single stall.",
        imageUrl: "",
      },
      {
        name: "Support",
        title: "Vendor Success",
        bio: "From onboarding to event day, this team is in the vendors' corner — briefing, prepping, and making sure every vendor walks away having sold out.",
        imageUrl: "",
      },
    ],
  },
  {
    name: "Production Crew",
    role: "Logistics & Experience Design",
    desc: "From the neon lights to the stage setup, our production crew transforms any space into an immersive night market you won't forget.",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
    icon: <Clapperboard className="w-10 h-10" />,
    modalDesc:
      "Behind every jaw-dropping setup is a crew that started work days before you arrived. They are the unsung architects of the DAN experience — lights, sound, layout, flow, and every atmospheric detail.",
    members: [
      {
        name: "Lighting & AV",
        title: "Atmosphere Design",
        bio: "The neon glow you feel before you even see the stalls? That's them. Every fixture, projection, and beam is placed with intention.",
        imageUrl: "",
      },
      {
        name: "Stage & Sound",
        title: "Live Experience",
        bio: "From soundcheck to the final set, the stage team ensures the music and live moments hit exactly as hard as they should.",
        imageUrl: "",
      },
      {
        name: "Logistics",
        title: "Build & Flow",
        bio: "Floor plans, vendor placement, crowd flow, infrastructure — this team builds the world DAN exists in, from the ground up.",
        imageUrl: "",
      },
    ],
  },
];

function TeamModal({
  team,
  onClose,
}: {
  team: TeamGroup;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col"
          style={{
            background: "linear-gradient(160deg, #0c0c0c, #060606)",
            borderColor: `${team.color}30`,
            boxShadow: `0 0 60px ${team.glow}20`,
          }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Corner accents — outside the scroll container so they stay fixed */}
          <span
            className="absolute top-0 left-0 w-8 h-8 pointer-events-none z-10"
            style={{
              borderTop: `2px solid ${team.color}`,
              borderLeft: `2px solid ${team.color}`,
            }}
          />
          <span
            className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none z-10"
            style={{
              borderBottom: `2px solid ${team.color}`,
              borderRight: `2px solid ${team.color}`,
            }}
          />

          {/* Close button — also outside scroll container */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border transition-colors z-20"
            style={{ borderColor: `${team.color}40`, color: team.color }}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable content area */}
          <div className="overflow-y-auto flex-1">
          <div className="p-7 pt-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
              <div
                style={{
                  color: team.color,
                  filter: `drop-shadow(0 0 8px ${team.glow})`,
                }}
              >
                {team.icon}
              </div>
              <div>
                <h3
                  className="text-2xl font-bold uppercase tracking-wide"
                  style={{
                    color: team.color,
                    textShadow: `0 0 16px ${team.glow}`,
                  }}
                >
                  {team.name}
                </h3>
                <p className="text-gray-500 text-xs uppercase tracking-widest">
                  {team.role}
                </p>
              </div>
            </div>

            <div
              className="h-px w-full my-4"
              style={{
                background: `linear-gradient(to right, ${team.color}40, transparent)`,
              }}
            />

            <p className="text-gray-300 text-sm leading-relaxed mb-7">
              {team.modalDesc}
            </p>

            {/* Member grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members.map((person) => (
                <div
                  key={person.name}
                  className="flex gap-4 items-start rounded-xl border p-4"
                  style={{
                    borderColor: `${team.color}18`,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center text-xl font-bold uppercase"
                    style={{
                      borderColor: `${team.color}50`,
                      background: `${team.color}10`,
                      color: team.color,
                    }}
                  >
                    {person.imageUrl ? (
                      <img
                        src={person.imageUrl}
                        alt={person.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      person.name[0]
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="font-bold text-sm uppercase tracking-wide"
                      style={{ color: team.color }}
                    >
                      {person.name}
                    </p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">
                      {person.title}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {person.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>{/* end overflow-y-auto */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const values = [
  {
    title: "Community First",
    desc: "We exist to create space for Lagos food vendors, creatives, and night owls to come together. Everyone is welcome at our table.",
    icon: <Globe className="w-8 h-8" />,
    color: "#FFFF00",
  },
  {
    title: "Quality Over Everything",
    desc: "Every vendor, every activation, every detail is curated. We'd rather do less and do it right.",
    icon: <Star className="w-8 h-8" />,
    color: "#FF3333",
  },
  {
    title: "Authentically Lagos",
    desc: "DAN is rooted in Lagos culture — the energy, the flavours, the people. We celebrate where we're from.",
    icon: <Landmark className="w-8 h-8" />,
    color: "#00FF41",
  },
  {
    title: "Vendor Success = Our Success",
    desc: "Our vendors' 100% return rate and 90% sell-out rate isn't luck — it's because we genuinely invest in their success.",
    icon: <TrendingUp className="w-8 h-8" />,
    color: "#FFFF00",
  },
];

const timeline = [
  {
    year: "2023",
    title: "The Idea",
    desc: "Dine At Night is conceived over a late-night suya run. A question is asked: why isn't there a proper nighttime food market in Lagos?",
    color: "#FFFF00",
  },
  {
    year: "2024",
    title: "Edition 1",
    desc: "The first Dine At Night sells 850+ tickets, attracts 30+ vendors, and has a 90% sell-out rate. Edition 2 is immediately demanded.",
    color: "#FF3333",
  },
  {
    year: "2026",
    title: "Edition 2",
    desc: "DAN returns bigger, longer, louder. New vendors, new activations, same relentless energy.",
    color: "#00FF41",
  },
  {
    year: "Future",
    title: "The Vision",
    desc: "Multi-city expansion across Nigeria and Africa. Dine At Night becomes the definitive nighttime food experience on the continent.",
    color: "#FFFF00",
  },
];

export default function AboutPage() {
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamGroup | null>(null);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-20 px-6 text-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://res.cloudinary.com/dhhvxjczm/image/upload/v1771715446/PlateOpen_s92wrz.png"
            alt=""
            className="w-full h-full object-cover object-center md:hidden block"
          />
          <div
            className="absolute inset-0 opacity-75"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.6) 100%, rgba(0,0,0,0.82) 10%, rgba(0,0,0,0.95) 100%)",
            }}
          />
        </div>
        <div
          className="absolute inset-0 pointer-events-none relative z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)",
          }}
        />
        <motion.p
          className="relative z-10 text-xs tracking-[0.7em] uppercase mb-3"
          style={{
            color: "#FFFF00",
            textShadow: "0 0 12px rgba(255,255,0,0.7)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Our Story
        </motion.p>
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #FFFF00",
            textShadow: "0 0 40px rgba(255,255,0,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          About Dine At Night
        </motion.h1>
        <motion.p
          className="relative z-10 mt-6 text-gray-300 text-lg sm:text-xl max-w-2xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Dine At Night was born from a simple obsession: Lagos deserves a
          world-class nighttime food experience. So we built it.
        </motion.p>
      </section>

      {/* ── STATS ── */}
      <SectionFadeIn>
        <section className="py-14 px-6 md:px-16 bg-black/85 border-y border-white/5">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                label: "Tickets Sold",
                value: 850,
                suffix: "+",
                color: "#FFFF00",
                glow: "rgba(255,255,0,0.25)",
              },
              {
                label: "Vendors",
                value: 30,
                suffix: "+",
                color: "#FF3333",
                glow: "rgba(255,51,51,0.25)",
              },
              {
                label: "Vendors Sold Out",
                value: 90,
                suffix: "%",
                color: "#00FF41",
                glow: "rgba(0,255,65,0.25)",
              },
              {
                label: "Return Rate",
                value: 100,
                suffix: "%",
                color: "#FFFF00",
                glow: "rgba(255,255,0,0.25)",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="rounded-xl border p-6 text-center"
                style={{
                  borderColor: `${stat.color}25`,
                  boxShadow: `0 0 20px ${stat.glow}`,
                  background: "linear-gradient(135deg, #0a0a0a, #040404)",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="text-4xl md:text-5xl font-bold"
                  style={{
                    color: stat.color,
                    textShadow: `0 0 20px ${stat.color}`,
                  }}
                >
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-2">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── ORIGIN STORY ── */}
      <SectionFadeIn>
        <section className="pt-10 pb-5 px-6 md:px-24 bg-black/75">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-10 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow: "0 0 20px rgba(255,51,51,0.4)",
              }}
            >
              Why We Exist
            </h2>
            <div className="space-y-6 text-gray-300 text-base text-justify md:text-lg leading-loose">
              <p>
                Lagos is a city that never truly sleeps — but for years, its
                nightlife lacked one crucial element: a space where the
                city&apos;s best food vendors could come alive after dark.
              </p>
              <p>
                Street food culture is deeply woven into the fabric of Lagos
                life. But the experience of enjoying it — the atmosphere, the
                energy, the presentation — had never been elevated into
                something truly spectacular.
              </p>
              <p>
                <span
                  style={{
                    color: "#FFFF00",
                    textShadow: "0 0 10px rgba(255,255,0,0.5)",
                  }}
                >
                  Dine At Night changes that.
                </span>{" "}
                We curate the city&apos;s finest food vendors, place them under
                neon lights, add great music and community, and create an
                experience that Lagos hasn&apos;t seen before.
              </p>
              <p>
                Edition 1 proved the concept. 850+ attendees showed up. 90% of
                vendors sold out. Every single vendor said they&apos;d come
                back. And they will.
              </p>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── VALUES ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-16 bg-black/82 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-14 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #00FF41",
                textShadow: "0 0 20px rgba(0,255,65,0.4)",
              }}
            >
              What We Stand For
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((val, i) => (
                <motion.div
                  key={val.title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: `${val.color}20`,
                    background: "linear-gradient(135deg, #090909, #040404)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{
                    borderColor: val.color,
                    boxShadow: `0 0 25px ${val.color}25`,
                  }}
                >
                  <div
                    className="mb-3"
                    style={{
                      color: val.color,
                      filter: `drop-shadow(0 0 6px ${val.color}80)`,
                    }}
                  >
                    {val.icon}
                  </div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-2"
                    style={{ color: val.color }}
                  >
                    {val.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {val.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TIMELINE ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-24 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-16 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 20px rgba(255,255,0,0.4)",
              }}
            >
              Our Journey
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-0 bottom-0 w-px"
                style={{
                  background:
                    "linear-gradient(to bottom, #FFFF00, #FF3333, #00FF41, transparent)",
                }}
              />
              <div className="space-y-12">
                {timeline.map((item, i) => (
                  <motion.div
                    key={item.year}
                    className="flex gap-6 items-start"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold relative z-10"
                      style={{
                        borderColor: item.color,
                        color: item.color,
                        background: "#000",
                        boxShadow: `0 0 14px ${item.color}50`,
                      }}
                    >
                      {item.year.length <= 4 ? item.year.slice(-2) : "✦"}
                    </div>
                    <div>
                      <p
                        className="text-[10px] tracking-[0.4em] uppercase mb-1"
                        style={{ color: item.color }}
                      >
                        {item.year}
                      </p>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TEAM ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-16 bg-black/85 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-14 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow: "0 0 20px rgba(255,51,51,0.4)",
              }}
            >
              The Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamMembers.map((member, i) => (
                <motion.div
                  key={member.name}
                  className="relative rounded-2xl border p-7 overflow-hidden cursor-pointer flex flex-col justify-between"
                  style={{
                    borderColor: `${member.color}25`,
                    background: "linear-gradient(135deg, #080808, #030303)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  whileHover={{
                    borderColor: member.color,
                    boxShadow: `0 0 30px ${member.glow}30`,
                  }}
                  onClick={() => setSelectedTeam(member)}
                >
                  <span
                    className="absolute top-0 left-0 w-6 h-6"
                    style={{
                      borderTop: `2px solid ${member.color}`,
                      borderLeft: `2px solid ${member.color}`,
                    }}
                  />
                  <span
                    className="absolute bottom-0 right-0 w-6 h-6"
                    style={{
                      borderBottom: `2px solid ${member.color}`,
                      borderRight: `2px solid ${member.color}`,
                    }}
                  />

                  <div
                    className="mb-4"
                    style={{
                      color: member.color,
                      filter: `drop-shadow(0 0 8px ${member.glow})`,
                    }}
                  >
                    {member.icon}
                  </div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-1"
                    style={{
                      color: member.color,
                      textShadow: `0 0 10px ${member.glow}`,
                    }}
                  >
                    {member.name}
                  </h3>
                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-4">
                    {member.role}
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {member.desc}
                  </p>
                  <p
                    className="mt-4 text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: `${member.color}70` }}
                  >
                    Tap to meet the team →
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── JOIN US CTA ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl uppercase tracking-wider"
              style={{
                color: "#FFFF00",
                textShadow: "0 0 30px rgba(255,255,0,0.5)",
              }}
            >
              Be Part of the Night
            </h2>
            <p className="text-gray-400 text-base">
              Whether you&apos;re a food vendor, brand, or night owl —
              there&apos;s a place for you at Dine At Night.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => setVendorModalOpen(true)}
                className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-black text-sm"
                style={{
                  background: "#FFFF00",
                  boxShadow: "0 0 25px rgba(255,255,0,0.5)",
                }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 45px rgba(255,255,0,0.7)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                Apply to Vend
              </motion.button>
              <Link href="/contact">
                <motion.button
                  className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-[#00FF41] text-[#00FF41]"
                  style={{ boxShadow: "0 0 15px rgba(0,255,65,0.3)" }}
                  whileHover={{
                    scale: 1.04,
                    boxShadow: "0 0 30px rgba(0,255,65,0.6)",
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  Contact Us
                </motion.button>
              </Link>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── MILESTONES Carousel ── */}
      <section className="py-10 px-6 md:px-16 border-t border-white/5 bg-black/75">
        <div className="max-w-3xl mx-auto">
          <Carousel
            title="By The Numbers"
            accentColor="#FFFF00"
            glowColor="rgba(255,255,0,0.4)"
            autoPlayInterval={5000}
            items={[
              {
                id: 1,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(255,255,0,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#FFFF00",
                        textShadow: "0 0 30px rgba(255,255,0,0.6)",
                      }}
                    >
                      850+
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      Tickets Sold — Edition 1
                    </p>
                  </div>
                ),
              },
              {
                id: 2,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(255,51,51,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#FF3333",
                        textShadow: "0 0 30px rgba(255,51,51,0.6)",
                      }}
                    >
                      90%
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      Vendors Sold Out
                    </p>
                  </div>
                ),
              },
              {
                id: 3,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(0,255,65,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#00FF41",
                        textShadow: "0 0 30px rgba(0,255,65,0.6)",
                      }}
                    >
                      100%
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      Vendor Return Rate
                    </p>
                  </div>
                ),
              },
              {
                id: 4,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(255,255,0,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#FFFF00",
                        textShadow: "0 0 30px rgba(255,255,0,0.6)",
                      }}
                    >
                      20K+
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      Instagram Followers
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <Footer />
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />
      {selectedTeam && (
        <TeamModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
