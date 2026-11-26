/* ── Admin portal — What's On Wellington ── */

// ✏️  Add your Google account email here
const ADMIN_EMAILS = ['whatsonwelly@gmail.com', 'irishchris1@gmail.com'];

// Firebase config (same project as the main site)
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCql0Pc_sSFcQSo8NDTWO29lLcXqFKFFgg",
  authDomain:        "whatsonwellington-4b7a7.firebaseapp.com",
  projectId:         "whatsonwellington-4b7a7",
  storageBucket:     "whatsonwellington-4b7a7.firebasestorage.app",
  messagingSenderId: "51704787462",
  appId:             "1:51704787462:web:b2cedc8d4c46602b814987"
};

// ── Init Firebase ──────────────────────────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

// ── State ─────────────────────────────────────────────────────────────────────
let allEvents       = [];
let publishedEvents = [];
let editingDocId     = null;
let deletingDocId    = null;
let deletingTitle    = '';
let deletingStaticId = null;
let hiddenStaticKeys = new Set();
let unsubscribeSnap = null;
let unsubscribePicks = null;
let showPast        = false;
let dashboardSession = 0;
let selectedWeek = eventWeekStart(aucklandToday());
let savedWeeklyPicks = {};
let picksState = 'loading';
let savingPick = false;
let eventsState = 'loading';
const adminStaticEvents = (typeof STATIC_EVENTS === 'undefined' ? [] : STATIC_EVENTS)
  .map((ev, i) => ({ ...ev, ...adminEventSchedule(ev), id: `static-${i}`, _static: true, _staticId: i, active: true }));
const adminCurated = new Map(adminStaticEvents.map(ev => [eventListingKey(ev), ev]));
const adminSchedules = new WeakMap();

function adminSchedule(ev) {
  if (!adminSchedules.has(ev)) adminSchedules.set(ev, eventSchedule(ev));
  return adminSchedules.get(ev);
}

function toggleShowPast(btn) {
  showPast = !showPast;
  btn.textContent = showPast ? 'Hide past' : 'Show past';
  applyFilters();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user && ADMIN_EMAILS.includes(user.email)) {
    showDashboard(user);
  } else if (user) {
    // Signed in but not an admin
    showToast('Access denied — this account is not authorised.');
    auth.signOut();
    showLogin();
  } else {
    showLogin();
  }
});

function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    showToast('Sign-in failed: ' + err.message);
  });
}

function signOut() {
  auth.signOut();
}

function showLogin() {
  dashboardSession++;
  unsubscribeSnap?.();
  unsubscribePicks?.();
  unsubscribeSnap = unsubscribePicks = null;
  allEvents = publishedEvents = [];
  savedWeeklyPicks = {};
  hiddenStaticKeys = new Set();
  picksState = eventsState = 'loading';
  savingPick = false;
  closeModal();
  closeDeleteModal();
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard(user) {
  const session = ++dashboardSession;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('adminEmail').textContent = user.email;
  selectedWeek = eventWeekStart(aucklandToday());
  applyFilters();
  subscribeToWeeklyPicks();
  db.collection('settings').doc('hiddenStatics').get().then(doc => {
    if (session === dashboardSession && doc.exists) (doc.data().keys || []).forEach(k => hiddenStaticKeys.add(k));
  }).catch(() => {}).finally(() => {
    if (session === dashboardSession) subscribeToEvents();
  });
  loadAbout();
  openFromUrlParams();
}

// ── Pre-filled modal from URL params (?new=1&title=...&type=...etc) ───────────
function openFromUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get('new')) return;
  // Wait for dashboard to render then open modal
  setTimeout(() => {
    openModal();
    const set = (id, val) => { if (val !== null) { const el = document.getElementById(id); if (el) el.value = decodeURIComponent(val); } };
    set('fTitle',   p.get('title'));
    set('fDesc',    p.get('description'));
    set('fType',    p.get('type'));
    set('fDate',    eventDate({ date: p.get('date'), day: p.get('day'), weekend: p.get('weekend') }));
    set('fRegion',  p.get('region'));
    set('fVenue',   p.get('venue'));
    set('fTime',    p.get('time'));
    set('fUrl',     p.get('url'));
    set('fImg',     p.get('img'));
    // Always open as draft when coming from a link
    const activeEl = document.getElementById('fActive');
    if (activeEl) activeEl.checked = false;
    // Clean URL so refreshing doesn't re-open the modal
    window.history.replaceState({}, '', window.location.pathname);
  }, 300);
}

// ── Catalogue and Picks listeners ───────────────────────────────────────────
function subscribeToEvents() {
  unsubscribeSnap?.();
  unsubscribeSnap = db.collection('events').onSnapshot(snapshot => {
    const live = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const catalogue = eventCatalogue(adminStaticEvents, live);
    publishedEvents = catalogue.published.filter(ev => !ev._static || !hiddenStaticKeys.has(legacyEventKey(ev)));
    allEvents = [...publishedEvents, ...catalogue.drafts];
    eventsState = 'ready';
    applyFilters();
  }, err => {
    console.error('Could not load events:', err);
    eventsState = 'error';
    applyFilters();
  });
}

function subscribeToWeeklyPicks() {
  unsubscribePicks?.();
  unsubscribePicks = db.collection('siteConfig').doc('about').onSnapshot(doc => {
    savedWeeklyPicks = readWeeklyPicks(doc.data()?.weeklyPicks);
    picksState = 'ready';
    applyFilters();
  }, err => {
    console.error('Could not load weekly picks:', err);
    picksState = 'error';
    applyFilters();
  });
}

// ── Week selection and filtering ────────────────────────────────────────────
const adminWeekLabel = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const adminDayLabel = new Intl.DateTimeFormat('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function selectAdminWeek(date) {
  if (date && !isCalendarDate(date)) return;
  selectedWeek = date ? eventWeekStart(date) : '';
  applyFilters();
}

