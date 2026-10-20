import { useEffect, useRef, useState } from "react";

interface CursorSpotlightProps {
  size?: number;
  opacity?: number;
  color?: string;
  className?: string;
}

/**
 * Live cursor spotlight feedback element (inspired by WyberAi / RoastMyPitch).
 * Tracks the mouse position over its parent container and renders a smooth
 * illuminated radial glow directly beneath the cursor.
 */
export function CursorSpotlight({
  size = 400,
  opacity = 0.14,
  color,
  className = "",
}: CursorSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onLeave = () => setPos(null);

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);

    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-300 ${
        pos ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {pos && (
        <div
          className="absolute rounded-full pointer-events-none will-change-transform"
          style={{
            left: pos.x - size / 2,
            top: pos.y - size / 2,
            width: size,
            height: size,
            background: color
              ? `radial-gradient(circle, ${color}, transparent 65%)`
              : `radial-gradient(circle, rgba(255, 255, 255, ${opacity}) 0%, rgba(255, 255, 255, ${opacity * 0.35}) 35%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
