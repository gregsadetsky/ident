# IDENT

make identification exports - videos, gifs, and ascii that works in bash and 404 pages.

[https://ident.greg.technology/](https://ident.greg.technology/)

![acme gif](readme-assets/ident.gif)

## embed api

`<script src="https://ident.greg.technology/embed/ident.js"></script>` then:

- `ident.mount(el, config)` - draws the mark inside `el` (sized to the mark; effects overflow it), plays the enter move, reacts on hover. returns a handle. `config` is what the app's "get embed" bundle writes: `{ mark, moves, tuning }`, plus `ascii: true` to render as text
- `handle.enter()` - replay the enter move from rest (what happens on load)
- `handle.react()` - play the hover move (what happens on mouseenter)
- `handle.trigger(name)` - play any move by name on top of whatever is running, e.g. `trigger("spin")` on a click. names: punch, flag, roll-in, fly-in, squash, spin, psycho, keystone, wobble, none
- `handle.destroy()` - stop the animation and remove the canvas

## dev

```
npm install
npm run dev
```

## build

`npm run build` -> `dist/`

## tests

- `npm test` - vitest unit tests (envelope, presets, ascii, url). also run in the dockerfile, so a failing test stops the deploy
- `npm run test:e2e` - playwright smoke tests against a dev server (destinations, ascii, iframe drag, exports, mobile)
- both run on pre-commit: `git config core.hooksPath .githooks` (once per clone). skip with `--no-verify`
