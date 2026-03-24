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
let filteredEvents  = [];
let editingDocId    = null;
let deletingDocId   = null;
let deletingTitle   = '';
let unsubscribeSnap = null;
let showPast        = false;
let firstLoad       = true;

// True from Monday 00:00 after the weekend
function weekendIsPast(satDateStr) {
  if (!satDateStr) return false;
  const monday = new Date(satDateStr + 'T00:00:00');
  monday.setDate(monday.getDate() + 2);
  monday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= monday;
}

function toggleShowPast(btn) {
  showPast = !showPast;
  btn.textContent = showPast ? 'Hide past' : 'Show past';
  applyFilters();
}

async function deletePastEvents(btn) {
  const past = allEvents.filter(e => !e._static && weekendIsPast(e.weekend));
  if (!past.length) { showToast('No past events to delete'); return; }
  if (!confirm(`Delete ${past.length} past event${past.length === 1 ? '' : 's'} from Firestore?`)) return;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const batch = db.batch();
    past.forEach(e => batch.delete(db.collection('events').doc(e.id)));
    await batch.commit();
    showToast(`${past.length} past event${past.length === 1 ? '' : 's'} deleted`);
  } catch (err) {
    showToast('Delete failed: ' + err.message);
  }
  btn.disabled = false;
  btn.textContent = '🗑 Delete past';
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
  if (unsubscribeSnap) { unsubscribeSnap(); unsubscribeSnap = null; }
  auth.signOut();
}

function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('adminEmail').textContent = user.email;
  subscribeToEvents();
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
    set('fDay',     p.get('day'));
    set('fWeekend', p.get('weekend'));
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

// ── Firestore real-time listener ───────────────────────────────────────────────
function subscribeToEvents() {
  if (unsubscribeSnap) unsubscribeSnap();
  unsubscribeSnap = db.collection('events')
    .onSnapshot(snapshot => {
      allEvents = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const w = (a.weekend || '').localeCompare(b.weekend || '');
          return w !== 0 ? w : (a.title || '').localeCompare(b.title || '');
        });

      // Merge in STATIC_EVENTS not yet imported to Firestore
      if (typeof STATIC_EVENTS !== 'undefined' && STATIC_EVENTS.length) {
        const firestoreKeys = new Set(
          allEvents.map(e => `${(e.title || '').trim()}|${e.weekend || ''}|${e.day || 'sat'}`)
        );
        STATIC_EVENTS.forEach((ev, i) => {
          const key = `${(ev.title || '').trim()}|${ev.weekend || ''}|${ev.day || 'sat'}`;
          if (!firestoreKeys.has(key)) {
            allEvents.push({ ...ev, id: `static-${i}`, _static: true, _staticId: i, active: true });
          }
        });
        allEvents.sort((a, b) => {
          const w = (a.weekend || '').localeCompare(b.weekend || '');
          return w !== 0 ? w : (a.title || '').localeCompare(b.title || '');
        });
      }

      updateStats();
      populateWeekendFilter();
      if (firstLoad) {
        firstLoad = false;
        const upcoming = allEvents.map(e => e.weekend).filter(w => w && !weekendIsPast(w)).sort()[0];
        if (upcoming) document.getElementById('weekendFilter').value = upcoming;
      }
      applyFilters();
    }, err => {
      console.error('Firestore error:', err);
      document.getElementById('eventTableBody').innerHTML =
        `<tr class="table-empty"><td colspan="6" style="color:#c00">
          Firestore error: ${err.message}<br>
          <small>Check browser console and Firebase security rules.</small>
        </td></tr>`;
    });
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function updateStats() {
  const fsEvents  = allEvents.filter(e => !e._static);
  const stEvents  = allEvents.filter(e => e._static);
  const active    = fsEvents.filter(e => e.active).length;
  const draft     = fsEvents.filter(e => !e.active).length;
  const weekends  = new Set(allEvents.map(e => e.weekend)).size;
  document.getElementById('statTotal').textContent    = fsEvents.length + (stEvents.length ? ` (+${stEvents.length} static)` : '');
  document.getElementById('statActive').textContent   = active;
  document.getElementById('statDraft').textContent    = draft + (stEvents.length ? ` (+${stEvents.length} static)` : '');
  document.getElementById('statWeekends').textContent = weekends;
}

