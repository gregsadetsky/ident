const RAMP = " .:-=+*#%@";

// canvas -> ascii lines. cols = character columns; rows follow the ~2:1 glyph aspect.
export function canvasToAscii(src: HTMLCanvasElement, cols: number, invert = false): string {
  const rows = Math.max(1, Math.round((src.height / src.width) * cols * 0.5));
  const tmp = document.createElement("canvas");
  tmp.width = cols; tmp.height = rows;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(src, 0, 0, cols, rows);
  const d = ctx.getImageData(0, 0, cols, rows).data;
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      // luminance weighted by alpha so transparent = dark
      let l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 * (d[i + 3] / 255);
      if (invert) l = 1 - l;
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}