function chooseRelativeWeek(offset) {
  selectAdminWeek(addCalendarDays(eventWeekStart(aucklandToday()), offset));
}

function shiftAdminWeek(offset) {
  if (selectedWeek) selectAdminWeek(addCalendarDays(selectedWeek, offset));
}

function syncWeekControls() {
  const thisWeek = eventWeekStart(aucklandToday());
  const nextWeek = addCalendarDays(thisWeek, 7);
  for (const [id, active] of [
    ['thisWeekBtn', selectedWeek === thisWeek], ['nextWeekBtn', selectedWeek === nextWeek], ['allDatesBtn', !selectedWeek],
  ]) {
    const button = document.getElementById(id);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  document.getElementById('weekDate').value = selectedWeek;
  document.getElementById('previousWeekBtn').disabled = !selectedWeek;
  document.getElementById('followingWeekBtn').disabled = !selectedWeek;
  document.getElementById('adminPicksSection').hidden = !selectedWeek;
  if (!selectedWeek) return;
  document.getElementById('adminPicksHeading').textContent = selectedWeek === thisWeek ? 'This Week’s Picks'
    : selectedWeek === nextWeek ? 'Next Week’s Picks' : 'Weekly Picks';
  const start = calendarDay(selectedWeek);
  const end = calendarDay(addCalendarDays(selectedWeek, 6));
  document.getElementById('adminRange').textContent = adminWeekLabel.formatRange?.(start, end)
    ?? `${adminWeekLabel.format(start)} – ${adminWeekLabel.format(end)}`;
}

function adminWeekPicks(week, saved, now) {
  if (!Object.hasOwn(saved, week)) return resolveWeeklyPicks(publishedEvents, week, saved, now, adminSchedule);
  // Keep explicit picks visible and removable when a listing was unpublished or expired.
  return [...new Set(saved[week].map(id => {
    const event = publishedEvents.find(ev => eventSlug(ev) === id || legacyEventSlug(ev) === id);
    return event ? eventSlug(event) : id;
  }))];
}

function canEditPicks(week, now) {
  return week && addCalendarDays(week, 6) >= aucklandToday(now) && eventsState === 'ready' && picksState === 'ready';
}

function applyFilters() {
  const focus = document.activeElement?.dataset;
  syncWeekControls();
  const now = Date.now();
  const picks = selectedWeek ? adminWeekPicks(selectedWeek, savedWeeklyPicks, now) : [];
  if (selectedWeek) renderAdminPicks(picks, now);
  const results = document.getElementById('adminEventResults');
  if (eventsState !== 'ready') {
    results.innerHTML = `<p class="admin-empty" role="status">${eventsState === 'error' ? 'Could not load events from Firestore.' : 'Loading events…'}</p>`;
    return;
  }

  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const region = document.getElementById('regionFilter').value;
  const status = document.getElementById('statusFilter').value;
  const today = aucklandToday(now);
  const weekEnd = selectedWeek && addCalendarDays(selectedWeek, 6);
  const includePast = showPast || (weekEnd && weekEnd < today);
  const groups = new Map();
  for (const ev of allEvents) {
    if (region && ev.region !== region || status === 'active' && !ev.active || status === 'draft' && ev.active) continue;
    if (query && !`${ev.title} ${ev.description || ''} ${ev.venue || ''}`.toLowerCase().includes(query)) continue;
    const schedule = adminSchedule(ev);
    const past = eventIsPast(schedule, now);
    if (past && !includePast) continue;
    const date = selectedWeek
      ? nextEventDate(schedule, includePast || selectedWeek > today ? selectedWeek : today, weekEnd,
        includePast ? aucklandInstant(selectedWeek) : now)
      : nextEventDate(schedule, today, '9999-12-31', now) || eventStartDate(ev);
    if (!date) continue;
    const ongoing = eventScheduleType(ev) === 'ongoing' && !past && schedule.some(period => period.startsAt <= now);
    const group = ongoing ? '' : date;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ ev, date, past });
  }

  const days = [...groups.keys()].sort();
  results.innerHTML = days.length ? days.map(day => {
    const cards = groups.get(day).sort((a, b) => a.ev.title.localeCompare(b.ev.title))
      .map(({ ev, date, past }) => renderAdminCard(ev, date, past, picks, now)).join('');
    const title = day ? adminDayLabel.format(calendarDay(day)) : 'On Now in Wellington';
    return `<section class="admin-event-group" aria-labelledby="admin-day-${day || 'ongoing'}">
      <div class="day-label"><span class="pip"></span><h2 id="admin-day-${day || 'ongoing'}">${title}</h2><span class="line"></span></div>
      <div class="events-grid">${cards}</div>
    </section>`;
  }).join('') : '<p class="admin-empty" role="status">No events match these filters.</p>';
  if (focus?.adminAction) {
    const replacement = [...document.querySelectorAll('[data-admin-action]')].find(button =>
      button.dataset.adminAction === focus.adminAction && button.dataset.eventId === focus.eventId &&
      button.dataset.recordId === focus.recordId && button.dataset.pickLocation === focus.pickLocation);
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    else if (focus.eventId) [...results.querySelectorAll('[data-admin-action="pick"]')]
      .find(button => button.dataset.eventId === focus.eventId && !button.disabled)?.focus({ preventScroll: true });
  }
}

