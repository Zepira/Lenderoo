// Renders made-up book covers for Lenderoo's demo data (no real titles or artwork).
// Usage: node supabase/demo/make-covers.mjs [outDir]   (default: supabase/demo/covers)
// Needs Chrome and playwright-core; borrows the zepira-apps monorepo's copy
// (ZEPIRA_APPS, default ~/dev/zepira-apps) so Lenderoo gets no new dependency.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const monorepo = process.env.ZEPIRA_APPS ?? path.join(os.homedir(), 'dev/zepira-apps');
const require = createRequire(path.join(monorepo, 'packages/shots/package.json'));
const { chromium } = require('playwright-core');

const out = process.argv[2] ?? path.join(path.dirname(new URL(import.meta.url).pathname), 'covers');
await fs.mkdir(out, { recursive: true });

const covers = [
  { file: 'salt-road', title: 'The Salt Road', author: 'Imogen Hart', bg: '#1F3A5F', fg: '#F4E9D8', accent: '#E07A5F', motif: 'road' },
  { file: 'wattle-bay', title: 'Tides of Wattle Bay', author: 'Clare Mitchell', bg: '#F2C14E', fg: '#2D2A32', accent: '#3B7A57', motif: 'waves' },
  { file: 'midnight-ferry', title: 'Midnight at the Ferry', author: 'J. R. Doyle', bg: '#14141F', fg: '#F7F3E3', accent: '#F2C14E', motif: 'moon' },
  { file: 'garden-year', title: 'A Small Garden Year', author: 'Lena Fox', bg: '#DDE8D3', fg: '#2F4734', accent: '#C8553D', motif: 'leaves' },
  { file: 'last-lighthouse', title: 'The Last Lighthouse', author: 'Hamish Reid', bg: '#8FB8DE', fg: '#0B2545', accent: '#FFFFFF', motif: 'tower' },
  { file: 'small-things', title: 'Kitchen of Small Things', author: 'Ana Moreno', bg: '#C8553D', fg: '#FFF4E6', accent: '#F2C14E', motif: 'sun' },
  { file: 'quiet-orchard', title: 'The Quiet Orchard', author: 'Nadia Brooks', bg: '#4B3F72', fg: '#F7E7CE', accent: '#E9A6A6', motif: 'leaves' },
  { file: 'red-dirt', title: 'Red Dirt Summer', author: 'Callum Byrne', bg: '#B5442F', fg: '#FDF0D5', accent: '#2E1F27', motif: 'sun' },
];

const motifs = {
  road: (c) => `<path d="M150 900 L280 520 L320 520 L450 900 Z" fill="${c.accent}" opacity=".9"/><path d="M300 900 L300 540" stroke="${c.fg}" stroke-width="6" stroke-dasharray="30 24"/>`,
  waves: (c) => [0, 1, 2, 3].map((i) => `<path d="M0 ${640 + i * 60} q75 -40 150 0 t150 0 t150 0 t150 0" fill="none" stroke="${c.accent}" stroke-width="14" opacity="${1 - i * 0.2}"/>`).join(''),
  moon: (c) => `<circle cx="420" cy="560" r="90" fill="${c.accent}"/><circle cx="455" cy="535" r="80" fill="${c.bg}"/><rect x="60" y="760" width="480" height="8" fill="${c.fg}" opacity=".5"/>`,
  leaves: (c) => [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${120 + i * 90}" cy="${640 + (i % 2) * 70}" rx="34" ry="70" transform="rotate(${-30 + i * 15} ${120 + i * 90} ${640 + (i % 2) * 70})" fill="${c.accent}" opacity=".85"/>`).join(''),
  tower: (c) => `<path d="M270 820 L290 540 L310 540 L330 820 Z" fill="${c.accent}"/><rect x="282" y="510" width="36" height="34" fill="${c.fg}"/><path d="M318 525 L560 470 L560 580 Z" fill="${c.accent}" opacity=".35"/><rect x="0" y="820" width="600" height="80" fill="${c.fg}" opacity=".9"/>`,
  sun: (c) => `<circle cx="300" cy="640" r="120" fill="${c.accent}"/>${[...Array(12)].map((_, i) => `<rect x="296" y="460" width="8" height="40" fill="${c.accent}" transform="rotate(${i * 30} 300 640)"/>`).join('')}`,
};

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0}
  .cover{width:600px;height:900px;position:relative;overflow:hidden;background:${c.bg};color:${c.fg};font-family:Georgia,'Times New Roman',serif}
  svg{position:absolute;inset:0}
  .title{position:absolute;left:48px;right:48px;bottom:${c.title.length > 18 ? 170 : 150}px;font-size:64px;line-height:1.05;font-weight:700;letter-spacing:-.5px}
  .author{position:absolute;left:48px;right:48px;bottom:80px;font-size:26px;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;opacity:.9}
</style></head><body><div class="cover"><svg viewBox="0 0 600 900" width="600" height="900"><g transform="translate(0,-400)">${motifs[c.motif](c)}</g></svg>
<div class="title">${c.title}</div><div class="author">${c.author}</div></div></body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 600, height: 900 } });
for (const c of covers) {
  await page.setContent(html(c));
  await page.screenshot({ path: path.join(out, `${c.file}.png`) });
  console.log(`✓ ${c.file}`);
}
await browser.close();
