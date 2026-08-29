import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Reveal } from "./Reveal";
import {
  scrollState,
  subscribeScroll,
  setPassIndex,
  setPassDrag,
  endPassDrag,
} from "@/lib/rausch-scroll";
import { PassBookingModal, PassTier } from "./PassBookingModal";

/* ---------------------------------- Nav ---------------------------------- */

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [passesBlend, setPassesBlend] = useState(0);
  const [bookingTier, setBookingTier] = useState<PassTier | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    const onScroll = () => {
      setSolid(window.scrollY > 50);
      setPassesBlend(scrollState.passesBlend);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleSelectTier = async (tier: PassTier) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      window.location.href = "/login";
      return;
    }
    setBookingTier(tier);
  };

  const navLinks = [
    ["Manifesto", "#manifesto"],
    ["Passes", "#passes"],
    ["Venue", "#venue"],
    ["Rules", "#rules"],
    [user ? "My Passes" : "Sign In", user ? "/purchases" : "/login"],
  ];

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-700 pointer-events-auto"
        style={{
          backdropFilter: solid && passesBlend < 0.2 ? "blur(20px)" : "none",
          borderBottom:
            solid && passesBlend < 0.2 ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
          background: solid && passesBlend < 0.2 ? "rgba(7, 8, 11, 0.85)" : "transparent",
          opacity: Math.max(0.12, 1 - passesBlend * 0.88),
          pointerEvents: passesBlend > 0.6 ? "none" : "auto",
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-14 lg:px-20">
          <a href="#top" className="flex items-center hover:opacity-80 transition-opacity">
            <img
              src="/images/rausch-logo.png"
              alt="RAUSCH"
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </a>

          <div className="hidden items-center gap-10 md:flex">
            {navLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a
              href={user ? "/purchases" : "/login"}
              className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-[0.25em] text-silver hover:text-white transition-colors"
            >
              {user ? "My Passes" : "Sign In"}
            </a>
            <button
              onClick={() => handleSelectTier("general")}
              className="border border-white/20 px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground transition-all hover:bg-white hover:text-black cursor-pointer"
            >
              Reserve Pass
            </button>
          </div>
        </nav>
      </header>

      {bookingTier && (
        <PassBookingModal
          isOpen={true}
          initialTier={bookingTier}
          onClose={() => setBookingTier(null)}
        />
      )}
    </>
  );
}

/* --------------------------------- Hero ---------------------------------- */

export function Hero() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const onScroll = () => setT(Math.min(1, window.scrollY / (window.innerHeight || 1)));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-between px-6 pb-10 pt-36 md:px-14 lg:px-20"
    >
      <div
        className="pointer-events-none flex flex-1 flex-col justify-center my-auto"
        style={{
          opacity: 1 - t * 1.3,
          transform: `translate3d(0, ${t * -50}px, 0)`,
        }}
      >
        <div className="max-w-4xl">
          <Reveal delay={80}>
            <div className="font-serif italic text-sm md:text-base tracking-[0.38em] text-silver/80 uppercase">
              One Day. One Feeling. A Legacy.
            </div>
          </Reveal>

          <Reveal delay={200} y={30}>
            <div className="mt-4 -ml-1 relative inline-block">
              <img
                src="/images/rausch-logo.png"
                alt="RAUSCH"
                className="relative z-10 w-[88vw] sm:w-[74vw] md:w-[62vw] lg:w-[48rem] max-w-full h-auto object-contain select-none"
              />
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-6">
              <p className="font-sans text-xs tracking-[0.24em] text-muted-foreground uppercase leading-relaxed max-w-md">
                The biggest teen party ever witnessed · Hyderabad
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div
        className="flex items-end justify-between border-t border-white/10 pt-6"
        style={{ opacity: 1 - t * 1.5 }}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/80">
          Chapter I · Hyderabad
        </span>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/60">
            Scroll
          </span>
          <span className="h-px w-10 bg-silver/40" />
        </div>

        <span />
      </div>
    </section>
  );
}

