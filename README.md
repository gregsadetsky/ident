# ident

make identification exports - videos, gifs, and ascii that works in bash and 404 pages.

lives at ident.greg.technology, deployed with disco.

## does this animate on github?

still png:

![ident still](readme-assets/ident.png)

gif:

![ident gif](readme-assets/ident.gif)

mp4 (via img tag, probably won't render):

![ident mp4](readme-assets/ident.mp4)

mp4 (via video tag):

<video src="readme-assets/ident.mp4" width="512" autoplay loop muted></video>

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
