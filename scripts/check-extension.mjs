#!/usr/bin/env node
// Kiểm tra manifest MV3 và cú pháp các script của extension mà không cần thư viện ngoài.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'browser-extension');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push('manifest_version phải là 3');
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) {
  errors.push('version phải theo định dạng x.y.z');
}
if (!manifest.action?.default_popup) {
  errors.push('thiếu action.default_popup');
}

const referenced = [
  manifest.action?.default_popup,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...(manifest.content_scripts || []).flatMap((entry) => [
    ...(entry.js || []),
    ...(entry.css || []),
  ]),
].filter(Boolean);

for (const file of new Set(referenced)) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`thiếu tệp được manifest tham chiếu: ${file}`);
  }
}

for (const file of ['content.js', 'popup.js', 'cacheDB.js']) {
  const code = readFileSync(resolve(root, file), 'utf8');
  try {
    new vm.Script(code, { filename: file });
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Extension OK: manifest v${manifest.version}, ${referenced.length} tệp tham chiếu hợp lệ.`);
