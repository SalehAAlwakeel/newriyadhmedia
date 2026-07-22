import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(root, 'locales/ar.json'), 'utf8'));

const re = /data-i18n(?:-html|-placeholder|-aria|-data-label)?="([^"]+)"/g;

for (const f of ['index.html', 'about.html', 'automated-marketing.html']) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const keys = [...html.matchAll(re)].map((m) => m[1]);
  const missingEn = [...new Set(keys.filter((k) => !(k in en)))];
  const missingAr = [...new Set(keys.filter((k) => !(k in ar)))];
  console.log(f, 'attrs:', keys.length, 'unique:', new Set(keys).size);
  if (missingEn.length) console.log('  missing en:', missingEn);
  if (missingAr.length) console.log('  missing ar:', missingAr);
}

console.log('locale keys en/ar:', Object.keys(en).length, Object.keys(ar).length);
