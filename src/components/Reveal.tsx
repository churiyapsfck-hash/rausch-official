import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p";
};

/** Scroll-triggered cinematic reveal: fade + rise + slight blur lift. */
export function Reveal({ children, delay = 0, y = 28, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        filter: shown ? "blur(0px)" : "blur(10px)",
        transition: `opacity 1100ms var(--ease-cinema) ${delay}ms, transform 1200ms var(--ease-cinema) ${delay}ms, filter 1100ms var(--ease-cinema) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
