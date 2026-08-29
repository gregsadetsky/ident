export type RenderMode = "fill" | "outline" | "3d";
export type Shape = "bare" | "box" | "circle"; // frame drawn around the text (radio station id style)
export type Destination = "header" | "404" | "readme" | "terminal";
export type View = "px" | "ascii";

export interface Mark {
  text: string;
  font: string;
  mode: RenderMode;
  shape: Shape;
  fg: string;
  bg: string; // css color, may be "transparent"
  image: HTMLImageElement | null; // dropped logo overrides text
  size: number; // font size in px (images: height = size * 2)
  w: number;    // derived: tight box around the text / image, see measureMark
  h: number;
}

export interface State {
  mark: Mark;
  moves: { enter: string; react: string };
  tuning: { speed: number; bounce: number; persist: number };
  dest: Destination;
  view: Record<Destination, View>;
  siteUrl: string;
  headerPos: { x: number; y: number }; // px, top-left of the floating mark over a framed site
}

export const FONTS = [
  "Abril Fatface", "Anton", "Archivo Black", "Bebas Neue", "Black Ops One", "Bungee", "Fredoka", "Lobster", "Monoton", "Orbitron", "Permanent Marker", "Playfair Display", "Press Start 2P", "Righteous", "Rubik Mono One", "Space Mono",
];

export const state: State = {
  mark: { text: "Acme", font: "Archivo Black", mode: "fill", shape: "bare", fg: "#ff4d00", bg: "transparent", image: null, size: 40, w: 0, h: 0 },
  moves: { enter: "punch", react: "wobble" },
  tuning: { speed: 1, bounce: 0.5, persist: 0.6 },
  dest: "header",
  view: { header: "px", "404": "ascii", readme: "px", terminal: "ascii" },
  siteUrl: "",
  headerPos: { x: 24, y: 16 },
};

type Listener = (s: State) => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }
// measure hook, installed by mark/render so state stays free of canvas code
let measure: ((m: Mark) => { w: number; h: number }) | null = null;
export function setMeasure(fn: (m: Mark) => { w: number; h: number }) { measure = fn; Object.assign(state.mark, fn(state.mark)); }
export function update(fn: (s: State) => void) {
  fn(state);
  if (measure) Object.assign(state.mark, measure(state.mark));
  listeners.forEach((l) => l(state));
}

// destinations with no hover (a readme, a shell) loop the enter move instead.
// an ascii web page (404) still has hover. the rail greys "on hover" out when this is false.
export const LOOP_DESTS: Destination[] = ["readme", "terminal"];
export function hoverAvailable(s: State): boolean {
  return !LOOP_DESTS.includes(s.dest);
}
