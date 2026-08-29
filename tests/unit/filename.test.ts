import { describe, it, expect } from "vitest";
import { slug, exportName } from "../../src/export/filename";

describe("export filenames", () => {
  it("slugs text: lowercase, accents stripped, punctuation/emoji/spaces -> dashes", () => {
    expect(slug("Acme")).toBe("acme");
    expect(slug("Café Ünïcode!")).toBe("cafe-unicode");
    expect(slug("  hello   world  ")).toBe("hello-world");
    expect(slug("KJAZ 🎷 radio")).toBe("kjaz-radio");
    expect(slug("a/b\\c:d*e?f\"g<h>i|j")).toBe("a-b-c-d-e-f-g-h-i-j");
    expect(slug("")).toBe("mark");
    expect(slug("🎉🎉")).toBe("mark");
  });
  it("names are ident-<slug>-<seconds>.<ext>", () => {
    expect(exportName("Acme Co", "png", 1491284000)).toBe("ident-acme-co-1491284.png");
    expect(exportName("X", "zip", 1700000000123)).toBe("ident-x-1700000000.zip");
    expect(exportName("Acme", "gif")).toMatch(/^ident-acme-\d{10}\.gif$/);
  });
});