function adminEventImage(ev) {
  const image = typeof ev.img === 'string' ? ev.img : '';
  if (/^images\/[\w./-]+$/.test(image)) {
    const base = '../' + image.replace(/\.(webp|jpe?g|png)$/i, '');
    return `<picture class="admin-event-image"><source srcset="${esc(base)}-thumb.webp" type="image/webp"><img src="${esc(base)}.jpg" alt="" loading="lazy" decoding="async" onerror="this.hidden=true"></picture>`;
  }
  if (/^https?:\/\//i.test(image)) return `<img class="admin-event-image" src="${esc(image)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">`;
  return '<span class="admin-event-image" aria-hidden="true"></span>';
}

function pickButton(id, title, starred, canEdit, location) {
  const label = starred ? 'Remove from Picks' : 'Star for selected week';
  return `<button type="button" class="pick-star" data-admin-action="pick" data-event-id="${esc(id)}"
    data-pick-location="${location}" aria-pressed="${starred}" aria-label="${label} · ${esc(title)}"
    title="${label}"${canEdit ? '' : ' disabled'}${savingPick ? ' aria-disabled="true"' : ''}>${starred ? '★' : '☆'}</button>`;
}

function renderAdminPicks(ids, now) {
  const count = document.getElementById('picksCount');
  count.textContent = `${ids.length} of ${MAX_WEEKLY_PICKS} picks`;
  const status = document.getElementById('picksStatus');
  status.textContent = picksState === 'error' ? 'Could not load Picks from Firestore.'
    : savingPick ? 'Saving Picks…' : picksState === 'loading' || eventsState === 'loading' ? 'Loading Picks…'
    : !ids.length && canEditPicks(selectedWeek, now) ? 'Star an event for this week’s public Picks.' : '';
  document.getElementById('adminPicks').innerHTML = ids.map(id => {
    const event = publishedEvents.find(ev => eventSlug(ev) === id);
    const date = event && eventDateInWeek(adminSchedule(event), selectedWeek, now);
    const title = event?.title || 'Unavailable event';
    return `<li class="admin-pick">
      ${event ? adminEventImage(event) : ''}
      <div class="admin-pick-label"><strong>${esc(title)}</strong><small>${date ? adminDayLabel.format(calendarDay(date)) : 'Unavailable this week'}</small></div>
      ${pickButton(id, title, true, canEditPicks(selectedWeek, now), 'picks')}
    </li>`;
  }).join('');
}

function renderAdminCard(ev, date, past, picks, now) {
  const id = eventSlug(ev);
  const label = EVENT_CATEGORIES[eventCategory(ev)];
  const price = eventPrice(ev, adminCurated);
  const starred = ev.active && picks.includes(id);
  const showStar = Boolean(selectedWeek && ev.active && !past);
  const activeBadge = ev.active ? ev._static ? 'Catalogue' : 'Published' : 'Draft';
  const state = past ? 'Past' : activeBadge;
  const badgeStyle = past ? 'past' : ev.active ? 'active' : 'draft';
  const action = name => `data-admin-action="${name}" data-record-id="${esc(ev.id)}"`;
  const range = eventScheduleRange(adminSchedule(ev));
  const until = eventScheduleType(ev) === 'ongoing' && range?.end;
  const dateText = until ? `On until ${adminWeekLabel.format(calendarDay(until))}`
    : adminDayLabel.format(calendarDay(date));
  const title = ev.active ? `<a href="../?e=${encodeURIComponent(id)}">${esc(ev.title)}</a>` : esc(ev.title);
  return `<article class="card revealed open admin-event-card${starred ? ' card-featured' : ''}${showStar ? ' has-star' : ''}">
    <div class="admin-event-media">${adminEventImage(ev)}</div>
    ${showStar ? pickButton(id, ev.title, starred, canEditPicks(selectedWeek, now), 'card') : ''}
    <div class="card-body">
      <div class="admin-card-labels"><span class="card-cat">${label}</span><span class="badge badge-${badgeStyle}">${state}</span>${priceBadge(price.tier, price.estimated)}</div>
      <h3 class="card-title">${title}</h3>
      <div class="card-meta">
        <span class="meta-row">${esc(dateText)}</span>
        ${ev.time ? `<span class="meta-row">${esc(ev.time)}</span>` : ''}
        ${ev.venue ? `<span class="meta-row">${esc(ev.venue)}</span>` : ''}
      </div>
    </div>
    <div class="card-footer">
      <button type="button" class="action-btn edit" ${action('edit')}>Edit</button>
      <button type="button" class="action-btn delete" ${action('delete')}>${ev._static ? 'Remove' : 'Delete'}</button>
    </div>
  </article>`;
}

async function toggleWeeklyPick(id) {
  const week = selectedWeek;
  const now = Date.now();
  if (savingPick || !canEditPicks(week, now)) return;
  const current = adminWeekPicks(week, savedWeeklyPicks, now);
  const add = !current.includes(id);
  const event = publishedEvents.find(ev => eventSlug(ev) === id);
  if (add && (!event || !eventDateInWeek(adminSchedule(event), week, now))) return;
  if (add && current.length >= MAX_WEEKLY_PICKS) {
    showToast(`Remove a Pick before adding another. A week can have ${MAX_WEEKLY_PICKS} Picks.`);
    return;
  }

  savingPick = true;
  const session = dashboardSession;
  applyFilters();
  const config = db.collection('siteConfig').doc('about');
  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(config);
      const ids = adminWeekPicks(week, readWeeklyPicks(snapshot.data()?.weeklyPicks), now);
      const next = add ? [...new Set([...ids, id])] : ids.filter(key => key !== id);
      if (next.length > MAX_WEEKLY_PICKS) throw new Error(`This week already has ${MAX_WEEKLY_PICKS} Picks.`);
      // Merge only this week, keeping the About text and other weeks intact.
      transaction.set(config, { weeklyPicks: { [week]: next } }, { merge: true });
    });
    if (session === dashboardSession) showToast(add ? 'Added to this week’s Picks.' : 'Removed from this week’s Picks.');
  } catch (err) {
    if (session === dashboardSession) showToast('Could not save Picks. ' + err.message);
  } finally {
    if (session === dashboardSession) {
      savingPick = false;
      applyFilters();
    }
  }
}

