import { useEffect } from "react";
import Lenis from "lenis";
import { readScroll, scrollState } from "@/lib/rausch-scroll";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isMobile = window.innerWidth < 768 || "ontouchstart" in window;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let raf = 0;

    if (!reduced) {
      // Butter-smooth momentum inertia scroll for both mobile touch and desktop wheel
      lenis = new Lenis({
        duration: isMobile ? 0.95 : 1.2,
        lerp: isMobile ? 0.12 : 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: isMobile ? 1.1 : 1.3,
        syncTouch: true,
      });

      const loop = (time: number) => {
        lenis?.raf(time);
        readScroll();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      const onScroll = () => readScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      readScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Subtle gyro tilt parallax for mobile devices
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const targetX = Math.max(-1, Math.min(1, e.gamma / 30));
        const targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
        scrollState.pointerX += (targetX - scrollState.pointerX) * 0.1;
        scrollState.pointerY += (targetY - scrollState.pointerY) * 0.1;
      }
    };

    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrientation);
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