// ── Weekend filter population ──────────────────────────────────────────────────
function populateWeekendFilter() {
  const sel     = document.getElementById('weekendFilter');
  const current = sel.value;
  const weekends = [...new Set(allEvents.map(e => e.weekend).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All weekends</option>' +
    weekends.map(w => `<option value="${w}" ${w === current ? 'selected' : ''}>${formatWeekend(w)}</option>`).join('');
}

function formatWeekend(isoSat) {
  if (!isoSat) return isoSat;
  const sat = new Date(isoSat + 'T00:00:00');
  const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
  const fmt = (d, showMonth) => {
    const day = d.getDate();
    const mon = d.toLocaleString('en-NZ', { month: 'short' });
    return showMonth ? `${day} ${mon}` : `${day}`;
  };
  const sameMon = sat.getMonth() === sun.getMonth();
  return sameMon ? `${fmt(sat, false)}–${fmt(sun, true)}` : `${fmt(sat, true)}–${fmt(sun, true)}`;
}

// ── Filters & render ──────────────────────────────────────────────────────────
function applyFilters() {
  const q       = document.getElementById('searchInput').value.trim().toLowerCase();
  const weekend = document.getElementById('weekendFilter').value;
  const region  = document.getElementById('regionFilter').value;
  const status  = document.getElementById('statusFilter').value;

  filteredEvents = allEvents.filter(ev => {
    if (!showPast && weekendIsPast(ev.weekend)) return false;
    if (weekend && ev.weekend !== weekend) return false;
    if (region  && ev.region  !== region)  return false;
    if (status === 'active' && !ev.active)  return false;
    if (status === 'draft'  && ev.active)   return false;
    if (q && !`${ev.title} ${ev.description || ''} ${ev.venue || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('eventTableBody');
  if (!filteredEvents.length) {
    tbody.innerHTML = '<tr class="table-empty"><td colspan="6">No events found.</td></tr>';
    return;
  }
  tbody.innerHTML = filteredEvents.map(ev => `
    <tr${ev._static ? ' style="background:#fdf8ee"' : ''}>
      <td><strong>${esc(ev.title)}</strong>${ev.venue ? `<br><small style="color:#888">${esc(ev.venue)}</small>` : ''}</td>
      <td><span class="badge-cat">${esc(ev.type || ev.category || '—')}</span></td>
      <td>${esc(ev.region || '—')}</td>
      <td>${ev._static
        ? '<span class="badge badge-draft" title="Hardcoded in site — import to manage via admin">Static</span>'
        : `<span class="badge ${ev.active ? 'badge-active' : 'badge-draft'}">${ev.active ? 'Active' : 'Draft'}</span>`
      }</td>
      <td class="col-actions">
        ${ev._static
          ? `<button class="action-btn edit" onclick="editStaticEvent(${ev._staticId}, this)">Edit</button>`
          : `<button class="action-btn edit"   onclick="openModal('${ev.id}')">Edit</button>
             <button class="action-btn delete" onclick="openDeleteModal('${ev.id}', '${escAttr(ev.title)}')">Del</button>`
        }
      </td>
    </tr>
  `).join('');
}

// ── Modal (add / edit) ─────────────────────────────────────────────────────────
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
    document.getElementById('fDay').value      = ev.day      || 'sat';
    document.getElementById('fWeekend').value  = ev.weekend  || '';
    document.getElementById('fRegion').value   = ev.region   || '';
    document.getElementById('fTags').value     = (ev.tags || []).join(', ');
    document.getElementById('fVenue').value    = ev.venue    || '';
    document.getElementById('fTime').value     = ev.time     || '';
    document.getElementById('fUrl').value      = ev.url      || '';
    document.getElementById('fImg').value      = ev.img      || '';
    document.getElementById('fActive').checked = ev.active !== false;
    updateImgPreview();
    document.getElementById('fPick').checked   = ev.pick   || false;
    document.getElementById('fIndoor').checked = ev.indoor || false;
  } else {
    title.textContent = 'Add Event';
    btn.textContent   = 'Save Event';
    document.getElementById('fActive').checked = true;
    document.getElementById('fIndoor').checked = false;
    updateImgPreview();
  }

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
function uploadToStorage(blob, slug) {
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
        setUploadStatus(`Uploading… ${pct}%`);
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

  const weekendVal = document.getElementById('fWeekend').value;
  if (weekendVal) {
    const [wy, wm, wd] = weekendVal.split('-').map(Number);
    const wDate = new Date(wy, wm - 1, wd);
    if (wDate.getDay() !== 6) {
      showToast('Weekend date must be a Saturday (day 6). Please correct it.');
      return;
    }
  }

  const data = {
    title:       document.getElementById('fTitle').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    category:    'events',
    type:        document.getElementById('fType').value,
    day:         document.getElementById('fDay').value,
    weekend:     weekendVal,
    region:      document.getElementById('fRegion').value,
    tags,
    venue:       document.getElementById('fVenue').value.trim(),
    time:        document.getElementById('fTime').value.trim(),
    url:         document.getElementById('fUrl').value.trim(),
    img:         document.getElementById('fImg').value.trim(),
    active:      document.getElementById('fActive').checked,
    pick:        document.getElementById('fPick').checked,
    indoor:      document.getElementById('fIndoor').checked || false,
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
  };

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    if (editingDocId) {
      await db.collection('events').doc(editingDocId).update(data);
      showToast('Event updated.');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('events').add(data);
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

// ── Delete ─────────────────────────────────────────────────────────────────────
function openDeleteModal(docId, title) {
  deletingDocId  = docId;
  deletingTitle  = title;
  document.getElementById('deleteEventName').textContent = title;
  document.getElementById('deleteOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteOverlay').classList.add('hidden');
  deletingDocId = null;
  deletingTitle = '';
}

function handleDeleteOverlayClick(e) {
  if (e.target === document.getElementById('deleteOverlay')) closeDeleteModal();
}

async function confirmDelete() {
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

function escAttr(str) {
  return String(str ?? '').replace(/'/g, "\\'");
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
        return (data.title || '').trim().toLowerCase() === key &&
               data.weekend === ev.weekend &&
               data.day === ev.day;
      });

      if (isDupe) { skipped++; continue; }

      await db.collection('events').add({
        title:       ev.title,
        description: ev.description || '',
        type:        ev.type        || 'other',
        day:         ev.day         || 'sat',
        weekend:     ev.weekend     || '',
        region:      ev.region      || 'wellington',
        venue:       ev.venue       || '',
        time:        ev.time        || '',
        url:         ev.url         || '',
        img:         ev.img         || '',
        pick:        ev.pick        || false,
        indoor:      ev.indoor      || false,
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
    // Check if already imported into Firestore
    const existing = await db.collection('events')
      .where('weekend', '==', ev.weekend)
      .where('day', '==', ev.day || 'sat')
      .get();
    const dupeDoc = existing.docs.find(d => {
      const data = d.data();
      return (data.title || '').trim().toLowerCase() === (ev.title || '').trim().toLowerCase();
    });
    let docId;
    if (dupeDoc) {
      docId = dupeDoc.id;
    } else {
      const ref = await db.collection('events').add({
        title:       ev.title,
        description: ev.description || '',
        type:        ev.type        || 'other',
        day:         ev.day         || 'sat',
        weekend:     ev.weekend     || '',
        region:      ev.region      || 'wellington',
        venue:       ev.venue       || '',
        time:        ev.time        || '',
        url:         ev.url         || '',
        img:         ev.img         || '',
        pick:        ev.pick        || false,
        indoor:      ev.indoor      || false,
        tags:        [],
        active:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      docId = ref.id;
      // Add to allEvents so openModal can find it
      allEvents.push({ ...ev, id: docId, _static: false, active: false, tags: [] });
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
  const d   = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  const dow = d.getDay(); // 0=Sun, 6=Sat
  const pad = n => String(n).padStart(2, '0');
  const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  if (dow === 6) {
    return { weekend: dateStr, day: 'sat' };
  } else if (dow === 0) {
    const sat = new Date(d);
    sat.setDate(sat.getDate() - 1);
    return { weekend: fmt(sat), day: 'sun' };
  } else {
    // Weekday — map to the coming Saturday of the same week
    const sat = new Date(d);
    sat.setDate(sat.getDate() + (6 - dow));
    return { weekend: fmt(sat), day: 'sat' };
  }
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
    if (!ev.title || typeof ev.title !== 'string' || !ev.title.trim()) {
      resultEl.textContent = `Event ${i + 1}: missing or invalid "title".`;
      resultEl.classList.add('json-import-error');
      return;
    }
    if (!ev.date || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
      resultEl.textContent = `Event ${i + 1}: "date" must be YYYY-MM-DD (got "${ev.date}").`;
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
      await db.collection('events').add({
        title:       String(ev.title).trim(),
        description: String(ev.description || '').trim(),
        category:    'events',
        type:        'other',
        day,
        weekend,
        region:      'wellington',
        venue:       String(ev.location || '').trim(),
        time:        String(ev.time || '').trim(),
        url:         '',
        img:         '',
        tags:        [],
        active:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
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

// ── VENUE EDITOR ──────────────────────────────────────────────────────────────
// Architecture: admin fetches index.html, parses venue cards, stores overrides
// in Firestore `venues` collection. Main site applies overrides on load.

let venueData = { food: null, walks: null, parks: null, activities: null, markets: null };

function switchTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
  // Show/hide events-specific content
  document.querySelectorAll('.events-only').forEach(el => {
    el.style.display = tab === 'events' ? '' : 'none';
  });
  // Show/hide venue sections
  ['food', 'walks', 'parks', 'activities', 'markets'].forEach(s => {
    const el = document.getElementById('admin-section-' + s);
    if (el) el.classList.toggle('hidden', s !== tab);
  });
  // Lazy-load venue data on first visit
  if (tab !== 'events' && !venueData[tab]) loadVenueSection(tab);
}

// Produce a stable slug used as the Firestore document ID
function venueSlug(name) {
  return name.toLowerCase()
    .replace(/[āáàä]/g, 'a').replace(/[ōóò]/g, 'o')
    .replace(/[ūúù]/g, 'u').replace(/[īíì]/g, 'i').replace(/[ēé]/g, 'e')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function loadVenueSection(section) {
  const listEl = document.getElementById(section + '-list');
  listEl.innerHTML = '<p class="venue-status-msg">Loading venues from main site…</p>';
  try {
    // Parse venue cards from the section's own HTML file (content is lazy-loaded,
    // not embedded in index.html, so we fetch sections/{section}.html directly)
    const res  = await fetch('../sections/' + section + '.html');
    if (!res.ok) throw new Error('Could not load sections/' + section + '.html (' + res.status + ')');
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const cards = [...doc.querySelectorAll('.venue-card')];
    if (!cards.length) throw new Error('No venue cards found in sections/' + section + '.html');

    // Fetch existing Firestore overrides for this section
    const snap = await db.collection('venues').where('section', '==', section).get();
    const overrides = {};
    snap.docs.forEach(d => { overrides[d.id] = d.data(); });

    // Build venue list, applying any saved overrides
    const venues = cards.map(card => {
      const rawName = (card.querySelector('.venue-name')?.textContent || '').trim();
      const slug    = venueSlug(rawName);
      const ov      = overrides[slug] || {};
      const locRaw  = (card.querySelector('.venue-location')?.textContent || '').trim();
      return {
        slug,
        name:        ov.name        ?? rawName,
        description: ov.description ?? (card.querySelector('.venue-desc')?.textContent || '').trim(),
        location:    ov.location    ?? locRaw.replace(/^\s*📍\s*/, ''),
        rating:      ov.rating      ?? parseFloat((card.querySelector('.rating-score')?.textContent || '0')),
        linkUrl:     ov.linkUrl     ?? (card.querySelector('.rating-link')?.getAttribute('href') || ''),
        linkLabel:   ov.linkLabel   ?? (card.querySelector('.rating-link')?.textContent || '').trim(),
        region:      ov.region      ?? (card.dataset.region || 'wellington'),
        duration:    ov.duration    ?? (card.dataset.duration || ''),
        img:         ov.img         ?? (card.dataset.img || ''),
        section,
        hasOverride: !!overrides[slug],
        isDeleted:   ov.deleted === true,
      };
    });

    venueData[section] = venues;
    renderVenueList(section, venues);
  } catch (err) {
    listEl.innerHTML = '<p class="venue-status-msg" style="color:var(--rust)">Error: ' + esc(err.message) + '</p>';
  }
}

function renderVenueList(section, venues) {
  const listEl = document.getElementById(section + '-list');
  if (!venues || !venues.length) {
    listEl.innerHTML = '<p class="venue-status-msg">No venues found.</p>';
    return;
  }
  listEl.innerHTML = venues.map((v, i) => {
    const rating = typeof v.rating === 'number' ? v.rating.toFixed(1) : v.rating;
    const meta   = [v.region, section === 'walks' && v.duration ? v.duration : '', '⭐ ' + rating]
                     .filter(Boolean).join(' · ');
    const editedBadge   = v.hasOverride && !v.isDeleted ? '<span class="badge-override">Edited</span>' : '';
    const deletedBadge  = v.isDeleted ? '<span class="badge-override" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">Hidden</span>' : '';
    const editBtn       = !v.isDeleted ? `<button class="action-btn edit" onclick="toggleVenueEdit('${section}',${i})">Edit</button>` : '';
    const deleteBtn     = !v.isDeleted ? `<button class="action-btn delete" onclick="deleteVenue('${section}',${i},'${v.slug}')">Delete</button>` : '';
    const restoreBtn    = v.isDeleted  ? `<button class="action-btn edit" onclick="restoreVenueFromDeleted('${section}',${i},'${v.slug}')">Restore</button>` : '';
    const revertBtn     = v.hasOverride && !v.isDeleted ? `<button class="action-btn delete" onclick="revertVenue('${section}',${i},'${v.slug}')">Revert</button>` : '';
    return `<div class="venue-admin-card${v.hasOverride ? ' has-override' : ''}${v.isDeleted ? ' is-deleted' : ''}" id="vcard-${section}-${i}">
      <div class="venue-admin-header">
        <div class="venue-admin-info">
          <span class="venue-admin-name">${esc(v.name)}</span>
          <span class="venue-admin-meta">${esc(meta)}</span>
        </div>
        <div class="venue-admin-actions">
          ${deletedBadge}${editedBadge}${editBtn}${deleteBtn}${restoreBtn}${revertBtn}
        </div>
      </div>
      <div class="venue-edit-form hidden" id="vedit-${section}-${i}">
        ${!v.isDeleted ? buildVenueForm(section, v, i) : ''}
      </div>
    </div>`;
  }).join('');
}

function buildVenueForm(section, v, i) {
  const sel = (val, opts) => opts.map(([k, label]) =>
    `<option value="${k}"${v[val] === k ? ' selected' : ''}>${label}</option>`).join('');

  const regionOpts = sel('region', [
    ['wellington','Wellington City'],['lower-hutt','Lower Hutt'],
    ['upper-hutt','Upper Hutt'],['kapiti','Kāpiti Coast'],
    ['porirua','Porirua'],['wairarapa','Wairarapa'],
  ]);
  const durOpts = sel('duration', [
    ['under30','Under 30 min'],['under1','Under 1 hour'],
    ['under2','Under 2 hours'],['over2','Over 2 hours'],
  ]);

  return `
    <div class="venue-form-grid">
      <div class="form-row">
        <label class="form-label">Venue name</label>
        <input class="form-input" id="vf-name-${section}-${i}" type="text" value="${escAttr(v.name)}">
      </div>
      <div class="form-row">
        <label class="form-label">Region</label>
        <select class="form-select" id="vf-region-${section}-${i}">${regionOpts}</select>
      </div>
    </div>
    <div class="form-row">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="vf-desc-${section}-${i}" rows="3">${esc(v.description)}</textarea>
    </div>
    <div class="venue-form-grid">
      <div class="form-row">
        <label class="form-label">📍 Location text</label>
        <input class="form-input" id="vf-location-${section}-${i}" type="text" value="${escAttr(v.location)}">
      </div>
      <div class="form-row">
        <label class="form-label">Rating (0–5)</label>
        <input class="form-input" id="vf-rating-${section}-${i}" type="number" min="0" max="5" step="0.1" value="${v.rating}">
      </div>
    </div>
    <div class="venue-form-grid">
      <div class="form-row">
        <label class="form-label">External link URL</label>
        <input class="form-input" id="vf-linkUrl-${section}-${i}" type="url" value="${escAttr(v.linkUrl)}" placeholder="https://…">
      </div>
      <div class="form-row">
        <label class="form-label">Link label</label>
        <input class="form-input" id="vf-linkLabel-${section}-${i}" type="text" value="${escAttr(v.linkLabel)}" placeholder="TripAdvisor reviews ↗">
      </div>
    </div>
    ${section === 'walks' ? `<div class="form-row">
      <label class="form-label">Duration</label>
      <select class="form-select" id="vf-duration-${section}-${i}">${durOpts}</select>
    </div>` : ''}
    <div class="form-row">
      <label class="form-label">Image URL</label>
      <input class="form-input" id="vf-img-${section}-${i}" type="url" value="${escAttr(v.img || '')}" placeholder="https://upload.wikimedia.org/…">
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" onclick="toggleVenueEdit('${section}',${i})">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveVenueEdit('${section}',${i},'${v.slug}')">Save changes</button>
    </div>`;
}

function toggleVenueEdit(section, idx) {
  document.getElementById('vedit-' + section + '-' + idx)?.classList.toggle('hidden');
}

async function saveVenueEdit(section, idx, slug) {
  const val = id => (document.getElementById(id)?.value || '').trim();
  const pre  = `vf-${section}-${idx}-` .replace(/(\w+)-(\w+)-(\d+)/, 'vf-$1-$2-$3');

  // Helper to build the field id
  const fid = f => `vf-${f}-${section}-${idx}`;

  const data = {
    section,
    name:        val(fid('name')),
    description: val(fid('desc')),
    location:    val(fid('location')),
    rating:      Math.round(parseFloat(val(fid('rating')) || 0) * 10) / 10,
    linkUrl:     val(fid('linkUrl')),
    linkLabel:   val(fid('linkLabel')),
    region:      val(fid('region')),
    img:         val(fid('img')),
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (section === 'walks') data.duration = val(fid('duration'));

  try {
    await db.collection('venues').doc(slug).set(data, { merge: true });

    // Update local state and re-render list
    if (venueData[section]?.[idx]) {
      Object.assign(venueData[section][idx], { ...data, hasOverride: true });
    }
    renderVenueList(section, venueData[section]);

    // Flash the saved card green
    requestAnimationFrame(() => {
      const card = document.getElementById('vcard-' + section + '-' + idx);
      if (card) { card.classList.add('save-flash'); setTimeout(() => card.classList.remove('save-flash'), 1800); }
    });
    showToast('Venue saved.');
  } catch (err) {
    showToast('Save failed: ' + err.message);
  }
}

async function revertVenue(section, idx, slug) {
  if (!confirm('Revert to the original values from the main site?')) return;
  try {
    await db.collection('venues').doc(slug).delete();
    venueData[section] = null;
    await loadVenueSection(section);
    showToast('Venue reverted to original.');
  } catch (err) {
    showToast('Revert failed: ' + err.message);
  }
}

async function deleteVenue(section, idx, slug) {
  if (!confirm('Hide this venue from the main site?')) return;
  try {
    await db.collection('venues').doc(slug).set({ deleted: true, section }, { merge: true });
    if (venueData[section]?.[idx]) {
      venueData[section][idx].isDeleted  = true;
      venueData[section][idx].hasOverride = true;
    }
    renderVenueList(section, venueData[section]);
    showToast('Venue hidden from main site.');
  } catch (err) {
    showToast('Delete failed: ' + err.message);
  }
}

async function restoreVenueFromDeleted(section, idx, slug) {
  try {
    await db.collection('venues').doc(slug).update({ deleted: false });
    if (venueData[section]?.[idx]) {
      venueData[section][idx].isDeleted = false;
    }
    renderVenueList(section, venueData[section]);
    showToast('Venue restored.');
  } catch (err) {
    showToast('Restore failed: ' + err.message);
  }
}
