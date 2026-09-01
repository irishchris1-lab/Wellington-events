#!/usr/bin/env node
/**
 * Generate an on-brand placeholder hero image for an event.
 *
 * Use this when there is no photograph we hold the rights to. It draws a flat
 * vector motif on a diagonal gradient — the same idiom as the existing
 * images/events/ art — then hands the result to the standard sharp pipeline so
 * the outputs match process-image.js exactly:
 *
 *   images/events/<name>.webp        800px  (card)
 *   images/events/<name>-thumb.webp  400px  (carousel)
 *   images/events/<name>.jpg         800px  (fallback)
 *
 * Usage:
 *   node scripts/generate-event-image.js --name <slug> --theme <theme>
 *   node scripts/generate-event-image.js --list
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const W = 800, H = 450, CX = W / 2, CY = 205;

// ── motifs ────────────────────────────────────────────────────────────────
// Each returns SVG drawn around (CX, CY). Keep shapes flat and few — these
// read at 400px wide in a card, so detail is wasted.

function blossoms(petal, centre, leaf) {
  const flower = (x, y, r) => {
    let p = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      p += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${(r * 0.62).toFixed(1)}" fill="${petal}"/>`;
    }
    return p + `<circle cx="${x}" cy="${y}" r="${(r * 0.46).toFixed(1)}" fill="${centre}"/>`;
  };
  // bunting strung across the top — a street-fair cue
  let bunting = `<path d="M 40 60 Q ${CX} 120 760 60" stroke="${leaf}" stroke-width="3" fill="none" opacity="0.85"/>`;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = 40 + t * 720;
    const y = 60 + Math.sin(Math.PI * t) * 30;
    const fill = i % 2 ? petal : centre;
    bunting += `<path d="M ${x - 13} ${y} L ${x + 13} ${y} L ${x} ${y + 30} Z" fill="${fill}" opacity="0.9"/>`;
  }
  return bunting
    + flower(CX, CY + 20, 52)
    + flower(CX - 105, CY + 62, 34)
    + flower(CX + 105, CY + 62, 34);
}

function shamrock(leafCol, stemCol) {
  // three lobes at 120°, each a circle pair, plus a stem
  let lobes = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * 120 - 90) * Math.PI / 180;
    const lx = CX + Math.cos(a) * 58;
    const ly = CY + Math.sin(a) * 58;
    lobes += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="52" fill="${leafCol}"/>`;
  }
  const stem = `<path d="M ${CX} ${CY + 40} Q ${CX + 26} ${CY + 120} ${CX - 6} ${CY + 168}"
                  stroke="${stemCol}" stroke-width="13" fill="none" stroke-linecap="round"/>`;
  return lobes + `<circle cx="${CX}" cy="${CY}" r="26" fill="${leafCol}"/>` + stem;
}

function fanfare(arcCol, coreCol, ringCol) {
  // full concentric rings = resonance from a single source; a choral/brass cue
  // without drawing a literal instrument
  let rings = '';
  [88, 122, 156, 190].forEach((r, i) => {
    rings += `<circle cx="${CX}" cy="${CY}" r="${r}" stroke="${arcCol}"
               stroke-width="${10 - i * 1.5}" fill="none"
               opacity="${(0.85 - i * 0.16).toFixed(2)}"/>`;
  });
  return rings
    + `<circle cx="${CX}" cy="${CY}" r="54" fill="${ringCol}"/>`
    + `<circle cx="${CX}" cy="${CY}" r="40" fill="${coreCol}"/>`;
}

function equaliser(barCol, accentCol) {
  const heights = [58, 104, 150, 190, 150, 104, 58];
  const bw = 34, gap = 22;
  const total = heights.length * bw + (heights.length - 1) * gap;
  let bars = '';
  heights.forEach((h, i) => {
    const x = CX - total / 2 + i * (bw + gap);
    const y = CY + 95 - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y}" width="${bw}" height="${h}" rx="${bw / 2}"
               fill="${i % 2 ? accentCol : barCol}"/>`;
  });
  return bars;
}

// ── themes ────────────────────────────────────────────────────────────────
const THEMES = {
  spring:  { from: '#2E8B57', to: '#E8C86A', bar: '#1A6B3A',
             art: () => blossoms('#F7F2EB', '#E4A11B', '#1A6B3A') },
  irish:   { from: '#0B5F3A', to: '#D9A441', bar: '#F7F2EB',
             art: () => shamrock('#F7F2EB', '#8FBF6A') },
  choral:  { from: '#3B1220', to: '#C4622D', bar: '#D9A441',
             art: () => fanfare('#E8C86A', '#3B1220', '#F7F2EB') },
  nightgig:{ from: '#241546', to: '#C0357A', bar: '#4FC58F',
             art: () => equaliser('#F7F2EB', '#4FC58F') },
};

// ── args ──────────────────────────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach((v, i, a) => { if (v.startsWith('--')) args[v.slice(2)] = a[i + 1]; });

if ('list' in args) {
  console.log('themes: ' + Object.keys(THEMES).join(', '));
  process.exit(0);
}
const { name, theme } = args;
if (!name || !theme) {
  console.error('Usage: node scripts/generate-event-image.js --name <slug> --theme <theme>');
  console.error('Themes: ' + Object.keys(THEMES).join(', '));
  process.exit(1);
}
const t = THEMES[theme];
if (!t) { console.error(`Unknown theme "${theme}". Options: ${Object.keys(THEMES).join(', ')}`); process.exit(1); }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.from}"/>
      <stop offset="1" stop-color="${t.to}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${t.art()}
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${t.bar}"/>
</svg>`;

const outDir = path.join(__dirname, '..', 'images', 'events');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, name);

(async () => {
  const src = sharp(Buffer.from(svg));
  await src.clone().resize({ width: 800 }).webp({ quality: 82, effort: 4 }).toFile(base + '.webp');
  await src.clone().resize({ width: 400 }).webp({ quality: 80, effort: 4 }).toFile(base + '-thumb.webp');
  await src.clone().resize({ width: 800 }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(base + '.jpg');
  const line = f => `  ${path.basename(f).padEnd(34)} ${(fs.statSync(f).size / 1024).toFixed(1)} KB`;
  console.log(`✓ images/events/${name}  (theme: ${theme})`);
  console.log([base + '.webp', base + '-thumb.webp', base + '.jpg'].map(line).join('\n'));
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
