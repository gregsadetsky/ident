import "./style.css";
import { mountRail } from "./ui/rail";
import { mountStage } from "./ui/stage";
import { triggerEnter } from "./engine";
import { state, update } from "./core/state";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <aside id="rail"><h1>IDENT</h1></aside>
  <main id="stage"></main>
`;
mountRail(document.querySelector("#rail")!);
mountStage(document.querySelector("#stage")!);

// re-render the mark once web fonts arrive, then play the enter move
document.fonts.ready.then(() => { update(() => {}); triggerEnter(); });
document.fonts.load(`40px "${state.mark.font}"`).then(() => update(() => {}));
