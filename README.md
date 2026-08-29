# IDENT

make identification exports - videos, gifs, and ascii that works in bash and 404 pages.

[https://ident.greg.technology/](https://ident.greg.technology/)

![acme gif](readme-assets/ident.gif)

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
