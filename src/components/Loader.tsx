import { useEffect, useRef, useState } from "react";
import { setIntroState } from "@/lib/rausch-scroll";

export function Loader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "open">("intro");
  const hasStarted = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Immediately trigger smooth intro
    setIntroState("light_spin", 1.0, 0);

    const finishIntro = () => {
      setPhase("open");
      setIntroState("done", 1.0);
      onDoneRef.current();
    };

    // Snappy, cinematic 1.2s reveal
    const timer = setTimeout(finishIntro, 1200);

    // Instant bypass on tap/scroll
    const handleInteract = () => {
      clearTimeout(timer);
      finishIntro();
    };

    window.addEventListener("pointerdown", handleInteract, { once: true });
    window.addEventListener("wheel", handleInteract, { once: true });
    window.addEventListener("touchstart", handleInteract, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleInteract);
      window.removeEventListener("wheel", handleInteract);
      window.removeEventListener("touchstart", handleInteract);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center select-none pointer-events-none transition-opacity duration-700 ${
        phase === "open" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Subtle Cosmic Gradient Curtain */}
      <div
        className={`absolute inset-0 bg-[#040507] transition-opacity duration-700 ${
          phase === "open" ? "opacity-0" : "opacity-90"
        }`}
      />

      {/* RAUSCH Title Reveal */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center px-6 transition-all duration-700 ${
          phase === "intro" ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
      >
        <img
          src="/images/rausch-logo.png"
          alt="RAUSCH"
          className="w-[84vw] sm:w-[58vw] md:w-[44vw] max-w-[480px] h-auto object-contain select-none filter drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]"
        />

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.45em] text-silver/80">
          HYDERABAD · TOS CLUB & LOUNGE
        </div>
      </div>
    </div>
  );
}
