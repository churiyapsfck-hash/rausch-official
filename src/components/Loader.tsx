import { useEffect, useRef, useState } from "react";
import { setIntroState } from "@/lib/rausch-scroll";

/**
 * Storyboard (Guaranteed Single Run):
 * 1. Pitch black void (silence).
 * 2. 3D Moon fades in smoothly in center.
 * 3. Edge light array spins half a circle (~180°) around the moon.
 * 4. Moon and light fade off completely into pitch black.
 * 5. Title RAUSCH has a silky smooth fade-in from the void with cosmic glow.
 * 6. Website opens directly right after into the hero scene.
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<
    "pitch_black" | "moon_fade_in" | "light_spin" | "moon_fade_out" | "rausch" | "open"
  >("pitch_black");

  const hasStarted = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // 1. Initial State: 100% Pitch Black silence
    setIntroState("pitch_black", 0, -Math.PI / 2);

    // 2. 3D Moon Fades In from Pitch Black
    const t1 = setTimeout(() => {
      setPhase("moon_fade_in");
      const startTime = performance.now();
      const fadeInDuration = 900;

      const animateFadeIn = (now: number) => {
        const p = Math.min(1, (now - startTime) / fadeInDuration);
        const eased = p * p * (3 - 2 * p);
        setIntroState("moon_fade_in", eased, -Math.PI / 2);

        if (p < 1) {
          requestAnimationFrame(animateFadeIn);
        }
      };
      requestAnimationFrame(animateFadeIn);
    }, 350);

    // 3. Edge Light Spins Half Circle (~180°) around the moon
    const t2 = setTimeout(() => {
      setPhase("light_spin");
      const startTime = performance.now();
      const spinDuration = 1400;

      const animateSpin = (now: number) => {
        const p = Math.min(1, (now - startTime) / spinDuration);
        const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const angle = -Math.PI / 2 + eased * Math.PI; // -90deg to +90deg (180deg)
        setIntroState("light_spin", 1.0, angle);

        if (p < 1) {
          requestAnimationFrame(animateSpin);
        }
      };
      requestAnimationFrame(animateSpin);
    }, 1300);

    // 4. Moon and Light Fade Off Completely into Pitch Black
    const t3 = setTimeout(() => {
      setPhase("moon_fade_out");
      const startTime = performance.now();
      const fadeOutDuration = 650;

      const animateFadeOut = (now: number) => {
        const p = Math.min(1, (now - startTime) / fadeOutDuration);
        const eased = 1 - p * p * (3 - 2 * p);
        setIntroState("moon_fade_out", eased, Math.PI / 2);

        if (p < 1) {
          requestAnimationFrame(animateFadeOut);
        }
      };
      requestAnimationFrame(animateFadeOut);
    }, 2750);

    // 5. Title RAUSCH Smoothly Fades In from the Pitch Black Void
    const t4 = setTimeout(() => {
      setPhase("rausch");
      setIntroState("rausch", 0);
    }, 3500);

    // 6. Direct Website Open right after RAUSCH appears
    const t5 = setTimeout(() => {
      setPhase("open");
      setIntroState("done", 1.0);
      setTimeout(() => {
        onDoneRef.current();
      }, 750);
    }, 4600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const isRauschVisible = phase === "rausch" || phase === "open";
  const isCurtainTransparent = phase === "moon_fade_in" || phase === "light_spin";

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center select-none pointer-events-none transition-opacity duration-700 ${
        phase === "open" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Blackout Curtain during Moon phase and RAUSCH reveal */}
      {phase !== "open" && (
        <div
          className={`absolute inset-0 bg-[#030406] transition-opacity duration-300 ${
            isCurtainTransparent ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* RAUSCH Title - Silky Smooth Cinema Fade-In with Cosmic Glow */}
      <div
        className="relative z-10 flex flex-col items-center justify-center px-6 transition-all duration-[800ms]"
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          opacity: isRauschVisible ? 1 : 0,
          transform: isRauschVisible ? "scale(1)" : "scale(0.96)",
        }}
      >
        <div className="relative inline-block">
          <img
            src="/images/rausch-logo.png"
            alt="RAUSCH"
            className="relative z-10 w-[84vw] sm:w-[58vw] md:w-[44vw] max-w-[480px] h-auto object-contain select-none"
          />
        </div>

        <div
          className="mt-8 font-mono text-[9px] uppercase tracking-[0.45em] text-silver/60 transition-opacity duration-[1000ms] delay-150"
          style={{
            opacity: isRauschVisible ? 1 : 0,
          }}
        >
          HYDERABAD · ONE DAY ONLY
        </div>
      </div>
    </div>
  );
}
