import "./style.css";
import { mountRail } from "./ui/rail";
import { mountStage } from "./ui/stage";
import { triggerEnter } from "./engine";
import { state, update } from "./core/state";
import { mount } from "./embed/runtime";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <aside id="rail"><h1><span class="logo"></span></h1></aside>
  <main id="stage"></main>
  <div id="mobile"><h1><span class="logo"></span></h1><p>Hi!<br><br>Unfortunately, this user interface is a tad too demanding to work on mobile.<br><br>I promise that it's really cool - please try it on your desktop browser!<br><br>See you there, cheers<br><br>Greg</p></div>
`;
mountRail(document.querySelector("#rail")!);
mountStage(document.querySelector("#stage")!);

// re-render the mark once web fonts arrive, then play the enter move
document.fonts.ready.then(() => { update(() => {}); triggerEnter(); });
document.fonts.load(`40px "${state.mark.font}"`).then(() => update(() => {}));

// our own mark, made with itself: the embed runtime mounted on the rail and mobile logos
for (const el of document.querySelectorAll<HTMLElement>(".logo")) {
  mount(el, {
    mark: { text: "IDENT", font: "Archivo Black", mode: "fill", shape: "bare", fg: "#1a1a1a", bg: "transparent", size: 22, w: 0, h: 0 },
    moves: { enter: "punch", react: "wobble" },
    tuning: { speed: 1, bounce: 0.5, persist: 0.6, glow: 0.4, scan: 0.25, curve: 0 },
  });
}
