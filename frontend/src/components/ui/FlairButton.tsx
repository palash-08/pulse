import { useRef, type ElementType, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { gsap, useGSAP } from "../../lib/motion";
import { useTheme } from "../../context/useTheme.js";

type Props<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  fill?: string;      // flair colour
  textFrom?: string;  // text colour at rest
  textTo?: string;    // text colour when filled
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function FlairButton<T extends ElementType = "button">({
  as,
  children,
  className = "",
  fill,
  textFrom,
  textTo,
  ...rest
}: Props<T>) {
  const Tag = (as || "button") as ElementType;
  const root = useRef<HTMLElement>(null);
  const flair = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const moveX = useRef<(v: number) => void>();
  const moveY = useRef<(v: number) => void>();

  let isDark = false;
  try {
    const themeContext = useTheme();
    isDark = themeContext.isDark;
  } catch {
    isDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // White and black defaults:
  // Light mode: black outline/text at rest, fills black on hover, text turns white
  // Dark mode: white outline/text at rest, fills white on hover, text turns black
  const defaultFill = isDark ? "#ffffff" : "#000000";
  const defaultTextFrom = isDark ? "#ffffff" : "#000000";
  const defaultTextTo = isDark ? "#000000" : "#ffffff";

  const resolvedFill = fill ?? defaultFill;
  const resolvedTextFrom = textFrom ?? defaultTextFrom;
  const resolvedTextTo = textTo ?? defaultTextTo;

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(flair.current, { xPercent: -50, yPercent: -50, scale: 0 });
      moveX.current = gsap.quickTo(flair.current, "x", { duration: 0.4, ease: "power3" });
      moveY.current = gsap.quickTo(flair.current, "y", { duration: 0.4, ease: "power3" });
      gsap.set(label.current, { color: resolvedTextFrom });
    },
    { scope: root, dependencies: [resolvedTextFrom] }
  );

  const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const point = (e: React.MouseEvent) => {
    const r = root.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, r };
  };
  const size = (r: DOMRect) => Math.hypot(r.width, r.height) * 2; // big enough to cover from any corner

  const enter = contextSafe((e: React.MouseEvent) => {
    if ((rest as { disabled?: boolean }).disabled) return;
    const { x, y, r } = point(e);
    if (reduce()) {
      gsap.set(flair.current, { width: size(r), height: size(r), x: r.width / 2, y: r.height / 2, scale: 1 });
      gsap.set(label.current, { color: resolvedTextTo });
      return;
    }
    gsap.set(flair.current, { width: size(r), height: size(r), x, y });
    gsap.to(flair.current, { scale: 1, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    gsap.to(label.current, { color: resolvedTextTo, duration: 0.25, ease: "power1.out" });
  });

  const move = contextSafe((e: React.MouseEvent) => {
    if (reduce() || (rest as { disabled?: boolean }).disabled) return;
    const { x, y } = point(e);
    moveX.current?.(x);
    moveY.current?.(y);
  });

  const leave = contextSafe((e: React.MouseEvent) => {
    const { x, y } = point(e);
    gsap.to(flair.current, { x, y, scale: 0, duration: reduce() ? 0 : 0.4, ease: "power2.inOut", overwrite: "auto" });
    gsap.to(label.current, { color: resolvedTextFrom, duration: reduce() ? 0 : 0.3, ease: "power1.inOut" });
  });

  return (
    <Tag
      ref={root}
      className={`relative overflow-hidden isolate ${className}`}
      onMouseEnter={enter}
      onMouseMove={move}
      onMouseLeave={leave}
      {...rest}
    >
      <span
        ref={flair}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 rounded-full"
        style={{ backgroundColor: resolvedFill }}
      />
      <span ref={label} className="relative inline-flex items-center justify-center gap-1.5" style={{ color: resolvedTextFrom }}>
        {children}
      </span>
    </Tag>
  );
}

export default FlairButton;
