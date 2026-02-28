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
let showPast        = false;

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
      updateStats();
      populateWeekendFilter();
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
    <tr>
      <td><strong>${esc(ev.title)}</strong>${ev.venue ? `<br><small style="color:#888">${esc(ev.venue)}</small>` : ''}</td>
      <td><span class="badge-cat">${esc(ev.type || ev.category || '—')}</span></td>
      <td>${ev.weekend ? formatWeekend(ev.weekend) : '—'}${weekendIsPast(ev.weekend) ? ' <span class="badge badge-past">Past</span>' : ''}</td>
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

// ── Bulk import ───────────────────────────────────────────────────────────────
const DRAFT_EVENTS = [
  {
    title: 'The Performance Arcade',
    description: 'Wellington\'s acclaimed live art festival returns to the waterfront behind Te Papa, with artists presenting works in iconic shipping container installations spanning performance art, theatre, dance, circus, and live music. Free and ticketed events — runs all weekend attracting tens of thousands of visitors.',
    type: 'culture', day: 'sat', weekend: '2026-02-28', region: 'wellington',
    venue: 'Wellington Waterfront (behind Te Papa)', time: 'All day',
    url: 'https://www.theperformancearcade.com',
  },
  {
    title: 'Wellington Dragon Boat Festival',
    description: 'Teams from across NZ and the world compete in dragon boat racing on Wellington Harbour, with youth team finals on Sunday. A spectacular waterfront event that\'s great for families to watch from the shore.',
    type: 'outdoor', day: 'sun', weekend: '2026-02-28', region: 'wellington',
    venue: 'Wellington Waterfront, Jervois Quay', time: 'All day',
    url: 'https://www.dragonboatfestival.org.nz',
  },
  {
    title: 'Wellington MTB Festival – Matairangi Day',
    description: 'The free Wellington Mountain Bike Festival activates Matairangi (Mt Victoria) with guided rides, demos, kids\' activities, live music and food trucks. Guest riders include world-class slopestyle athlete Brett Rheeder.',
    type: 'outdoor', day: 'sat', weekend: '2026-02-28', region: 'wellington',
    venue: 'Matairangi / Mount Victoria Trails', time: 'All day',
    url: 'https://www.wellingtonmtbfestival.nz',
  },
  {
    title: 'Aotearoa New Zealand Festival of the Arts',
    description: 'Celebrating its 40th anniversary, this prestigious biennial festival runs 24 Feb–15 Mar with music, theatre, dance, visual arts, and literature across Wellington venues. Includes free and ticketed events with family-friendly options throughout.',
    type: 'culture', day: 'sat', weekend: '2026-02-28', region: 'wellington',
    venue: 'Various venues across Wellington', time: 'Various times',
    url: 'https://www.festival.nz',
  },
  {
    title: 'NZ Fringe Festival – Final Weekend',
    description: 'The final weekend of the New Zealand Fringe Festival (13 Feb–7 Mar) with 178 events across 30+ venues — comedy, dance, theatre, circus, and outdoor spectacle. Family highlights include aerial circus shows and Shakespeare in the Innermost Gardens.',
    type: 'culture', day: 'sat', weekend: '2026-02-28', region: 'wellington',
    venue: 'Various venues across Wellington', time: 'Various times',
    url: 'https://www.fringe.co.nz',
  },
  {
    title: 'Wellington Pride Parade',
    description: 'Wellington\'s Pride Parade winds through Courtenay Place and Dixon Street to the Cuba Street Rainbow Crossing. Street celebrations begin at 4pm with live performances, food and craft stalls lining Lower Cuba Street — a joyful community spectacle.',
    type: 'festival', day: 'sat', weekend: '2026-03-07', region: 'wellington',
    venue: 'Courtenay Place → Cuba Street', time: '4:00pm–8:00pm',
    url: 'https://www.wellingtonpridefestival.com',
  },
  {
    title: 'Newtown Festival',
    description: 'The beloved free annual Newtown street festival celebrates its 32nd anniversary with live music across multiple stages, food and drink stalls, fairground rides, and a dedicated Tamariki programme for kids. Performers include King Kapisi and Ria Hall.',
    type: 'festival', day: 'sun', weekend: '2026-03-07', region: 'wellington',
    venue: 'Newtown streets, Wellington', time: 'All day',
    url: 'https://www.newtownfestival.org.nz',
  },
  {
    title: 'Hutt Sounds 2026',
    description: 'The fourth annual Hutt Sounds music festival at Brewtown features Fun Lovin\' Criminals and When The Cats Away alongside local acts. Gourmet food trucks, craft beer and non-alcoholic options throughout — easily accessible by train from Wellington.',
    type: 'music', day: 'sun', weekend: '2026-03-07', region: 'upper-hutt',
    venue: 'Brewtown, 11 Miro Street, Upper Hutt', time: 'All day',
    url: 'https://www.huttsounds.co.nz',
  },
  {
    title: 'Kāpiti Tattoo & Arts Festival',
    description: 'A fusion of ink, art and live entertainment at Paraparaumu Memorial Hall featuring over 40 tattoo artists and visual art creators including painters, sculptors, illustrators and craftspeople. Showcases the best of local and regional artistic talent.',
    type: 'culture', day: 'sat', weekend: '2026-03-07', region: 'kapiti',
    venue: 'Paraparaumu Memorial Hall, Kāpiti Coast', time: 'All day',
    url: 'https://www.kapiticoast.govt.nz',
  },
  {
    title: 'Pātaka Art + Museum',
    description: 'Pātaka Art + Museum in Porirua is free to visit, with exhibitions through March 2026 connected to Ngāti Toa Rangatira waterways. The museum hosts regular weekend community programmes — an accessible family outing in the northern Wellington region.',
    type: 'culture', day: 'sat', weekend: '2026-03-07', region: 'porirua',
    venue: 'Pātaka Art + Museum, Norrie Street, Porirua', time: 'Open daily',
    url: 'https://pataka.org.nz',
  },
  {
    title: 'Zealandia – Twilight Wildlife Tour',
    description: 'Guided 2.5-hour evening tours of the world\'s first fully-fenced urban ecosanctuary, where families can spot tuatara, kiwi, and native birds in their natural habitat as night falls. The 225-hectare sanctuary has reintroduced 18 species of native wildlife to Wellington.',
    type: 'outdoor', day: 'sat', weekend: '2026-03-07', region: 'wellington',
    venue: 'Zealandia Te Māra a Tāne, Waiapu Rd, Karori', time: 'From dusk',
    url: 'https://www.visitzealandia.com/events',
  },
  {
    title: 'Te Matapihi – Central Library Opening Weekend',
    description: 'Wellington\'s long-awaited central library reopens after a $217.6 million redevelopment with a public celebration weekend. Features a ground-floor café, creative spaces, and a community exhibition created by Wellingtonians. Free entry.',
    type: 'culture', day: 'sat', weekend: '2026-03-14', region: 'wellington',
    venue: '65 Victoria Street (Te Ngākau Civic Precinct)', time: '10:00am–5:00pm',
    url: 'https://wellington.govt.nz',
  },
  {
    title: 'Ōtaki International Kite Festival',
    description: 'A spectacular free family event as world-class kites fill the skies along the Ōtaki coastline, with NZ and international kite flyers participating. Features all-day stage entertainment, kids\' bouncy castles and slides, market stalls and food vendors.',
    type: 'outdoor', day: 'sat', weekend: '2026-03-14', region: 'kapiti',
    venue: 'Marine Parade, Ōtaki Beach', time: 'All day',
    url: 'https://www.eventfinda.co.nz',
  },
  {
    title: 'Ōtaki International Kite Festival',
    description: 'A spectacular free family event as world-class kites fill the skies along the Ōtaki coastline, with NZ and international kite flyers participating. Features all-day stage entertainment, kids\' bouncy castles and slides, market stalls and food vendors.',
    type: 'outdoor', day: 'sun', weekend: '2026-03-14', region: 'kapiti',
    venue: 'Marine Parade, Ōtaki Beach', time: 'All day',
    url: 'https://www.eventfinda.co.nz',
  },
  {
    title: 'Kāpiti Classic 2026',
    description: 'A live music day in the outdoor amphitheatre at Southward Car Museum, with Th\' Dudes, Anika Moa, The Warratahs, and Automatic 80\'s. Bring a picnic blanket and enjoy the sunshine among over 400 classic cars in a uniquely scenic setting.',
    type: 'music', day: 'sat', weekend: '2026-03-14', region: 'kapiti',
    venue: 'Southward Car Museum, Paraparaumu', time: '11:00am onwards',
    url: 'https://www.eventbrite.co.nz',
  },
  {
    title: 'Out in the City – Wellington Pride',
    description: 'The flagship community event of Wellington Pride Festival — a free all-day family-friendly fair at Odlin\'s Plaza with 70+ stalls, food and drink, and a packed stage programme. Marks 40 years since Wellington\'s first Gay & Lesbian Fair.',
    type: 'festival', day: 'sun', weekend: '2026-03-14', region: 'wellington',
    venue: "Odlin's Plaza, Wellington", time: '10:00am–4:00pm',
    url: 'https://www.wellingtonpridefestival.com',
  },
  {
    title: 'Wellington Zoo – Family Visit',
    description: 'Te Nukuao Wellington Zoo is open year-round with daily animal talks, feeding times, and Close Encounter experiences with Red Pandas, Lions, Cheetahs, Giraffes and more. Wild Explorer experiences take families through Dinosaur Evolution or Dolphins of the Reef.',
    type: 'whanau', day: 'sat', weekend: '2026-03-14', region: 'wellington',
    venue: 'Te Nukuao Wellington Zoo, 200 Daniell Street, Newtown', time: '9:30am–5:00pm',
    url: 'https://wellingtonzoo.com',
  },
  {
    title: 'Mangaroa Farms Harvest Festival',
    description: 'A harvest celebration at Mangaroa Farms to launch Upper Hutt Food Week, featuring fresh local produce, regenerative farm tours, kai tastings, nature play for tamariki, and a Pumpkin Competition. An immersive outing on a real working farm.',
    type: 'outdoor', day: 'sat', weekend: '2026-03-21', region: 'upper-hutt',
    venue: 'Mangaroa Farms, 98 Whitemans Valley Road, Upper Hutt', time: '10:00am–3:00pm',
    url: 'https://mangaroa.org',
  },
  {
    title: 'Wellington Pride Picnic',
    description: 'A relaxed outdoor celebration to close the Wellington Pride Festival, inviting the community to gather, share food, and enjoy each other\'s company in a welcoming open-air setting. A casual and family-inclusive finale to Aotearoa\'s longest-running Pride festival.',
    type: 'whanau', day: 'sun', weekend: '2026-03-21', region: 'wellington',
    venue: 'TBC, Wellington', time: 'TBC',
    url: 'https://www.wellingtonpridefestival.com',
  },
  {
    title: 'CubaDupa',
    description: 'Wellington\'s biggest free street festival transforms the Cuba Precinct into a kaleidoscope of music, performance, kai and colour. Over 210 acts, 220 performances and 70 food vendors across the Cuba Quarter — a true community celebration for all ages, runs all weekend.',
    type: 'festival', day: 'sat', weekend: '2026-03-28', region: 'wellington',
    venue: 'Cuba Precinct, Cuba Street, Wellington', time: 'All day',
    url: 'https://www.cubadupa.co.nz',
  },
  {
    title: 'CubaDupa',
    description: 'Wellington\'s biggest free street festival transforms the Cuba Precinct into a kaleidoscope of music, performance, kai and colour. Over 210 acts, 220 performances and 70 food vendors across the Cuba Quarter — a true community celebration for all ages, runs all weekend.',
    type: 'festival', day: 'sun', weekend: '2026-03-28', region: 'wellington',
    venue: 'Cuba Precinct, Cuba Street, Wellington', time: 'All day',
    url: 'https://www.cubadupa.co.nz',
  },
  {
    title: 'Wellington Night Market',
    description: 'A popular Saturday night market on Lower Cuba Street offering authentic Asian cuisine from Japanese, Malay, Indonesian, Indian and Moroccan traditions, plus live entertainment. Running every Friday and Saturday — a great evening out in the Cuba Quarter.',
    type: 'market', day: 'sat', weekend: '2026-03-28', region: 'wellington',
    venue: 'Lower Cuba Street, Wellington', time: '5:00pm–11:00pm',
    url: 'https://www.wellingtonnightmarket.co.nz',
  },
  {
    title: 'Harbourside Market',
    description: 'Wellington\'s most popular Sunday waterfront market adjacent to Te Papa, drawing up to 25,000 visitors. Fresh fruit, vegetables, artisan produce, 30+ food trucks and live music — a perfect Sunday morning family outing in the fresh harbour air.',
    type: 'market', day: 'sun', weekend: '2026-03-28', region: 'wellington',
    venue: 'Cable Street & Barnett Street, Wellington Waterfront', time: '7:30am–2:00pm',
    url: 'https://www.wellingtonnz.com/visit/see-and-do/harbourside-market',
  },
];

