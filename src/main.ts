import "./style.css";
import { mountRail } from "./ui/rail";
import { mountStage } from "./ui/stage";
import { triggerEnter } from "./engine";
import { state, update } from "./core/state";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <aside id="rail"><h1>IDENT</h1></aside>
  <main id="stage"></main>
  <div id="mobile"><h1>IDENT</h1><p>Hi!<br>Unfortunately, this user interface is a tad too demanding to work on mobile.<br>I promise that it's really cool - please try it on your desktop browser!<br>See you there, cheers!<br>Greg</p></div>
`;
mountRail(document.querySelector("#rail")!);
mountStage(document.querySelector("#stage")!);

// re-render the mark once web fonts arrive, then play the enter move
document.fonts.ready.then(() => { update(() => {}); triggerEnter(); });
document.fonts.load(`40px "${state.mark.font}"`).then(() => update(() => {}));
