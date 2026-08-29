# todo

- exports still stubbed: js embed (site header), 404.html (self-contained ascii loop), .sh (frames + sleep loop)
- our own IDENT mark (top-left of the rail, and on the mobile note) should itself be ident-animated: same engine, enter move on load, react on hover (= the embed destination turned inward)
- screen pass from the 15.scanimate-spike not ported: glow, scanlines, barrel curvature, colorizer / palettes
- gif/mp4 export only verified in chromium (webcodecs coverage differs in safari/firefox)
- share urls + remix (serialize state, db) - not started
- favicon / opengraph - punted
- to be tested: dropping an svg and a png onto the page (untested so far)
- test absolutely all export options end to end in their real destination: readme: png + gif confirmed working on github, mp4 confirmed not (2026-08-29); still to test: embed on a real site, 404.html in a real server, .sh in bash/zsh/iterm/terminal.app
- crt effects: more deflections. the deflection is already webgl (src/gl/warp.ts: per-pixel sampling coordinate bent through sweep lag -> keystone -> zoom/spin -> oscillators -> flag, persistence via ping-pong fbo). the moves in src/core/presets.ts only combine those few knobs. to get more scanimate-like: more sources (ramps, more oscillators, noise), a patch matrix (any source -> any deflection axis, like the spike's uM[20]), per-scanline size/position ramps, the screen pass (glow, scanlines, barrel, phosphor colorizer). presets should then be chords over that, not hand-written param sets.
