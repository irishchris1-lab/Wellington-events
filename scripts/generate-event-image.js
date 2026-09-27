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

function star(cx, cy, r, fill) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
}

function theatre(curtain, fold, spot) {
  // stage curtains, a scalloped valance and a spotlight pool
  const valance = Array.from({ length: 9 }, (_, i) =>
    `<circle cx="${i * 100}" cy="0" r="58" fill="${curtain}"/>`).join('');
  const drape = (x0, x1, dir) =>
    `<path d="M ${x0} 0 L ${x1} 0 Q ${x1 - dir * 46} 220 ${x1 - dir * 12} 450 L ${x0} 450 Z" fill="${curtain}"/>` +
    [0.3, 0.6].map(t => { const fx = x0 + (x1 - x0) * t;
      return `<path d="M ${fx} 40 Q ${fx - dir * 20} 240 ${fx - dir * 6} 450" stroke="${fold}" stroke-width="7" fill="none" opacity="0.55"/>`; }).join('');
  return `<path d="M ${CX - 70} 40 L ${CX + 70} 40 L ${CX + 175} 400 L ${CX - 175} 400 Z" fill="${spot}" opacity="0.13"/>`
    + `<ellipse cx="${CX}" cy="392" rx="178" ry="30" fill="${spot}" opacity="0.45"/>`
    + drape(0, 250, 1) + drape(800, 550, -1) + valance
    + star(CX, 250, 48, spot);
}

function book(page, starCol, spine) {
  // an open book with a path of stars rising from it
  const pages = `<path d="M ${CX} 360 Q ${CX - 85} 322 ${CX - 190} 345 L ${CX - 190} 262 Q ${CX - 85} 238 ${CX} 276 Z" fill="${page}"/>`
              + `<path d="M ${CX} 360 Q ${CX + 85} 322 ${CX + 190} 345 L ${CX + 190} 262 Q ${CX + 85} 238 ${CX} 276 Z" fill="${page}"/>`
              + `<path d="M ${CX} 276 L ${CX} 360" stroke="${spine}" stroke-width="5"/>`;
  const trail = [[CX + 10, 222, 8], [CX + 45, 178, 10], [CX + 95, 142, 12], [CX + 158, 118, 15]]
    .map(([x, y, r]) => star(x, y, r, starCol)).join('');
  return pages + trail + star(CX + 238, 104, 34, starCol);
}

function diyas(bowl, flame, glow) {
  // three diya oil lamps — a Diwali cue
  const lamp = (x, y, s) =>
    `<circle cx="${x}" cy="${y - 44 * s}" r="${46 * s}" fill="${glow}" opacity="0.22"/>` +
    `<path d="M ${x} ${y - 82 * s} Q ${x + 19 * s} ${y - 44 * s} ${x} ${y - 12 * s} Q ${x - 19 * s} ${y - 44 * s} ${x} ${y - 82 * s} Z" fill="${flame}"/>` +
    `<path d="M ${x - 62 * s} ${y} A ${62 * s} ${38 * s} 0 0 0 ${x + 62 * s} ${y} Z" fill="${bowl}"/>`;
  const dots = Array.from({ length: 13 }, (_, i) =>
    `<circle cx="${130 + i * 45}" cy="392" r="${i % 2 ? 5 : 8}" fill="${glow}" opacity="0.75"/>`).join('');
  return lamp(CX - 175, 305, 0.82) + lamp(CX, 290, 1.12) + lamp(CX + 175, 305, 0.82) + dots;
}

function yarn(ball, strand, needle) {
  // a ball of yarn with crossed needles — handmade / craft
  const r = 98;
  const wraps = [-40, -12, 16, 44].map(o =>
    `<path d="M ${CX - r + 10} ${CY + o} Q ${CX} ${CY + o - 52} ${CX + r - 10} ${CY + o}" stroke="${strand}" stroke-width="5" fill="none" opacity="0.7"/>`).join('');
  const needles = [[-1, 1], [1, 1]].map(([dx]) =>
    `<line x1="${CX + dx * 190}" y1="${CY - 125}" x2="${CX - dx * 20}" y2="${CY + 150}" stroke="${needle}" stroke-width="11" stroke-linecap="round"/>` +
    `<circle cx="${CX + dx * 190}" cy="${CY - 125}" r="15" fill="${needle}"/>`).join('');
  return needles + `<circle cx="${CX}" cy="${CY}" r="${r}" fill="${ball}"/>` + wraps
    + `<path d="M ${CX + 70} ${CY + 70} Q ${CX + 170} ${CY + 170} ${CX + 290} ${CY + 130}" stroke="${ball}" stroke-width="6" fill="none"/>`;
}

function portico(stone, shadow) {
  // a classical portico — heritage buildings
  const cols = [-150, -75, 0, 75, 150].map(o =>
    `<rect x="${CX + o - 17}" y="${CY - 38}" width="34" height="178" fill="${stone}"/>` +
    `<rect x="${CX + o - 24}" y="${CY - 50}" width="48" height="14" fill="${stone}"/>`).join('');
  return `<path d="M ${CX - 215} ${CY - 60} L ${CX} ${CY - 165} L ${CX + 215} ${CY - 60} Z" fill="${stone}"/>`
    + `<path d="M ${CX - 160} ${CY - 72} L ${CX} ${CY - 142} L ${CX + 160} ${CY - 72} Z" fill="${shadow}" opacity="0.35"/>`
    + `<rect x="${CX - 215}" y="${CY - 62}" width="430" height="14" fill="${stone}"/>`
    + cols
    + `<rect x="${CX - 225}" y="${CY + 140}" width="450" height="16" fill="${stone}"/>`
    + `<rect x="${CX - 250}" y="${CY + 160}" width="500" height="16" fill="${stone}"/>`;
}

