"use client";

import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

type LenisContextValue = {
  lenis: Lenis | null;
  /** Smooth-scroll to a section anchor; falls back to native scroll when
      Lenis is disabled (reduced motion). Offset clears the sticky navbar. */
  scrollToId: (id: string) => void;
};

const LenisContext = createContext<LenisContextValue>({
  lenis: null,
  scrollToId: () => {},
});

export function useLenis() {
  return useContext(LenisContext);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const instance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    setLenis(instance);

    // Pinned sections shift layout once fonts/canvas settle — recompute.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      instance.destroy();
      ScrollTrigger.getAll().forEach(st => st.kill());
      setLenis(null);
    };
  }, []);

  const scrollToId = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: -64 });
    } else {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, [lenis]);

  return (
    <LenisContext.Provider value={{ lenis, scrollToId }}>
      {children}
    </LenisContext.Provider>
  );
}
