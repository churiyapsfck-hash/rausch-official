import { useEffect, useRef, useState } from "react";
import { setIntroState } from "@/lib/rausch-scroll";

/**
 * Storyboard:
 * 1. Step 1 (0 - 1.6s): Black void -> Glowing RAUSCH chrome logo smoothly fades in at center.
 * 2. Step 2 (1.6s - 3.2s): RAUSCH dissolves -> Glowing 3D Moon appears in center with radiant edge lighting.
 * 3. Step 3 (3.2s - 4.2s): Moon glides smoothly into its Hero position as blackout curtain dissolves.
 * 4. Step 4 (4.2s+): Live website active!
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"rausch" | "moon" | "open">("rausch");
  const hasStarted = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Step 1: RAUSCH title in pitch black void
    setIntroState("rausch", 0, -Math.PI / 2);

    // Step 2: Transition from RAUSCH to 3D Moon in Center
    const t1 = setTimeout(() => {
      setPhase("moon");
      setIntroState("light_spin", 1.0, 0);
    }, 1500);

    // Step 3: Moon glides to Hero position and site reveals
    const t2 = setTimeout(() => {
      setPhase("open");
      setIntroState("done", 1.0);
      onDoneRef.current();
    }, 3200);

    // Quick bypass on user tap/scroll
    const handleBypass = () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setPhase("open");
      setIntroState("done", 1.0);
      onDoneRef.current();
    };

    window.addEventListener("pointerdown", handleBypass, { once: true });
    window.addEventListener("wheel", handleBypass, { once: true });
    window.addEventListener("touchstart", handleBypass, { once: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("pointerdown", handleBypass);
      window.removeEventListener("wheel", handleBypass);
      window.removeEventListener("touchstart", handleBypass);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center select-none pointer-events-none transition-opacity duration-1000 ${
        phase === "open" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Blackout curtain behind intro */}
      <div
        className={`absolute inset-0 bg-[#030406] transition-opacity duration-700 ${
          phase === "moon" ? "opacity-0" : phase === "open" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* RAUSCH Title - Smooth Cinema Fade-In & Out */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center px-6 transition-all duration-700 ${
          phase === "rausch" ? "opacity-100 scale-100 filter blur-0" : "opacity-0 scale-105 filter blur-md"
        }`}
      >
        <div className="relative inline-block">
          <div
            className="absolute -inset-10 -z-10 rounded-full opacity-60 blur-3xl pointer-events-none select-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(220, 235, 255, 0.4) 0%, rgba(140, 185, 255, 0.15) 50%, transparent 80%)",
            }}
          />
          <img
            src="/images/rausch-logo.png"
            alt="RAUSCH"
            className="relative z-10 w-[84vw] sm:w-[58vw] md:w-[44vw] max-w-[480px] h-auto object-contain select-none filter drop-shadow-[0_0_35px_rgba(255,255,255,0.35)]"
          />
        </div>

        <div className="mt-8 font-mono text-[9px] uppercase tracking-[0.45em] text-silver/70">
          HYDERABAD · ONE DAY ONLY
        </div>
      </div>
    </div>
  );
}
