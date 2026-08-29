import { useEffect } from "react";
import Lenis from "lenis";
import { readScroll, scrollState } from "@/lib/rausch-scroll";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || window.innerWidth < 768;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let raf = 0;

    if (isTouch || reduced) {
      // 100% native buttery 120Hz hardware scrolling on iOS / Android
      const onScroll = () => readScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      readScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    // Smooth inertia scroll for desktop mouse wheels only
    lenis = new Lenis({
      duration: 1.1,
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      syncTouch: false,
    });

    const loop = (time: number) => {
      lenis?.raf(time);
      readScroll();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
