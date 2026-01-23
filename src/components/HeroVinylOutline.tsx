import { useEffect, useState } from "react";

interface HeroVinylOutlineProps {
  /** Match RollingVinylLogo's responsive sizing */
  sizePx?: number;
  /** Where the center should sit as % of viewport width */
  centerLeftPercent?: number;
}

const getResponsiveSize = () => {
  const vw = window.innerWidth;
  if (vw < 480) return 80;
  if (vw < 640) return 100;
  if (vw < 768) return 120;
  if (vw < 1024) return 150;
  return 195;
};

export function HeroVinylOutline({
  sizePx,
  centerLeftPercent = 21,
}: HeroVinylOutlineProps) {
  const [size, setSize] = useState<number>(() => sizePx ?? getResponsiveSize());

  useEffect(() => {
    if (typeof sizePx === "number") {
      setSize(sizePx);
      return;
    }

    const onResize = () => setSize(getResponsiveSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sizePx]);

  return (
    <div
      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-[5]"
      style={{
        left: `${centerLeftPercent}%`,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        opacity: 0.15,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
      }}
      aria-hidden="true"
    >
      {/* Outline-only vinyl to match the rolling vinyl's resting spot */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle
          cx="100"
          cy="100"
          r="98"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          opacity="0.9"
        />
        <circle cx="100" cy="100" r="92" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4" />
        <circle cx="100" cy="100" r="87" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35" />
        <circle cx="100" cy="100" r="82" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4" />
        <circle cx="100" cy="100" r="77" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35" />
        <circle cx="100" cy="100" r="72"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          opacity="0.4"
        />
        <circle cx="100" cy="100" r="67" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4" />
        <circle cx="100" cy="100" r="57" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35" />
        <circle cx="100" cy="100" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4" />
        <circle cx="100" cy="100" r="47" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.35" />

        {/* Simple label ring + spindle */}
        <circle cx="100" cy="100" r="38" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.18" />
        <circle cx="100" cy="100" r="5" fill="hsl(var(--primary))" opacity="0.18" />
      </svg>
    </div>
  );
}
