import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

export interface RocketLayerProps {
  isAnimating: boolean;
  direction?: "light-to-dark" | "dark-to-light";
  duration?: number; // duration in ms, default 1100ms
  onComplete?: () => void;
}

export function RocketLayer({
  isAnimating,
  direction = "light-to-dark",
  duration = 1100,
  onComplete,
}: RocketLayerProps) {
  const rocketRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!isAnimating || !rocketRef.current) {
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const Rh = 32;
    const yStart = height + 10;
    const yEnd = -Rh - 20;

    // Rocket is centered horizontally (width of rocket is ~30px)
    const rocketX = (width - 30) / 2;

    const setRocketY = gsap.quickSetter(rocketRef.current, "y", "px");
    const setRocketX = gsap.quickSetter(rocketRef.current, "x", "px");

    // Position horizontally and initialize Y
    setRocketX(rocketX);
    gsap.set(rocketRef.current, {
      force3D: true,
      opacity: 1,
    });

    const isReverse = direction === "dark-to-light";
    const initialP = isReverse ? 1 : 0;
    const targetP = isReverse ? 0 : 1;

    // Compute initial position
    const initialT = initialP * initialP * (3 - 2 * initialP);
    setRocketY(yStart + (yEnd - yStart) * initialT);

    const progressObj = { p: initialP };

    tweenRef.current = gsap.to(progressObj, {
      p: targetP,
      duration: duration / 1000,
      ease: "none", // Linear timing because smoothstep is embedded inside position calculation
      onUpdate: () => {
        const p = progressObj.p;
        const t = p * p * (3 - 2 * p);
        const y = yStart + (yEnd - yStart) * t;
        setRocketY(y);
      },
      onComplete: () => {
        onComplete?.();
      },
    });

    const handleResize = () => {
      setRocketX((window.innerWidth - 30) / 2);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
    };
  }, [isAnimating, direction, duration, onComplete]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999999,
        visibility: isAnimating ? "visible" : "hidden",
      }}
    >
      <div
        ref={rocketRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 30,
          height: 36,
          // Isolates the rocket into its own View Transition group so it's not frozen inside the snapshot
          viewTransitionName: "rocket",
          mixBlendMode: "difference",
          willChange: "transform",
        }}
        className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
      >
        <svg
          width="30"
          height="36"
          viewBox="0 0 30 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Engine Thrust / Small Flame Plume under nozzle */}
          <path
            d="M 12 27 C 12 32, 14 35, 15 35 C 16 35, 18 32, 18 27 Z"
            fill="url(#rocket-thrust)"
            opacity="0.9"
          />

          {/* Main Fuselage */}
          <path
            d="M 15 2 C 12 7, 8 16, 8 24 L 22 24 C 22 16, 18 7, 15 2 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Left Aerodynamic Fin */}
          <path
            d="M 8 20 L 3 25 C 2 26, 3 28, 5 28 L 8 26 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Aerodynamic Fin */}
          <path
            d="M 22 20 L 27 25 C 28 26, 27 28, 25 28 L 22 26 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Spine Center Line */}
          <line
            x1="15"
            y1="2"
            x2="15"
            y2="10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Window Porthole */}
          <circle
            cx="15"
            cy="15"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          {/* Engine Nozzle Ring */}
          <path
            d="M 11 24 L 19 24 L 18 27 L 12 27 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <defs>
            <linearGradient
              id="rocket-thrust"
              x1="15"
              y1="27"
              x2="15"
              y2="35"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>,
    document.body
  );
}
