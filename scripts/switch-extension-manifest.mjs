#!/usr/bin/env node
// Chuyển manifest extension giữa bản production và bản dev (có host tunnel/local).
//
//   node scripts/switch-extension-manifest.mjs dev
//   node scripts/switch-extension-manifest.mjs prod
//
// Bản production (mặc định trong repo) không chứa host dev để tránh cấp quyền
// cho mọi tên miền trycloudflare. Chạy "dev" trước khi thử với backend local,
// và chạy "prod" trước khi đóng gói/phát hành.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV_HOSTS = [
  'http://127.0.0.1:8000/*',
  'http://localhost:8000/*',
  'https://*.trycloudflare.com/*',
];

const mode = (process.argv[2] || '').toLowerCase();
if (!['dev', 'prod'].includes(mode)) {
  console.error('Cách dùng: node scripts/switch-extension-manifest.mjs dev|prod');
  process.exit(2);
}

const manifestPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'browser-extension',
  'manifest.json',
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const current = manifest.host_permissions || [];
const withoutDevHosts = current.filter((host) => !DEV_HOSTS.includes(host));

manifest.host_permissions = mode === 'dev'
  ? [...new Set([...withoutDevHosts, ...DEV_HOSTS])]
  : withoutDevHosts;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(
  `manifest.json -> ${mode}: ${manifest.host_permissions.length} host_permissions`,
);