document.getElementById('dashboard').addEventListener('click', event => {
  const button = event.target.closest('button[data-admin-action]');
  if (!button || button.getAttribute('aria-disabled') === 'true') return;
  const { adminAction, eventId, recordId } = button.dataset;
  if (adminAction === 'pick') {
    toggleWeeklyPick(eventId);
    return;
  }
  const record = allEvents.find(ev => ev.id === recordId);
  if (!record) return;
  if (adminAction === 'edit') {
    if (record._static) editStaticEvent(record._staticId, button);
    else openModal(record.id);
  } else if (adminAction === 'delete') {
    openDeleteModal(record._static ? null : record.id, record.title, record._static ? record._staticId : null);
  }
});

// ── Modal (add / edit) ─────────────────────────────────────────────────────────
function syncScheduleForm() {
  const type = document.getElementById('fScheduleType').value;
  document.getElementById('fOperatingDays').hidden = type === 'one-off';
  document.getElementById('fOccurrenceRow').hidden = type !== 'recurring' && type !== 'ongoing';
  document.getElementById('fEndDate').required = type === 'multi-day';
}

function occurrenceDate(session) {
  return typeof session === 'string' ? session : session && eventStartDate(session);
}

function inputClock(value) {
  const clock = eventClock(value);
  return clock === '24:00:00' ? '00:00' : clock.slice(0, 5);
}

function openModal(docId) {
  editingDocId = docId || null;
  const title  = document.getElementById('modalTitle');
  const btn    = document.getElementById('submitBtn');
  const form   = document.getElementById('eventForm');
  form.reset();

  if (docId) {
    const ev = allEvents.find(e => e.id === docId);
    if (!ev) return;
    title.textContent  = 'Edit Event';
    btn.textContent    = 'Save Changes';
    document.getElementById('fTitle').value    = ev.title    || '';
    document.getElementById('fDesc').value     = ev.description || '';
    document.getElementById('fType').value     = ev.type     || '';
    document.getElementById('fDate').value     = eventStartDate(ev);
    document.getElementById('fScheduleType').value = eventScheduleType(ev);
    const start = readEventDateTime(ev.start);
    const end = readEventDateTime(ev.end);
    document.getElementById('fEndDate').value  = end?.date || ev.endDate || '';
    document.getElementById('fStartTime').value = inputClock(start?.time || ev.startTime);
    document.getElementById('fEndTime').value   = inputClock(end?.time || ev.endTime);
    const days = ev.daysOfOperation?.length ? ev.daysOfOperation : ev.daily ? EVENT_WEEKDAYS : [];
    document.querySelectorAll('#fOperatingDays input').forEach(input => { input.checked = days.includes(input.value); });
    document.getElementById('fOccurrences').value = [...new Set((ev.occurrences || []).map(occurrenceDate).filter(Boolean))].sort().join('\n');
    document.getElementById('fRegion').value   = ev.region   || '';
    document.getElementById('fTags').value     = (ev.tags || []).join(', ');
    document.getElementById('fVenue').value    = ev.venue    || '';
    document.getElementById('fTime').value     = ev.time     || '';
    document.getElementById('fUrl').value      = ev.url      || '';
    document.getElementById('fImg').value      = ev.img      || '';
    document.getElementById('fPriceTier').value = ev.priceTier || '';
    document.getElementById('fPriceEstimated').checked = ev.priceEstimated === true;
    document.getElementById('fActive').checked = ev.active !== false;
    updateImgPreview();
    document.getElementById('fPick').checked   = ev.pick   || false;
    document.getElementById('fPickWeek').value = ev.pickWeek || '';
    document.getElementById('fIndoor').checked = ev.indoor || false;
    document.getElementById('fCategory').value = ev.category || '';
  } else {
    title.textContent = 'Add Event';
    btn.textContent   = 'Save Event';
    document.getElementById('fActive').checked = true;
    document.getElementById('fIndoor').checked = false;
    document.getElementById('fCategory').value = '';
    updateImgPreview();
  }

  syncScheduleForm();
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('fTitle').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingDocId = null;
  // Reset image upload UI
  revokeDownloadUrls();
  document.getElementById('imgProcessed').classList.add('hidden');
  document.getElementById('imgProcessedInfo').textContent = '';
  document.getElementById('imgProcessedDownloads').innerHTML = '';
  document.getElementById('uploadStatus').textContent = '';
  document.getElementById('uploadStatus').className = 'upload-status';
  document.getElementById('fIndoor').checked = false;
}

// ── Image upload / preview (client-side processing) ─────────────────────────

// Slug matching the main site + venue slug convention
function imageSlug(str) {
  return str.toLowerCase()
    .replace(/[āáàä]/g, 'a').replace(/[ōóò]/g, 'o')
    .replace(/[ūúù]/g, 'u').replace(/[īíì]/g, 'i').replace(/[ēé]/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function setUploadStatus(msg, cls) {
  const el = document.getElementById('uploadStatus');
  el.textContent = msg;
  el.className   = 'upload-status' + (cls ? ' ' + cls : ' uploading');
}

// HEIC/HEIF files from iPhones can't be decoded by the browser canvas API
function isHeicFile(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase();
  return file.type === 'image/heic' || file.type === 'image/heif' ||
         ext === 'heic' || ext === 'heif';
}

// Load a File into an HTMLImageElement.
// Rejects with a clear message if loading fails or times out.
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url     = URL.createObjectURL(file);
    const img     = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    const timer   = setTimeout(() => {
      cleanup();
      reject(new Error('Image load timed out — file may be corrupted or in an unsupported format.'));
    }, 8000);
    img.onload = () => { clearTimeout(timer); cleanup(); resolve(img); };
    img.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('Could not decode this image. Try converting it to JPG first.'));
    };
    img.src = url;
  });
}

