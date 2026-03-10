#!/usr/bin/env node
/**
 * Process a single image for What's On Wellington.
 *
 * Usage:
 *   node scripts/process-image.js --input <path> --category <cat> --name <slug>
 *
 * Generates in images/<category>/:
 *   <name>.webp        800 px wide, WebP (card image)
 *   <name>-thumb.webp  400 px wide, WebP (highlights carousel)
 *   <name>.jpg         800 px wide, JPEG (fallback for older browsers)
 *
 * Categories: events | food | walks | parks | activities | markets
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// ── Parse --key value arguments ────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach((val, i, arr) => {
  if (val.startsWith('--')) args[val.slice(2)] = arr[i + 1];
});

const { input, category, name } = args;

if (!input || !category || !name) {
  console.error('Usage: node scripts/process-image.js --input <path> --category <cat> --name <slug>');
  console.error('Categories: events | food | walks | parks | activities | markets');
  process.exit(1);
}

const VALID_CATEGORIES = ['events', 'food', 'walks', 'parks', 'activities', 'markets'];
if (!VALID_CATEGORIES.includes(category)) {
  console.error(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'images', category);
fs.mkdirSync(outDir, { recursive: true });

const base = path.join(outDir, name);

async function run() {
  // .rotate() auto-corrects orientation from EXIF and strips EXIF from output
  const src = sharp(input).rotate();
  const meta = await src.metadata();

  if (meta.width < 800) {
    console.warn(`⚠  Source image is ${meta.width}px wide — ideally ≥ 800px for best quality.`);
  }

  await src.clone()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(base + '.webp');

  await src.clone()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(base + '-thumb.webp');

  await src.clone()
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toFile(base + '.jpg');

  const sizes = [base + '.webp', base + '-thumb.webp', base + '.jpg'].map(f => {
    const kb = (fs.statSync(f).size / 1024).toFixed(1);
    return `  ${path.basename(f).padEnd(28)} ${kb} KB`;
  });

  console.log(`✓ images/${category}/${name}`);
  console.log(sizes.join('\n'));
  console.log(`\nReference in HTML/Firestore as: images/${category}/${name}`);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
