import { describe, it, expect } from "vitest";
import { pixelsToAscii, asciiRows } from "../../src/export/ascii";

function px(cols: number, rows: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const d = new Uint8ClampedArray(cols * rows * 4);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) d.set(fill(x, y), (y * cols + x) * 4);
  return d;
}

describe("ascii", () => {
  it("transparent -> empty lines, opaque -> @, colors ignored", () => {
    expect(pixelsToAscii(px(4, 2, () => [0, 0, 0, 0]), 4, 2)).toBe("\n");
    expect(pixelsToAscii(px(3, 1, () => [255, 255, 255, 255]), 3, 1)).toBe("@@@");
    expect(pixelsToAscii(px(3, 1, () => [0, 0, 0, 255]), 3, 1)).toBe("@@@");
    expect(pixelsToAscii(px(3, 1, () => [255, 77, 0, 255]), 3, 1)).toBe("@@@");
  });
  it("strips trailing spaces and keeps leading ones", () => {
    const d = px(5, 1, (x) => (x === 1 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    expect(pixelsToAscii(d, 5, 1)).toBe(" @");
  });
  it("half alpha lands mid-ramp, never emits unknown chars", () => {
    const out = pixelsToAscii(px(10, 1, (x) => [0, 0, 0, Math.round((x / 9) * 255)]), 10, 1);
    expect(out).toMatch(/^[ .:\-=+*#%@]*$/);
    expect(out[0]).toBe(" "); expect(out[9]).toBe("@");
  });
  it("rows follow a 2:1 glyph aspect", () => {
    expect(asciiRows(512, 192, 64)).toBe(12);
    expect(asciiRows(100, 100, 1)).toBe(1);
  });
});
