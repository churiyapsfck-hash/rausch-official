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
 * High-Performance Cosmic Atmosphere (Zero Frame Drops):
 * - Smooth 60/120fps hardware canvas without expensive CPU shadowBlur
 * - Soft hardware radial atmospheric haze
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
    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

      const count = mobile ? 80 : 260;
      stars = Array.from({ length: count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * (h * 2.5);
        const depth = Math.random();

        let r: number;
        let baseOpacity: number;
        let speed: number;
        let hasGlint = false;

        if (depth < 0.70) {
          r = 0.6 + Math.random() * 0.4;
          baseOpacity = 0.55 + Math.random() * 0.25;
          speed = 0.05 + Math.random() * 0.08;
        } else if (depth < 0.90) {
          r = 1.0 + Math.random() * 0.4;
          baseOpacity = 0.8 + Math.random() * 0.2;
          speed = 0.12 + Math.random() * 0.12;
        } else {
          r = 1.4 + Math.random() * 0.5;
          baseOpacity = 1.0;
          speed = 0.20 + Math.random() * 0.15;
          hasGlint = true;
        }

        return {
          x,
          y,
          r,
          color: starColors[Math.floor(Math.random() * starColors.length)]!,
          baseOpacity,
          twinkleSpeed: 0.0014 + Math.random() * 0.003,
          twinkleDepth: 0.3 + Math.random() * 0.35,
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

        const tw = 1 - s.twinkleDepth * 0.4 + Math.sin(t * s.twinkleSpeed + s.phase) * (s.twinkleDepth * 0.4);
        const alpha = Math.max(0.15, Math.min(1, s.baseOpacity * tw));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;

        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (s.hasGlint && alpha > 0.5) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.8;
          const glintLen = s.r * 3.2;

          ctx.beginPath();
          ctx.moveTo(s.x - glintLen, y);
          ctx.lineTo(s.x + glintLen, y);
          ctx.moveTo(s.x, y - glintLen);
          ctx.lineTo(s.x, y + glintLen);
          ctx.stroke();
        }
      }

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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#040507]">
      {/* Restrained Smoke Haze */}
      <div
        className="absolute -left-[15%] top-[-5%] h-[75vh] w-[70vw] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(20,30,50,0.6), transparent 70%)",
        }}
      />
      <div
        className="absolute right-[-15%] top-[40%] h-[65vh] w-[60vw] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(15,20,30,0.7), transparent 72%)",
        }}
      />

      {/* Deep Photographic Vignette */}
      <div
        className="absolute inset-0 pointer-events-none opacity-75"
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 45%, rgba(4,5,7,0.85) 100%)",
        }}
      />

      {/* 60/120FPS High Performance Starfield */}
      <canvas ref={canvas} className="absolute inset-0 z-10" />
    </div>
  );
}
