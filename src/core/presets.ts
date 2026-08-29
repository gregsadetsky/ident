// deflection parameters: what the "analog cpu" feeds into the crt sweep.
// every move is envelope e (1 at trigger -> 0 at rest) and time t -> params.
export interface Deflect {
  dx: number; dy: number;      // static offset (fraction of frame)
  zx: number; zy: number;      // per-axis zoom (1 = rest)
  rot: number;                 // radians
  persp: number;               // per-scanline size ramp (keystone / flying perspective)
  tau: number;                 // rc lag on the vertical sweep (rubbery ramp), 0..0.85
  ampX: number; freqX: number; rateX: number; // horizontal wobble: x += ampX*sin(2pi*(freqX*y + rateX*t))
  ampY: number; freqY: number; rateY: number; // vertical wobble
  flag: number;                // travelling wave scaled by x (a flag)
}
export const REST: Deflect = { dx: 0, dy: 0, zx: 1, zy: 1, rot: 0, persp: 0, tau: 0, ampX: 0, freqX: 3, rateX: 6, ampY: 0, freqY: 3, rateY: 5, flag: 0 };

export type Move = (e: number, t: number) => Partial<Deflect>;

export const MOVES: Record<string, Move> = {
  punch:     (e) => ({ zx: 1 + e * 0.7, zy: 1 + e * 0.7, tau: e * 0.3 }),
  flag:      (e) => ({ flag: e * 0.35, zy: 1 - e * 0.1 }),
  "roll-in": (e) => ({ dx: -e * 1.2, rot: -e * Math.PI, persp: e * 0.3 }),
  "fly-in":  (e) => ({ dy: -e * 1.2, persp: e * 0.9, tau: e * 0.6, zx: 1 + e * 0.4 }),
  squash:    (e) => ({ zx: 1 + e * 0.8, zy: 1 - e * 0.7 }),
  wobble:    (e) => ({ ampX: e * 0.08, freqX: 2, rateX: 7, ampY: e * 0.02, rateY: 9 }),
  spin:      (e) => ({ rot: e * Math.PI * 2, zx: 1 - e * 0.5, zy: 1 - e * 0.5 }),
  psycho:    (e) => ({ ampX: e * 0.15, freqX: 6, rateX: 3, ampY: e * 0.15, freqY: 5, rateY: 2, rot: e * 0.4 }),
  keystone:  (e) => ({ persp: e * 1.2, dy: e * 0.2 }),
  none:      () => ({}),
};
export const ENTER_MOVES = ["punch", "flag", "roll-in", "fly-in", "squash", "spin", "psycho", "keystone", "none"];
export const REACT_MOVES = ["wobble", "spin", "punch", "squash", "flag", "psycho", "none"];

// chord = sum of all live moves' contributions on top of rest
export function chord(parts: Partial<Deflect>[]): Deflect {
  const d = { ...REST };
  for (const p of parts) for (const k in p) {
    const key = k as keyof Deflect, v = p[key]!;
    if (key === "zx" || key === "zy") d[key] *= v;
    else if (key.startsWith("freq") || key.startsWith("rate")) d[key] = v;
    else d[key] += v;
  }
  return d;
}
