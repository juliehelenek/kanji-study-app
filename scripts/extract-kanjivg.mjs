import fs from 'node:fs';
import path from 'node:path';
import { svgPathProperties } from 'svg-path-properties';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/data.ts'), 'utf8');
const characters = new Set([
  ...Array.from(source.matchAll(/textbookEntry\('([^']+)'/g), match => match[1]),
  ...Array.from(source.matchAll(/character:\s*'([^']+)'/g), match => match[1]),
]);
const dataDir = path.join(root, 'node_modules/@madcat/kanjivg/dist/main');
const output = {};

for (const character of characters) {
  const codepoint = character.codePointAt(0).toString(16).padStart(5, '0');
  const svgPath = path.join(dataDir, `${codepoint}.svg`);
  if (!fs.existsSync(svgPath)) continue;
  const svg = fs.readFileSync(svgPath, 'utf8');
  const paths = Array.from(svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g), match => match[1]);
  output[character] = paths.map(d => {
    const properties = new svgPathProperties(d);
    const length = properties.getTotalLength();
    return Array.from({ length: 32 }, (_, i) => {
      const point = properties.getPointAtLength(length * i / 31);
      return [Number(point.x.toFixed(2)), Number(point.y.toFixed(2))];
    });
  });
}

fs.writeFileSync(path.join(root, 'src/kanjiStrokes.json'), `${JSON.stringify(output)}\n`);
const missing = [...characters].filter(character => !output[character]);
console.log(`Extracted stroke paths for ${Object.keys(output).length}/${characters.size} deck kanji.${missing.length ? ` Missing: ${missing.join(' ')}` : ''}`);
