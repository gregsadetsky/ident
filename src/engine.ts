import { state, subscribe } from "./core/state";
import { envelope } from "./core/envelope";
import { MOVES, chord, type Deflect } from "./core/presets";
import { renderMark } from "./mark/render";
import { Warp } from "./gl/warp";

// the static mark is rendered to a 2d canvas once per state change and uploaded as the
// "artwork on the light table". every frame the warp pass re-scans it with the current
// deflection chord (sum of all live moves' envelopes). the warp canvas is the one frame
// every destination (px + ascii) reads from.
const markCanvas = document.createElement("canvas");
const warp = new Warp();
let triggered: { move: string; at: number }[] = [];
const t0 = performance.now();

export const frame = warp.canvas;
export function trigger(move: string) { triggered.push({ move, at: performance.now() }); }
export function triggerEnter() { triggered = []; trigger(state.moves.enter); }
export function triggerReact() { trigger(state.moves.react); }

function rebuild() { renderMark(state.mark, markCanvas); warp.setSource(markCanvas); }
subscribe(rebuild); rebuild();

export function currentDeflect(now = performance.now()): Deflect {
  triggered = triggered.filter((tr) => (now - tr.at) / 1000 < 4);
  return chord(triggered.map((tr) => {
    const t = (now - tr.at) / 1000;
    return (MOVES[tr.move] ?? MOVES.none)(envelope(t, state.tuning.speed, state.tuning.bounce), t);
  }));
}

export function drawFrame(target: HTMLCanvasElement) {
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, target.width, target.height);
  if (state.mark.bg !== "transparent") { ctx.fillStyle = state.mark.bg; ctx.fillRect(0, 0, target.width, target.height); }
  ctx.drawImage(frame, 0, 0, target.width, target.height);
}

const frames = new Set<() => void>();
export function onFrame(fn: () => void) { frames.add(fn); return () => frames.delete(fn); }
function loop() {
  const now = performance.now();
  warp.render(currentDeflect(now), (now - t0) / 1000, state.tuning.persist);
  frames.forEach((f) => f());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
