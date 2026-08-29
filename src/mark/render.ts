import type { Mark } from "../core/state";

// draws the static mark (shape + fg only, never bg) into a canvas. pure function of mark.
// bg is composited per destination so ascii can read pure alpha coverage.
export function renderMark(mark: Mark, canvas: HTMLCanvasElement) {
  canvas.width = mark.w; canvas.height = mark.h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, mark.w, mark.h);

  if (mark.image) {
    const im = mark.image;
    const s = Math.min((mark.w * 0.85) / im.width, (mark.h * 0.85) / im.height);
    const w = im.width * s, h = im.height * s;
    ctx.drawImage(im, (mark.w - w) / 2, (mark.h - h) / 2, w, h);
    return;
  }

  const text = mark.text || " ";
  let size = mark.h * 0.7;
  ctx.font = `${size}px "${mark.font}"`;
  const tw = ctx.measureText(text).width;
  if (tw > mark.w * 0.9) { size *= (mark.w * 0.9) / tw; ctx.font = `${size}px "${mark.font}"`; }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const cx = mark.w / 2, cy = mark.h / 2;

  if (mark.mode === "3d") {
    const depth = Math.max(2, size * 0.06);
    ctx.fillStyle = shade(mark.fg);
    for (let i = depth; i > 0; i--) ctx.fillText(text, cx + i, cy + i);
    ctx.fillStyle = mark.fg; ctx.fillText(text, cx, cy);
  } else if (mark.mode === "outline") {
    ctx.lineWidth = Math.max(1.5, size * 0.03); ctx.strokeStyle = mark.fg; ctx.strokeText(text, cx, cy);
  } else {
    ctx.fillStyle = mark.fg; ctx.fillText(text, cx, cy);
  }
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return "#666";
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${r * 0.45 | 0},${g * 0.45 | 0},${b * 0.45 | 0})`;
}
