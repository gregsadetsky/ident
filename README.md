# ident

make identification exports - videos, gifs, and ascii that works in bash and 404 pages.

lives at ident.greg.technology, deployed with disco.

![acme gif](readme-assets/ident.gif)

(on github: png and gif render, mp4 does not - confirmed 2026-08-29)

## dev

```
npm install
npm run dev
```

## build

`npm run build` -> `dist/` (that's what the dockerfile does; disco serves it as a static "generator" service)

## tests

- `npm test` - vitest unit tests (envelope, presets, ascii, url). also run in the dockerfile, so a failing test stops the deploy
- `npm run test:e2e` - playwright smoke tests against a dev server (destinations, ascii, iframe drag/resize, exports, mobile)
- both run on pre-commit: `git config core.hooksPath .githooks` (once per clone). skip with `--no-verify`