function witch(moon, hat, band, starCol) {
  // crescent moon, a witch's hat and a scatter of stars
  return `<defs><mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/>`
    + `<circle cx="${CX + 118}" cy="${CY - 70}" r="80" fill="#000"/></mask></defs>`
    + `<circle cx="${CX + 80}" cy="${CY - 50}" r="92" fill="${moon}" mask="url(#cres)"/>`
    + [[150, 90, 10], [250, 150, 7], [640, 110, 9], [690, 250, 7], [120, 250, 8], [560, 60, 6]]
        .map(([x, y, r]) => star(x, y, r, starCol)).join('')
    + `<path d="M ${CX - 30} ${CY - 95} Q ${CX - 60} ${CY + 30} ${CX - 105} ${CY + 125} L ${CX + 60} ${CY + 125} Q ${CX + 15} ${CY + 30} ${CX - 30} ${CY - 95} Z" fill="${hat}"/>`
    + `<ellipse cx="${CX - 22}" cy="${CY + 130}" rx="150" ry="24" fill="${hat}"/>`
    + `<path d="M ${CX - 96} ${CY + 104} L ${CX + 52} ${CY + 104} L ${CX + 58} ${CY + 122} L ${CX - 103} ${CY + 122} Z" fill="${band}"/>`;
}

function discoball(ball, tile, ray) {
  // a mirror ball on a string with sparkle rays
  const r = 100, cy = CY + 20;
  let tiles = '';
  for (let y = cy - r; y <= cy + r; y += 25) tiles += `<line x1="${CX - r}" y1="${y}" x2="${CX + r}" y2="${y}" stroke="${tile}" stroke-width="3"/>`;
  for (let x = CX - r; x <= CX + r; x += 25) tiles += `<ellipse cx="${CX}" cy="${cy}" rx="${Math.abs(x - CX)}" ry="${r}" stroke="${tile}" stroke-width="3" fill="none"/>`;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 + 22) * Math.PI / 180;
    return `<line x1="${(CX + Math.cos(a) * 128).toFixed(1)}" y1="${(cy + Math.sin(a) * 128).toFixed(1)}" x2="${(CX + Math.cos(a) * 172).toFixed(1)}" y2="${(cy + Math.sin(a) * 172).toFixed(1)}" stroke="${ray}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
  }).join('');
  return `<defs><clipPath id="ball"><circle cx="${CX}" cy="${cy}" r="${r}"/></clipPath></defs>`
    + `<line x1="${CX}" y1="0" x2="${CX}" y2="${cy - r}" stroke="${ball}" stroke-width="4"/>`
    + rays + `<circle cx="${CX}" cy="${cy}" r="${r}" fill="${ball}"/>`
    + `<g clip-path="url(#ball)">${tiles}</g>`
    + star(CX - 150, cy - 110, 16, ray) + star(CX + 165, cy + 105, 12, ray);
}

function mic(body, grille, wave) {
  // a stage microphone with sound waves either side
  const waves = [1, -1].map(d => [70, 105, 140].map((r, i) =>
    `<path d="M ${CX + d * r} ${CY - 60 + i * 4} Q ${CX + d * (r + 30)} ${CY - 5} ${CX + d * r} ${CY + 50 - i * 4}" stroke="${wave}" stroke-width="${9 - i * 2}" fill="none" stroke-linecap="round" opacity="${0.9 - i * 0.22}"/>`).join('')).join('');
  let lines = '';
  for (let y = CY - 88; y <= CY + 20; y += 16) lines += `<line x1="${CX - 44}" y1="${y}" x2="${CX + 44}" y2="${y}" stroke="${grille}" stroke-width="3"/>`;
  return waves
    + `<rect x="${CX - 50}" y="${CY - 110}" width="100" height="150" rx="50" fill="${body}"/>` + lines
    + `<rect x="${CX - 12}" y="${CY + 40}" width="24" height="70" fill="${body}"/>`
    + `<path d="M ${CX - 78} ${CY + 5} Q ${CX - 78} ${CY + 88} ${CX} ${CY + 88} Q ${CX + 78} ${CY + 88} ${CX + 78} ${CY + 5}" stroke="${body}" stroke-width="10" fill="none"/>`
    + `<rect x="${CX - 70}" y="${CY + 112}" width="140" height="18" rx="9" fill="${body}"/>`;
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
  theatre: { from: '#1B1F3B', to: '#4B2A5E', bar: '#E8C86A',
             art: () => theatre('#B3263A', '#6E1224', '#F2D27A') },
  book:    { from: '#0B5563', to: '#1B2A55', bar: '#E8C86A',
             art: () => book('#F7F2EB', '#E8C86A', '#9AACAC') },
  diwali:  { from: '#3A0F4A', to: '#B0306A', bar: '#F2B233',
             art: () => diyas('#E0762B', '#FFD45C', '#F2B233') },
  craft:   { from: '#C8723C', to: '#E8B04A', bar: '#0B5563',
             art: () => yarn('#0B5563', '#F7F2EB', '#F7F2EB') },
  heritage:{ from: '#2F4A5A', to: '#7C8C7A', bar: '#D9A441',
             art: () => portico('#F7F2EB', '#2F4A5A') },
  witch:   { from: '#120A2A', to: '#4A2468', bar: '#9B6BD1',
             art: () => witch('#F4E7B8', '#0B0716', '#9B6BD1', '#E8C86A') },
  disco:   { from: '#6A1B6A', to: '#E0643A', bar: '#F2D27A',
             art: () => discoball('#E6E6EE', '#9A96B0', '#FFF4CC') },
  mic:     { from: '#101820', to: '#1E6B5A', bar: '#E8C86A',
             art: () => mic('#E8C86A', '#101820', '#F7F2EB') },
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
