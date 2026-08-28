import { Suspense, useEffect, useState } from "react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SmoothScroll>
      <Atmosphere />

      {mounted && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <Suspense fallback={null}>
            <MoonScene />
          </Suspense>
        </div>
      )}

      <div className="relative z-10">
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
  );
}
