#!/usr/bin/env node
/**
 * Pre-deploy checks for the static site.
 *
 * Each check guards a failure this repo has actually shipped:
 *  1. parse errors in any script the page loads
 *  2. a top-level `const` declared in two files that share global scope
 *     (events-data.js + script.js are classic scripts — a collision is a
 *     parse-time SyntaxError that kills script.js entirely)
 *  3. an event pointing at a local image whose files were never committed
 *  4. a service-worker shell entry that 404s, silently breaking precache
 *  5. an og:image / twitter:image that points at a file that doesn't exist
 *  6. an event without a valid category or price tier, which filters would mis-file
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const errors = [];
const fail = (check, msg) => errors.push(`${check}: ${msg}`);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// ── 1. syntax ──────────────────────────────────────────────────────────
const scripts = ['js/event-dates.js', 'js/events-data.js', 'js/script.js', 'admin/admin.js', 'sw.js',
                 'scripts/process-image.js',
                 'scripts/generate-event-image.js', 'scripts/ai-event-image.js',
                 'scripts/import-event-image.js'];
for (const f of scripts) {
  if (!fs.existsSync(path.join(root, f))) { fail('syntax', `${f} is missing`); continue; }
  try {
    cp.execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' });
  } catch (e) {
    fail('syntax', `${f} does not parse\n${(e.stderr || '').toString().trim()}`);
  }
}

// ── 2. global-scope collisions between the two classic scripts ─────────
const topLevel = f => {
  const names = new Map();
  read(f).split('\n').forEach((line, i) => {
    const m = /^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(line)
           || /^function\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m && !names.has(m[1])) names.set(m[1], i + 1);
  });
  return names;
};
const a = topLevel('js/events-data.js');
const b = topLevel('js/script.js');
for (const [name, lineA] of a) {
  if (b.has(name)) {
    fail('global-collision',
      `"${name}" is declared at top level in both js/events-data.js:${lineA} ` +
      `and js/script.js:${b.get(name)} — both load as classic scripts into one ` +
      `global scope, so this is a SyntaxError that stops script.js running`);
  }
}

// ── 3. local event images are committed ────────────────────────────────
// cardImgHTML(): an `img` starting with "images/" is resolved as
// <base>.webp + <base>.jpg, with <base>-thumb.webp used for thumbnails.
const data = read('js/events-data.js');
const seen = new Set();
for (const m of data.matchAll(/img:\s*'([^']*)'/g)) {
  const ref = m[1];
  if (!ref || /^https?:/.test(ref)) continue;
  if (!ref.startsWith('images/')) {
    fail('images', `img: '${ref}' is neither an absolute URL nor an images/ path`);
    continue;
  }
  const base = ref.replace(/\.(webp|jpe?g|png)$/i, '');
  if (seen.has(base)) continue;
  seen.add(base);
  for (const suffix of ['.webp', '.jpg', '-thumb.webp']) {
    if (!fs.existsSync(path.join(root, base + suffix))) {
      fail('images', `event image "${ref}" is missing ${base}${suffix}`);
    }
  }
}

// ── 4. service worker shell resolves ───────────────────────────────────
const shell = /const SHELL\s*=\s*\[([\s\S]*?)\]/.exec(read('sw.js'));
if (!shell) {
  fail('service-worker', 'could not find the SHELL array in sw.js');
} else {
  for (const m of shell[1].matchAll(/'([^']+)'/g)) {
    const url = m[1];
    const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
    if (!fs.existsSync(path.join(root, rel))) {
      fail('service-worker', `SHELL entry "${url}" has no file at ${rel}`);
    }
  }
}

// ── 5. social share images exist ───────────────────────────────────────
// og:image / twitter:image pointing at a missing file = shares with no preview
const site = 'https://whatsonwellington.co.nz/';
for (const m of read('index.html').matchAll(/<meta\s+(?:property|name)="(og:image|twitter:image)"\s+content="([^"]+)"/g)) {
  const [, tag, url] = m;
  if (!url.startsWith(site)) continue;               // external image — not ours to check
  const rel = url.slice(site.length);
  if (!fs.existsSync(path.join(root, rel))) fail('share-image', `${tag} "${url}" has no file at ${rel}`);
}

// ── 6. every event has a category ──────────────────────────────────
// The Show filter reads `category` (see EVENT_CATEGORIES in js/script.js);
// Rainy Day reads `indoor`.
const vm = require('vm');
const sandbox = {};
vm.runInNewContext(data + '\n;this.STATIC_EVENTS = STATIC_EVENTS;', sandbox);
const {
  isCalendarDate, eventDate, eventSchedule, eventIsPast, nextEventDate, aucklandInstant,
} = vm.runInNewContext(read('js/event-dates.js') +
  '\n({ isCalendarDate, eventDate, eventSchedule, eventIsPast, nextEventDate, aucklandInstant })');
const CATEGORIES = ['music', 'festivals', 'sports', 'exhibitions', 'workshops', 'food'];
const PRICE_TIERS = ['Free', '$', '$$', '$$$'];
(sandbox.STATIC_EVENTS || []).forEach(ev => {
  if (!CATEGORIES.includes(ev.category)) {
    fail('category', `"${ev.title}" (${ev.weekend}) has category ${JSON.stringify(ev.category)}; use one of ${CATEGORIES.join(', ')}`);
  }
  if ('date' in ev && !isCalendarDate(ev.date)) {
    fail('date', `"${ev.title}" has date ${JSON.stringify(ev.date)}; use a valid YYYY-MM-DD date`);
  } else if (!eventDate(ev)) {
    fail('date', `"${ev.title}" needs a valid date or a legacy weekend date`);
  }
  if ('indoor' in ev && typeof ev.indoor !== 'boolean') {
    fail('category', `"${ev.title}" (${ev.weekend}) has indoor: ${JSON.stringify(ev.indoor)}; use true or leave it out`);
  }
  if (ev.priceUnknown === true) {
    if ('priceTier' in ev || 'priceEstimated' in ev || !ev.cost) {
      fail('price', `"${ev.title}" needs a note and no price tier when its price is unknown`);
    }
  } else if (!PRICE_TIERS.includes(ev.priceTier)) {
    fail('price', `"${ev.title}" (${ev.weekend}) needs a priceTier of ${PRICE_TIERS.join(', ')}`);
  }
  if ('priceUnknown' in ev && typeof ev.priceUnknown !== 'boolean') {
    fail('price', `"${ev.title}" has a non-boolean priceUnknown`);
  }
  if ('priceEstimated' in ev && typeof ev.priceEstimated !== 'boolean') {
    fail('price', `"${ev.title}" (${ev.weekend}) has a non-boolean priceEstimated`);
  }
});

// ── 7. event expiry uses Wellington time and each occurrence's own schedule ──
const date = '2026-11-28';
const sunday = '2026-11-29';
const close = Date.parse('2026-11-28T02:00:00Z'); // 3 pm NZDT
const checks = [
  ['exact end instant', { date, end: '2026-11-28T15:00' }, close],
  ['offset end instant', { date, end: '2026-11-28T02:00:00Z' }, close],
  ['legacy time range', { date, time: '10 am – 3 pm' }, close],
  ['date-only fallback', { date, time: 'Starts at 10 am' }, Date.parse('2026-11-28T11:00:00Z')],
  ['overnight time range', { date, time: '8 pm – 1 am' }, Date.parse('2026-11-28T12:00:00Z')],
  ['multi-day event', { date: '2026-11-27', endDate: date, endTime: '15:00' }, close],
  ['daily run', { date: '2026-11-27', endDate: date, endTime: '15:00', daily: true }, close],
  ['separate occurrences', { date, occurrences: [{ date, endTime: '15:00' }, sunday] }, Date.parse('2026-11-29T11:00:00Z')],
];
for (const [name, ev, end] of checks) {
  const schedule = eventSchedule(ev);
  if (eventIsPast(schedule, end - 1) || !eventIsPast(schedule, end)) {
    fail('expiry', `${name} must expire at ${new Date(end).toISOString()}`);
  }
}
const daily = eventSchedule({ date, endDate: sunday, endTime: '15:00', daily: true });
if (nextEventDate(daily, date, date, close) || nextEventDate(daily, date, sunday, close) !== sunday) {
  fail('expiry', 'a completed daily session must advance to the next available date');
}
const sparse = eventSchedule({ date, occurrences: [date, '2026-11-30'] });
if (nextEventDate(sparse, sunday, sunday, close)) fail('expiry', 'a recurring event must skip dates without a session');
if (aucklandInstant('2026-04-05', '02:30:00') !== Date.parse('2026-04-04T14:30:00Z') ||
    aucklandInstant('2026-09-27', '02:30:00') !== Date.parse('2026-09-26T14:30:00Z')) {
  fail('expiry', 'daylight saving transitions must use the correct Wellington instant');
}

// ── report ─────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s) found:\n`);
  errors.forEach(e => console.error('  • ' + e));
  console.error('');
  process.exit(1);
}
console.log(`✔ all checks passed (${seen.size} local event images, ${scripts.length} scripts parsed)`);
