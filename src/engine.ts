import { state, subscribe } from "./core/state";
import { envelope } from "./core/envelope";
import { MOVES, REST, chord, type Deflect } from "./core/presets";
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

// renders one frame at rest with no persistence into target (the live loop overwrites it next tick)
export function renderStill(target: HTMLCanvasElement) {
  warp.render(REST, 0, 0);
  drawFrame(target);
}

// deterministic export: the enter move simulated from rest at a fixed dt, persistence
// accumulated frame by frame. same state -> same frames. the live loop resumes after.
export function renderSequence(seconds: number, fps: number, each: (frame: HTMLCanvasElement, i: number) => void) {
  const tmp = document.createElement("canvas");
  tmp.width = state.mark.w; tmp.height = state.mark.h;
  warp.render(REST, 0, 0); // clear persistence
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    const d = chord([(MOVES[state.moves.enter] ?? MOVES.none)(envelope(t, state.tuning.speed, state.tuning.bounce), t)]);
    warp.render(d, t, state.tuning.persist);
    drawFrame(tmp);
    each(tmp, i);
  }
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
