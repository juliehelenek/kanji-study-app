# kanji-study-app

## Writing practice data

Writing practice uses stroke order and SVG path data from [KanjiVG](https://github.com/KanjiVG/kanjivg), copyright Ulrich Apel, licensed under [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The sampled paths bundled in `src/kanjiStrokes.json` are derived from that data and distributed under the same license. Characters without a KanjiVG entry remain traceable but do not receive automatic stroke checks.

After changing the built-in deck, regenerate the bundled paths with `npm run generate:kanji-strokes`.

## Publish on GitHub Pages

The `main` branch deploys the web app to <https://juliehelenek.github.io/kanji-study-app/> through GitHub Actions. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The deployment workflow then runs on each push to `main`.

GitHub Pages requires a paid GitHub plan for a private repository. On GitHub Free, Pages is available only when the repository is public. Changing repository visibility also makes the published site public, so check your account plan and site visibility before publishing.

On iPhone, open the published URL in Safari, tap **Share**, then **Add to Home Screen**. The site includes a web app manifest and an iPhone home screen icon. Study progress is stored in that browser on that device.
