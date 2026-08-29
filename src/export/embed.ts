import { state } from "../core/state";
import type { IdentConfig } from "../embed/runtime";
import { download } from "./video";
import { zipSync, strToU8 } from "fflate";

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
<script src="./ident.js"></script>
<script>ident.mount(document.getElementById("ident"), ${cfg});</script>
`;
}

export function embedHtml(): string {
  return page({}, `<div id="ident"></div>`, `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111; }`);
}

// same runtime, 404 dressing: black page, ascii if that's how the 404 destination is set
export function html404(ascii: boolean): string {
  return page(ascii ? { ascii: true, loop: 3000, color: "#5dd77a" } : {},
    `<main>\n  <div id="ident"></div>\n  <p>404 — page not found</p>\n  <p><a href="/">go home</a></p>\n</main>`,
    `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #5dd77a; font: 14px ui-monospace, Menlo, monospace; }
main { display: flex; flex-direction: column; align-items: center; gap: 32px; }
a { color: inherit; }`);
}

// bundles: the page + a local copy of the runtime, so it's self-hostable as-is
async function bundle(name: string, html: string, htmlName: string) {
  const js = await fetch(embedScriptUrl()).then((r) => { if (!r.ok) throw new Error("could not fetch " + embedScriptUrl()); return r.text(); });
  const zip = zipSync({ [htmlName]: strToU8(html), "ident.js": strToU8(js), "readme.txt": strToU8(`ident ${name}\n\n${htmlName}  open it, or copy the two script tags into your own page\nident.js    the runtime (also served at ${embedScriptUrl()})\n\napi: ident.mount(el, config) -> { enter(), react(), trigger(move), destroy() }\n`) }, { level: 6 });
  download(new Blob([zip as BlobPart], { type: "application/zip" }), `ident-${name}.zip`);
}
export function downloadEmbed() { return bundle("embed", embedHtml(), "index.html").catch((e) => alert(String(e))); }
export function download404() { return bundle("404", html404(state.view["404"] === "ascii"), "404.html").catch((e) => alert(String(e))); }

function escapeHtml(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
