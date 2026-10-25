/**
 * Generates an SVG path string for the flame-shaped window during the theme transition.
 *
 * @param progress 0 (start) to 1 (full screen)
 * @param width Viewport width in pixels
 * @param height Viewport height in pixels
 * @returns SVG path string compatible with CSS `clip-path: path(...)`
 */
export function getFlamePath(progress: number, width: number, height: number): string {
  const f = (n: number) => Math.round(n * 10) / 10;
  const Xc = width / 2;
  const Rh = 32; // Rocket height in pixels
  const Ystart = height + 10;
  const Yend = -Rh - 20;

  // From ~94% progress, lock into full-screen rectangle covering viewport
  if (progress >= 0.94) {
    return `M -2 -2 H ${f(width + 2)} V ${f(height + 2)} H -2 Z`;
  }

  // Smoothstep easing for rocket progress (t * t * (3 - 2 * t)): starts slow, exits fast
  const p = Math.max(0, Math.min(1, progress));
  const t = p * p * (3 - 2 * p);
  const Yrocket = Ystart + (Yend - Ystart) * t;
  const Ya = Yrocket + Rh; // Apex (tip of flame) at rocket tail

  // If rocket has not yet entered screen
  if (p <= 0.005 || Ya >= height + 10) {
    return `M ${f(Xc)} ${f(height + 20)} L ${f(Xc - 1)} ${f(height + 20)} L ${f(Xc + 1)} ${f(height + 20)} Z`;
  }

  // Spread starts at 0 and grows to 1 from ~48% progress
  const spreadProgress = Math.max(0, Math.min(1, (p - 0.48) / (0.94 - 0.48)));
  const spread = spreadProgress * spreadProgress * (3 - 2 * spreadProgress);

  // Base half-width expands from narrow plume to wider than screen
  const baseHalfWidth =
    (28 + Math.max(0, height - Ya) * 0.1) * (1 - spread) +
    (width * 0.85 + 200) * spread;

  const Xbl = Xc - baseHalfWidth;
  const Xbr = Xc + baseHalfWidth;
  const Yb = (height + 20) * (1 - spread) + (-20) * spread;

  // Left cubic bezier control points from apex (Ya) to base (Yb)
  const c1xl = Xc - (12 + 60 * spread);
  const c1yl = Ya + (Yb - Ya) * 0.35;
  const c2xl = Xbl + 40 * (1 - spread);
  const c2yl = Ya + (Yb - Ya) * 0.75;

  // Right cubic bezier control points from base (Yb) back to apex (Ya)
  const c1xr = Xc + (12 + 60 * spread);
  const c1yr = Ya + (Yb - Ya) * 0.35;
  const c2xr = Xbr - 40 * (1 - spread);
  const c2yr = Ya + (Yb - Ya) * 0.75;

  // Closed path enclosing the flame and the bottom/sides of the screen
  return `M ${f(Xc)} ${f(Ya)} C ${f(c1xl)} ${f(c1yl)} ${f(c2xl)} ${f(c2yl)} ${f(Xbl)} ${f(Yb)} L ${f(Xbl)} ${f(height + 20)} L ${f(Xbr)} ${f(height + 20)} L ${f(Xbr)} ${f(Yb)} C ${f(c2xr)} ${f(c2yr)} ${f(c1xr)} ${f(c1yr)} ${f(Xc)} ${f(Ya)} Z`;
}