// Draw img to a canvas at targetW pixels wide (never upscale)
function resizeToCanvas(img, targetW) {
  const w = Math.min(img.naturalWidth, targetW);
  const h = Math.round(w / (img.naturalWidth / img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

// canvas.toBlob wrapped in a Promise with:
//   • JPEG fallback when the requested type returns null/empty (e.g. WebP on old Safari)
//   • 6-second timeout so the Promise can't hang if the callback never fires
function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() =>
      reject(new Error('canvas.toBlob timed out — try a different image or browser.')), 6000);
    try {
      canvas.toBlob(blob => {
        clearTimeout(timer);
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          // Format unsupported (e.g. WebP on older iOS Safari) — fall back to JPEG
          canvas.toBlob(fb => {
            fb && fb.size > 0
              ? resolve(fb)
              : reject(new Error('canvas.toBlob returned empty — please try a JPG or PNG source.'));
          }, 'image/jpeg', quality);
        }
      }, type, quality);
    } catch (e) {
      clearTimeout(timer);
      // toBlob threw synchronously (very old browsers)
      canvas.toBlob(fb => resolve(fb), 'image/jpeg', quality);
    }
  });
}

// Revoke any previously created object URLs to avoid memory leaks
let _pendingDownloadUrls = [];
function revokeDownloadUrls() {
  _pendingDownloadUrls.forEach(u => URL.revokeObjectURL(u));
  _pendingDownloadUrls = [];
}

function handleImageDrop(event) {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  handleImageUpload({ files: [file] });
}

async function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof input.value === 'string') input.value = ''; // reset so same file can be reselected

  revokeDownloadUrls();
  document.getElementById('imgProcessed').classList.add('hidden');
  document.getElementById('imgPreviewWrap').classList.add('hidden');

  // ── HEIC guard ───────────────────────────────────────────────────────────
  if (isHeicFile(file)) {
    setUploadStatus(
      '⚠ HEIC photos can\'t be processed here. On iPhone: open the photo → Share → "Save Image", then upload the saved JPEG.',
      'error'
    );
    return;
  }

  // ── Overall timeout (covers processing + upload) ──────────────────────────
  let timedOut = false;
  const overallTimer = setTimeout(() => {
    timedOut = true;
    setUploadStatus(
      'This is taking longer than expected. Try a smaller image or check your connection.',
      'error'
    );
  }, 40000);

  try {
    // Stage 1: decode
    setUploadStatus('Reading file…');
    const img = await loadImageFile(file);
    if (timedOut) return;

    if (img.naturalWidth < 800) {
      setUploadStatus(`⚠ Source is ${img.naturalWidth} × ${img.naturalHeight}px — ideally ≥ 800px. Processing anyway…`);
      await new Promise(r => setTimeout(r, 700));
    }
    if (timedOut) return;

    // Stage 2: resize
    setUploadStatus('Resizing…');
    const cardCanvas  = resizeToCanvas(img, 800);
    const thumbCanvas = resizeToCanvas(img, 400);
    if (timedOut) return;

    // Stage 3: compress
    setUploadStatus('Compressing…');
    const [cardWebp, thumbWebp, cardJpeg] = await Promise.all([
      canvasBlob(cardCanvas,  'image/webp', 0.82),
      canvasBlob(thumbCanvas, 'image/webp', 0.80),
      canvasBlob(cardCanvas,  'image/jpeg', 0.82),
    ]);
    if (timedOut) return;

    // Slug from event title or filename
    const titleVal = document.getElementById('fTitle').value.trim();
    const rawName  = titleVal || file.name.replace(/\.[^.]+$/, '');
    const slug     = imageSlug(rawName);

    // Stage 4: upload processed JPEG to Firebase Storage
    // (using the processed blob — smaller file, no EXIF, consistent format)
    setUploadStatus('Uploading…');
    let storageUrl  = null;
    let storageErrMsg = null;
    try {
      storageUrl = await uploadToStorage(cardJpeg, slug);
    } catch (storageErr) {
      // Translate Firebase error codes into actionable messages
      const code = storageErr.code || '';
      if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
        storageErrMsg = `Permission denied (${code}). Open Firebase Console → Storage → Rules and allow authenticated writes to event-images/.`;
      } else if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
        storageErrMsg = `Bucket not found (${code}). Check storageBucket in admin.js config.`;
      } else if (code === 'storage/canceled') {
        storageErrMsg = 'Upload timed out after 25 s — check connection.';
      } else {
        // Likely a CORS or network error — show raw message
        storageErrMsg = storageErr.message || code || 'Unknown Storage error';
      }
      console.warn('Firebase Storage upload failed:', code, storageErr.message);
    }
    if (timedOut) return;

    clearTimeout(overallTimer);

    // ── Preview from the local blob ───────────────────────────────────────
    const previewUrl = URL.createObjectURL(cardWebp);
    _pendingDownloadUrls.push(previewUrl);
    document.getElementById('imgPreview').src = previewUrl;
    document.getElementById('imgPreviewWrap').classList.remove('hidden');

    if (storageUrl) {
      // ── Happy path: Storage URL saved directly ──────────────────────────
      document.getElementById('fImg').value = storageUrl;
      setUploadStatus('✓ Done', 'success');
    } else {
      // ── Fallback: show download buttons for manual git commit ───────────
      const localPath = `images/events/${slug}`;
      document.getElementById('fImg').value = localPath;

      const gotWebp = cardWebp.type === 'image/webp';
      const kb = b => (b.size / 1024).toFixed(0) + ' KB';
      document.getElementById('imgProcessedInfo').textContent =
        `Storage upload failed. Download and commit to images/events/\n`
        + `${localPath}  ·  card ${kb(cardWebp)}  ·  thumb ${kb(thumbWebp)}  ·  jpg ${kb(cardJpeg)}`
        + (gotWebp ? '' : '  (files are JPEG — WebP not supported by this browser)');

      const downloads = [
        { blob: cardWebp,  name: `${slug}.webp`,       label: '⬇ card.webp' },
        { blob: thumbWebp, name: `${slug}-thumb.webp`, label: '⬇ thumb.webp' },
        { blob: cardJpeg,  name: `${slug}.jpg`,        label: '⬇ card.jpg' },
      ];
      const dlEl = document.getElementById('imgProcessedDownloads');
      dlEl.innerHTML = '';
      for (const { blob, name, label } of downloads) {
        const url = URL.createObjectURL(blob);
        _pendingDownloadUrls.push(url);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.textContent = label;
        a.className = 'img-download-btn';
        dlEl.appendChild(a);
      }
      document.getElementById('imgProcessed').classList.remove('hidden');
      setUploadStatus(`⚠ Storage error: ${storageErrMsg}`, 'error');
    }
  } catch (err) {
    clearTimeout(overallTimer);
    if (!timedOut) setUploadStatus('Error: ' + err.message, 'error');
  }
}

