"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";

// Native-scroll inertia via Lenis. Keeps position: sticky working (no transform
// hijack) and is fully disabled under prefers-reduced-motion, where the browser's
// own scrolling is used instead.
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
