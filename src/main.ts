import "./style.css";
import { asciiBox } from "./exports/ascii";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main>
    <h1>ident</h1>
    <textarea id="input" rows="4" placeholder="Your name, handle, anything"></textarea>
    <pre id="ascii"></pre>
  </main>
`;

const input = app.querySelector<HTMLTextAreaElement>("#input")!;
const out = app.querySelector<HTMLPreElement>("#ascii")!;
const render = () => { out.textContent = asciiBox(input.value || "ident"); };
input.addEventListener("input", render);
render();
