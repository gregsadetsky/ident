import { describe, it, expect } from "vitest";
import { MOVES, ENTER_MOVES, REACT_MOVES, REST, chord } from "../../src/core/presets";

describe("moves", () => {
  it("every listed move exists and returns rest-ish params at e=0", () => {
    for (const name of [...ENTER_MOVES, ...REACT_MOVES]) {
      expect(MOVES[name], name).toBeDefined();
      const d = chord([MOVES[name](0, 1)]);
      for (const k of ["dx", "dy", "rot", "persp", "tau", "ampX", "ampY", "flag"] as const) expect(d[k], `${name}.${k}`).toBeCloseTo(0, 6);
      expect(d.zx).toBeCloseTo(1, 6); expect(d.zy).toBeCloseTo(1, 6);
    }
  });
  it("every move actually deflects something at e=1", () => {
    for (const name of [...ENTER_MOVES, ...REACT_MOVES]) {
      if (name === "none") continue;
      const d = chord([MOVES[name](1, 0.1)]);
      const changed = (Object.keys(REST) as (keyof typeof REST)[]).some((k) => Math.abs(d[k] - REST[k]) > 1e-6);
      expect(changed, name).toBe(true);
    }
  });
  it("empty chord is rest; chords add offsets and multiply zooms", () => {
    expect(chord([])).toEqual(REST);
    const d = chord([{ dx: 0.1, zx: 2 }, { dx: 0.2, zx: 0.5 }]);
    expect(d.dx).toBeCloseTo(0.3); expect(d.zx).toBeCloseTo(1);
  });
});

import { state, hoverAvailable } from "../../src/core/state";
describe("hoverAvailable", () => {
  it("false for readme/terminal and for ascii views, true otherwise", () => {
    const s = { ...state, view: { ...state.view } };
    s.dest = "header"; s.view.header = "px"; expect(hoverAvailable(s)).toBe(true);
    s.view.header = "ascii"; expect(hoverAvailable(s)).toBe(false);
    s.dest = "404"; s.view["404"] = "px"; expect(hoverAvailable(s)).toBe(true);
    s.dest = "readme"; s.view.readme = "px"; expect(hoverAvailable(s)).toBe(false);
    s.dest = "terminal"; expect(hoverAvailable(s)).toBe(false);
  });
});