// Upload a blob to Firebase Storage and return the download URL.
// Rejects if the upload doesn't complete within 25 seconds.
// onProgress(msg) is optional — defaults to setUploadStatus for the events modal.
function uploadToStorage(blob, slug, onProgress) {
  return new Promise((resolve, reject) => {
    const filename = slug + '-' + Date.now() + '.jpg';
    const ref  = storage.ref('event-images/' + filename);
    const task = ref.put(blob, { contentType: 'image/jpeg' });

    const timer = setTimeout(() => {
      task.cancel();
      reject(new Error('Upload timed out after 25 s'));
    }, 25000);

    task.on('state_changed',
      snap => {
        const pct = Math.round((snap.bytesTransferred / (snap.totalBytes || 1)) * 100);
        const msg = `Uploading… ${pct}%`;
        if (onProgress) onProgress(msg); else setUploadStatus(msg);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
      async () => {
        clearTimeout(timer);
        try {
          const url = await task.snapshot.ref.getDownloadURL();
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

function updateImgPreview() {
  const val  = document.getElementById('fImg').value.trim();
  const wrap = document.getElementById('imgPreviewWrap');
  const img  = document.getElementById('imgPreview');
  if (val) {
    // For local paths show a placeholder (can't preview repo files from admin);
    // for full URLs show normally.
    img.src = val.startsWith('images/') ? (val + '.jpg') : val;
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
    img.src = '';
  }
}

function clearImg() {
  revokeDownloadUrls();
  document.getElementById('fImg').value = '';
  document.getElementById('imgPreviewWrap').classList.add('hidden');
  document.getElementById('imgPreview').src = '';
  document.getElementById('imgProcessed').classList.add('hidden');
  document.getElementById('imgProcessedInfo').textContent = '';
  document.getElementById('imgProcessedDownloads').innerHTML = '';
  document.getElementById('uploadStatus').textContent = '';
  document.getElementById('uploadStatus').className = 'upload-status';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn  = document.getElementById('submitBtn');
  const tags = document.getElementById('fTags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const date = document.getElementById('fDate').value;
  if (!isCalendarDate(date)) {
    showToast('Choose an event date.');
    return;
  }
  const existing = allEvents.find(ev => ev.id === editingDocId);
  const scheduleType = document.getElementById('fScheduleType').value;
  const startTime = document.getElementById('fStartTime').value;
  const endDate = document.getElementById('fEndDate').value;
  const endTime = document.getElementById('fEndTime').value;
  if ((endDate && endDate < date) || (scheduleType === 'multi-day' && endDate <= date)) {
    showToast(scheduleType === 'multi-day' ? 'Choose an end date after the start date.' : 'The end date must be on or after the start date.');
    return;
  }
  const daysOfOperation = scheduleType === 'one-off' ? [] : [...document.querySelectorAll('#fOperatingDays input:checked')].map(input => input.value);
  const rawDates = ['recurring', 'ongoing'].includes(scheduleType) ? document.getElementById('fOccurrences').value.trim() : '';
  const sessionDates = rawDates ? [...new Set(rawDates.split(/[\s,]+/))].sort() : [];
  if (sessionDates.some(day => !isCalendarDate(day) || day < date || (endDate && day > endDate))) {
    showToast('Use YYYY-MM-DD session dates within the event’s date range.');
    return;
  }
  const existingSessions = Array.isArray(existing?.occurrences) ? existing.occurrences : [];
  const occurrences = sessionDates.flatMap(day => {
    const sessions = existingSessions.filter(session => occurrenceDate(session) === day);
    return sessions.length ? sessions : [day];
  });
  const previousStart = readEventDateTime(existing?.start);
  const previousEnd = readEventDateTime(existing?.end);
  const sameStart = existing && eventStartDate(existing) === date;
  const { day, weekend } = isCalendarDate(existing?.weekend) && sameStart
    ? existing : dateToWeekend(date);
  const pick = document.getElementById('fPick').checked;
  const pickDate = document.getElementById('fPickWeek').value;
  const priceTier = document.getElementById('fPriceTier').value;
  const data = {
    title:       document.getElementById('fTitle').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    type:        document.getElementById('fType').value,
    date:        sameStart ? eventDate(existing) : date,
    day,
    weekend,
    scheduleType,
    startTime:   existing?.startTime && startTime === inputClock(existing.startTime) ? existing.startTime : startTime,
    endDate,
    endTime:     existing?.endTime && endTime === inputClock(existing.endTime) ? existing.endTime : endTime,
    daily:       false,
    daysOfOperation,
    occurrences,
    region:      document.getElementById('fRegion').value,
    tags,
    venue:       document.getElementById('fVenue').value.trim(),
    time:        document.getElementById('fTime').value.trim(),
    url:         document.getElementById('fUrl').value.trim(),
    img:         document.getElementById('fImg').value.trim(),
    active:      document.getElementById('fActive').checked,
    pick,
    pickWeek:    pick && isCalendarDate(pickDate) ? eventWeekStart(pickDate) : '',
    indoor:      document.getElementById('fIndoor').checked || false,
    category:    document.getElementById('fCategory').value,
    priceTier,
    priceEstimated: priceTier !== '' && document.getElementById('fPriceEstimated').checked,
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (previousStart && (!sameStart || startTime !== inputClock(previousStart.time || existing.startTime))) data.start = date;
  if (previousEnd && (endDate !== previousEnd.date || endTime !== inputClock(previousEnd.time || existing.endTime))) data.end = '';
  if (scheduleType === 'one-off' && existing?.openingHours) data.openingHours = null;
  if (!eventSchedule({ ...existing, ...data }).length) {
    showToast('Choose at least one operating date within the event’s date range.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    if (editingDocId) {
      if (existing) data.publicId = eventSlug(existing);
      await db.collection('events').doc(editingDocId).update(data);
      showToast('Event updated.');
    } else {
      await createEvent(data);
      showToast('Event added.');
    }
    closeModal();
  } catch (err) {
    showToast('Save failed: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = editingDocId ? 'Save Changes' : 'Save Event';
  }
}

async function createEvent(data) {
  const ref = db.collection('events').doc();
  await ref.set({
    ...data,
    publicId: `event-${ref.id}`,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// ── Delete ─────────────────────────────────────────────────────────────────────
function openDeleteModal(docId, title, staticId = null) {
  deletingDocId    = docId;
  deletingTitle    = title;
  deletingStaticId = staticId ?? null;
  const msg = document.querySelector('#deleteOverlay .delete-msg');
  if (msg) {
    if (deletingStaticId !== null) {
      msg.innerHTML = `Remove <strong>${esc(title)}</strong> from the site?`;
    } else {
      msg.innerHTML = `Are you sure you want to delete <strong>${esc(title)}</strong>? This cannot be undone.`;
    }
  }
  document.getElementById('deleteOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteOverlay').classList.add('hidden');
  deletingDocId    = null;
  deletingTitle    = '';
  deletingStaticId = null;
}

function handleDeleteOverlayClick(e) {
  if (e.target === document.getElementById('deleteOverlay')) closeDeleteModal();
}

async function confirmDelete() {
  if (deletingStaticId !== null) {
    if (typeof STATIC_EVENTS === 'undefined') { closeDeleteModal(); return; }
    const ev = STATIC_EVENTS[deletingStaticId];
    if (!ev) { closeDeleteModal(); return; }
    const key = legacyEventKey(ev);
    try {
      await db.collection('settings').doc('hiddenStatics').set(
        { keys: firebase.firestore.FieldValue.arrayUnion(key) },
        { merge: true }
      );
      hiddenStaticKeys.add(key);
      allEvents = allEvents.filter(e => !(e._static && e._staticId === deletingStaticId));
      publishedEvents = publishedEvents.filter(e => !(e._static && e._staticId === deletingStaticId));
      showToast(`"${deletingTitle}" removed.`);
      closeDeleteModal();
      applyFilters();
    } catch (err) {
      showToast('Error: ' + err.message);
    }
    return;
  }
  if (!deletingDocId) return;
  try {
    await db.collection('events').doc(deletingDocId).delete();
    showToast(`"${deletingTitle}" deleted.`);
    closeDeleteModal();
  } catch (err) {
    showToast('Delete failed: ' + err.message);
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Bulk import (uses STATIC_EVENTS from js/events-data.js) ──────────────────
async function bulkImportDraftEvents() {
  if (typeof STATIC_EVENTS === 'undefined' || !STATIC_EVENTS.length) {
    showToast('STATIC_EVENTS not available — check events-data.js is loaded');
    return;
  }
  const btn = document.getElementById('importBtn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  try {
    const existing = await db.collection('events').get();
    let created = 0;
    let skipped = 0;

    for (const ev of STATIC_EVENTS) {
      const key = (ev.title || '').trim().toLowerCase();
      const isDupe = existing.docs.some(d => {
        const data = d.data();
        return eventSlug(data) === eventSlug(ev) || ((data.title || '').trim().toLowerCase() === key &&
               (eventDate(data) === eventDate(ev) ||
                 (!data.date && data.weekend === ev.weekend && data.day === ev.day)));
      });

      if (isDupe) { skipped++; continue; }

      await db.collection('events').add({
        title:       ev.title,
        description: ev.description || '',
        type:        ev.type        || 'other',
        ...adminEventSchedule(ev),
        region:      ev.region      || 'wellington',
        venue:       ev.venue       || '',
        time:        ev.time        || '',
        url:         ev.url         || '',
        img:         ev.img         || '',
        pick:        ev.pick        || false,
        indoor:      ev.indoor      || false,
        category:    ev.category    || '',
        priceTier:   ev.priceTier    || '',
        priceEstimated: ev.priceEstimated === true,
        tags:        [],
        active:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      created++;
    }

    btn.textContent = '✓ Done';
    showToast(`${created} draft event${created !== 1 ? 's' : ''} imported${skipped ? `, ${skipped} skipped (already exist)` : ''}.`);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '⬇ Import drafts';
    showToast('Import failed: ' + err.message);
  }
}

async function editStaticEvent(staticId, btn) {
  if (typeof STATIC_EVENTS === 'undefined') return;
  const ev = STATIC_EVENTS[staticId];
  if (!ev) return;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    // Check local allEvents first (already synced from Firestore) to avoid a query
    const titleKey = (ev.title || '').trim().toLowerCase();
    const existing = allEvents.find(e =>
      !e._static && (eventSlug(e) === eventSlug(ev) || (
      (e.title || '').trim().toLowerCase() === titleKey &&
      (eventDate(e) === eventDate(ev) ||
        (!e.date && e.weekend === ev.weekend && e.day === ev.day))))
    );
    let docId;
    if (existing) {
      docId = existing.id;
    } else {
      const ref = await db.collection('events').add({
        title:       ev.title,
        description: ev.description || '',
        type:        ev.type        || 'other',
        ...adminEventSchedule(ev),
        region:      ev.region      || 'wellington',
        venue:       ev.venue       || '',
        time:        ev.time        || '',
        url:         ev.url         || '',
        img:         ev.img         || '',
        pick:        ev.pick        || false,
        indoor:      ev.indoor      || false,
        category:    ev.category    || '',
        priceTier:   ev.priceTier    || '',
        priceEstimated: ev.priceEstimated === true,
        tags:        [],
        active:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      docId = ref.id;
      if (!allEvents.some(event => event.id === docId)) {
        allEvents.push({ ...ev, ...adminEventSchedule(ev), id: docId, _static: false, active: false, tags: [] });
      }
    }
    btn.disabled = false;
    btn.textContent = 'Edit';
    openModal(docId);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Edit';
    showToast('Error: ' + err.message);
  }
}
// ── JSON paste import ──────────────────────────────────────────────────────────
function toggleJsonPanel(btn) {
  const body = document.getElementById('jsonPanelBody');
  const nowHidden = body.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', nowHidden ? 'false' : 'true');
}

// Given a YYYY-MM-DD date string, return the Saturday `weekend` key and `day`
function dateToWeekend(dateStr) {
  const day = EVENT_WEEKDAYS[calendarDay(dateStr).getUTCDay()];
  return { weekend: addCalendarDays(dateStr, -EVENT_DAY_OFFSETS[day]), day };
}

function adminEventSchedule(ev) {
  const date = eventDate(ev);
  const legacy = isCalendarDate(ev.weekend) ? { weekend: ev.weekend, day: ev.day || 'sat' }
    : date ? dateToWeekend(date) : { weekend: '', day: 'sat' };
  return { ...eventScheduleFields(ev), publicId: eventSlug(ev), date, ...legacy };
}

async function importFromJSON() {
  const btn      = document.getElementById('jsonImportBtn');
  const resultEl = document.getElementById('jsonImportResult');
  const raw      = document.getElementById('jsonInput').value.trim();

  resultEl.textContent = '';
  resultEl.className   = 'json-import-result';

  if (!raw) {
    resultEl.textContent = 'Paste some JSON first.';
    resultEl.classList.add('json-import-error');
    return;
  }

  // Parse
  let events;
  try {
    const parsed = JSON.parse(raw);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    resultEl.textContent = 'Invalid JSON: ' + err.message;
    resultEl.classList.add('json-import-error');
    return;
  }

  // Validate required fields
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev || typeof ev.title !== 'string' || !ev.title.trim()) {
      resultEl.textContent = `Event ${i + 1}: missing or invalid "title".`;
      resultEl.classList.add('json-import-error');
      return;
    }
    if (!isCalendarDate(ev.date)) {
      resultEl.textContent = `Event ${i + 1}: "date" must be YYYY-MM-DD (got "${ev.date}").`;
      resultEl.classList.add('json-import-error');
      return;
    }
    const start = eventStartDate(ev);
    const end = eventEndDate(ev);
    const invalidDays = ev.daysOfOperation != null && (!Array.isArray(ev.daysOfOperation) ||
      ev.daysOfOperation.some(day => !EVENT_WEEKDAYS.includes(day)));
    const invalidSessions = ev.occurrences != null && (!Array.isArray(ev.occurrences) || ev.occurrences.some(session => {
      const day = occurrenceDate(session);
      return !isCalendarDate(day) || day < start || (end && day > end);
    }));
    if ((ev.scheduleType && !EVENT_SCHEDULE_TYPES.includes(ev.scheduleType)) || (ev.endDate && !isCalendarDate(ev.endDate)) ||
        (end && end < start) || (ev.scheduleType === 'multi-day' && end <= start) || invalidDays || invalidSessions ||
        (ev.startTime && !eventClock(ev.startTime)) || (ev.endTime && !eventClock(ev.endTime)) || !eventSchedule(ev).length) {
      resultEl.textContent = `Event ${i + 1}: check the schedule type, dates, times and operating days.`;
      resultEl.classList.add('json-import-error');
      return;
    }
  }

  btn.disabled    = true;
  btn.textContent = 'Creating…';

  let created = 0;
  try {
    for (const ev of events) {
      const { weekend, day } = dateToWeekend(ev.date);
      await createEvent({
        title:       String(ev.title).trim(),
        description: String(ev.description || '').trim(),
        type:        'other',
        ...eventScheduleFields(ev),
        date:        ev.date,
        day,
        weekend,
        region:      'wellington',
        venue:       String(ev.location || '').trim(),
        time:        String(ev.time || '').trim(),
        url:         '',
        img:         '',
        tags:        [],
        active:      false,
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      created++;
    }
    resultEl.textContent = `✓ ${created} draft event${created !== 1 ? 's' : ''} created. Edit in the table above to set type and region.`;
    resultEl.classList.add('json-import-success');
    document.getElementById('jsonInput').value = '';
  } catch (err) {
    resultEl.textContent = 'Save failed: ' + err.message;
    resultEl.classList.add('json-import-error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create Draft';
  }
}

// ── About section editor ───────────────────────────────────────────────────────
function toggleAboutPanel(btn) {
  const body = document.getElementById('aboutPanelBody');
  const nowHidden = body.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', nowHidden ? 'false' : 'true');
}

function loadAbout() {
  db.collection('siteConfig').doc('about').get().then(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    if (d.para1) document.getElementById('aPara1').value = d.para1;
    if (d.para2) document.getElementById('aPara2').value = d.para2;
    if (d.para3) document.getElementById('aPara3').value = d.para3;
  }).catch(err => showToast('Could not load about: ' + err.message));
}

async function saveAbout() {
  const btn = document.getElementById('saveAboutBtn');
  const data = {
    para1: document.getElementById('aPara1').value.trim(),
    para2: document.getElementById('aPara2').value.trim(),
    para3: document.getElementById('aPara3').value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!data.para1 && !data.para2 && !data.para3) {
    showToast('Nothing to save — fill in at least one paragraph.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await db.collection('siteConfig').doc('about').set(data, { merge: true });
    showToast('About section updated.');
  } catch (err) {
    showToast('Save failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save About';
  }
}
