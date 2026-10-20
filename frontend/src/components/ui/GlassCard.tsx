import React, { useRef, useState, forwardRef } from "react";
import { GlassCard as GlaceGlassCard } from "glaceui";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlight?: boolean;
  spotlightSize?: number;
  spotlightOpacity?: number;
  interactive?: boolean;
  sheen?: boolean;
  tone?: "dark" | "light";
  radius?: number;
}

/**
 * Enhanced GlassCard with WyberAi-inspired luminous translucency
 * and live cursor spotlight & border illumination.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  {
    children,
    className = "",
    spotlight = true,
    spotlightSize = 380,
    spotlightOpacity = 0.12,
    interactive = false,
    sheen = false,
    tone = "dark",
    radius = 24,
    style,
    ...rest
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setCoords(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group/spotlight rounded-[${radius}px]`}
      style={{ borderRadius: `${radius}px`, ...style }}
    >
      <GlaceGlassCard
        ref={ref}
        tone={tone}
        radius={radius}
        interactive={interactive}
        sheen={sheen}
        className={`relative overflow-hidden transition-all duration-300 ${
          interactive
            ? "hover:border-white/20 hover:shadow-[0_0_50px_rgba(255,255,255,0.06)] hover:-translate-y-0.5"
            : ""
        } ${className}`}
        {...rest}
      >
        {/* Live Cursor Spotlight Feedback (WyberAi style) */}
        {spotlight && coords && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] transition-opacity duration-200"
          >
            <div
              className="absolute rounded-full pointer-events-none will-change-transform"
              style={{
                left: coords.x - spotlightSize / 2,
                top: coords.y - spotlightSize / 2,
                width: spotlightSize,
                height: spotlightSize,
                background: `radial-gradient(circle, rgba(255, 255, 255, ${spotlightOpacity}) 0%, rgba(255, 255, 255, ${
                  spotlightOpacity * 0.35
                }) 35%, transparent 70%)`,
              }}
            />
          </div>
        )}

        {/* Live Cursor Specular Border Highlight */}
        {spotlight && coords && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] transition-opacity duration-200"
            style={{
              padding: "1px",
              background: `radial-gradient(260px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.35), transparent 70%)`,
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            }}
          />
        )}

        <div className="relative z-10">{children}</div>
      </GlaceGlassCard>
    </div>
  );
});
