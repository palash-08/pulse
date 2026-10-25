import React, { useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { getFlamePath } from "../lib/flamePath.js";
import { RocketLayer } from "../components/ui/RocketLayer.js";
import { Theme, ThemeContext } from "./useTheme.js";

export type { Theme } from "./useTheme.js";

const STORAGE_KEY = "pulse-theme";
const ANIMATION_DURATION = 1100; // 1.1s duration matching the flame physics

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Fall back to dark
  }

  return "dark";
}

function applyThemeToDOM(newTheme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  if (newTheme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
    if (body) {
      body.classList.add("dark");
      body.setAttribute("data-theme", "dark");
    }
  } else {
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    root.style.colorScheme = "light";
    if (body) {
      body.classList.remove("dark");
      body.removeAttribute("data-theme");
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"light-to-dark" | "dark-to-light">("light-to-dark");
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAnimationRef = useRef<Animation | null>(null);

  const persistTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore quota/security errors
    }
  };

  const setTheme = (newTheme: Theme) => {
    applyThemeToDOM(newTheme);
    persistTheme(newTheme);
    setThemeState(newTheme);
  };

  const cancelActiveAnimations = () => {
    if (currentAnimationRef.current) {
      try {
        currentAnimationRef.current.cancel();
      } catch {
        // Ignore
      }
      currentAnimationRef.current = null;
    }
    // Cancel any orphaned view-transition animations on documentElement
    try {
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.getAnimations().forEach((anim) => {
          const pseudo = (anim.effect as KeyframeEffect)?.pseudoElement;
          if (pseudo && pseudo.includes("view-transition")) {
            anim.cancel();
          }
        });
      }
    } catch {
      // Ignore
    }
  };

  const toggleTheme = useCallback(() => {
    if (isAnimating) return;

    // Derive state directly from actual DOM presence of .dark to prevent any React/DOM drift
    const currentlyDark =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : theme === "dark";

    const nextTheme: Theme = currentlyDark ? "light" : "dark";
    const isDarkToLight = currentlyDark;
    const direction = isDarkToLight ? "dark-to-light" : "light-to-dark";

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Accessibility: Skip rocket and animation when prefers-reduced-motion is enabled
    if (prefersReducedMotion) {
      cancelActiveAnimations();
      document.documentElement.classList.add("theme-fade-transition");
      applyThemeToDOM(nextTheme);
      setThemeState(nextTheme);
      persistTheme(nextTheme);
      setTimeout(() => {
        document.documentElement.classList.remove("theme-fade-transition");
      }, 200);
      return;
    }

    // 2. Check for View Transitions API support
    const hasViewTransition =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as any).startViewTransition === "function";

    // Fallback: If browser doesn't support View Transitions, switch with 300ms fade and fly the rocket
    if (!hasViewTransition) {
      cancelActiveAnimations();
      setIsAnimating(true);
      setAnimationDirection(direction);
      document.documentElement.classList.add("theme-fade-transition");
      applyThemeToDOM(nextTheme);
      setThemeState(nextTheme);
      persistTheme(nextTheme);

      setTimeout(() => {
        document.documentElement.classList.remove("theme-fade-transition");
      }, 300);

      setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);
      return;
    }

    // 3. View Transitions API: Animate clip-path with the flame shape
    // Cancel any previous animations first so lingering forward-fills don't clip snapshots
    cancelActiveAnimations();

    setIsAnimating(true);
    setAnimationDirection(direction);

    // Disable CSS transitions during DOM update so snapshot captures instant, fully-rendered styles
    document.documentElement.classList.add("theme-transitioning");

    if (isDarkToLight) {
      document.documentElement.classList.add("theme-reverse");
    } else {
      document.documentElement.classList.remove("theme-reverse");
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set initial clip-path immediately via a dedicated style tag so ::view-transition-new(root)
    // NEVER flashes full-screen before the Web Animations API begins
    let dynamicStyle = document.getElementById("pulse-vt-dynamic") as HTMLStyleElement | null;
    if (!dynamicStyle) {
      dynamicStyle = document.createElement("style");
      dynamicStyle.id = "pulse-vt-dynamic";
      document.head.appendChild(dynamicStyle);
    }

    if (!isDarkToLight) {
      dynamicStyle.textContent = `
        ::view-transition-old(root) { z-index: 1; }
        ::view-transition-new(root) { z-index: 2; clip-path: path('${getFlamePath(0, width, height)}'); }
      `;
    } else {
      dynamicStyle.textContent = `
        ::view-transition-old(root) { z-index: 2; }
        ::view-transition-new(root) { z-index: 1; }
      `;
    }

    // Pre-generate 60 keyframes across progress 0 to 1
    const totalFrames = 60;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= totalFrames; i++) {
      const p = i / totalFrames;
      keyframes.push({
        clipPath: `path('${getFlamePath(p, width, height)}')`,
      });
    }

    // Dark-to-light reverses the keyframes: starts at full-screen rectangle and shrinks down
    const activeKeyframes = isDarkToLight ? [...keyframes].reverse() : keyframes;
    const targetPseudoElement = isDarkToLight
      ? "::view-transition-old(root)"
      : "::view-transition-new(root)";

    // Start View Transition with flushSync so React synchronously renders all components
    // and updates all dark classes into the DOM BEFORE the browser takes the snapshot!
    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        applyThemeToDOM(nextTheme);
        setThemeState(nextTheme);
      });
      persistTheme(nextTheme);
    });

    const cleanup = () => {
      cancelActiveAnimations();
      document.documentElement.classList.remove("theme-reverse");
      document.documentElement.classList.remove("theme-transitioning");
      const s = document.getElementById("pulse-vt-dynamic");
      s?.remove();
      setIsAnimating(false);
    };

    transition.ready
      .then(() => {
        try {
          const anim = document.documentElement.animate(activeKeyframes, {
            duration: ANIMATION_DURATION,
            easing: "linear",
            pseudoElement: targetPseudoElement,
            fill: "forwards",
          });
          currentAnimationRef.current = anim;
        } catch (err) {
          console.warn("View transition flame animation failed to run on pseudo-element:", err);
        }
      })
      .catch(() => {
        cleanup();
      });

    // Safety timeout to guarantee unblocking if transition takes too long
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(cleanup, ANIMATION_DURATION + 300);

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        cleanup();
      });
  }, [theme, isAnimating]);

  useEffect(() => {
    applyThemeToDOM(theme);
    persistTheme(theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, isDark, isAnimating, toggleTheme, setTheme }}>
      {children}
      <RocketLayer
        isAnimating={isAnimating}
        direction={animationDirection}
        duration={ANIMATION_DURATION}
      />
    </ThemeContext.Provider>
  );
}