async function bulkImportDraftEvents() {
  const btn = document.getElementById('importBtn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  try {
    // Fetch existing titles to skip duplicates
    const existing = await db.collection('events').get();
    const existingTitles = new Set(
      existing.docs.map(d => (d.data().title || '').trim().toLowerCase())
    );

    let created = 0;
    let skipped = 0;

    for (const ev of DRAFT_EVENTS) {
      const key = ev.title.trim().toLowerCase();
      // Skip if a doc with same title + weekend + day already exists
      const isDupe = existing.docs.some(d => {
        const data = d.data();
        return (data.title || '').trim().toLowerCase() === key &&
               data.weekend === ev.weekend &&
               data.day === ev.day;
      });

      if (isDupe) { skipped++; continue; }

      await db.collection('events').add({
        title:       ev.title,
        description: ev.description,
        category:    'events',
        type:        ev.type,
        day:         ev.day,
        weekend:     ev.weekend,
        region:      ev.region,
        venue:       ev.venue,
        time:        ev.time,
        url:         ev.url,
        tags:        [],
        img:         '',
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

let venueData = { food: null, walks: null, parks: null, activities: null };

function switchTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
  // Show/hide events-specific content
  document.querySelectorAll('.events-only').forEach(el => {
    el.style.display = tab === 'events' ? '' : 'none';
  });
  // Show/hide venue sections
  ['food', 'walks', 'parks', 'activities'].forEach(s => {
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
    // Parse venue cards from the live main site HTML
    const res  = await fetch('../index.html');
    const html = await res.text();
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const sectionEl = doc.getElementById('section-' + section);
    if (!sectionEl) throw new Error('Section not found in main site');
    const cards = [...sectionEl.querySelectorAll('.venue-card')];
    if (!cards.length) throw new Error('No venue cards found');

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
        section,
        hasOverride: !!overrides[slug],
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
    return `<div class="venue-admin-card${v.hasOverride ? ' has-override' : ''}" id="vcard-${section}-${i}">
      <div class="venue-admin-header">
        <div class="venue-admin-info">
          <span class="venue-admin-name">${esc(v.name)}</span>
          <span class="venue-admin-meta">${esc(meta)}</span>
        </div>
        <div class="venue-admin-actions">
          ${v.hasOverride ? '<span class="badge-override">Edited</span>' : ''}
          <button class="action-btn edit" onclick="toggleVenueEdit('${section}',${i})">Edit</button>
          ${v.hasOverride ? `<button class="action-btn delete" onclick="revertVenue('${section}',${i},'${v.slug}')">Revert</button>` : ''}
        </div>
      </div>
      <div class="venue-edit-form hidden" id="vedit-${section}-${i}">
        ${buildVenueForm(section, v, i)}
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
