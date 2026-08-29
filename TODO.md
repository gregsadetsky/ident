# todo

- iframe: server-side check of x-frame-options / csp frame-ancestors to tell the user a site refuses framing (needs the flask backend; ~10 lines). the browser can't detect a blocked frame on its own. sanity check list: stripe.com (refuses), greg.technology (allows)
- exports still stubbed: js embed (site header), 404.html (self-contained ascii loop), .sh (frames + sleep loop)
- our own IDENT mark top-right of the app, same engine, react on hover (= the embed destination turned inward)
- screen pass from the 15.scanimate-spike not ported: glow, scanlines, barrel curvature, colorizer / palettes
- unexplained: faint rectangular ghost around the mark in live px views (light gray box on white). not in exported files.
- tab thumbnails in ascii mode are tiny/faint
- gif/mp4 export only verified in chromium (webcodecs coverage differs in safari/firefox)
- share urls + remix (serialize state, db) - not started
- favicon / opengraph - punted
