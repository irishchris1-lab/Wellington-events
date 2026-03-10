#!/usr/bin/env node
/**
 * Migrate Wikimedia Commons image URLs to self-hosted images.
 *
 * Reads data-img attributes from sections/*.html, downloads each unique
 * Wikimedia URL, processes it with sharp, and saves to images/<category>/.
 *
 * Usage:
 *   node scripts/migrate-images.js          # download + process all
 *   node scripts/migrate-images.js --dry-run  # print what would be done
 *
 * Outputs scripts/image-mapping.json:
 *   { "https://upload.wikimedia.org/…": "images/food/my-cafe" }
 *
 * After running, update data-img attributes in sections/*.html and img fields
 * in Firestore using the mapping, then remove the Wikimedia URLs.
 */

const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const https  = require('https');
const http   = require('http');

const isDryRun = process.argv.includes('--dry-run');

// ── Section file → category mapping ────────────────────────────────────────
const SECTION_MAP = {
  'food.html':       'food',
  'walks.html':      'walks',
  'parks.html':      'parks',
  'activities.html': 'activities',
  'markets.html':    'markets',
};

const root        = path.join(__dirname, '..');
const sectionsDir = path.join(root, 'sections');
const imagesDir   = path.join(root, 'images');

// ── Helpers ─────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics / macrons
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Wellington-Events-Migrator/1.0 (github.com/irishchris1-lab/Wellington-events)',
        'Accept': 'image/*',
      },
    }, res => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function processBuffer(buffer, outBase) {
  const src = sharp(buffer).rotate();
  const { width } = await src.metadata();
  if (width < 800) console.warn(`    ⚠  Source is only ${width}px wide`);

  await src.clone()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(outBase + '.webp');

  await src.clone()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(outBase + '-thumb.webp');

  await src.clone()
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toFile(outBase + '.jpg');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const mapping  = {};
  let processed  = 0;
  let skipped    = 0;
  let failed     = 0;

  for (const [file, category] of Object.entries(SECTION_MAP)) {
    const filePath = path.join(sectionsDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${file}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf8');

    // Collect all Wikimedia URLs from data-img and src attributes
    const urls = new Set([
      ...[...html.matchAll(/data-img=["']([^"']+)["']/g)].map(m => m[1]),
      ...[...html.matchAll(/class="[^"]*card-img[^"]*"[^>]*src=["']([^"']+)["']/g)].map(m => m[1]),
    ].filter(u => u && u.includes('wikimedia.org')));

    if (!urls.size) {
      console.log(`${file}: no Wikimedia URLs found`);
      continue;
    }

    console.log(`\n${file} (${category}): ${urls.size} image(s)`);

    const outDir = path.join(imagesDir, category);
    if (!isDryRun) fs.mkdirSync(outDir, { recursive: true });

    for (const url of urls) {
      // Derive slug from the filename portion of the URL
      const filename = decodeURIComponent(url.split('/').pop().replace(/^\d+px-/, ''));
      const slug     = slugify(filename.replace(/\.[^.]+$/, ''));
      const localPath = `images/${category}/${slug}`;
      const outBase   = path.join(imagesDir, category, slug);

      mapping[url] = localPath;

      if (isDryRun) {
        console.log(`  [dry-run] ${slug}`);
        console.log(`    ← ${url}`);
        continue;
      }

      // Skip if already processed (idempotent re-runs)
      if (fs.existsSync(outBase + '.webp') && fs.existsSync(outBase + '.jpg')) {
        console.log(`  ✓ ${slug} (already exists, skipped)`);
        skipped++;
        continue;
      }

      process.stdout.write(`  Downloading ${slug}…`);
      try {
        const buffer = await fetchBuffer(url);
        process.stdout.write(' processing…');
        await processBuffer(buffer, outBase);
        const webpKb = (fs.statSync(outBase + '.webp').size / 1024).toFixed(1);
        console.log(` ✓ (${webpKb} KB webp)`);
        processed++;
      } catch (err) {
        console.log(` ✗ ${err.message}`);
        failed++;
      }
    }
  }

  const mappingPath = path.join(__dirname, 'image-mapping.json');
  if (!isDryRun && Object.keys(mapping).length) {
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`\nMapping saved to scripts/image-mapping.json`);
    console.log('\nNext steps:');
    console.log('  1. Update data-img attributes in sections/*.html using the mapping');
    console.log('  2. git add images/ sections/ && git push');
    console.log('  3. Update Firestore img fields via the admin portal');
  }

  console.log(`\nDone: ${processed} processed, ${skipped} skipped, ${failed} failed`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
