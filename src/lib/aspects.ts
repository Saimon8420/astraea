/**
 * Aspects — angular relationships between chart points.
 *
 * For each pair we test the configured aspect angles and keep the closest match
 * within orb. When both points have a speed, we mark the aspect applying (moving
 * toward exact) or separating.
 */

import { norm360, signedDelta } from "./zodiac";

export interface AspectType {
  name: string;
  angle: number;
  orb: number; // default max orb (degrees)
  kind: "major" | "minor";
}

export const ASPECT_TYPES: AspectType[] = [
  { name: "conjunction", angle: 0, orb: 8, kind: "major" },
  { name: "sextile", angle: 60, orb: 6, kind: "major" },
  { name: "square", angle: 90, orb: 7, kind: "major" },
  { name: "trine", angle: 120, orb: 8, kind: "major" },
  { name: "opposition", angle: 180, orb: 8, kind: "major" },
  { name: "semisextile", angle: 30, orb: 2, kind: "minor" },
  { name: "semisquare", angle: 45, orb: 2, kind: "minor" },
  { name: "sesquiquadrate", angle: 135, orb: 2, kind: "minor" },
  { name: "quincunx", angle: 150, orb: 3, kind: "minor" },
];

export interface AspectPoint {
  name: string;
  longitude: number;
  speed?: number; // °/day, optional (angles/nodes omit it)
}

export interface Aspect {
  between: [string, string];
  type: string;
  angle: number;
  orb: number; // exact orb magnitude (degrees from exact)
  applying: boolean | null;
}

export interface AspectOptions {
  includeMinor?: boolean;
  /** Optional hard cap on orb (degrees) applied to every aspect. */
  maxOrb?: number;
}

/** Detect aspects across all unordered pairs of points. */
export function detectAspects(points: AspectPoint[], options: AspectOptions = {}): Aspect[] {
  const types = ASPECT_TYPES.filter((t) => options.includeMinor || t.kind === "major");
  const out: Aspect[] = [];

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const phi = signedDelta(a.longitude, b.longitude); // (−180, 180]
      const sep = Math.abs(phi); // 0..180

      let best: { type: AspectType; orb: number } | null = null;
      for (const t of types) {
        const cap = options.maxOrb !== undefined ? Math.min(t.orb, options.maxOrb) : t.orb;
        const delta = Math.abs(sep - t.angle);
        if (delta <= cap && (!best || delta < best.orb)) best = { type: t, orb: delta };
      }
      if (!best) continue;

      out.push({
        between: [a.name, b.name],
        type: best.type.name,
        angle: best.type.angle,
        orb: Number(best.orb.toFixed(3)),
        applying: applyingState(a, b, phi, best.type.angle),
      });
    }
  }

  // Tightest aspects first.
  return out.sort((x, y) => x.orb - y.orb);
}

/**
 * Applying (true) when the orb is closing, separating (false) when widening,
 * null when either point lacks a speed.
 */
function applyingState(a: AspectPoint, b: AspectPoint, phi: number, angle: number): boolean | null {
  if (a.speed === undefined || b.speed === undefined) return null;

  // Nearest exact target for phi is +angle or −angle.
  const targets = angle === 0 || angle === 180 ? [angle === 0 ? 0 : 180, angle === 0 ? 0 : -180] : [angle, -angle];
  let target = targets[0];
  for (const t of targets) {
    if (Math.abs(signedDelta(phi, t)) < Math.abs(signedDelta(phi, target))) target = t;
  }
  const signedOrb = signedDelta(phi, target); // distance from exact, signed
  const dOrb = a.speed - b.speed; // d(phi)/dt
  if (Math.abs(dOrb) < 1e-9) return null;
  // Closing when signedOrb and its derivative have opposite signs.
  return signedOrb * dOrb < 0;
}

/**
 * Cross aspects between two separate point sets (transit↔natal, A↔B synastry).
 * Every point in `a` is compared against every point in `b`. `between` is
 * [aName, bName], so the caller knows which side each belongs to.
 */
export function crossAspects(a: AspectPoint[], b: AspectPoint[], options: AspectOptions = {}): Aspect[] {
  const types = ASPECT_TYPES.filter((t) => options.includeMinor || t.kind === "major");
  const out: Aspect[] = [];

  for (const pa of a) {
    for (const pb of b) {
      const phi = signedDelta(pa.longitude, pb.longitude);
      const sep = Math.abs(phi);
      let best: { type: AspectType; orb: number } | null = null;
      for (const t of types) {
        const cap = options.maxOrb !== undefined ? Math.min(t.orb, options.maxOrb) : t.orb;
        const delta = Math.abs(sep - t.angle);
        if (delta <= cap && (!best || delta < best.orb)) best = { type: t, orb: delta };
      }
      if (!best) continue;
      out.push({
        between: [pa.name, pb.name],
        type: best.type.name,
        angle: best.type.angle,
        orb: Number(best.orb.toFixed(3)),
        applying: applyingState(pa, pb, phi, best.type.angle),
      });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Convenience: normalize an angular separation to 0..180. */
export function separation(a: number, b: number): number {
  return Math.abs(signedDelta(norm360(a), norm360(b)));
}
