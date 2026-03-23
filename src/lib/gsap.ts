import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealOptions {
  y?: number;
  duration?: number;
  delay?: number;
  stagger?: number;
  start?: string;
  children?: boolean; // if true, animate children with stagger
}

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const {
      y = 20,
      duration = 0.8,
      delay = 0,
      stagger = 0.1,
      start = "top 85%",
      children = false,
    } = options;

    const targets = children ? ref.current.children : ref.current;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger: children ? stagger : 0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start,
            once: true,
          },
        },
      );
    });

    return () => ctx.revert();
  }, [options.y, options.duration, options.delay, options.stagger, options.start, options.children]);

  return ref;
}
