// a move maps envelope value e (1 at trigger, decays to 0) to a transform.
export interface Xform { x: number; y: number; sx: number; sy: number; rot: number; skew: number; alpha: number; }
export const REST: Xform = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, skew: 0, alpha: 1 };

export type Move = (e: number, t: number) => Xform;

export const MOVES: Record<string, Move> = {
  punch:   (e) => ({ ...REST, sx: 1 + e * 0.6, sy: 1 + e * 0.6, alpha: 1 - Math.max(0, e - 0.8) * 5 }),
  flag:    (e, t) => ({ ...REST, skew: e * 0.5 * Math.sin(t * 18), sy: 1 - Math.abs(e) * 0.1 }),
  "roll-in": (e) => ({ ...REST, x: -e * 1.2, rot: -e * Math.PI }),
  "fly-in": (e) => ({ ...REST, y: -e * 1.5, sx: 1 + e * 0.3 }),
  squash:  (e) => ({ ...REST, sx: 1 + e * 0.8, sy: 1 - e * 0.7 }),
  wobble:  (e, t) => ({ ...REST, rot: e * 0.25 * Math.sin(t * 22), sx: 1 + e * 0.08 }),
  spin:    (e) => ({ ...REST, rot: e * Math.PI * 2, sx: 1 - e * 0.5, sy: 1 - e * 0.5 }),
  none:    () => REST,
};
export const ENTER_MOVES = ["punch", "flag", "roll-in", "fly-in", "squash", "spin"];
export const REACT_MOVES = ["wobble", "spin", "punch", "squash", "none"];
