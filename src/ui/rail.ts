import { state, update, FONTS, type RenderMode } from "../core/state";
import { ENTER_MOVES, REACT_MOVES } from "../core/presets";
import { triggerEnter, triggerReact } from "../engine";

function chips(opts: string[], current: () => string, set: (v: string) => void, after?: () => void) {
  const wrap = document.createElement("div"); wrap.className = "chips";
  for (const o of opts) {
    const b = document.createElement("button"); b.textContent = o; b.className = "chip";
    b.onclick = () => { update(() => set(o)); sync(); after?.(); };
    wrap.appendChild(b);
  }
  const sync = () => wrap.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => b.classList.toggle("on", b.textContent === current()));
  sync();
  return wrap;
}

function loadImage(f: File) {
  const im = new Image();
  im.onload = () => { update((s) => { s.mark.image = im; }); triggerEnter(); };
  im.src = URL.createObjectURL(f);
}

export function mountRail(root: HTMLElement) {
  root.insertAdjacentHTML("beforeend", `
    <section>
      <h2>Mark</h2>
      <div class="drop" id="drop">Drop an svg / png anywhere<br><small>or type below</small></div>
      <input id="text" type="text" maxlength="24" spellcheck="false">
      <select id="font"></select>
      <div id="mode"></div>
      <div class="row">
        <label>fg <input id="fg" type="color"></label>
        <label>bg <input id="bg" type="color"></label>
        <label><input id="bgt" type="checkbox"> transparent</label>
      </div>
      <div class="row">
        <label>w <input id="w" type="number" min="32" max="2048" step="16"></label>
        <label>h <input id="h" type="number" min="32" max="2048" step="16"></label>
      </div>
    </section>
    <section>
      <h2>Move</h2>
      <div class="sub">enter <button class="play" id="playEnter" title="replay">▶</button></div>
      <div id="enter"></div>
      <div class="sub">react <small>(on hover)</small> <button class="play" id="playReact" title="replay">▶</button></div>
      <div id="react"></div>
      <details>
        <summary>fine tune</summary>
        <label>speed <input id="speed" type="range" min="0.3" max="3" step="0.05"></label>
        <label>bounce <input id="bounce" type="range" min="0" max="1" step="0.05"></label>
      </details>
    </section>
  `);
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>("#" + id)!;

  const text = $<HTMLInputElement>("text");
  text.value = state.mark.text;
  text.oninput = () => update((s) => { s.mark.text = text.value; s.mark.image = null; });

  const font = $<HTMLSelectElement>("font");
  for (const f of FONTS) { const o = document.createElement("option"); o.value = o.textContent = f; o.style.fontFamily = f; font.appendChild(o); }
  font.value = state.mark.font;
  font.onchange = () => {
    update((s) => { s.mark.font = font.value; });
    document.fonts.load(`40px "${font.value}"`).then(() => update(() => {}));
  };

  $("mode").replaceWith(chips(["fill", "outline", "3d"], () => state.mark.mode, (v) => { state.mark.mode = v as RenderMode; }));

  const fg = $<HTMLInputElement>("fg"), bg = $<HTMLInputElement>("bg"), bgt = $<HTMLInputElement>("bgt");
  fg.value = state.mark.fg; bg.value = "#000000"; bgt.checked = state.mark.bg === "transparent";
  fg.oninput = () => update((s) => { s.mark.fg = fg.value; });
  const setBg = () => update((s) => { s.mark.bg = bgt.checked ? "transparent" : bg.value; });
  bg.oninput = () => { bgt.checked = false; setBg(); }; bgt.onchange = setBg;

  const w = $<HTMLInputElement>("w"), h = $<HTMLInputElement>("h");
  w.value = String(state.mark.w); h.value = String(state.mark.h);
  const setSize = () => update((s) => { s.mark.w = +w.value || 512; s.mark.h = +h.value || 192; });
  w.onchange = setSize; h.onchange = setSize;

  $("enter").replaceWith(chips(ENTER_MOVES, () => state.moves.enter, (v) => { state.moves.enter = v; }, triggerEnter));
  $("react").replaceWith(chips(REACT_MOVES, () => state.moves.react, (v) => { state.moves.react = v; }, triggerReact));
  $("playEnter").onclick = triggerEnter; $("playReact").onclick = triggerReact;

  const speed = $<HTMLInputElement>("speed"), bounce = $<HTMLInputElement>("bounce");
  speed.value = String(state.tuning.speed); bounce.value = String(state.tuning.bounce);
  speed.oninput = () => update((s) => { s.tuning.speed = +speed.value; });
  bounce.oninput = () => update((s) => { s.tuning.bounce = +bounce.value; });

  // drop anywhere on the page
  const dz = $("drop");
  document.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("over"); });
  document.addEventListener("dragleave", () => dz.classList.remove("over"));
  document.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("over");
    const f = e.dataTransfer?.files[0]; if (f && f.type.startsWith("image/")) loadImage(f);
  });
  dz.onclick = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => { const f = inp.files?.[0]; if (f) loadImage(f); };
    inp.click();
  };
}
