// the embeddable runtime: one script, `ident.mount(el, config)`. shares core/ gl/ mark/ with
// the editor but owns its state (many marks per page are fine). enter move on mount,
// react move on hover. the canvas is 1.5x the mark (bleed) and overflows the element.
import { Warp } from "../gl/warp";
import { envelope } from "../core/envelope";
import { MOVES, chord } from "../core/presets";
import { renderMark, measureMark } from "../mark/render";
import { fontCssUrl } from "../core/fonts";
import { pixelsToAscii, asciiGrid } from "../export/ascii";
import type { Mark } from "../core/state";

export interface IdentConfig {
  mark: Omit<Mark, "image"> & { image?: string | null }; // image = data url
  moves: { enter: string; react: string };
  tuning: { speed: number; bounce: number; persist: number; glow?: number; scan?: number; curve?: number };
  ascii?: boolean;   // render as text in a <pre>: shape only, colored by `color` / `background`
  loop?: number;     // ms: replay the enter move on a timer (for places with no hover)
  color?: string;    // ascii text color (default: inherit)
  background?: string; // ascii block background (default: none)
  noBg?: boolean;      // px mode: skip the mark's bg box (the page already has that color)
}
export interface IdentHandle { trigger(move: string): void; enter(): void; react(): void; destroy(): void }

const RES = 2, BLEED = 1.5;

export function mount(el: HTMLElement, cfg: IdentConfig): IdentHandle {
  const mark: Mark = { ...cfg.mark, image: null };
  const measure = () => { if (!cfg.mark.w || !cfg.mark.h) Object.assign(mark, measureMark(mark)); };
  measure();
  const warp = new Warp();
  const source = document.createElement("canvas");
  const out = document.createElement("canvas");
  const fs = { w: 0, h: 0 };
  const layout = () => {
    fs.w = Math.round(mark.w * BLEED); fs.h = Math.round(mark.h * BLEED);
    out.width = fs.w * RES; out.height = fs.h * RES;
    // px: the element is the mark's rect (canvas overflows it). ascii: the element wraps the <pre>
    Object.assign(el.style, { position: el.style.position || "relative", display: el.style.display || "inline-block" },
      cfg.ascii ? { width: "auto", height: "auto" } : { width: mark.w + "px", height: mark.h + "px" });
  };
  layout();
  Object.assign(out.style, { position: "absolute", left: "-25%", top: "-25%", width: "150%", height: "150%", pointerEvents: "none" });
  el.appendChild(out);
  const ctx = out.getContext("2d")!;
  let pre: HTMLPreElement | null = null;
  if (cfg.ascii) {
    out.remove();
    pre = document.createElement("pre");
    const g = asciiGrid(fs.w, fs.h);
    Object.assign(pre.style, { margin: "0", whiteSpace: "pre", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: "10px", lineHeight: "10px", width: g.cols + "ch", color: cfg.color || "inherit", background: cfg.background || "" });
    el.appendChild(pre);
  }

  let triggered: { move: string; at: number }[] = [];
  const t0 = performance.now();
  const rebuild = () => { measure(); layout(); renderMark(mark, source, RES, BLEED); warp.setSource(source); };
  rebuild();

  // fonts: load the face, re-render when it arrives
  // (fonts.load resolves with nothing if the face isn't in the cssom yet: wait for the stylesheet first)
  if (!mark.image && document.fonts) {
    const loadFace = () => document.fonts.load(`10px "${mark.font}"`).then(rebuild, () => {});
    const existing = document.querySelector<HTMLLinkElement>(`link[data-ident-font="${mark.font}"]`);
    if (existing) loadFace();
    else {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = fontCssUrl(mark.font); l.dataset.identFont = mark.font;
      l.onload = loadFace; document.head.appendChild(l);
    }
    document.fonts.ready.then(rebuild);
  }
  if (cfg.mark.image) { const im = new Image(); im.onload = () => { mark.image = im; rebuild(); }; im.src = cfg.mark.image; }

  const trigger = (move: string) => triggered.push({ move, at: performance.now() });
  const enter = () => { triggered = []; trigger(cfg.moves.enter); };
  const react = () => trigger(cfg.moves.react);
  el.addEventListener("mouseenter", react);
  const timer = cfg.loop ? setInterval(enter, cfg.loop) : 0;

  let raf = 0;
  const loop = () => {
    const now = performance.now();
    triggered = triggered.filter((tr) => (now - tr.at) / 1000 < 4);
    const d = chord(triggered.map((tr) => { const t = (now - tr.at) / 1000; return (MOVES[tr.move] ?? MOVES.none)(envelope(t, cfg.tuning.speed, cfg.tuning.bounce), t); }));
    warp.render(d, (now - t0) / 1000, cfg.tuning.persist, { glow: cfg.tuning.glow ?? 0, scan: cfg.tuning.scan ?? 0, curve: cfg.tuning.curve ?? 0 });
    if (pre) {
      const g = asciiGrid(fs.w, fs.h);
      const w = g.cols + "ch"; if (pre.style.width !== w) pre.style.width = w;
      const t = document.createElement("canvas"); t.width = g.cols; t.height = g.rows;
      const tc = t.getContext("2d")!; tc.drawImage(warp.canvas, 0, 0, g.cols, g.rows);
      pre.textContent = pixelsToAscii(tc.getImageData(0, 0, g.cols, g.rows).data, g.cols, g.rows);
      raf = requestAnimationFrame(loop); return;
    }
    ctx.clearRect(0, 0, out.width, out.height);
    if (mark.bg !== "transparent" && !cfg.noBg) {
      const m = (BLEED - 1) / 2; ctx.fillStyle = mark.bg;
      ctx.fillRect(mark.w * m * RES, mark.h * m * RES, mark.w * RES, mark.h * RES);
    }
    ctx.drawImage(warp.canvas, 0, 0, out.width, out.height);
    raf = requestAnimationFrame(loop);
  };
  enter(); raf = requestAnimationFrame(loop);

  return { trigger, enter, react, destroy() { cancelAnimationFrame(raf); clearInterval(timer); el.removeEventListener("mouseenter", react); out.remove(); pre?.remove(); } };
}
