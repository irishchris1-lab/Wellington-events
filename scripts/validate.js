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
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const errors = [];
const fail = (check, msg) => errors.push(`${check}: ${msg}`);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// ── 1. syntax ──────────────────────────────────────────────────────────
const scripts = ['js/events-data.js', 'js/script.js', 'sw.js',
                 'scripts/process-image.js', 'scripts/migrate-images.js',
                 'scripts/generate-event-image.js', 'scripts/ai-event-image.js'];
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

// ── report ─────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s) found:\n`);
  errors.forEach(e => console.error('  • ' + e));
  console.error('');
  process.exit(1);
}
console.log(`✔ all checks passed (${seen.size} local event images, ${scripts.length} scripts parsed)`);
