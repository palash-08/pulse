import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

export interface LaunchOptions {
  from: DOMRect;
  label: string;
  target: string;
  initialSpeed?: number;
  isDark?: boolean;
  onMidFlight: () => void;
  onLanded?: () => void;
}

export interface LaunchContextValue {
  launchToNav: (opts: LaunchOptions) => void;
  registerNavTarget: (key: string, el: HTMLElement | null) => void;
  isFlying: boolean;
}

const LaunchContext = createContext<LaunchContextValue | null>(null);

export function useLaunch() {
  const context = useContext(LaunchContext);
  if (!context) {
    throw new Error("useLaunch must be used within a LaunchProvider");
  }
  return context;
}

interface SmokePuff {
  id: number;
  x: number;
  y: number;
  size: number;
  scale: number;
  opacity: number;
}

export function LaunchProvider({ children }: { children: React.ReactNode }) {
  const [isFlying, setIsFlying] = useState(false);
  const [smokePuffs, setSmokePuffs] = useState<SmokePuff[]>([]);
  const [ghostData, setGhostData] = useState<{
    label: string;
    initialRect: DOMRect;
    isDark?: boolean;
  } | null>(null);

  const targetsRef = useRef<Map<string, Set<HTMLElement>>>(new Map());
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const activeLaunchRef = useRef<LaunchOptions | null>(null);
  const flyingRef = useRef(false);

  const registerNavTarget = useCallback((key: string, el: HTMLElement | null) => {
    if (!targetsRef.current.has(key)) {
      targetsRef.current.set(key, new Set());
    }
    const set = targetsRef.current.get(key)!;
    if (el) {
      set.add(el);
    }
  }, []);

  const getNavTarget = useCallback((key: string): HTMLElement | null => {
    const set = targetsRef.current.get(key);
    if (!set || set.size === 0) return null;

    // Prefer visible element in DOM (e.g. desktop vs mobile nav)
    for (const el of set) {
      if (el && el.isConnected) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
    }

    // Fallback to any connected element
    for (const el of set) {
      if (el && el.isConnected) return el;
    }
    return null;
  }, []);

  const launchToNav = useCallback(
    (opts: LaunchOptions) => {
      // Reduced motion: skip animation and fire mid-flight / landed immediately
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        opts.onMidFlight();
        opts.onLanded?.();
        return;
      }

      // Must be at the top navlinks (desktop/tablet navbar), not phones etc.
      const targetEl = getNavTarget(opts.target);
      const isTopNav =
        targetEl &&
        targetEl.isConnected &&
        targetEl.getBoundingClientRect().width > 0 &&
        targetEl.getBoundingClientRect().top < 120 &&
        (typeof window !== "undefined" ? window.innerWidth >= 768 : true);

      if (!isTopNav) {
        opts.onMidFlight();
        opts.onLanded?.();
        return;
      }

      if (flyingRef.current) return;
      flyingRef.current = true;
      activeLaunchRef.current = opts;
      setIsFlying(true);

      setGhostData({
        label: opts.label,
        initialRect: opts.from,
        isDark: opts.isDark,
      });
    },
    []
  );

  useEffect(() => {
    if (!ghostData || !ghostRef.current) return;
    const ghostEl = ghostRef.current;
    const opts = activeLaunchRef.current;
    if (!opts) return;

    const startX = ghostData.initialRect.left;
    const startY = ghostData.initialRect.top;

    const targetEl = getNavTarget(opts.target);
    let targetX = startX;
    let targetY = -150; // default: fly straight up if target is missing
    let targetScale = 0.85;

    if (targetEl) {
      const tRect = targetEl.getBoundingClientRect();
      targetX = tRect.left + tRect.width / 2 - ghostData.initialRect.width / 2;
      targetY = tRect.top + tRect.height / 2 - ghostData.initialRect.height / 2;
      targetScale = 1.0;
    }

    const computeKeyframesAndPath = (
      tX: number,
      tY: number,
      tScale: number
    ) => {
      // p0: Starting point (hand-off position at max height)
      const p0 = { x: startX, y: startY };

      // p1: Gentle apex rise (~35px) before arcing toward target
      const p1 = { x: startX, y: startY - 35 };

      // Displacement from p1 to target
      const deltaX = tX - p1.x;
      const deltaY = tY - p1.y;

      // Arc waypoints curving toward the target
      const p2 = { x: p1.x + deltaX * 0.22, y: p1.y + deltaY * 0.35 };
      const p3 = { x: p1.x + deltaX * 0.58, y: p1.y + deltaY * 0.68 };
      const p4 = { x: p1.x + deltaX * 0.86, y: p1.y + deltaY * 0.90 };
      const p5 = { x: tX, y: tY };

      // Calculate path segments
      const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const d23 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
      const d34 = Math.hypot(p4.x - p3.x, p4.y - p3.y);
      const d45 = Math.hypot(p5.x - p4.x, p5.y - p4.y);

      const pathLength = d01 + d12 + d23 + d34 + d45;

      // Near-linear travel over the first 85% of time; final 15% is deceleration into the tab
      const travelDist = Math.max(1, d01 + d12 + d23 + d34);
      const offset1 = (d01 / travelDist) * 0.85;
      const offset2 = ((d01 + d12) / travelDist) * 0.85;
      const offset3 = ((d01 + d12 + d23) / travelDist) * 0.85;
      const offset4 = 0.85;

      const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
      const tilt = Math.max(-14, Math.min(14, (deltaX / Math.max(screenWidth, 1)) * 55));

      const keyframes: Keyframe[] = [
        {
          transform: `translate3d(${p0.x}px, ${p0.y}px, 0) rotate(0deg) scale(1)`,
          opacity: 1,
          offset: 0,
        },
        {
          // Gentle apex continuation
          transform: `translate3d(${p1.x}px, ${p1.y}px, 0) rotate(${tilt * 0.25}deg) scale(1.02)`,
          opacity: 1,
          offset: Math.min(offset1, 0.2),
        },
        {
          // Turning into arc
          transform: `translate3d(${p2.x}px, ${p2.y}px, 0) rotate(${tilt * 0.85}deg) scale(1.04)`,
          opacity: 1,
          offset: Math.min(offset2, 0.5),
        },
        {
          // Mid-arc
          transform: `translate3d(${p3.x}px, ${p3.y}px, 0) rotate(${tilt * 1.05}deg) scale(1.02)`,
          opacity: 1,
          offset: Math.min(offset3, 0.72),
        },
        {
          // Aligning over tab, entering deceleration phase
          transform: `translate3d(${p4.x}px, ${p4.y}px, 0) rotate(${tilt * 0.2}deg) scale(0.98)`,
          opacity: 1,
          offset: offset4,
        },
        {
          // Final landing approach: scale down and dissolve into tab
          transform: `translate3d(${p4.x + (p5.x - p4.x) * 0.7}px, ${p4.y + (p5.y - p4.y) * 0.7}px, 0) rotate(0deg) scale(${tScale * 1.04})`,
          opacity: 0.6,
          offset: 0.94,
        },
        {
          // Landed and dissolved
          transform: `translate3d(${p5.x}px, ${p5.y}px, 0) rotate(0deg) scale(${tScale})`,
          opacity: 0,
          offset: 1,
        },
      ];

      return { pathLength, keyframes };
    };

    const { pathLength, keyframes } = computeKeyframesAndPath(
      targetX,
      targetY,
      targetScale
    );

    // Speed clamped to [280, 500] px/s; duration clamped to [1200, 1900] ms
    const speed = Math.max(280, Math.min(500, opts.initialSpeed || 360));
    const calculatedDuration = (pathLength / speed) * 1000;
    const duration = Math.max(1200, Math.min(1900, Math.round(calculatedDuration)));

    const animation = ghostEl.animate(keyframes, {
      duration,
      easing: "cubic-bezier(0.3, 0.1, 0.4, 1)",
      fill: "forwards",
    });

    // Switch page mid-flight (~52% of duration) like before, so it's smooth and not abrupt
    const midFlightTimer = setTimeout(() => {
      opts.onMidFlight();
    }, duration * 0.52);

    // Trailing smoke particles across the whole flight
    const puffs: Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      bornAt: number;
      life: number;
      vx: number;
      vy: number;
    }> = [];
    let puffIdCounter = 0;
    let lastSpawnTime = 0;
    let trailRafId: number;

    const updateTrail = () => {
      const now = performance.now();

      if (ghostRef.current && flyingRef.current) {
        const rect = ghostRef.current.getBoundingClientRect();
        // Spawn smoke puffs every ~28ms while flying across the screen
        if (now - lastSpawnTime > 28) {
          lastSpawnTime = now;
          const x1 = rect.left + rect.width * 0.32;
          const x2 = rect.left + rect.width * 0.68;
          const y = rect.bottom;

          puffs.push({
            id: puffIdCounter++,
            x: x1 + (Math.random() - 0.5) * 6,
            y: y + Math.random() * 4,
            size: Math.random() * 6 + 18,
            bornAt: now,
            life: 600,
            vx: (Math.random() - 0.5) * 12,
            vy: Math.random() * 10 + 6,
          });

          puffs.push({
            id: puffIdCounter++,
            x: x2 + (Math.random() - 0.5) * 6,
            y: y + Math.random() * 4,
            size: Math.random() * 6 + 18,
            bornAt: now,
            life: 600,
            vx: (Math.random() - 0.5) * 12,
            vy: Math.random() * 10 + 6,
          });
        }
      }

      const activePuffs: SmokePuff[] = [];
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        const age = now - p.bornAt;
        const progress = age / p.life;
        if (progress >= 1) {
          puffs.splice(i, 1);
        } else {
          activePuffs.push({
            id: p.id,
            x: p.x + p.vx * progress,
            y: p.y + p.vy * progress,
            size: p.size,
            scale: 0.8 + progress * 2.4,
            opacity: (1 - progress) * 0.65,
          });
        }
      }

      setSmokePuffs(activePuffs);

      if (flyingRef.current) {
        trailRafId = requestAnimationFrame(updateTrail);
      } else {
        setSmokePuffs([]);
      }
    };

    trailRafId = requestAnimationFrame(updateTrail);

    // Re-check target rect at ~65% in case layout shifted after page route change
    const layoutRecheckTimer = setTimeout(() => {
      const latestEl = getNavTarget(opts.target);
      if (latestEl) {
        const latestRect = latestEl.getBoundingClientRect();
        const newTX =
          latestRect.left + latestRect.width / 2 - ghostData.initialRect.width / 2;
        const newTY =
          latestRect.top + latestRect.height / 2 - ghostData.initialRect.height / 2;
        const newScale = 1.0;

        if (
          Math.abs(newTX - targetX) > 2 ||
          Math.abs(newTY - targetY) > 2
        ) {
          if (
            animation.effect &&
            typeof (animation.effect as any).setKeyframes === "function"
          ) {
            const updated = computeKeyframesAndPath(newTX, newTY, newScale);
            (animation.effect as any).setKeyframes(updated.keyframes);
          }
        }
      }
    }, duration * 0.65);

    animation.onfinish = () => {
      cancelAnimationFrame(trailRafId);
      setSmokePuffs([]);

      // Trigger landing pulse on the target element
      const finalTarget = getNavTarget(opts.target);
      if (finalTarget) {
        finalTarget.setAttribute("data-landing", "true");
        setTimeout(() => {
          finalTarget.removeAttribute("data-landing");
        }, 600);
      }

      opts.onLanded?.();
      flyingRef.current = false;
      setIsFlying(false);
      setGhostData(null);
      activeLaunchRef.current = null;
    };

    return () => {
      cancelAnimationFrame(trailRafId);
      clearTimeout(midFlightTimer);
      clearTimeout(layoutRecheckTimer);
      animation.cancel();
      setSmokePuffs([]);
    };
  }, [ghostData, getNavTarget]);

  return (
    <LaunchContext.Provider
      value={{
        launchToNav,
        registerNavTarget,
        isFlying,
      }}
    >
      {children}

      {typeof document !== "undefined" &&
        ghostData &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] pointer-events-none"
            aria-hidden="true"
          >
            {/* Trailing Smoke Puffs behind craft across the whole flight */}
            {smokePuffs.map((puff) => (
              <div
                key={puff.id}
                className="fixed pointer-events-none rounded-full"
                style={{
                  left: `${puff.x}px`,
                  top: `${puff.y}px`,
                  width: `${puff.size}px`,
                  height: `${puff.size}px`,
                  transform: `translate(-50%, -50%) scale(${puff.scale})`,
                  opacity: puff.opacity,
                  background: ghostData.isDark
                    ? "radial-gradient(circle, rgba(235, 240, 250, 0.45) 0%, rgba(180, 205, 240, 0.2) 45%, transparent 70%)"
                    : "radial-gradient(circle, rgba(140, 155, 175, 0.45) 0%, rgba(180, 195, 215, 0.2) 45%, transparent 70%)",
                  filter: "blur(4px)",
                }}
              />
            ))}

            <div
              ref={ghostRef}
              className="fixed pointer-events-none select-none flex items-center justify-center z-10"
              style={{
                left: 0,
                top: 0,
                width: `${ghostData.initialRect.width}px`,
                height: `${ghostData.initialRect.height}px`,
                transform: `translate3d(${ghostData.initialRect.left}px, ${ghostData.initialRect.top}px, 0)`,
                transformOrigin: "center center",
              }}
            >
              {/* Rocket Pill button ("Create Monitor") flying for the whole flight */}
              <div
                className={`relative flex items-center justify-center rounded-full whitespace-nowrap h-full w-full ${
                  ghostData.isDark
                    ? "bg-[#171717] text-white border border-white shadow-[0_4px_16px_rgba(0,0,0,0.3)] text-xs font-medium px-6"
                    : "bg-white text-neutral-900 border border-neutral-900 shadow-[0_4px_16px_rgba(0,0,0,0.15)] text-xs font-medium px-6"
                }`}
              >
                <span className="relative z-10">
                  {ghostData.label}
                </span>

                {/* Left Thruster Pod */}
                <div
                  className="absolute top-[calc(100%-2px)] left-[32%] -translate-x-1/2 flex flex-col items-center"
                >
                  <div className="w-2.5 h-1.5 bg-neutral-800 rounded-b-xs border-t border-neutral-700" />
                  <div className="w-2 h-5 bg-gradient-to-b from-white via-[#8ec5ff] to-[#3b82f6] rounded-full shadow-[0_0_12px_#60a5fa] animate-pulse" />
                  <div className="w-3 h-6 -mt-3 bg-gradient-to-b from-[#60a5fa]/80 via-[#3b82f6]/40 to-transparent rounded-full blur-[1px]" />
                  <div className="w-4 h-7 -mt-2 bg-gradient-to-b from-blue-200/50 via-neutral-300/30 to-transparent rounded-full blur-[2px]" />
                  <div className="w-5 h-9 -mt-3 bg-gradient-to-b from-neutral-200/35 via-neutral-400/20 to-transparent rounded-full blur-[3px]" />
                </div>

                {/* Right Thruster Pod */}
                <div
                  className="absolute top-[calc(100%-2px)] left-[68%] -translate-x-1/2 flex flex-col items-center"
                >
                  <div className="w-2.5 h-1.5 bg-neutral-800 rounded-b-xs border-t border-neutral-700" />
                  <div className="w-2 h-5 bg-gradient-to-b from-white via-[#8ec5ff] to-[#3b82f6] rounded-full shadow-[0_0_12px_#60a5fa] animate-pulse" />
                  <div className="w-3 h-6 -mt-3 bg-gradient-to-b from-[#60a5fa]/80 via-[#3b82f6]/40 to-transparent rounded-full blur-[1px]" />
                  <div className="w-4 h-7 -mt-2 bg-gradient-to-b from-blue-200/50 via-neutral-300/30 to-transparent rounded-full blur-[2px]" />
                  <div className="w-5 h-9 -mt-3 bg-gradient-to-b from-neutral-200/35 via-neutral-400/20 to-transparent rounded-full blur-[3px]" />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </LaunchContext.Provider>
  );
}
