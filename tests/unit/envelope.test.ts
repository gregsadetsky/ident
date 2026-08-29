import { describe, it, expect } from "vitest";
import { envelope } from "../../src/core/envelope";

describe("envelope", () => {
  it("starts at 1 and settles to ~0", () => {
    expect(envelope(0)).toBe(1);
    expect(Math.abs(envelope(4))).toBeLessThan(0.01);
    expect(Math.abs(envelope(4, 1, 0))).toBeLessThan(0.01);
    expect(Math.abs(envelope(4, 1, 1))).toBeLessThan(0.05);
  });
  it("never produces NaN and stays bounded", () => {
    for (const bounce of [0, 0.5, 1]) for (const speed of [0.3, 1, 3]) for (let t = 0; t < 5; t += 0.05) {
      const v = envelope(t, speed, bounce);
      expect(Number.isNaN(v)).toBe(false);
      expect(Math.abs(v)).toBeLessThanOrEqual(1.0001);
    }
  });
  it("critically damped never overshoots below 0; bouncy does", () => {
    let minFlat = 1, minBouncy = 1;
    for (let t = 0; t < 4; t += 0.01) { minFlat = Math.min(minFlat, envelope(t, 1, 0)); minBouncy = Math.min(minBouncy, envelope(t, 1, 1)); }
    expect(minFlat).toBeGreaterThanOrEqual(0);
    expect(minBouncy).toBeLessThan(-0.05);
  });
  it("faster speed settles sooner", () => {
    expect(Math.abs(envelope(1, 3))).toBeLessThan(Math.abs(envelope(1, 0.5)));
  });
});
