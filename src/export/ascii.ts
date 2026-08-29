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

// one character cell stands for CELL x 2*CELL pixels of the mark (ascii art reads bigger than
// the px mark: a 40px wordmark is ~67 columns), so a bigger mark
// takes more characters (and a wider one more columns), never fewer.
export const CELL = 3;
export function asciiGrid(width: number, height: number): { cols: number; rows: number } {
  return { cols: Math.max(1, Math.round(width / CELL)), rows: Math.max(1, Math.round(height / (CELL * 2))) };
}

// fixed column count (thumbnails): rows follow the ~2:1 glyph aspect
export function asciiRows(width: number, height: number, cols: number): number {
  return Math.max(1, Math.round((height / width) * cols * 0.5));
}

// grid: explicit character grid; cols: fixed columns (thumbnails); neither: from the canvas pixel size
export function canvasToAscii(src: HTMLCanvasElement, cols?: number, grid?: { cols: number; rows: number }): string {
  const g = grid ?? (cols ? { cols, rows: asciiRows(src.width, src.height, cols) } : asciiGrid(src.width, src.height));
  const tmp = document.createElement("canvas");
  tmp.width = g.cols; tmp.height = g.rows;
  const ctx = tmp.getContext("2d")!;
  ctx.drawImage(src, 0, 0, g.cols, g.rows);
  return pixelsToAscii(ctx.getImageData(0, 0, g.cols, g.rows).data, g.cols, g.rows);
}
