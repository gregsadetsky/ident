import { describe, it, expect } from "vitest";
import { FONTS, state } from "../../src/core/state";

describe("fonts", () => {
  it("are listed in alphabetical order, no duplicates", () => {
    const sorted = [...FONTS].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    expect(FONTS).toEqual(sorted);
    expect(new Set(FONTS).size).toBe(FONTS.length);
  });
  it("default font is in the list", () => {
    expect(FONTS).toContain(state.mark.font);
  });
});