/* ------------------------------- Marquee --------------------------------- */

export function MarqueeStrip() {
  return (
    <div className="border-y border-white/10 py-4 overflow-hidden select-none">
      <div className="flex w-max animate-drift gap-16 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground/50">
        {[1, 2, 3].map((i) => (
          <span key={i} className="flex items-center gap-16">
            <span>HYDERABAD</span>
            <span className="text-silver/40">✦</span>
            <span>UNLIMITED FOOD & MOCKTAILS</span>
            <span className="text-silver/40">✦</span>
            <span>MONOCHROME LASER MATRIX</span>
            <span className="text-silver/40">✦</span>
            <span>HIGH-VOLTAGE SOUND</span>
            <span className="text-silver/40">✦</span>
            <span>ONE DAY ONE ECLIPSE</span>
            <span className="text-silver/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Manifesto -------------------------------- */

export function Manifesto() {
  const quoteWords =
    "Some moments don't ask permission — they become memory before they end.".split(" ");

  const ref = useRef<HTMLParagraphElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const end = window.innerHeight * 0.18;
      setP(Math.min(1, Math.max(0, (start - r.top) / (start - end))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="manifesto" className="relative mx-auto max-w-7xl px-6 py-[24vh] md:px-14 lg:px-20">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8">
          <Reveal>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-silver/80">
              01 ✦ The Manifesto
            </div>
          </Reveal>

          <blockquote
            ref={ref}
            className="text-display mt-8 text-[8vw] sm:text-5xl md:text-6xl lg:text-[4rem] leading-[1.1] font-light"
          >
            <span className="text-silver/30 font-serif">“</span>
            {quoteWords.map((w, i) => {
              const threshold = i / quoteWords.length;
              const lit = p > threshold;
              return (
                <span
                  key={`${w}-${i}`}
                  className="transition-all duration-700"
                  style={{
                    color: lit ? "var(--foreground)" : "rgba(255,255,255,0.18)",
                    textShadow: lit ? "0 0 35px rgba(255,255,255,0.2)" : "none",
                  }}
                >
                  {w}{" "}
                </span>
              );
            })}
            <span className="text-silver/30 font-serif">”</span>
          </blockquote>

          <Reveal delay={200} className="mt-12 max-w-xl">
            <p className="font-sans text-sm leading-[2] text-muted-foreground">
              Sound that moves through the floor, subterranean acoustic precision, and a
              high-voltage crowd that becomes one organism. Built strictly for teens with zero
              alcohol, limitless craft mocktails, gourmet food, and laser matrices.
            </p>
          </Reveal>

          <Reveal delay={350} className="mt-12 flex items-center gap-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground/60">
              Powered by
            </div>
            <a
              href="https://ironoak.site"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-2xl tracking-[0.25em] text-foreground hover:text-silver transition-colors"
            >
              IRONOAK ↗
            </a>
          </Reveal>
        </div>

        <div className="hidden lg:block lg:col-span-4 lg:pt-20 space-y-10">
          <div className="border-l border-white/15 pl-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-silver">
              Acoustics
            </div>
            <div className="mt-2 font-sans text-xs text-muted-foreground">
              Subterranean Acoustic Rig · 128 BPM
            </div>
          </div>
          <div className="border-l border-white/15 pl-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-silver">
              Hospitality
            </div>
            <div className="mt-2 font-sans text-xs text-muted-foreground">
              Unlimited Food & Mocktails Included
            </div>
          </div>
          <div className="border-l border-white/15 pl-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-silver">
              Aesthetic
            </div>
            <div className="mt-2 font-sans text-xs text-muted-foreground">
              Matte Black · Cosmic Luxury
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------ Eclipse Pass Selector (Single Active Pass Architecture) ------------------ */

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/dir//TOS+Club+%26+Lounge,+5th+floor,+Hotel+Vinflora+Residency,+Srinagar+Colony+Main+Rd,+Sri+Nagar+Colony,+Kamalapuri+Colony,+Banjara+Hills,+Hyderabad,+Telangana+500045/@17.4796031,78.3728449,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bcb918e56be1361:0xbf4dd2965cd48c4a!2m2!1d78.4296226!2d17.4296587?entry=ttu&g_ep=EgoyMDI2MDgyNC4wIKXMDSoASAFQAw%3D%3D";

const INSTAGRAM_URL = "https://www.instagram.com/rausch.hyd/?hl=en";

export function Passes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bookingTier, setBookingTier] = useState<PassTier | null>(null);

  const handleSelectTier = async (tier: PassTier) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      window.location.href = "/login";
      return;
    }
    setBookingTier(tier);
  };

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalH = el.offsetHeight - vh;

      if (rect.top <= 0 && rect.bottom >= vh) {
        scrollState.passesBlend = 1.0;
        const scrollProg = Math.max(0, Math.min(1, -rect.top / totalH));
        scrollState.targetTimeline = scrollProg;
        scrollState.passTimeline = scrollProg;
      } else if (rect.top > 0 && rect.top < vh) {
        const entryProgress = 1 - rect.top / vh;
        scrollState.passesBlend = entryProgress * entryProgress * (3 - 2 * entryProgress);
        scrollState.targetTimeline = 0.0;
      } else if (rect.bottom < vh && rect.bottom > 0) {
        const exitProgress = rect.bottom / vh;
        scrollState.passesBlend = exitProgress * exitProgress * (3 - 2 * exitProgress);
        scrollState.targetTimeline = 1.0;
      } else {
        scrollState.passesBlend = 0.0;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <section ref={containerRef} id="passes" className="relative select-none">
        {/* 1. TIER 01: GENERAL (Positioned on the RIGHT) */}
        <div className="min-h-screen flex items-center justify-end px-6 py-24 md:px-14 lg:px-24">
          <div className="w-full max-w-lg text-right">
            <Reveal>
              <div className="font-mono text-[9px] sm:text-[10px] text-silver/60 tracking-[0.4em] uppercase">
                01 // GENERAL ADMISSION
              </div>
              <h2 className="text-display mt-2 text-6xl sm:text-7xl md:text-8xl font-light text-foreground leading-none tracking-tight">
                GENERAL
              </h2>
              <div className="text-display mt-3 text-4xl sm:text-5xl font-light text-silver tracking-tight">
                ₹1,199
              </div>
              <div className="mt-6 space-y-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] text-foreground/80 flex flex-col items-end">
                <div>MAIN FLOOR ACCESS</div>
                <div>UNLIMITED FOOD & CRAFT MOCKTAILS</div>
                <div>MONOCHROME LASER MATRIX</div>
                <div className="text-muted-foreground">+ HIGH-VOLTAGE SOUND RIG</div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => handleSelectTier("general")}
                  className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white hover:text-silver transition-colors cursor-pointer"
                >
                  <span className="border-b border-white/40 group-hover:border-white pb-1 transition-colors">
                    RESERVE GENERAL
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 2. TIER 02: VIP ACCESS (Positioned on the LEFT) */}
        <div className="min-h-screen flex items-center justify-start px-6 py-24 md:px-14 lg:px-24">
          <div className="w-full max-w-lg text-left">
            <Reveal>
              <div className="font-mono text-[9px] sm:text-[10px] text-silver/60 tracking-[0.4em] uppercase">
                02 // INNER ORBIT · VIP
              </div>
              <h2 className="text-display mt-2 text-6xl sm:text-7xl md:text-8xl font-light text-foreground leading-none tracking-tight">
                VIP ACCESS
              </h2>
              <div className="text-display mt-3 text-4xl sm:text-5xl font-light text-silver tracking-tight">
                ₹1,699
              </div>
              <div className="mt-6 space-y-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] text-foreground/80 flex flex-col items-start">
                <div>EXCLUSIVE VIP LOUNGE ACCESS</div>
                <div>DEDICATED TABLE & BOUNCER SERVICE</div>
                <div>UNLIMITED FOOD & CRAFT MOCKTAILS</div>
                <div className="text-muted-foreground">+ PRIORITY ZERO-QUEUE ENTRY</div>
              </div>
              <div className="mt-8 flex justify-start">
                <button
                  onClick={() => handleSelectTier("vip")}
                  className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white hover:text-silver transition-colors cursor-pointer"
                >
                  <span className="border-b border-white group-hover:border-silver pb-1 transition-colors font-semibold">
                    ENTER VIP ACCESS
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 3. TIER 03: COUPLE GENERAL (Positioned on the RIGHT) */}
        <div className="min-h-screen flex items-center justify-end px-6 py-24 md:px-14 lg:px-24">
          <div className="w-full max-w-lg text-right">
            <Reveal>
              <div className="font-mono text-[9px] sm:text-[10px] text-silver/60 tracking-[0.4em] uppercase">
                03 // COUPLE ADMISSION
              </div>
              <h2 className="text-display mt-2 text-5xl sm:text-6xl md:text-7xl font-light text-foreground leading-none tracking-tight">
                COUPLE GENERAL
              </h2>
              <div className="text-display mt-3 text-4xl sm:text-5xl font-light text-silver tracking-tight">
                ₹2,299
              </div>
              <div className="mt-6 space-y-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] text-foreground/80 flex flex-col items-end">
                <div>2X GENERAL PASSES (1 GUY + 1 GIRL)</div>
                <div>FULL MAIN FLOOR & LASER MATRIX</div>
                <div>UNLIMITED FOOD & CRAFT MOCKTAILS</div>
                <div className="text-muted-foreground">+ EXPRESS COUPLE GATE ENTRY</div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => handleSelectTier("couple_general")}
                  className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white hover:text-silver transition-colors cursor-pointer"
                >
                  <span className="border-b border-white/40 group-hover:border-white pb-1 transition-colors">
                    RESERVE COUPLE GENERAL
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 4. TIER 04: COUPLE VIP (Positioned in the MIDDLE with Eclipse) */}
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 md:px-14 lg:px-24">
          <div className="w-full max-w-2xl mx-auto">
            <Reveal>
              <div className="font-mono text-[9px] sm:text-[10px] text-silver/70 tracking-[0.45em] uppercase">
                04 // ECLIPSE TIER · COUPLE VIP
              </div>
              <h2 className="text-display mt-2 text-5xl sm:text-7xl md:text-8xl font-light text-white leading-none tracking-tight">
                COUPLE VIP
              </h2>
              <div className="text-display mt-3 text-4xl sm:text-5xl font-light text-silver">
                ₹3,299
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.22em] text-silver/80 max-w-xl mx-auto">
                <span>2X VIP ACCESS PASSES</span>
                <span className="text-white/20">✦</span>
                <span>VIP SANCTUARY LOUNGE</span>
                <span className="text-white/20">✦</span>
                <span>DEDICATED TABLE & BOUNCER</span>
                <span className="text-white/20">✦</span>
                <span>LIMITLESS GOURMET DINING</span>
              </div>
              <div className="mt-10">
                <button
                  onClick={() => handleSelectTier("couple_vip")}
                  className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-white hover:text-silver transition-colors cursor-pointer"
                >
                  <span className="border-b border-white/60 group-hover:border-white pb-1 transition-colors">
                    RESERVE COUPLE VIP
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {bookingTier && (
        <PassBookingModal
          isOpen={true}
          initialTier={bookingTier}
          onClose={() => setBookingTier(null)}
        />
      )}
    </>
  );
}

