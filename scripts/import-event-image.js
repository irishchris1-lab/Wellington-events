#!/usr/bin/env node
/**
 * Import a supplied event image — typically an organiser's own promo banner.
 *
 * Why not process-image.js: that scales to width and lets the card crop to
 * 16:9. Promo banners are usually wider than 16:9 and carry baked-in text
 * (dates, venue, the event name) right out to the edges, so a crop clips it.
 * This pads to exactly 16:9 instead, using a colour sampled from the image's
 * own edge, so nothing is lost and the padding is invisible.
 *
 * Usage:
 *   node scripts/import-event-image.js --input <file> --name <slug>
 *   node scripts/import-event-image.js --input banner.png --name x --fit cover
 *
 *   --fit pad    (default) letterbox to 16:9, nothing cropped — use for
 *                anything with text in it
 *   --fit cover  crop to fill 16:9 — fine for photographs with no text
 *
 * Writes the same three outputs as process-image.js:
 *   images/events/<name>.webp / -thumb.webp / .jpg
 */

const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

const W = 800, H = 450;

const args = {};
process.argv.slice(2).forEach((v, i, a) => {
  if (v.startsWith('--')) args[v.slice(2)] = (a[i + 1] && !a[i + 1].startsWith('--')) ? a[i + 1] : true;
});

const { input, name } = args;
const fit = args.fit || 'pad';

if (!input || !name) {
  console.error('Usage: node scripts/import-event-image.js --input <file> --name <slug> [--fit pad|cover]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`Invalid --name "${name}": use a lowercase slug, e.g. irish-cultural-festival`);
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}
if (!['pad', 'cover'].includes(fit)) {
  console.error(`--fit must be "pad" or "cover", got "${fit}"`);
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'images', 'events');
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, name);

(async () => {
  const src = sharp(input).rotate();              // honour EXIF, then strip it
  const meta = await src.metadata();
  const ratio = meta.width / meta.height;
  console.log(`source: ${meta.width}x${meta.height} (${ratio.toFixed(2)}:1), target 16:9 (1.78:1), fit=${fit}`);

  let pipeline;
  if (fit === 'cover') {
    pipeline = src.clone().resize({ width: W, height: H, fit: 'cover', position: 'attention' });
  } else {
    // Sample the edge for a padding colour so letterboxing blends in.
    const edge = await src.clone().extract({ left: 0, top: 0, width: Math.max(1, Math.floor(meta.width * 0.02)), height: meta.height })
                          .stats();
    const bg = { r: Math.round(edge.channels[0].mean), g: Math.round(edge.channels[1].mean), b: Math.round(edge.channels[2].mean), alpha: 1 };
    console.log(`padding colour sampled from left edge: rgb(${bg.r},${bg.g},${bg.b})`);
    pipeline = src.clone().resize({ width: W, height: H, fit: 'contain', background: bg });
  }

  const buf = await pipeline.png().toBuffer();    // one render, three encodings
  await sharp(buf).webp({ quality: 82, effort: 4 }).toFile(base + '.webp');
  await sharp(buf).resize({ width: 400 }).webp({ quality: 80, effort: 4 }).toFile(base + '-thumb.webp');
  await sharp(buf).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(base + '.jpg');

  const kb = f => `${(fs.statSync(f).size / 1024).toFixed(1)} KB`;
  console.log(`✓ images/events/${name}`);
  console.log(`  ${name}.webp        ${kb(base + '.webp')}`);
  console.log(`  ${name}-thumb.webp  ${kb(base + '-thumb.webp')}`);
  console.log(`  ${name}.jpg         ${kb(base + '.jpg')}`);
  console.log(`\nReference in events-data.js as:  img: 'images/events/${name}'`);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
