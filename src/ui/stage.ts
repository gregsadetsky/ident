import { state, update, subscribe, hoverAvailable, LOOP_DESTS, type Destination } from "../core/state";
import { drawFrame, frame, frameNoHover, frameSize, markRect, onFrame, triggerEnter, triggerReact } from "../engine";
import { canvasToAscii, asciiGrid } from "../export/ascii";
import { downloadStill } from "../export/still";
import { download, encodeGif, encodeMp4 } from "../export/video";
import { downloadEmbed, download404 } from "../export/embed";
import { makeFloating } from "./floating";
import { normalizeSiteUrl } from "../core/url";

// exports: label + action (undefined = not built yet)
interface Export { label: string; run?: () => void }
interface Dest { id: Destination; label: string; exports: Export[]; asciiLocked?: boolean }
const DESTS: Dest[] = [
  { id: "header", label: "site header", exports: [{ label: "get embed .html", run: downloadEmbed }] },
  { id: "404", label: "404", exports: [{ label: "get 404.html", run: download404 }] },
  { id: "readme", label: "readme", exports: [{ label: "get still .png", run: () => downloadStill() }, { label: "get .gif", run: () => download(encodeGif(), "ident.gif") },
    { label: "get .mp4", run: () => encodeMp4().then((b) => download(b, "ident.mp4"), (e) => alert(String(e))) }] },
  { id: "terminal", label: "terminal", exports: [{ label: "get .sh" }], asciiLocked: true },
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
    const name = document.createElement("span"); name.textContent = d.label;
    b.append(px, asc, name);
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
      t.px.hidden = view !== "px"; t.asc.hidden = view !== "ascii";
      if (view === "px") drawFrame(t.px, src, rect);
      else {
        if (!asciiSmall.has(src)) {
          thumbCrop.width = state.mark.w; thumbCrop.height = state.mark.h;
          const c2 = thumbCrop.getContext("2d")!;
          c2.clearRect(0, 0, thumbCrop.width, thumbCrop.height);
          c2.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, thumbCrop.width, thumbCrop.height);
          asciiSmall.set(src, canvasToAscii(thumbCrop, 48));
        }
        t.asc.textContent = asciiSmall.get(src)!;
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
      <p>404 — page not found · <a href="#">go home</a></p>
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
