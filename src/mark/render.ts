import type { Mark } from "../core/state";

// the mark's box is measured from its content: text at `size` px (or an image at size*2 tall)
// plus a little padding, more when a box/pill frame is drawn around it.
function metrics(mark: Mark) {
  const boxed = mark.shape !== "bare";
  const line = boxed ? Math.max(2, mark.size * 0.06) : 0;
  const pad = boxed ? mark.size * 0.45 : mark.size * 0.12;
  return { boxed, line, pad };
}

const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
export function measureMark(mark: Mark): { w: number; h: number } {
  if (mark.image) { const h = mark.size * 2; return { w: Math.max(1, Math.round((h * mark.image.width) / mark.image.height)), h }; }
  const ctx = measureCanvas!.getContext("2d")!;
  ctx.font = `${mark.size}px "${mark.font}"`;
  const m = ctx.measureText(mark.text || " ");
  const th = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || mark.size;
  const { line, pad } = metrics(mark);
  if (mark.shape === "circle") { const d = Math.ceil(Math.max(m.width, th) + (pad + line) * 2); return { w: d, h: d }; }
  return { w: Math.ceil(m.width + (pad + line) * 2), h: Math.ceil(th + (pad + line) * 2) };
}

// draws the static mark (shape + fg only, never bg) into a canvas. pure function of mark.
// scale = supersampling factor, bleed = extra room around the mark so deflections can
// leave its rect without being clipped: the canvas is (mark.w*bleed*scale) x (mark.h*bleed*scale)
// pixels and the mark is drawn at its true size in the centre. bg is composited per destination.
export function renderMark(mark: Mark, canvas: HTMLCanvasElement, scale = 1, bleed = 1) {
  canvas.width = Math.round(mark.w * bleed * scale); canvas.height = Math.round(mark.h * bleed * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate((mark.w * (bleed - 1)) / 2, (mark.h * (bleed - 1)) / 2);

  if (mark.image) { ctx.drawImage(mark.image, 0, 0, mark.w, mark.h); return; }

  const text = mark.text || " ";
  const { boxed, line } = metrics(mark);
  ctx.font = `${mark.size}px "${mark.font}"`;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const cx = mark.w / 2, baseline = (mark.h - th) / 2 + m.actualBoundingBoxAscent; // text vertically centred in the box

  if (boxed) {
    const inset = line / 2, x = inset, y = inset, w = mark.w - line, h = mark.h - line;
    ctx.lineWidth = line; ctx.strokeStyle = mark.fg;
    ctx.beginPath();
    if (mark.shape === "circle") ctx.arc(mark.w / 2, mark.h / 2, (mark.w - line) / 2, 0, Math.PI * 2); else ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  if (mark.mode === "3d") {
    const depth = Math.max(1, mark.size * 0.05);
    ctx.fillStyle = shade(mark.fg);
    for (let i = depth; i > 0; i -= 0.5) ctx.fillText(text, cx + i, baseline + i);
    ctx.fillStyle = mark.fg; ctx.fillText(text, cx, baseline);
  } else if (mark.mode === "outline") {
    ctx.lineWidth = Math.max(1, mark.size * 0.03); ctx.strokeStyle = mark.fg; ctx.strokeText(text, cx, baseline);
  } else {
    ctx.fillStyle = mark.fg; ctx.fillText(text, cx, baseline);
  }
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return "#666";
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${r * 0.45 | 0},${g * 0.45 | 0},${b * 0.45 | 0})`;
}
