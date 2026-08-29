# todo

- exports still stubbed: js embed (site header), 404.html (self-contained ascii loop), .sh (frames + sleep loop)
- our own IDENT mark (top-left of the rail, and on the mobile note) should itself be ident-animated: same engine, enter move on load, react on hover (= the embed destination turned inward)
- screen pass from the 15.scanimate-spike not ported: glow, scanlines, barrel curvature, colorizer / palettes
- test the remaining exports in their real destination: embed zip on a real site, 404 zip on a real server, terminal zip in iterm/terminal.app (readme png+gif confirmed on github, mp4 not; gif+mp4 export confirmed in safari - 2026-08-29)
- crt effects: more deflections. the deflection is already webgl (src/gl/warp.ts: per-pixel sampling coordinate bent through sweep lag -> keystone -> zoom/spin -> oscillators -> flag, persistence via ping-pong fbo). the moves in src/core/presets.ts only combine those few knobs. to get more scanimate-like: more sources (ramps, more oscillators, noise), a patch matrix (any source -> any deflection axis, like the spike's uM[20]), per-scanline size/position ramps, the screen pass (glow, scanlines, barrel, phosphor colorizer). presets should then be chords over that, not hand-written param sets.
