import { state, subscribe } from "./core/state";
import { envelope } from "./core/envelope";
import { MOVES, REST, type Xform } from "./core/presets";
import { renderMark } from "./mark/render";

// one shared animation: the static mark is rendered once per state change,
// the transform is a pure function of (move, time since trigger).
const markCanvas = document.createElement("canvas");
let triggered: { move: string; at: number }[] = [];

export function trigger(move: string) { triggered.push({ move, at: performance.now() }); }
export function triggerEnter() { triggered = []; trigger(state.moves.enter); }
export function triggerReact() { trigger(state.moves.react); }

subscribe(() => renderMark(state.mark, markCanvas));
renderMark(state.mark, markCanvas);

export function currentXform(now = performance.now()): Xform {
  const x = { ...REST };
  triggered = triggered.filter((tr) => (now - tr.at) / 1000 < 4);
  for (const tr of triggered) {
    const t = (now - tr.at) / 1000;
    const e = envelope(t, state.tuning.speed, state.tuning.bounce);
    const m = (MOVES[tr.move] ?? MOVES.none)(e, t);
    x.x += m.x; x.y += m.y; x.sx *= m.sx; x.sy *= m.sy; x.rot += m.rot; x.skew += m.skew; x.alpha *= m.alpha;
  }
  return x;
}

// draws the animated mark into target at its own size (bleed: mark may exceed bounds, that's fine)
export function drawFrame(target: HTMLCanvasElement, xf = currentXform()) {
  const ctx = target.getContext("2d")!;
  const W = target.width, H = target.height;
  ctx.clearRect(0, 0, W, H);
  const s = Math.min(W / markCanvas.width, H / markCanvas.height);
  ctx.save();
  ctx.translate(W / 2 + xf.x * W, H / 2 + xf.y * H);
  ctx.rotate(xf.rot);
  ctx.transform(1, 0, xf.skew, 1, 0, 0);
  ctx.scale(s * xf.sx, s * xf.sy);
  ctx.globalAlpha = Math.max(0, Math.min(1, xf.alpha));
  ctx.drawImage(markCanvas, -markCanvas.width / 2, -markCanvas.height / 2);
  ctx.restore();
}

// per-destination render loop subscribers
const frames = new Set<() => void>();
export function onFrame(fn: () => void) { frames.add(fn); return () => frames.delete(fn); }
function loop() { frames.forEach((f) => f()); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
