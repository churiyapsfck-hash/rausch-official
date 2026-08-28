import { useEffect, useRef, useState } from "react";
import { scrollState } from "@/lib/rausch-scroll";

type Star = {
  x: number;
  y: number;
  r: number;
  color: string;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleDepth: number;
  phase: number;
  speed: number;
  hasGlint: boolean;
};

/**
 * Art-directed Cosmic Atmosphere:
 * - Rich sparkling starfield with multi-depth micro-stars & optical glints
 * - Faint graphite/charcoal smoke haze
 * - Microscopic analogue film-grain texture overlay
 * - Deep cinematic vignette
 */
export function Atmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const updateMobile = () => setMobile(window.innerWidth < 768);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];

    const starColors = [
      "#ffffff",
      "#f0f6ff",
      "#e0edff",
      "#d6e6ff",
      "#eee8ff",
      "#fff8ee",
    ];

    const build = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rich, brilliant density: ~200 on mobile, ~420 on desktop
      const count = mobile ? 200 : 420;
      stars = Array.from({ length: count }, (_, i) => {
        const x = Math.random() * w;
        const y = Math.random() * (h * 2.5);
        const depth = Math.random(); // 0 = far, 1 = near

        let r: number;
        let baseOpacity: number;
        let speed: number;
        let hasGlint = false;

        if (depth < 0.60) {
          // 60% distant crisp stars (clearly visible)
          r = 0.55 + Math.random() * 0.4;
          baseOpacity = 0.65 + Math.random() * 0.25;
          speed = 0.05 + Math.random() * 0.08;
        } else if (depth < 0.88) {
          // 28% bright sparkling stars
          r = 0.95 + Math.random() * 0.45;
          baseOpacity = 0.85 + Math.random() * 0.15;
          speed = 0.12 + Math.random() * 0.12;
        } else {
          // 12% luminous crystal focal stars with optical cross glint
          r = 1.35 + Math.random() * 0.55;
          baseOpacity = 1.0;
          speed = 0.22 + Math.random() * 0.15;
          hasGlint = true;
        }

        return {
          x,
          y,
          r,
          color: starColors[Math.floor(Math.random() * starColors.length)]!,
          baseOpacity,
          twinkleSpeed: 0.0014 + Math.random() * 0.0032,
          twinkleDepth: 0.25 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          speed,
          hasGlint,
        };
      });
    };

    build();
    window.addEventListener("resize", build);

    let raf = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const off = scrollState.offset;
      const totalHeight = h * 2.5;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]!;
        const y = (((s.y - off * s.speed) % totalHeight) + totalHeight) % totalHeight;
        if (y > h + 20 || y < -20) continue;

        // Dynamic organic breathing twinkle
        const tw = 1 - s.twinkleDepth * 0.4 + Math.sin(t * s.twinkleSpeed + s.phase) * (s.twinkleDepth * 0.4);
        const alpha = Math.max(0.2, Math.min(1, s.baseOpacity * tw));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.r * 2.2;

        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Brilliant optical diamond cross glint on crystal focal stars
        if (s.hasGlint && alpha > 0.5) {
          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.75;
          ctx.shadowBlur = s.r * 3.5;
          const glintLen = s.r * 3.6;

          ctx.beginPath();
          ctx.moveTo(s.x - glintLen, y);
          ctx.lineTo(s.x + glintLen, y);
          ctx.moveTo(s.x, y - glintLen);
          ctx.lineTo(s.x, y + glintLen);
          ctx.stroke();

          // Luminous soft corona aura
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath();
          ctx.arc(s.x, y, s.r * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
    };
  }, [mobile]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Restrained black-on-black smoke haze */}
      <div
        className="absolute -left-[15%] top-[-5%] h-[85vh] w-[80vw] animate-drift rounded-full opacity-20 blur-[160px]"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, color-mix(in oklab, var(--navy) 60%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute right-[-15%] top-[40%] h-[75vh] w-[70vw] animate-drift rounded-full opacity-15 blur-[180px]"
        style={{
          animationDelay: "-14s",
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--charcoal) 75%, transparent), transparent 72%)",
        }}
      />

      {/* Deep Photographic Vignette (behind stars so stars remain 100% luminous everywhere) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 40%, color-mix(in oklab, var(--void) 85%, transparent) 100%)",
        }}
      />

      {/* Microscopic Analogue Film Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Brilliant High-Luminosity Starfield (Rendered on top of haze & vignette) */}
      <canvas ref={canvas} className="absolute inset-0 z-10" />
    </div>
  );
}
