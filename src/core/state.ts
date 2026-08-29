export type RenderMode = "fill" | "outline" | "3d";
export type Destination = "header" | "404" | "readme" | "terminal";
export type View = "px" | "ascii";

export interface Mark {
  text: string;
  font: string;
  mode: RenderMode;
  fg: string;
  bg: string; // css color, may be "transparent"
  image: HTMLImageElement | null; // dropped logo overrides text
  w: number;
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
  mark: { text: "Acme", font: "Archivo Black", mode: "fill", fg: "#ff4d00", bg: "transparent", image: null, w: 512, h: 192 },
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
export function update(fn: (s: State) => void) { fn(state); listeners.forEach((l) => l(state)); }

// destinations with no hover (a readme, a shell) loop the enter move instead;
// ascii views have no hover either. the rail greys "on hover" out when this is false.
export const LOOP_DESTS: Destination[] = ["readme", "terminal"];
export function hoverAvailable(s: State): boolean {
  return !LOOP_DESTS.includes(s.dest) && s.view[s.dest] !== "ascii";
}
