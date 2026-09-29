# kanji-study-app

## Writing practice data

Writing practice uses stroke order and SVG path data from [KanjiVG](https://github.com/KanjiVG/kanjivg), copyright Ulrich Apel, licensed under [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The sampled paths bundled in `src/kanjiStrokes.json` are derived from that data and distributed under the same license. Characters without a KanjiVG entry remain traceable but do not receive automatic stroke checks.

After changing the built-in deck, regenerate the bundled paths with `npm run generate:kanji-strokes`.
