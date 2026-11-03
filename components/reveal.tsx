"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  as?: "section" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Añade la clase `in` cuando el elemento entra en el viewport (y deja de observarlo).
// Las reglas CSS de `.reveal` solo ocultan con JS activo (`@media (scripting: enabled)`).
export function Reveal({ as: Tag = "section", className = "", style, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={"reveal " + className}
      style={style}
    >
      {children}
    </Tag>
  );
}