/* --------------------------- Venue & Date / Time -------------------------- */

export function VenueSection() {
  return (
    <section id="venue" className="relative mx-auto max-w-7xl px-6 py-[20vh] md:px-14 lg:px-20">
      <div className="grid lg:grid-cols-12 gap-12 items-start border-t border-white/10 pt-16">
        <div className="lg:col-span-7 space-y-8">
          <Reveal>
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-silver/80">
              04 ✦ The Stage
            </span>
            <h2 className="text-display mt-4 text-5xl sm:text-7xl font-light leading-none">
              TOS Club & Lounge
            </h2>
            <p className="mt-6 font-sans text-sm leading-relaxed text-muted-foreground max-w-xl">
              5th floor, Hotel Vinflora Residency, Srinagar Colony Main Rd, Kamalapuri Colony,
              Banjara Hills, Hyderabad. A premier high-energy sanctuary featuring elevated tiers,
              state-of-the-art acoustic precision, and VIP lounges.
            </p>
          </Reveal>

          <Reveal delay={200} className="grid sm:grid-cols-2 gap-8 pt-4">
            <div className="border-l border-white/15 pl-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-silver">
                ACE OF SOUND
              </div>
              <div className="mt-1 font-sans text-xs text-muted-foreground">
                High-Voltage Acoustic Rig · 128 BPM
              </div>
            </div>
            <div className="border-l border-white/15 pl-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-silver">
                KING OF LAYOUT
              </div>
              <div className="mt-1 font-sans text-xs text-muted-foreground">
                Main Dancefloor & VIP Lounges
              </div>
            </div>
            <div className="border-l border-white/15 pl-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-silver">
                QUEEN OF VISUALS
              </div>
              <div className="mt-1 font-sans text-xs text-muted-foreground">
                Monochrome Laser Grid
              </div>
            </div>
            <div className="border-l border-white/15 pl-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-silver">
                JACK OF TIMINGS
              </div>
              <div className="mt-1 font-sans text-xs text-muted-foreground">
                Day Gathering Energy
              </div>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-5 border-l border-white/10 lg:pl-12 space-y-10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-silver">
              Location & Address
            </div>
            <div className="text-display mt-3 text-2xl sm:text-3xl text-foreground font-light leading-snug">
              TOS Club & Lounge
            </div>
            <p className="mt-2 font-sans text-xs text-muted-foreground leading-relaxed">
              5th Floor, Hotel Vinflora Residency, Srinagar Colony Main Rd, Banjara Hills,
              Hyderabad, Telangana 500045
            </p>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Direct Navigation
            </div>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 font-mono text-[10px] uppercase tracking-[0.25em] border border-white/30 text-foreground transition-all hover:bg-white hover:text-black"
            >
              <span>Open in Google Maps</span>
              <span>↗</span>
            </a>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Gate Protocol
            </div>
            <p className="font-sans text-xs leading-relaxed text-muted-foreground">
              Instant 2-second QR scan at the entrance. No apps, no logins, zero queues.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- House Rules (Typographic Ledger) ---------------------------------- */

const RULES_DATA = [
  {
    index: "01",
    topic: "LOCATION",
    title: "Where is the event located?",
    details:
      "TOS Club & Lounge, 5th Floor, Hotel Vinflora Residency, Srinagar Colony Main Rd, Kamalapuri Colony, Banjara Hills, Hyderabad, Telangana 500045. Tap 'Open in Google Maps' above for direct navigation.",
  },
  {
    index: "02",
    topic: "PASSES & PRICING",
    title: "What are the pass options?",
    details:
      "General (Standard) ₹1,199 · VIP Access ₹1,699 · Couple General ₹2,299 · Couple VIP ₹3,299. All passes include unlimited gourmet food and craft mocktails.",
  },
  {
    index: "03",
    topic: "REFUNDS",
    title: "What is the refund policy?",
    details:
      "Passes are strictly non-refundable and limited in capacity. Each pass is a unique verified digital access credential.",
  },
  {
    index: "04",
    topic: "ENTRY",
    title: "How does gate check-in work?",
    details:
      "Show your pass QR link at the door. Scanned in under 2 seconds. No apps to download, no account logins, zero queues.",
  },
  {
    index: "05",
    topic: "SAFETY",
    title: "Is alcohol permitted?",
    details:
      "Strictly no alcohol. RAUSCH is an exclusive, safe party engineered for teens with unlimited gourmet food, craft mocktails, and professional security.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="rules" className="relative mx-auto max-w-7xl px-6 py-[22vh] md:px-14 lg:px-20">
      <div className="border-b border-white/10 pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-silver/80">
          05 ✦ The Deal
        </span>
        <h2 className="text-display mt-4 text-5xl sm:text-7xl md:text-8xl leading-none font-light">
          House Rules & Info
        </h2>
      </div>

      <div className="divide-y divide-white/10">
        {RULES_DATA.map((r, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={r.index} className="py-8 transition-colors">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-baseline justify-between text-left group"
              >
                <div className="flex items-baseline gap-6 sm:gap-10">
                  <span className="font-mono text-xs text-silver/50 tracking-widest">
                    {r.index}
                  </span>
                  <h3 className="text-display text-2xl sm:text-3xl md:text-4xl font-light text-foreground group-hover:text-white transition-colors">
                    {r.title}
                  </h3>
                </div>
                <span className="font-mono text-xs text-silver/60 pl-4">{isOpen ? "—" : "+"}</span>
              </button>

              <div
                className="grid transition-all duration-500 ease-out"
                style={{
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="overflow-hidden pl-10 sm:pl-16 pt-4 max-w-2xl">
                  <p className="font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {r.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------- Closing --------------------------------- */

export function Closing() {
  return (
    <section
      id="closing"
      className="relative flex min-h-[92svh] flex-col items-center justify-center px-6 text-center md:px-12"
    >
      <Reveal>
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-silver/70">
          06 ✦ The Ritual
        </span>
      </Reveal>

      <Reveal delay={150} y={30}>
        <h2 className="text-display mt-8 text-[12vw] sm:text-7xl md:text-8xl font-light leading-[0.9]">
          Be there when
          <br />
          the sky opens
        </h2>
      </Reveal>

      <Reveal delay={300}>
        <p className="mt-8 max-w-md font-sans text-xs uppercase leading-relaxed tracking-[0.25em] text-muted-foreground">
          TOS Club & Lounge · Hyderabad · Unlimited Food & Mocktails
        </p>
      </Reveal>

      <Reveal delay={450}>
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 font-mono text-[10px] uppercase tracking-[0.3em] text-background bg-foreground font-semibold hover:bg-silver transition-all"
          >
            Follow @rausch.hyd on Instagram
          </a>
          <a
            href="#passes"
            className="px-8 py-4 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground border border-white/30 hover:border-white transition-all"
          >
            View Passes
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/* --------------------------------- Footer --------------------------------- */

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 py-16 px-6 md:px-14 lg:px-20">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
        <div>
          <img
            src="/images/rausch-logo.png"
            alt="RAUSCH"
            className="h-9 sm:h-11 w-auto object-contain mb-3"
          />
          <p className="mt-3 font-sans text-xs text-muted-foreground max-w-sm leading-relaxed">
            TOS Club & Lounge, Banjara Hills, Hyderabad. The biggest teen party ever witnessed.
            General ₹1,199 · VIP ₹1,699 · Couples from ₹2,299. Unlimited food & mocktails.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 font-mono text-[11px] text-silver hover:text-white transition-colors"
          >
            Instagram: @rausch.hyd ↗
          </a>
        </div>

        <div className="font-mono text-xs text-muted-foreground space-y-2">
          <div className="text-foreground font-semibold">◈ Powered by</div>
          <a
            href="https://ironoak.site"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-silver hover:text-foreground transition-colors underline underline-offset-4"
          >
            IRONOAK (ironoak.site)
          </a>
          <div className="text-[10px] text-muted-foreground/60">
            © IRONOAK. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
