import { useEffect, useRef, useState, type ReactNode, type ElementType, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
  /** Distance to translate from in px */
  y?: number;
  /** Animation duration in ms */
  duration?: number;
  /** Trigger only once (default true) */
  once?: boolean;
}

/**
 * Fade + slide-up on scroll. Respects prefers-reduced-motion.
 */
export const Reveal = ({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  y = 18,
  duration = 600,
  once = true,
}: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const style: CSSProperties = {
    transitionProperty: "opacity, transform",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: `${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : `translateY(${y}px)`,
    willChange: "opacity, transform",
  };

  return (
    <Tag ref={ref as never} className={cn(className)} style={style}>
      {children}
    </Tag>
  );
};

export default Reveal;