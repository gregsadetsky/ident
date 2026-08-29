import { state, update, subscribe, hoverAvailable, LOOP_DESTS, type Destination } from "../core/state";
import { drawFrame, frame, frameNoHover, frameSize, markRect, onFrame, triggerEnter, triggerReact } from "../engine";
import { canvasToAscii, asciiGrid } from "../export/ascii";
import { downloadStill } from "../export/still";
import { download, encodeGif } from "../export/video";
import { downloadEmbed, download404 } from "../export/embed";
import { downloadTerminalBundle } from "../export/frames";
import { makeFloating } from "./floating";
import { normalizeSiteUrl } from "../core/url";

// exports: label + action (undefined = not built yet)
interface Export { label: string; run?: () => void }
interface Dest { id: Destination; label: string; tab?: string; exports: Export[]; asciiLocked?: boolean }
const GITHUB_MARK = `<svg class="gh-mark" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const DESTS: Dest[] = [
  { id: "header", label: "site header", exports: [{ label: "get embed .zip", run: downloadEmbed }] },
  { id: "404", label: "404", tab: "404.html", exports: [{ label: "get 404 .zip", run: download404 }] },
  { id: "readme", label: "readme", tab: `${GITHUB_MARK} README.md`, exports: [{ label: "get still .png", run: () => downloadStill() }, { label: "get .gif", run: () => download(encodeGif(), "ident.gif") }] },
  { id: "terminal", label: "terminal", tab: "&gt; terminal", exports: [{ label: "get terminal .zip", run: downloadTerminalBundle }], asciiLocked: true },
];

export function mountStage(root: HTMLElement) {
  root.innerHTML = `
    <nav class="tabs"></nav>
    <header class="stagehead">
      <span class="editing"></span>
      <span class="grow"></span>
      <span class="tgl"><button data-v="px">px</button><button data-v="ascii">ascii</button></span>
      <span class="exports"></span>
    </header>
    <div class="context"></div>
  `;
  const tabs = root.querySelector<HTMLElement>(".tabs")!;
  const editing = root.querySelector<HTMLElement>(".editing")!;
  const tgl = root.querySelector<HTMLElement>(".tgl")!;
  const exports = root.querySelector<HTMLElement>(".exports")!;
  const context = root.querySelector<HTMLElement>(".context")!;

  // tabs are live thumbnails
  const thumbs = new Map<Destination, { px: HTMLCanvasElement; asc: HTMLPreElement }>();
  for (const d of DESTS) {
    const b = document.createElement("button"); b.className = "tab"; b.dataset.id = d.id;
    const px = document.createElement("canvas"); px.width = 160; px.height = 60;
    const asc = document.createElement("pre");
    const thumb = document.createElement("div"); thumb.className = "thumb"; thumb.appendChild(asc);
    const name = document.createElement("span"); name.innerHTML = d.tab ?? d.label;
    b.append(px, thumb, name);
    b.onclick = () => update((s) => { s.dest = d.id; });
    tabs.appendChild(b); thumbs.set(d.id, { px, asc });
  }
  tgl.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.onclick = () => update((s) => { s.view[s.dest] = b.dataset.v as "px" | "ascii"; }));

  let ctxEl: { canvas?: HTMLCanvasElement; pre?: HTMLPreElement } = {};

  // rebuild the context only when what it shows changes; mark edits must not reload an iframe
  let built = "";
  function build() {
    const d = DESTS.find((x) => x.id === state.dest)!;
    const view = d.asciiLocked ? "ascii" : state.view[d.id];
    const key = `${d.id}|${view}|${state.siteUrl}`;
    if (key === built) return;
    built = key;
    editing.textContent = `editing: ${d.label}`;
    exports.innerHTML = "";
    for (const ex of d.exports) {
      const b = document.createElement("button"); b.className = "export"; b.textContent = ex.label + " ↓";
      b.onclick = ex.run ?? (() => alert("not built yet"));
      exports.appendChild(b);
    }
    tgl.hidden = !!d.asciiLocked;
    tgl.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("on", b.dataset.v === view));
    tabs.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => b.classList.toggle("on", b.dataset.id === d.id));
    context.className = "context " + d.id;
    context.innerHTML = CONTEXT[d.id](view);
    const slot = context.querySelector<HTMLElement>(".slot")!;
    ctxEl = {};
    if (view === "px") {
      const c = document.createElement("canvas");
      c.width = frame.width; c.height = frame.height;
      slot.style.setProperty("--fw", frameSize().w + "px"); // logical frame width for slots that show it 1:1
      slot.appendChild(c); ctxEl.canvas = c;
    } else {
      const p = document.createElement("pre"); slot.appendChild(p); ctxEl.pre = p;
      p.style.width = asciiGrid(frameSize().w, frameSize().h).cols + "ch"; // trailing spaces are stripped; keep the block centred
    }
    slot.onmouseenter = () => { if (hoverAvailable(state)) triggerReact(); };
    sizeReadmeSlot();
    const url = context.querySelector<HTMLInputElement>("#siteurl");
    if (url) {
      url.value = state.siteUrl;
      url.onchange = () => update((s) => { s.siteUrl = normalizeSiteUrl(url.value); });
      const fr = context.querySelector<HTMLIFrameElement>("iframe")!;
      if (state.siteUrl) fr.src = state.siteUrl;
      context.querySelector(".site")!.classList.toggle("framed", !!state.siteUrl);
      if (state.siteUrl) makeFloating(slot);
    }
  }
  subscribe(build); build();
  setInterval(() => { if (LOOP_DESTS.includes(state.dest)) triggerEnter(); }, 3000);

  // readme: github shows the gif at its css size; the screenshot is a 2x capture of 2886x1966
  const SHOT = { w: 2886, h: 1966, dpr: 2 };
  let sizedFor = "";
  function sizeReadmeSlot() {
    const slot = context.querySelector<HTMLElement>(".gh .slot"); if (!slot) return;
    const key = `${state.mark.w}x${state.mark.h}`; if (key === sizedFor) return; sizedFor = key;
    slot.style.width = ((state.mark.w * SHOT.dpr) / SHOT.w) * 100 + "%";
    slot.style.height = ((state.mark.h * SHOT.dpr) / SHOT.h) * 100 + "%";
  }
  subscribe(sizeReadmeSlot);

  // which scan a destination shows: hover-capable ones get the full chord, others enter-only
  const frameFor = (id: Destination) => hoverAvailable({ ...state, dest: id }) ? frame : frameNoHover;
  const thumbCrop = document.createElement("canvas");
  onFrame(() => {
    const stageFrame = frameFor(state.dest);
    if (ctxEl.canvas) {
      if (ctxEl.canvas.width !== frame.width || ctxEl.canvas.height !== frame.height) { ctxEl.canvas.width = frame.width; ctxEl.canvas.height = frame.height; ctxEl.canvas.parentElement!.style.setProperty("--fw", frameSize().w + "px"); }
      drawFrame(ctxEl.canvas, stageFrame);
    }
    if (ctxEl.pre) {
      const g = asciiGrid(frameSize().w, frameSize().h);
      ctxEl.pre.textContent = canvasToAscii(stageFrame, undefined, g);
      const w = g.cols + "ch"; if (ctxEl.pre.style.width !== w) ctxEl.pre.style.width = w;
    }
    // thumbnails: cropped to the mark rect (the bleed would make them tiny)
    const rect = markRect();
    const asciiSmall = new Map<HTMLCanvasElement, string>();
    for (const d of DESTS) {
      const t = thumbs.get(d.id)!;
      const view = d.asciiLocked ? "ascii" : state.view[d.id];
      const src = frameFor(d.id);
      t.px.hidden = view !== "px"; t.asc.parentElement!.hidden = view !== "ascii";
      if (view === "px") drawFrame(t.px, src, rect);
      else {
        // real grid for the mark rect, shrunk with a css transform (not a low-res grid)
        const g = asciiGrid(state.mark.w, state.mark.h);
        if (!asciiSmall.has(src)) {
          thumbCrop.width = state.mark.w; thumbCrop.height = state.mark.h;
          const c2 = thumbCrop.getContext("2d")!;
          c2.clearRect(0, 0, thumbCrop.width, thumbCrop.height);
          c2.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, thumbCrop.width, thumbCrop.height);
          asciiSmall.set(src, canvasToAscii(thumbCrop, undefined, g));
        }
        t.asc.textContent = asciiSmall.get(src)!;
        const scale = Math.min(150 / (g.cols * 6.02), 52 / (g.rows * 10)); // 10px mono ~ 6px wide
        const tr = `scale(${scale.toFixed(3)})`; if (t.asc.style.transform !== tr) { t.asc.style.transform = tr; t.asc.style.width = g.cols + "ch"; }
      }
    }
  });
}

const CONTEXT: Record<Destination, (view: string) => string> = {
  header: () => `
    <div class="urlbar"><input id="siteurl" type="text" placeholder="https://your-site.com (if iframe-able)"></div>
    <div class="site">
      <iframe sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
      <div class="fakepage">
        <div class="topbar"><span class="slot"></span><span class="links">about &nbsp; docs &nbsp; pricing</span></div>
        <div class="body">
          <h2>Ship faster with less.</h2>
          <p>A tiny toolkit for teams who would rather build than configure. Free for individuals.</p>
          <span class="btn">Get started</span>
          <div class="cols">
            <div><b>Fast</b><br>Cold start under a second.</div>
            <div><b>Small</b><br>No dependencies, one file.</div>
            <div><b>Yours</b><br>Self-host it anywhere.</div>
          </div>
        </div>
      </div>
    </div>`,
  "404": () => `
    <div class="page404">
      <span class="slot"></span>
      <p>404 — page not found</p>
      <p><a href="#">go home</a></p>
    </div>`,
  readme: () => `
    <div class="gh">
      <img src="/github-readme.png" alt="">
      <span class="slot"></span>
    </div>`,
  terminal: () => `
    <div class="term">
      <div class="termbar"><i></i><i></i><i></i></div>
      <div class="termbody"><div>$ npx yourcli</div><span class="slot"></span><div>$ <span class="cursor">_</span></div></div>
    </div>`,
};

export { triggerEnter };
