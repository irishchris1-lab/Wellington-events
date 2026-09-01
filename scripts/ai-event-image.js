#!/usr/bin/env node
/**
 * Generate an event hero image with an external image model.
 *
 * Why this exists: we can't use promoters' photos without permission, and a
 * photograph is often unavailable anyway. Generating our own art sidesteps
 * that — but a photorealistic "photo" of an event that never happened would
 * mislead readers, so this script hard-codes an illustrative style and
 * refuses photoreal prompts. The output is decorative artwork, not
 * documentation of the event.
 *
 * Providers (pick with --provider, or set AI_IMAGE_PROVIDER):
 *   openai  needs OPENAI_API_KEY
 *   gemini  needs GEMINI_API_KEY
 *
 * Usage:
 *   node scripts/ai-event-image.js --name upper-hutt-spring-festival \
 *     --subject "a spring street fair on a small-town main street, bunting,
 *                market stalls, cherry blossom" [--provider openai] [--dry-run]
 *
 * Writes (matching process-image.js exactly):
 *   images/events/<name>.webp        800x450  card
 *   images/events/<name>-thumb.webp  400x225  carousel
 *   images/events/<name>.jpg         800x450  fallback
 * The unprocessed generation is kept in images/originals/ (gitignored).
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 800, H = 450;               // 16:9, matching the existing card art

// House style. Prepended to every prompt so output stays on-brand and,
// importantly, stays clearly an illustration.
const STYLE = [
  'Flat vector editorial illustration, bold simple shapes, limited palette,',
  'clean geometric composition, subtle grain, generous negative space.',
  'Teal, cream and warm gold accents. Wide 16:9 composition.',
  'No text, no lettering, no logos, no watermarks.',
  'No recognisable real people, no identifiable faces, no real brand marks.',
  'Stylised illustration only — NOT photorealistic, not a photograph.',
].join(' ');

// Prompt words that would push toward a fake documentary photo.
const BANNED = /\b(photo|photograph|photorealistic|realistic|4k|8k|dslr|hyperreal|lifelike|render of a real)\b/i;

// ── args ──────────────────────────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach((v, i, a) => {
  if (v.startsWith('--')) args[v.slice(2)] = (a[i + 1] && !a[i + 1].startsWith('--')) ? a[i + 1] : true;
});

const name     = args.name;
const subject  = args.subject;
const provider = args.provider || process.env.AI_IMAGE_PROVIDER || 'openai';
const dryRun   = args['dry-run'] === true;

if (!name || !subject || subject === true) {
  console.error('Usage: node scripts/ai-event-image.js --name <slug> --subject "<what to draw>" [--provider openai|gemini] [--dry-run]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`Invalid --name "${name}": use a lowercase slug, e.g. upper-hutt-spring-festival`);
  process.exit(1);
}
if (BANNED.test(subject)) {
  console.error(`Refusing this --subject: it asks for a photographic look ("${subject.match(BANNED)[0]}").`);
  console.error('These images sit on event listings, so they must read as illustration, not as a photo of the event.');
  process.exit(1);
}

const prompt = `${STYLE} Subject: ${subject}.`;

if (dryRun) {
  console.log(`provider: ${provider}\nname:     ${name}\n\nprompt:\n${prompt}`);
  process.exit(0);
}

// ── providers ─────────────────────────────────────────────────────────────
// Both return a Buffer of the generated image. Model names move quickly —
// override with AI_IMAGE_MODEL if the default has been superseded.

async function viaOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const model = process.env.AI_IMAGE_MODEL || 'gpt-image-1';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1536x1024', n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image in OpenAI response: ' + JSON.stringify(json).slice(0, 300));
  return Buffer.from(b64, 'base64');
}

async function viaGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.AI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) throw new Error('No image in Gemini response: ' + JSON.stringify(json).slice(0, 300));
  return Buffer.from(part.inlineData.data, 'base64');
}

const PROVIDERS = { openai: viaOpenAI, gemini: viaGemini };

// ── run ───────────────────────────────────────────────────────────────────
(async () => {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`Unknown provider "${provider}". Use: ${Object.keys(PROVIDERS).join(', ')}`);

  console.log(`Generating "${name}" via ${provider}…`);
  const raw = await fn();

  // Keep the untouched generation for reference / regeneration. This directory
  // is gitignored, so only the processed derivatives get committed.
  const origDir = path.join(__dirname, '..', 'images', 'originals');
  fs.mkdirSync(origDir, { recursive: true });
  const origPath = path.join(origDir, `${name}-ai.png`);
  fs.writeFileSync(origPath, raw);

  const outDir = path.join(__dirname, '..', 'images', 'events');
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name);

  // cover-crop to 16:9 so card heights stay consistent with the existing art
  const src = sharp(raw).resize({ width: W, height: H, fit: 'cover', position: 'attention' });
  await src.clone().webp({ quality: 82, effort: 4 }).toFile(base + '.webp');
  await src.clone().resize({ width: 400, height: 225, fit: 'cover', position: 'attention' })
           .webp({ quality: 80, effort: 4 }).toFile(base + '-thumb.webp');
  await src.clone().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(base + '.jpg');

  const kb = f => `${(fs.statSync(f).size / 1024).toFixed(1)} KB`;
  console.log(`✓ images/events/${name}`);
  console.log(`  ${name}.webp        ${kb(base + '.webp')}`);
  console.log(`  ${name}-thumb.webp  ${kb(base + '-thumb.webp')}`);
  console.log(`  ${name}.jpg         ${kb(base + '.jpg')}`);
  console.log(`  original kept at images/originals/${name}-ai.png (gitignored)`);
  console.log(`\nReference in events-data.js as:  img: 'images/events/${name}'`);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
