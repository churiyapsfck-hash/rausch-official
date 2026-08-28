import { Suspense, useCallback, useEffect, useState } from "react";
import { Loader } from "@/components/Loader";
import { Atmosphere } from "@/components/Atmosphere";
import { SmoothScroll } from "@/components/SmoothScroll";
import MoonScene from "@/components/MoonScene";
import {
  Nav,
  Hero,
  MarqueeStrip,
  Manifesto,
  Passes,
  VenueSection,
  Faq,
  Closing,
  Footer,
} from "@/components/Sections";

export function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const handleDone = useCallback(() => {
    setIntroDone(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Loader onDone={handleDone} />

      <SmoothScroll>
        <Atmosphere />

        {mounted && (
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
            <Suspense fallback={null}>
              <MoonScene />
            </Suspense>
          </div>
        )}

        {/* Website content is completely hidden during the Moon light sweep, and smoothly turns on ONLY after intro */}
        <div
          className={`relative z-10 transition-opacity duration-1000 ease-out ${
            introDone ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Nav />
          <main>
            <Hero />
            <MarqueeStrip />
            <Manifesto />
            <Passes />
            <VenueSection />
            <Faq />
            <Closing />
          </main>
          <Footer />
        </div>
      </SmoothScroll>
    </>
  );
}
