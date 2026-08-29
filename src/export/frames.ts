import { zipSync, strToU8 } from "fflate";
import { renderSequence, frameSize } from "../engine";
import { canvasToAscii, asciiGrid } from "./ascii";
import { CLIP, download } from "./video";
import { state } from "../core/state";
import { exportName } from "./filename";

export interface AsciiClip { cols: number; rows: number; fps: number; frames: string[] }
export const SEP = "=====";

// the enter move as ascii frames, same grid as the terminal preview
export function asciiFrames(): AsciiClip {
  const fs = frameSize(), g = asciiGrid(fs.w, fs.h), frames: string[] = [];
  renderSequence(CLIP.seconds, CLIP.fps, (c) => frames.push(canvasToAscii(c, undefined, g)));
  return { cols: g.cols, rows: g.rows, fps: CLIP.fps, frames };
}

// frames.txt: one header line, then frames separated by a line of =====
// (rows are padded so every frame has exactly `rows` lines)
export function framesTxt(clip: AsciiClip): string {
  const head = `# ident frames cols=${clip.cols} rows=${clip.rows} fps=${clip.fps} count=${clip.frames.length}`;
  return [head, ...clip.frames.map((f) => { const l = f.split("\n"); while (l.length < clip.rows) l.push(""); return l.join("\n"); })].join(`\n${SEP}\n`) + "\n";
}

export function parseFramesTxt(txt: string): AsciiClip {
  const parts = txt.replace(/\n$/, "").split(`\n${SEP}\n`);
  const head = parts.shift() || "";
  const num = (k: string) => Number((head.match(new RegExp(`${k}=(\\d+)`)) || [])[1] || 0);
  return { cols: num("cols"), rows: num("rows"), fps: num("fps"), frames: parts };
}

export const PLAY_SH = `#!/usr/bin/env bash
# plays frames.txt in the terminal: clears the screen, prints a frame, waits 1/fps. ctrl-c to stop.
# usage: ./play.sh [frames.txt] [loops]   (loops defaults to 1, 0 = forever)
set -u
file="\${1:-frames.txt}"; loops="\${2:-1}"
fps=$(head -1 "$file" | sed -n 's/.*fps=\\([0-9]*\\).*/\\1/p'); fps="\${fps:-30}"
delay=$(awk "BEGIN { printf \\"%.4f\\", 1 / $fps }")
frames=(); cur=""
while IFS= read -r line || [ -n "$line" ]; do
  if [ "$line" = "${SEP}" ]; then frames+=("$cur"); cur=""; else cur+="$line"$'\\n'; fi
done < <(tail -n +3 "$file")   # skip the header line and the separator right after it
frames+=("$cur")
printf '\\033[?25l'; trap 'printf "\\033[?25h\\n"; exit' INT TERM
n=0
while [ "$loops" -eq 0 ] || [ "$n" -lt "$loops" ]; do
  for f in "\${frames[@]}"; do printf '\\033[H\\033[2J%s' "$f"; sleep "$delay"; done
  n=$((n + 1))
done
printf '\\033[?25h\\n'
`;

export const PLAY_JS = `#!/usr/bin/env node
// minimal player + loader for frames.txt. drop loadFrames() into your own tui code:
//   const { loadFrames } = require("./play.js"); const clip = loadFrames("frames.txt");
//   clip.frames[i] is a string of clip.rows lines; play at clip.fps
const fs = require("fs");
const SEP = "${SEP}";

function loadFrames(path) {
  const txt = fs.readFileSync(path, "utf8").replace(/\\n$/, "");
  const parts = txt.split("\\n" + SEP + "\\n");
  const head = parts.shift() || "";
  const num = (k) => Number((head.match(new RegExp(k + "=(\\\\d+)")) || [])[1] || 0);
  return { cols: num("cols"), rows: num("rows"), fps: num("fps"), frames: parts };
}

function play(clip, loops = 1) {
  process.stdout.write("\\x1b[?25l");
  let i = 0, n = 0;
  const stop = () => { process.stdout.write("\\x1b[?25h\\n"); process.exit(0); };
  process.on("SIGINT", stop);
  const t = setInterval(() => {
    process.stdout.write("\\x1b[H\\x1b[2J" + clip.frames[i]);
    if (++i >= clip.frames.length) { i = 0; if (loops && ++n >= loops) { clearInterval(t); stop(); } }
  }, 1000 / clip.fps);
}

module.exports = { loadFrames, play };
if (require.main === module) play(loadFrames(process.argv[2] || "frames.txt"), Number(process.argv[3] ?? 1));
`;

export function terminalReadme(clip: AsciiClip): string {
  return `ident terminal bundle

frames.txt  ${clip.frames.length} ascii frames, ${clip.cols}x${clip.rows} chars, ${clip.fps} fps, separated by a line of ${SEP}
play.sh     bash player: ./play.sh [frames.txt] [loops]   (0 loops = forever)
play.js     node player + loader: node play.js, or require("./play.js").loadFrames("frames.txt") in your own tui

the format is trivial to read from any language: skip the first line, split on "\\n${SEP}\\n".
`;
}

export function downloadTerminalBundle() {
  const clip = asciiFrames();
  const zip = zipSync({
    "frames.txt": strToU8(framesTxt(clip)),
    "play.sh": strToU8(PLAY_SH),
    "play.js": strToU8(PLAY_JS),
    "readme.txt": strToU8(terminalReadme(clip)),
  }, { level: 6 });
  download(new Blob([zip as BlobPart], { type: "application/zip" }), exportName(state.mark.text + " terminal", "zip"));
}
