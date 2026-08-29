import { state, subscribe, setMeasure } from "./core/state";
import { envelope } from "./core/envelope";
import { MOVES, REST, chord, type Deflect } from "./core/presets";
import { renderMark, measureMark } from "./mark/render";
import { Warp } from "./gl/warp";

// the static mark is rendered to a 2d canvas once per state change and uploaded as the
// "artwork on the light table". every frame the warp pass re-scans it with the current
// deflection chord (sum of all live moves' envelopes). the warp canvas is the one frame
// every destination (px + ascii) reads from.
// rendered at RES x the logical size so retina displays and upscaled slots stay crisp.
// BLEED: the frame is this much larger than the mark on each axis, mark centred, so effects
// that push the mark out of its own rect still show. logical frame size = mark * BLEED.
export const RES = 2;
export const BLEED = 1.5;
export function frameSize() { return { w: Math.round(state.mark.w * BLEED), h: Math.round(state.mark.h * BLEED) }; }
const markCanvas = document.createElement("canvas");
// two scans of the same artwork: one with every live move (hover included), one with the
// enter move only, for destinations that have no hover (readme, terminal, ascii views).
// separate instances because phosphor persistence is per-scan state.
const warp = new Warp();
const warpNoHover = new Warp();
type Kind = "enter" | "react";
let triggered: { move: string; at: number; kind: Kind }[] = [];
const t0 = performance.now();

export const frame = warp.canvas;
export const frameNoHover = warpNoHover.canvas;
export function trigger(move: string, kind: Kind = "react") { triggered.push({ move, at: performance.now(), kind }); }
export function triggerEnter() { triggered = []; trigger(state.moves.enter, "enter"); }
export function triggerReact() { trigger(state.moves.react, "react"); }

function rebuild() { renderMark(state.mark, markCanvas, RES, BLEED); warp.setSource(markCanvas); warpNoHover.setSource(markCanvas); }
setMeasure(measureMark);
subscribe(rebuild); rebuild();

export function currentDeflect(now = performance.now(), withReact = true): Deflect {
  triggered = triggered.filter((tr) => (now - tr.at) / 1000 < 4);
  return chord(triggered.filter((tr) => withReact || tr.kind === "enter").map((tr) => {
    const t = (now - tr.at) / 1000;
    return (MOVES[tr.move] ?? MOVES.none)(envelope(t, state.tuning.speed, state.tuning.bounce), t);
  }));
}

// draws src (default: the full frame) into target, bg composited. crop = source rect in frame pixels.
export function drawFrame(target: HTMLCanvasElement, src: HTMLCanvasElement = frame, crop?: { x: number; y: number; w: number; h: number }) {
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, target.width, target.height);
  if (state.mark.bg !== "transparent") {
    // bg belongs to the mark's own rect, never the bleed around it
    ctx.fillStyle = state.mark.bg;
    if (crop) ctx.fillRect(0, 0, target.width, target.height);
    else { const r = markRect(), sx = target.width / src.width, sy = target.height / src.height; ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy); }
  }
  if (crop) ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, target.width, target.height);
  else ctx.drawImage(src, 0, 0, target.width, target.height);
}

// the mark's own rect inside the bleed frame, in frame pixels
export function markRect() {
  const m = (BLEED - 1) / 2;
  return { x: Math.round(state.mark.w * m * RES), y: Math.round(state.mark.h * m * RES), w: state.mark.w * RES, h: state.mark.h * RES };
}

// renders one frame at rest with no persistence into target (the live loop overwrites it next tick)
export function renderStill(target: HTMLCanvasElement) {
  warp.clear();
  warp.render(REST, 0, 0, state.tuning);
  drawFrame(target);
}

// deterministic export: the enter move simulated from rest at a fixed dt, persistence
// accumulated frame by frame. same state -> same frames. the live loop resumes after.
export function renderSequence(seconds: number, fps: number, each: (frame: HTMLCanvasElement, i: number) => void) {
  const tmp = document.createElement("canvas");
  const fs = frameSize(); tmp.width = fs.w; tmp.height = fs.h;
  warp.clear();
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    const d = chord([(MOVES[state.moves.enter] ?? MOVES.none)(envelope(t, state.tuning.speed, state.tuning.bounce), t)]);
    warp.render(d, t, state.tuning.persist, state.tuning);
    drawFrame(tmp);
    each(tmp, i);
  }
}

const frames = new Set<() => void>();
export function onFrame(fn: () => void) { frames.add(fn); return () => frames.delete(fn); }
function loop() {
  const now = performance.now();
  warp.render(currentDeflect(now, true), (now - t0) / 1000, state.tuning.persist, state.tuning);
  warpNoHover.render(currentDeflect(now, false), (now - t0) / 1000, state.tuning.persist, state.tuning);
  frames.forEach((f) => f());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
