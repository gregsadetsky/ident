const RAMP = " .:-=+*#%@";

// rgba pixels -> ascii lines from alpha coverage only: colors never matter, empty = space,
// trailing spaces stripped. cols x rows must match the pixel buffer.
export function pixelsToAscii(d: Uint8ClampedArray | Uint8Array, cols: number, rows: number): string {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const a = d[(y * cols + x) * 4 + 3] / 255;
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(a * RAMP.length))];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}

// rows follow the ~2:1 glyph aspect
export function asciiRows(width: number, height: number, cols: number): number {
  return Math.max(1, Math.round((height / width) * cols * 0.5));
}

export function canvasToAscii(src: HTMLCanvasElement, cols: number): string {
  const rows = asciiRows(src.width, src.height, cols);
  const tmp = document.createElement("canvas");
  tmp.width = cols; tmp.height = rows;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(src, 0, 0, cols, rows);
  return pixelsToAscii(ctx.getImageData(0, 0, cols, rows).data, cols, rows);
}
