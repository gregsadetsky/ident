# todo

- screen pass from the 15.scanimate-spike not ported: glow, scanlines, barrel curvature, colorizer / palettes
- crt effects: more deflections. the deflection is already webgl (src/gl/warp.ts: per-pixel sampling coordinate bent through sweep lag -> keystone -> zoom/spin -> oscillators -> flag, persistence via ping-pong fbo). the moves in src/core/presets.ts only combine those few knobs. to get more scanimate-like: more sources (ramps, more oscillators, noise), a patch matrix (any source -> any deflection axis, like the spike's uM[20]), per-scanline size/position ramps, the screen pass (glow, scanlines, barrel, phosphor colorizer). presets should then be chords over that, not hand-written param sets.
