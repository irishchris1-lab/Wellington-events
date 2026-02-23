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
const auth = firebase.auth();
const db   = firebase.firestore();

// ── State ─────────────────────────────────────────────────────────────────────
let allEvents       = [];
let filteredEvents  = [];
let editingDocId    = null;
let deletingDocId   = null;
let deletingTitle   = '';
let unsubscribeSnap = null;

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
}

// ── Firestore real-time listener ───────────────────────────────────────────────
function subscribeToEvents() {
  if (unsubscribeSnap) unsubscribeSnap();
  unsubscribeSnap = db.collection('events')
    .orderBy('weekend', 'asc')
    .onSnapshot(snapshot => {
      allEvents = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      updateStats();
      populateWeekendFilter();
      applyFilters();
    }, err => {
      showToast('Firestore error: ' + err.message);
    });
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function updateStats() {
  const active   = allEvents.filter(e => e.active).length;
  const draft    = allEvents.filter(e => !e.active).length;
  const weekends = new Set(allEvents.map(e => e.weekend)).size;
  document.getElementById('statTotal').textContent   = allEvents.length;
  document.getElementById('statActive').textContent  = active;
  document.getElementById('statDraft').textContent   = draft;
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
    <tr>
      <td><strong>${esc(ev.title)}</strong>${ev.venue ? `<br><small style="color:#888">${esc(ev.venue)}</small>` : ''}</td>
      <td><span class="badge-cat">${esc(ev.type || ev.category || '—')}</span></td>
      <td>${ev.weekend ? formatWeekend(ev.weekend) : '—'}</td>
      <td>${esc(ev.region || '—')}</td>
      <td><span class="badge ${ev.active ? 'badge-active' : 'badge-draft'}">${ev.active ? 'Active' : 'Draft'}</span></td>
      <td class="col-actions">
        <button class="action-btn edit"   onclick="openModal('${ev.id}')">Edit</button>
        <button class="action-btn delete" onclick="openDeleteModal('${ev.id}', '${escAttr(ev.title)}')">Del</button>
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
  } else {
    title.textContent = 'Add Event';
    btn.textContent   = 'Save Event';
    document.getElementById('fActive').checked = true;
  }

  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('fTitle').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingDocId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn  = document.getElementById('submitBtn');
  const tags = document.getElementById('fTags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const data = {
    title:       document.getElementById('fTitle').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    category:    'events',
    type:        document.getElementById('fType').value,
    day:         document.getElementById('fDay').value,
    weekend:     document.getElementById('fWeekend').value,
    region:      document.getElementById('fRegion').value,
    tags,
    venue:       document.getElementById('fVenue').value.trim(),
    time:        document.getElementById('fTime').value.trim(),
    url:         document.getElementById('fUrl').value.trim(),
    img:         document.getElementById('fImg').value.trim(),
    active:      document.getElementById('fActive').checked,
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
