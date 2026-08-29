import { state, update, subscribe, type Destination } from "../core/state";
import { drawFrame, frame, onFrame, triggerEnter, triggerReact } from "../engine";
import { canvasToAscii } from "../export/ascii";

// terminal: ascii only, no hover (there is no hover in a shell) - the enter move loops instead
const DESTS: { id: Destination; label: string; export: string; asciiLocked?: boolean; loop?: boolean }[] = [
  { id: "header", label: "site header", export: "get embed" },
  { id: "404", label: "404", export: "get .html" },
  { id: "readme", label: "readme", export: "get .mp4" },
  { id: "terminal", label: "terminal", export: "get .sh", asciiLocked: true, loop: true },
];


export function mountStage(root: HTMLElement) {
  root.innerHTML = `
    <nav class="tabs"></nav>
    <header class="stagehead">
      <span class="editing"></span>
      <span class="grow"></span>
      <span class="tgl"><button data-v="px">px</button><button data-v="ascii">ascii</button></span>
      <button class="export"></button>
    </header>
    <div class="context"></div>
  `;
  const tabs = root.querySelector<HTMLElement>(".tabs")!;
  const editing = root.querySelector<HTMLElement>(".editing")!;
  const tgl = root.querySelector<HTMLElement>(".tgl")!;
  const exportBtn = root.querySelector<HTMLButtonElement>(".export")!;
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
  exportBtn.onclick = () => alert("export: not built yet");

  let ctxEl: { canvas?: HTMLCanvasElement; pre?: HTMLPreElement; cols: number } = { cols: 60 };

  function build() {
    const d = DESTS.find((x) => x.id === state.dest)!;
    const view = d.asciiLocked ? "ascii" : state.view[d.id];
    editing.textContent = `editing: ${d.label}`;
    exportBtn.textContent = d.export + " ↓";
    tgl.hidden = !!d.asciiLocked;
    tgl.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("on", b.dataset.v === view));
    tabs.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => b.classList.toggle("on", b.dataset.id === d.id));
    context.className = "context " + d.id;
    context.innerHTML = CONTEXT[d.id](view);
    const slot = context.querySelector<HTMLElement>(".slot")!;
    ctxEl = { cols: +(slot.dataset.cols || 60) };
    if (view === "px") {
      const c = document.createElement("canvas");
      c.width = state.mark.w; c.height = state.mark.h;
      slot.appendChild(c); ctxEl.canvas = c;
    } else {
      const p = document.createElement("pre"); slot.appendChild(p); ctxEl.pre = p;
    }
    slot.onmouseenter = d.loop ? null : triggerReact;
    const url = context.querySelector<HTMLInputElement>("#siteurl");
    if (url) {
      url.value = state.siteUrl;
      url.onchange = () => update((s) => {
        const v = url.value.trim();
        s.siteUrl = v && !/^https?:\/\//i.test(v) ? "https://" + v : v;
      });
      const fr = context.querySelector<HTMLIFrameElement>("iframe")!;
      if (state.siteUrl) fr.src = state.siteUrl;
      context.querySelector(".site")!.classList.toggle("framed", !!state.siteUrl);
    }
  }
  subscribe(build); build();
  setInterval(() => { if (DESTS.find((x) => x.id === state.dest)?.loop) triggerEnter(); }, 3000);

  onFrame(() => {
    if (ctxEl.canvas) drawFrame(ctxEl.canvas);
    if (ctxEl.pre) ctxEl.pre.textContent = canvasToAscii(frame, ctxEl.cols);
    let asciiSmall: string | null = null;
    for (const d of DESTS) {
      const t = thumbs.get(d.id)!;
      const view = d.asciiLocked ? "ascii" : state.view[d.id];
      t.px.hidden = view !== "px"; t.asc.hidden = view !== "ascii";
      if (view === "px") drawFrame(t.px);
      else t.asc.textContent = asciiSmall ??= canvasToAscii(frame, 28);
    }
  });
}

const CONTEXT: Record<Destination, (view: string) => string> = {
  header: () => `
    <div class="urlbar"><input id="siteurl" type="text" placeholder="https://your-site.com"></div>
    <div class="site">
      <iframe sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
      <div class="fakepage">
        <div class="topbar"><span class="slot" data-cols="40"></span><span class="links">about &nbsp; docs &nbsp; pricing</span></div>
        <div class="body"><div class="ph w60"></div><div class="ph w90"></div><div class="ph w40"></div></div>
      </div>
    </div>`,
  "404": () => `
    <div class="page404">
      <span class="slot" data-cols="72"></span>
      <p>404 — page not found · <a href="#">go home</a></p>
    </div>`,
  readme: () => `
    <div class="gh">
      <img src="/github-readme.png" alt="">
      <span class="slot" data-cols="90"></span>
    </div>`,
  terminal: () => `
    <div class="term">
      <div class="termbar"><i></i><i></i><i></i></div>
      <div class="termbody"><div>$ npx you</div><span class="slot" data-cols="64"></span><div>$ <span class="cursor">_</span></div></div>
    </div>`,
};

export { triggerEnter };
