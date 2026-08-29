import { state } from "../core/state";
import type { IdentConfig } from "../embed/runtime";
import { download } from "./video";

// the editor state, serialized for ident.mount (dropped logo -> data url)
export function embedConfig(): IdentConfig {
  const { image, ...mark } = state.mark;
  let data: string | null = null;
  if (image) { const c = document.createElement("canvas"); c.width = image.width; c.height = image.height; c.getContext("2d")!.drawImage(image, 0, 0); data = c.toDataURL("image/png"); }
  return { mark: { ...mark, image: data }, moves: { ...state.moves }, tuning: { ...state.tuning } };
}

export function embedScriptUrl(): string { return location.origin + "/embed/ident.js"; }

// a slim page: the script tag + one mount call. the div is the mark's rect; effects overflow it.
function page(opts: Partial<IdentConfig>, body: string, css: string): string {
  const cfg = JSON.stringify({ ...embedConfig(), ...opts }).replace(/</g, "\\u003c");
  return `<!doctype html>
<meta charset="utf-8">
<title>${escapeHtml(state.mark.text || "ident")}</title>
<style>${css}</style>

${body}

<!-- ident: the mark animates on load; px mode reacts on hover, ascii mode loops -->
<script src="${embedScriptUrl()}"></script>
<script>ident.mount(document.getElementById("ident"), ${cfg});</script>
`;
}

export function embedHtml(): string {
  return page({}, `<div id="ident"></div>`, `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111; }`);
}

// same runtime, 404 dressing: black page, ascii if that's how the 404 destination is set
export function html404(ascii: boolean): string {
  return page(ascii ? { ascii: true, loop: 3000, color: "#5dd77a" } : {},
    `<main>\n  <div id="ident"></div>\n  <p>404 — page not found · <a href="/">go home</a></p>\n</main>`,
    `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #5dd77a; font: 14px ui-monospace, Menlo, monospace; }
main { display: flex; flex-direction: column; align-items: center; gap: 32px; }
a { color: inherit; }`);
}

export function downloadEmbed() { download(new Blob([embedHtml()], { type: "text/html" }), "ident-embed.html"); }
export function download404() { download(new Blob([html404(state.view["404"] === "ascii")], { type: "text/html" }), "404.html"); }

function escapeHtml(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
