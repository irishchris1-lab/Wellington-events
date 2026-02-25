// ── SERVICE WORKER REGISTRATION ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed:', e));
}

// ── INSTALL PROMPT ──
  let deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  // Android / Chrome: capture the native prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!isStandalone() && !localStorage.getItem('installDismissed')) {
      setTimeout(showInstallBanner, 4000);
    }
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredInstallPrompt = null;
    ['installMenuBtn', 'headerInstallBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    showToast('App installed — find it on your home screen 🎉');
  });

  function showInstallBanner() {
    if (isStandalone()) return;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('visible');
  }
  function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('visible');
  }
  async function triggerInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') deferredInstallPrompt = null;
    hideInstallBanner();
  }
  function dismissInstall() {
    hideInstallBanner();
    localStorage.setItem('installDismissed', '1');
  }

  // iOS: show manual instructions modal
  function showIOSModal() {
    const el = document.getElementById('iosInstallOverlay');
    if (el) el.style.display = 'flex';
  }
  function closeIOSModal() {
    const el = document.getElementById('iosInstallOverlay');
    if (el) el.style.display = 'none';
    localStorage.setItem('installDismissed', '1');
  }

  // Entry point for menu button — handles both Android and iOS
  function handleInstallClick() {
    if (isIOS()) {
      showIOSModal();
    } else if (deferredInstallPrompt) {
      triggerInstall();
    } else {
      showToast('Open this site in Chrome or Safari to install it');
    }
  }

  // On load: show install buttons for any non-standalone user
  document.addEventListener('DOMContentLoaded', () => {
    if (!isStandalone()) {
      ['installMenuBtn', 'headerInstallBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      });
    }
    if (isIOS() && !isStandalone() && !localStorage.getItem('installDismissed')) {
      setTimeout(showIOSModal, 5000);
    }
  });

let currentRegion = 'all';
  let currentTypeFilter = 'all';
  let currentDuration = 'all';
  let walkTopRatedOnly = false;
  let foodRatingFilter = 'all';
  let kidFriendlyFilter = 'all';

  // ── FOOD: top-rated filter ──
  function filterFood(rating, btn) {
    foodRatingFilter = rating;
    document.querySelectorAll('.duration-filter button[onclick*="filterFood"]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyFoodFilters();
  }

  // ── FOOD: kid-friendly filter ──
  function filterKidFriendly(val, btn) {
    kidFriendlyFilter = val;
    document.querySelectorAll('.duration-filter button[onclick*="filterKidFriendly"]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyFoodFilters();
  }

  function applyFoodFilters() {
    document.querySelectorAll('#section-food .venue-card').forEach(card => {
      const regionMatch = currentRegion === 'all' || card.dataset.region === currentRegion;
      const rating = parseFloat(card.dataset.rating || '0');
      const ratingMatch = foodRatingFilter === 'all' || rating >= 4.5;
      const kidMatch = kidFriendlyFilter === 'all' || card.dataset.kidfriendly === 'true';
      card.classList.toggle('hidden', !(regionMatch && ratingMatch && kidMatch));
    });
    document.querySelectorAll('#section-food .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── WALKS: top-rated toggle ──
  function toggleWalkTopRated(btn) {
    walkTopRatedOnly = !walkTopRatedOnly;
    btn.classList.toggle('active', walkTopRatedOnly);
    btn.setAttribute('aria-pressed', walkTopRatedOnly ? 'true' : 'false');
    applyWalkFilters();
  }

  function filterDuration(duration, btn) {
    currentDuration = duration;
    document.querySelectorAll('.duration-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyWalkFilters();
  }

  function applyWalkFilters() {
    document.querySelectorAll('#section-walks .venue-card').forEach(card => {
      const regionMatch = currentRegion === 'all' || card.dataset.region === currentRegion;
      const dur = card.dataset.duration;
      const durationMatch = currentDuration === 'all' || dur === currentDuration;
      const rating = parseFloat(card.dataset.rating || '0');
      const ratingMatch = !walkTopRatedOnly || rating >= 4.5;
      card.classList.toggle('hidden', !(regionMatch && durationMatch && ratingMatch));
    });
    document.querySelectorAll('#section-walks .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── CHANGE 3: Focus trap helpers ──
  const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

  function trapFocus(el) {
    const focusable = [...el.querySelectorAll(FOCUSABLE)];
    const first = focusable[0], last = focusable[focusable.length - 1];
    el._trapHandler = function(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    el.addEventListener('keydown', el._trapHandler);
    if (first) first.focus();
  }
  function releaseFocus(el) {
    if (el._trapHandler) el.removeEventListener('keydown', el._trapHandler);
  }

  function toggleMenu() {
    const panel = document.getElementById('dropdownPanel');
    const isOpen = panel.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  }
  function openMenu() {
    const btn = document.getElementById('hamburgerBtn');
    const panel = document.getElementById('dropdownPanel');
    document.getElementById('dropdownMenu').classList.add('open');
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    trapFocus(panel);
    // Close on Escape
    panel._escHandler = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', panel._escHandler);
  }
  function closeMenu() {
    const btn = document.getElementById('hamburgerBtn');
    const panel = document.getElementById('dropdownPanel');
    document.getElementById('dropdownMenu').classList.remove('open');
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    releaseFocus(panel);
    if (panel._escHandler) document.removeEventListener('keydown', panel._escHandler);
    btn.focus();
  }

  function showSectionFromMenu(section) {
    const btns = document.querySelectorAll('.main-nav-btn');
    const map = { events: 0, food: 1, walks: 2, parks: 3, planner: 4 };
    if (section === 'about') {
      // About has no tab — just show the section directly
      document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.main-nav-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.getElementById('section-about').classList.add('active');
      document.querySelector('.tabs-bar').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'planner') {
      handlePlannerTabClick(btns[map.planner]);
      return;
    }
    const btn = map[section] !== undefined ? btns[map[section]] : null;
    if (btn) showSection(section, btn);
  }

  // ── CHANGE 5: URL hash state ──
  function updateHash(section, region) {
    try {
      const params = new URLSearchParams();
      if (section && section !== 'events') params.set('s', section);
      if (region && region !== 'all') params.set('r', region);
      history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    } catch (e) {
      // Silently ignore — happens when opened as a local file rather than served
    }
  }

  function readHash() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('s') || 'events';
    const region  = params.get('r') || 'all';
    return { section, region };
  }

  function showSection(section, btn) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    // ── Change 3: update aria-selected on tabs ──
    document.querySelectorAll('.main-nav-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('section-' + section).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.querySelector('.tabs-bar').style.display = section === 'events' ? '' : 'none';
    applyFilter(currentRegion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHash(section, currentRegion);
  }

  function showTab(id, btn) {
    document.querySelectorAll('.weekend-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    applyFilter(currentRegion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filterRegion(region, btn) {
    currentRegion = region;
    // Sync all region buttons (global filter-btn + in-section duration-btn)
    document.querySelectorAll('[data-filter-region]').forEach(b => {
      const isActive = b.dataset.filterRegion === region;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    applyFilter(region);
    // ── Change 5: update URL ──
    const activeSection = document.querySelector('.app-section.active')?.id?.replace('section-', '') || 'events';
    updateHash(activeSection, region);
  }

  function getCardType(card) {
    const strip = card.querySelector('.card-strip');
    if (!strip) return 'other';
    for (const cls of strip.classList) {
      if (cls.startsWith('strip-') && cls !== 'strip-other') return cls.slice(6);
    }
    return 'other';
  }

  function filterType(type, btn) {
    currentTypeFilter = type;
    document.querySelectorAll('[data-filter-type]').forEach(b => {
      const active = b.dataset.filterType === type;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    applyFilter(currentRegion);
  }

  function applyFilter(region) {
    const activePanel = document.querySelector('.weekend-panel.active');
    if (activePanel) {
      activePanel.querySelectorAll('.card').forEach(card => {
        const regionHide = region !== 'all' && card.dataset.region !== region;
        const isFamilyCard = currentTypeFilter === 'whanau' && card.querySelector('.badge-family');
        const typeHide   = currentTypeFilter !== 'all' && getCardType(card) !== currentTypeFilter && !isFamilyCard;
        card.classList.toggle('hidden', regionHide || typeHide);
      });
      activePanel.querySelectorAll('.events-grid').forEach(grid => {
        const existing = grid.nextElementSibling;
        if (existing && existing.classList.contains('no-results')) existing.remove();
        if (grid.querySelectorAll('.card:not(.hidden)').length === 0) {
          const msg = document.createElement('p');
          msg.className = 'no-results';
          msg.style.cssText = 'color:#bbb;font-size:13px;padding:12px 0 24px;font-style:italic;';
          msg.textContent = 'No events match the current filters.';
          grid.after(msg);
        }
      });
    }
    document.querySelectorAll('.venue-card, .banner-sponsored').forEach(card => {
      // Skip food & walk cards — handled by their own filter functions
      if (card.closest('#section-walks') || card.closest('#section-food')) return;
      const alwaysShow = card.dataset.region === 'all';
      card.classList.toggle('hidden', !alwaysShow && region !== 'all' && card.dataset.region !== region);
    });

    // Food and walk cards use combined region + rating/duration filters
    applyFoodFilters();
    applyWalkFilters();
    document.querySelectorAll('#section-parks .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── CHANGE 5: Restore state from URL on load ──
  document.addEventListener('DOMContentLoaded', () => {
    const { section, region } = readHash();

    // Restore section (default is now planner)
    if (section !== 'planner') {
      const navBtns = document.querySelectorAll('.main-nav-btn');
      const map = { events: 1, food: 2, walks: 3, parks: 4 };
      if (map[section] !== undefined) showSection(section, navBtns[map[section]]);
    }

    // Restore region
    if (region !== 'all') {
      const btn = document.querySelector('.filter-btn[data-filter-region="' + region + '"]');
      if (btn) filterRegion(region, btn);
    }

    // ── Arrow key navigation for tablists ──
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
      tablist.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const tabs = [...tablist.querySelectorAll('[role="tab"]')];
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) return;
        e.preventDefault();
        let next;
        if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  });

// ═══════════════════════════════════════════════════════
  // ✏️  FIREBASE SETUP — only needed for cross-device sync
  //
  //  The planner works RIGHT NOW for guests (saves locally).
  //  To enable Google sign-in and cloud sync:
  //
  //  1. Go to https://console.firebase.google.com
  //  2. Create a project → Add a web app → copy the config
  //  3. Authentication → Sign-in methods → Enable Google
  //  4. Firestore Database → Create database (test mode)
  //  5. Paste your config values below and deploy
  // ═══════════════════════════════════════════════════════
  const firebaseConfig = {
    apiKey:            "AIzaSyCql0Pc_sSFcQSo8NDTWO29lLcXqFKFFgg",
    authDomain:        "whatsonwellington-4b7a7.firebaseapp.com",
    projectId:         "whatsonwellington-4b7a7",
    storageBucket:     "whatsonwellington-4b7a7.firebasestorage.app",
    messagingSenderId: "51704787462",
    appId:             "1:51704787462:web:b2cedc8d4c46602b814987"
  };

  // ── Initialise Firebase (silently skipped if not configured) ──
  let firebaseReady = false;
  let db = null, auth = null;
  try {
    if (!firebaseConfig.apiKey.startsWith('YOUR_')) {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db   = firebase.firestore();
      firebaseReady = true;
      loadFirestoreEvents();
      loadAboutContent();
    }
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }

  // ═══════════════════════════════════════
  //  FIRESTORE EVENTS — live injection
  // ═══════════════════════════════════════

  const EVENT_TYPE_MAP = {
    festival: { strip: 'strip-festival', label: '🎪 Festival' },
    culture:  { strip: 'strip-culture',  label: '🎨 Arts & Culture' },
    market:   { strip: 'strip-market',   label: '🛒 Market' },
    music:    { strip: 'strip-music',    label: '🎵 Music' },
    outdoor:  { strip: 'strip-outdoor',  label: '🏃 Outdoor' },
    whanau:   { strip: 'strip-whanau',   label: '👨‍👩‍👧 Whānau' },
  };

  function buildEventCardHTML(ev) {
    const tm   = EVENT_TYPE_MAP[ev.type] || { strip: 'strip-other', label: '📅 Event' };
    const region = ev.region || 'all';
    const meta = [
      ev.time  ? `<div class="meta-row"><span class="meta-icon">🕐</span>${escHtml(ev.time)}</div>`  : '',
      ev.venue ? `<div class="meta-row"><span class="meta-icon">📍</span>${escHtml(ev.venue)}</div>` : '',
    ].join('');
    const footer = [
      ev.url ? `<a class="card-link" href="${escHtml(ev.url)}" target="_blank" rel="noopener">Find out more ↗</a>` : '',
      `<button class="add-to-plan-btn" onclick="addToPlan(this.closest('.card'))">+ Plan</button>`,
    ].join('');
    return `
      <div class="card" data-region="${escHtml(region)}" data-firestore="${escHtml(ev.id)}" data-weekend="${escHtml(ev.weekend || '')}" data-day="${escHtml(ev.day || 'sat')}">
        <div class="card-strip ${tm.strip}"></div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-cat">${tm.label}</div>
              <div class="card-title">${escHtml(ev.title)}</div>
            </div>
          </div>
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          ${ev.description ? `<div class="card-desc">${escHtml(ev.description)}</div>` : ''}
        </div>
        <div class="card-footer">${footer}</div>
      </div>`;
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Returns true from Monday 00:00 onwards after a weekend
  function weekendIsPast(satDateStr) {
    if (!satDateStr) return false;
    const monday = new Date(satDateStr + 'T00:00:00');
    monday.setDate(monday.getDate() + 2);
    monday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= monday;
  }

  // Hide tabs and panels for weekends that have already passed
  function hidePastWeekendTabs() {
    let firstVisible = null;
    document.querySelectorAll('.weekend-panel[data-weekend]').forEach(panel => {
      if (weekendIsPast(panel.dataset.weekend)) {
        panel.style.display = 'none';
        const btn = document.getElementById('wtab-' + panel.id);
        if (btn) btn.style.display = 'none';
      } else if (!firstVisible) {
        firstVisible = panel;
      }
    });
    // If the currently-active panel is now hidden, activate the first visible one
    const active = document.querySelector('.weekend-panel.active');
    if (active && active.style.display === 'none' && firstVisible) {
      active.classList.remove('active');
      firstVisible.classList.add('active');
      document.querySelectorAll('.tab-btn[aria-selected]').forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.classList.remove('active');
      });
      const newBtn = document.getElementById('wtab-' + firstVisible.id);
      if (newBtn) { newBtn.classList.add('active'); newBtn.setAttribute('aria-selected', 'true'); }
    }
  }

  function injectEventCard(ev) {
    if (weekendIsPast(ev.weekend)) return; // skip past events
    const panel = document.querySelector(`.weekend-panel[data-weekend="${ev.weekend}"]`);
    if (!panel) return;
    const grids = panel.querySelectorAll('.events-grid');
    const grid  = (ev.day === 'sun' && grids.length > 1) ? grids[1] : grids[0];
    if (!grid) return;
    grid.insertAdjacentHTML('beforeend', buildEventCardHTML(ev));
  }

  function loadFirestoreEvents() {
    if (!firebaseReady) return;
    db.collection('events')
      .where('active',   '==', true)
      .where('category', '==', 'events')
      .onSnapshot(snapshot => {
        // Remove previously injected cards
        document.querySelectorAll('.card[data-firestore]').forEach(el => el.remove());
        snapshot.docs.forEach(doc => injectEventCard({ id: doc.id, ...doc.data() }));
        applyFilter(currentRegion);
        updateAddButtons();
      }, err => console.warn('Firestore events error:', err));
  }

  function loadAboutContent() {
    if (!firebaseReady) return;
    db.collection('siteConfig').doc('about').get().then(doc => {
      if (!doc.exists) return;
      const d = doc.data();
      [['para1', 'aboutPara1', 'dropAboutPara1'],
       ['para2', 'aboutPara2', 'dropAboutPara2'],
       ['para3', 'aboutPara3', 'dropAboutPara3']].forEach(([field, mainId, dropId]) => {
        if (!d[field]) return;
        [mainId, dropId].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = d[field];
        });
      });
    }).catch(e => console.warn('Could not load about content:', e));
  }

  // ═══════════════════════════════════════
  //  AUTH STATE
  // ═══════════════════════════════════════
  let currentUser = null;

  function openLoginModal()  { document.getElementById('loginOverlay').classList.add('open'); }
  function closeLoginModal() { document.getElementById('loginOverlay').classList.remove('open'); }

  // Guest — just close modal and use localStorage
  function continueAsGuest() {
    closeLoginModal();
    showToast('Planning as guest — your plan saves on this device');
    renderPlan();
  }

  async function signInWithGoogle() {
    if (!firebaseReady) {
      showToast('Firebase not set up yet — planning as guest for now');
      continueAsGuest();
      return;
    }
    const btn = document.getElementById('googleSignInBtn');
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      closeLoginModal();
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = `<svg class="login-provider-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google`;
      if (e.code !== 'auth/popup-closed-by-user') {
        showToast('Sign-in failed — please try again');
        console.error('Google sign-in error:', e);
      }
    }
  }

  async function signOutUser() {
    closeUserDropdown();
    if (firebaseReady && auth) await auth.signOut();
    currentUser = null;
    updateAuthUI(null);
    showToast('Signed out');
  }

  function updateAuthUI(user) {
    const signInBtn = document.getElementById('authSignInBtn');
    const userArea  = document.getElementById('authUserArea');
    const avatarBtn = document.getElementById('authAvatarBtn');
    const nameEl    = document.getElementById('userDropdownName');
    const emailEl   = document.getElementById('userDropdownEmail');

    if (user) {
      signInBtn.style.display = 'none';
      userArea.style.display  = 'block';
      nameEl.textContent  = user.displayName || 'Signed in';
      emailEl.textContent = user.email || '';
      // Show avatar photo or initials
      const initial = (user.displayName || 'U')[0].toUpperCase();
      if (user.photoURL) {
        avatarBtn.style.backgroundImage = `url(${user.photoURL})`;
        avatarBtn.style.backgroundSize  = 'cover';
        avatarBtn.textContent = '';
      } else {
        avatarBtn.textContent = initial;
      }
      // Hide sync nudge once signed in
      document.getElementById('plannerSyncNudge').style.display = 'none';
    } else {
      signInBtn.style.display = 'flex';
      userArea.style.display  = 'none';
    }
  }

  // Listen for Firebase auth state changes
  if (firebaseReady) {
    auth.onAuthStateChanged(async user => {
      currentUser = user;
      updateAuthUI(user);
      if (user) {
        await loadPlan();
        renderPlan();
        updateAddButtons();
        showToast(`Welcome back, ${user.displayName?.split(' ')[0] || 'there'} 👋`);
      }
    });
  }

  // ── User dropdown ──
  function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('open');
  }
  function closeUserDropdown() {
    document.getElementById('userDropdown').classList.remove('open');
  }
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    const area = document.getElementById('authUserArea');
    if (dd && area && !area.contains(e.target)) dd.classList.remove('open');
  });

  // ═══════════════════════════════════════
  //  PLANNER — Data & Persistence
  // ═══════════════════════════════════════
  let planItems = []; // Array of { id, title, time, location, category, day, weekendStart, section, region, addedAt }
  let currentPlanWeekend = null; // YYYY-MM-DD of the Saturday for the selected weekend

  // ── Weekend helpers ──
  function getUpcomingWeekends(count) {
    count = count || 4;
    const weekends = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const daysToSat = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
    const firstSat = new Date(today);
    firstSat.setDate(today.getDate() + daysToSat);
    for (let i = 0; i < count; i++) {
      const sat = new Date(firstSat);
      sat.setDate(firstSat.getDate() + i * 7);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      const pad = n => String(n).padStart(2, '0');
      const key = `${sat.getFullYear()}-${pad(sat.getMonth() + 1)}-${pad(sat.getDate())}`;
      weekends.push({ key, sat, sun, label: formatWeekendLabel(sat, sun) });
    }
    return weekends;
  }

  function formatWeekendLabel(sat, sun) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const satStr = sat.getDate() + ' ' + months[sat.getMonth()];
    const sunStr = sun.getMonth() === sat.getMonth()
      ? sun.getDate() + ''
      : sun.getDate() + ' ' + months[sun.getMonth()];
    return satStr + '–' + sunStr;
  }

  // Returns all non-past weekends sourced directly from the DOM panels
  // (includes both hardcoded and dynamically generated panels)
  function getAllWeekends() {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .map(p => {
        const satStr = p.dataset.weekend;
        const [y, m, d] = satStr.split('-').map(Number);
        const sat = new Date(y, m - 1, d);
        const sun = new Date(y, m - 1, d + 1);
        const label = sun.getMonth() === sat.getMonth()
          ? `${sat.getDate()}–${sun.getDate()} ${MONTHS[sat.getMonth()]}`
          : `${sat.getDate()} ${MONTHS[sat.getMonth()]}–${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
        return { key: satStr, sat, sun, label };
      })
      .filter(w => !weekendIsPast(w.key))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  function selectPlanWeekend(key) {
    currentPlanWeekend = key;
    renderPlan();
  }

  function generateItemId(title) {
    return title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 60) + '-' + Date.now().toString(36);
  }

  function getCardData(cardEl) {
    const isVenueCard = cardEl.classList.contains('venue-card');
    let title, time, location, category, region, section, weekendStart, day;

    if (isVenueCard) {
      title        = cardEl.querySelector('.venue-name')?.textContent?.trim() || '';
      time         = cardEl.querySelector('.walk-duration')?.textContent?.trim() || '';
      location     = cardEl.querySelector('.venue-location')?.textContent?.trim()?.replace('📍 ', '') || '';
      category     = cardEl.querySelector('.venue-tag')?.textContent?.trim() || '';
      region       = cardEl.dataset.region || '';
      section      = cardEl.closest('#section-food') ? 'food' :
                     cardEl.closest('#section-walks') ? 'walks' :
                     cardEl.closest('#section-parks') ? 'parks' : 'other';
      weekendStart = null;
      day          = 'saturday';
    } else {
      title    = cardEl.querySelector('.card-title')?.textContent?.trim() || '';
      time     = '';
      location = '';
      category = cardEl.querySelector('.card-cat')?.textContent?.trim() || '';
      region   = cardEl.dataset.region || '';
      section  = 'events';
      // Extract time and location from meta rows
      cardEl.querySelectorAll('.meta-row').forEach(row => {
        const text = row.textContent.trim();
        if (text.includes('🕐')) time = text.replace('🕐', '').trim();
        if (text.includes('📍')) location = text.replace('📍', '').trim();
      });
      // Weekend: from data-weekend attribute (Firestore cards) or parent panel (hardcoded cards)
      weekendStart = cardEl.dataset.weekend ||
                     cardEl.closest('.weekend-panel')?.dataset?.weekend || '';
      // Day: from data-day attribute (Firestore cards) or by grid position (hardcoded cards)
      if (cardEl.dataset.day) {
        day = cardEl.dataset.day === 'sun' ? 'sunday' : 'saturday';
      } else {
        const grid = cardEl.closest('.events-grid');
        const prevLabel = grid?.previousElementSibling;
        day = prevLabel?.classList.contains('day-sun') ? 'sunday' : 'saturday';
      }
    }

    return { title, time, location, category, region, section, weekendStart, day };
  }

  function addToPlan(cardEl) {
    const data = getCardData(cardEl);
    // Check if already added (by title match)
    if (planItems.some(item => item.title === data.title)) {
      showToast('Already in your plan');
      return;
    }

    // Use the event's own weekend date; fall back to selected planner weekend or next upcoming
    const weekendStart = data.weekendStart || currentPlanWeekend || getUpcomingWeekends(1)[0].key;
    currentPlanWeekend = weekendStart;
    const item = {
      id: generateItemId(data.title),
      ...data,
      weekendStart,
      addedAt: Date.now()
    };

    planItems.push(item);
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Added to your weekend plan ✓');
  }

  function removeFromPlan(itemId) {
    planItems = planItems.filter(i => i.id !== itemId);
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Removed from plan');
  }

  function changeDay(itemId, newDay) {
    const item = planItems.find(i => i.id === itemId);
    if (item) {
      item.day = newDay;
      savePlan();
      renderPlan();
    }
  }

  function clearPlan() {
    if (!confirm('Clear your entire weekend plan?')) return;
    planItems = [];
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Plan cleared');
  }

  function movePlanItem(itemId, direction) {
    const idx = planItems.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= planItems.length) return;
    [planItems[idx], planItems[newIdx]] = [planItems[newIdx], planItems[idx]];
    savePlan();
    renderPlan();
  }

  // ── Persist to Firestore (or localStorage fallback) ──
  async function savePlan() {
    updatePlanBadge();
    if (firebaseReady && currentUser) {
      try {
        await db.collection('plans').doc(currentUser.uid).set({
          items: planItems,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore save failed, using localStorage', e);
        localStorage.setItem('wow_plan', JSON.stringify(planItems));
      }
    } else {
      localStorage.setItem('wow_plan', JSON.stringify(planItems));
    }
  }

  async function loadPlan() {
    if (firebaseReady && currentUser) {
      try {
        const doc = await db.collection('plans').doc(currentUser.uid).get();
        if (doc.exists && doc.data().items) {
          planItems = doc.data().items;
        } else {
          // Check localStorage for items added before sign-in
          const local = localStorage.getItem('wow_plan');
          if (local) {
            planItems = JSON.parse(local);
            await savePlan(); // migrate to Firestore
            localStorage.removeItem('wow_plan');
          }
        }
      } catch (e) {
        console.warn('Firestore load failed', e);
        const local = localStorage.getItem('wow_plan');
        planItems = local ? JSON.parse(local) : [];
      }
    } else {
      const local = localStorage.getItem('wow_plan');
      planItems = local ? JSON.parse(local) : [];
    }
    renderPlan();
    updateAddButtons();
  }

  // ── Render plan timeline ──
  function renderPlan() {
    const container = document.getElementById('plannerTimeline');
    const emptyEl   = document.getElementById('plannerEmpty');

    const allWeekends = getAllWeekends();
    if (!currentPlanWeekend && allWeekends.length) currentPlanWeekend = allWeekends[0].key;

    // Migrate legacy items without weekendStart
    planItems.forEach(item => { if (!item.weekendStart && allWeekends.length) item.weekendStart = allWeekends[0].key; });

    const weekendItems = planItems.filter(i => i.weekendStart === currentPlanWeekend);

    const exportWrap = document.getElementById('calExportWrap');
    if (planItems.length === 0) {
      container.innerHTML = renderWeekendPicker(allWeekends);
      emptyEl.style.display = 'block';
      if (exportWrap) exportWrap.style.display = 'none';
      updatePlanBadge();
      return;
    }
    emptyEl.style.display = 'none';
    if (exportWrap) exportWrap.style.display = '';

    const saturday = weekendItems.filter(i => i.day === 'saturday');
    const sunday   = weekendItems.filter(i => i.day === 'sunday');

    let html = renderWeekendPicker(allWeekends);

    if (weekendItems.length === 0) {
      html += '<p class="plan-weekend-empty">Nothing planned for this weekend yet — browse and tap <strong>+ Plan</strong> to add something.</p>';
    } else {
      if (saturday.length > 0) html += renderDaySection('Saturday', saturday);
      if (sunday.length > 0)   html += renderDaySection('Sunday', sunday);
    }

    html += renderSuggestions(weekendItems);

    container.innerHTML = html;
    updatePlanBadge();

    // Scroll picker to show the active weekend chip without moving the page
    requestAnimationFrame(() => {
      const picker = container.querySelector('.weekend-picker');
      const activeChip = picker?.querySelector('.weekend-chip.active');
      if (picker && activeChip) {
        const group = activeChip.closest('.weekend-month-group');
        if (group) {
          const groupRect  = group.getBoundingClientRect();
          const pickerRect = picker.getBoundingClientRect();
          picker.scrollTop += groupRect.top - pickerRect.top - 4;
        }
      }
    });
  }

  function renderWeekendPicker(weekends) {
    const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    // Group by year-month
    const groups = [];
    weekends.forEach(w => {
      const groupKey = `${w.sat.getFullYear()}-${w.sat.getMonth()}`;
      let group = groups.find(g => g.key === groupKey);
      if (!group) {
        group = { key: groupKey, label: MONTHS_FULL[w.sat.getMonth()] + ' ' + w.sat.getFullYear(), weekends: [] };
        groups.push(group);
      }
      group.weekends.push(w);
    });

    let html = '<div class="weekend-picker">';
    groups.forEach(group => {
      html += '<div class="weekend-month-group">';
      html += '<div class="weekend-month-label">' + group.label + '</div>';
      html += '<div class="weekend-chips">';
      group.weekends.forEach(w => {
        const isActive = w.key === currentPlanWeekend;
        const count = planItems.filter(i => i.weekendStart === w.key).length;
        const badge = count > 0 ? '<span class="weekend-chip-badge">' + count + '</span>' : '';
        html += '<button class="weekend-chip' + (isActive ? ' active' : '') + '" onclick="selectPlanWeekend(\'' + w.key + '\')">' + w.label + badge + '</button>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderSuggestions(weekendItems) {
    if (weekendItems.length === 0) return '';
    const planRegions = [...new Set(weekendItems.map(i => i.region).filter(Boolean))];
    if (planRegions.length === 0) return '';
    const plannedTitles = new Set(planItems.map(i => i.title));
    const food = [], walks = [], parks = [];
    document.querySelectorAll('.venue-card').forEach(card => {
      const region = card.dataset.region;
      if (!region || region === 'all' || !planRegions.includes(region)) return;
      const titleEl = card.querySelector('.venue-name');
      if (!titleEl) return;
      const t = titleEl.textContent.trim();
      if (plannedTitles.has(t)) return;
      const category = (card.querySelector('.venue-tag')?.textContent || '').trim();
      if (card.closest('#section-food') && food.every(s => s.title !== t)) {
        food.push({ title: t, category, section: 'food' });
      } else if (card.closest('#section-walks') && walks.every(s => s.title !== t)) {
        walks.push({ title: t, category, section: 'walks' });
      } else if (card.closest('#section-parks') && parks.every(s => s.title !== t)) {
        parks.push({ title: t, category, section: 'parks' });
      }
    });
    // Interleave: up to 2 cafés + 1 walk + 1 park
    const shown = [];
    if (food[0])  shown.push(food[0]);
    if (walks[0]) shown.push(walks[0]);
    if (food[1])  shown.push(food[1]);
    if (parks[0]) shown.push(parks[0]);
    if (shown.length === 0) return '';
    const regionLabels = { 'wellington': 'Wellington City', 'lower-hutt': 'Lower Hutt', 'upper-hutt': 'Upper Hutt', 'kapiti': 'Kāpiti', 'porirua': 'Porirua', 'wairarapa': 'Wairarapa' };
    const regionNames = planRegions.map(r => regionLabels[r] || r).join(' & ');
    const icons = { food: '☕', walks: '🌿', parks: '🛝' };
    let html = '<div class="suggestions-section"><div class="suggestions-header"><span class="suggestions-title">💡 Suggested & Nearby</span><span class="suggestions-sub">Cafés, walks & parks near your plan in ' + regionNames + '</span></div><div class="suggestions-list">';
    shown.forEach(s => {
      // Store title in data-title to avoid quote conflicts in onclick attribute
      html += '<div class="suggestion-card"><div class="suggestion-info"><div class="suggestion-name">' + escapeHtml(s.title) + '</div><div class="suggestion-meta">' + (icons[s.section] || '📌') + ' ' + escapeHtml(s.category) + '</div></div><button class="suggestion-add-btn" data-title="' + escapeHtml(s.title) + '" onclick="addToPlanByTitle(this)">+ Plan</button></div>';
    });
    html += '</div></div>';
    return html;
  }

  function addToPlanByTitle(btn) {
    // data-title stores HTML-encoded text; dataset.title auto-decodes to raw text
    const title = btn.dataset.title;
    if (!title) return;
    const card = [...document.querySelectorAll('.venue-card')].find(c => {
      const el = c.querySelector('.venue-name');
      return el && el.textContent.trim() === title;
    });
    if (card) {
      addToPlan(card);
      btn.textContent = 'In plan';
      btn.classList.add('added');
    }
  }

  function renderDaySection(dayLabel, items) {
    const dayValue = dayLabel.toLowerCase();
    const otherDay = dayValue === 'saturday' ? 'sunday' : 'saturday';
    const otherLabel = dayValue === 'saturday' ? 'Sun' : 'Sat';

    let html = `<div class="plan-day-section">
      <div class="plan-day-title"><span class="pip"></span>${dayLabel}<span class="line"></span></div>
      <div class="plan-items">`;

    items.forEach((item, idx) => {
      const sectionIcon = { events: '🗓', food: '☕', walks: '🌿', parks: '🛝', other: '📌' }[item.section] || '📌';
      html += `
        <div class="plan-item" draggable="true" data-item-id="${item.id}">
          <div class="plan-item-grip" title="Drag to reorder">⠿</div>
          <div class="plan-item-content">
            <div class="plan-item-title">${escapeHtml(item.title)}</div>
            <div class="plan-item-meta">
              <span>${sectionIcon} ${escapeHtml(item.category)}</span>
              ${item.time ? '<span>🕐 ' + escapeHtml(item.time) + '</span>' : ''}
              ${item.location ? '<span>📍 ' + escapeHtml(item.location) + '</span>' : ''}
            </div>
          </div>
          <select class="plan-day-select" onchange="changeDay('${item.id}', this.value)" title="Move to another day">
            <option value="saturday" ${dayValue === 'saturday' ? 'selected' : ''}>Sat</option>
            <option value="sunday" ${dayValue === 'sunday' ? 'selected' : ''}>Sun</option>
          </select>
          <button class="plan-item-remove" onclick="removeFromPlan('${item.id}')" title="Remove">✕</button>
        </div>`;
    });

    html += '</div></div>';
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Plan badge count ──
  function updatePlanBadge() {
    const badge = document.getElementById('planCountBadge');
    if (!badge) return;
    const count = planItems.length;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  // ── Share intercept — show sign-in prompt for guests ──
  function handleShareClick() {
    if (currentUser) {
      sharePlan();
    } else {
      document.getElementById('shareModalOverlay').classList.add('open');
    }
  }
  function closeShareModal() {
    document.getElementById('shareModalOverlay').classList.remove('open');
  }
  function shareWithoutSignIn() {
    closeShareModal();
    sharePlan();
  }

  // ── Share plan ──
  function sharePlan() {
    if (planItems.length === 0) { showToast('Nothing to share yet'); return; }
    let text = '🗓 My Wellington Weekend Plan\n\n';
    // Group by weekend
    const weekendKeys = [...new Set(planItems.map(i => i.weekendStart))].sort();
    const allWeekends = getAllWeekends();
    weekendKeys.forEach(key => {
      const wInfo = allWeekends.find(w => w.key === key);
      if (wInfo) text += '🗓 ' + wInfo.label + '\n';
      const saturday = planItems.filter(i => i.weekendStart === key && i.day === 'saturday');
      const sunday   = planItems.filter(i => i.weekendStart === key && i.day === 'sunday');
      if (saturday.length) {
        text += '📅 SATURDAY\n';
        saturday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
        text += '\n';
      }
      if (sunday.length) {
        text += '📅 SUNDAY\n';
        sunday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
        text += '\n';
      }
    });
    const saturday = planItems.filter(i => !i.weekendStart && i.day === 'saturday');
    const sunday   = planItems.filter(i => !i.weekendStart && i.day === 'sunday');
    if (saturday.length) {
      text += '📅 SATURDAY\n';
      saturday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
    }
    if (sunday.length) {
      text += '📅 SUNDAY\n';
      sunday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
    }
    text += '\nPlanned on whatsonwellington.co.nz';

    if (navigator.share) {
      navigator.share({ title: 'My Wellington Weekend', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast('Plan copied to clipboard'));
    }
  }

  // ═══════════════════════════════════════
  //  CALENDAR EXPORT
  // ═══════════════════════════════════════

  function toggleCalendarExport(e) {
    e.stopPropagation();
    document.getElementById('calExportDropdown')?.classList.toggle('open');
  }

  // Close calendar dropdown on outside click
  document.addEventListener('click', () => {
    document.getElementById('calExportDropdown')?.classList.remove('open');
  });

  // Parse a time string like "10am", "10:30am–12pm", "2.00pm" into {startH,startM,endH,endM}
  function parseTimeRange(timeStr) {
    if (!timeStr) return { startH: 10, startM: 0, endH: 12, endM: 0 };
    const s = timeStr.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[–—]/g, '-')
      .replace(/\./g, ':')
      .replace(/^from/, '');
    const parts = s.split('-');
    function parseOne(t) {
      const m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
      if (!m) return null;
      let h = parseInt(m[1]);
      const min = parseInt(m[2] || '0');
      if (m[3] === 'pm' && h !== 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      return { h, m: min };
    }
    const start = parseOne(parts[0]);
    if (!start) return { startH: 10, startM: 0, endH: 12, endM: 0 };
    const end = parts[1] ? parseOne(parts[1]) : null;
    return {
      startH: start.h, startM: start.m,
      endH: end ? end.h : Math.min(start.h + 2, 23),
      endM: end ? end.m : start.m
    };
  }

  // Returns plain date/time objects for calendar formatting (avoids timezone pitfalls)
  function getItemDateParts(item) {
    if (!item.weekendStart) return null;
    const [y, mo, d] = item.weekendStart.split('-').map(Number);
    let year = y, month = mo, day = d;
    if (item.day === 'sunday') {
      const dt = new Date(year, month - 1, day + 1); // handles month boundary
      year = dt.getFullYear(); month = dt.getMonth() + 1; day = dt.getDate();
    }
    const t = parseTimeRange(item.time);
    return {
      year, month, day,
      startH: t.startH, startM: t.startM,
      endH:   t.endH,   endM:   t.endM
    };
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function calDateStr(p, useEnd) {
    const h = useEnd ? p.endH   : p.startH;
    const m = useEnd ? p.endM   : p.startM;
    return `${p.year}${pad2(p.month)}${pad2(p.day)}T${pad2(h)}${pad2(m)}00`;
  }

  function buildGCalUrl(item) {
    const p = getItemDateParts(item);
    if (!p) return null;
    const details = [item.category, item.location].filter(Boolean).join(' · ');
    const params = new URLSearchParams({
      action:   'TEMPLATE',
      text:     item.title,
      dates:    calDateStr(p, false) + '/' + calDateStr(p, true),
      details:  details,
      location: item.location || ''
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function openAllGCal() {
    document.getElementById('calExportDropdown')?.classList.remove('open');
    const items = planItems.filter(i => i.weekendStart);
    if (items.length === 0) { showToast('No items with dates to export'); return; }
    items.forEach(item => {
      const url = buildGCalUrl(item);
      if (url) window.open(url, '_blank', 'noopener');
    });
  }

  function escapeICS(str) {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  function downloadICS() {
    document.getElementById('calExportDropdown')?.classList.remove('open');
    const items = planItems.filter(i => i.weekendStart);
    if (items.length === 0) { showToast('No items with dates to export'); return; }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//What\'s On Wellington//Wellington Weekend Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    items.forEach(item => {
      const p = getItemDateParts(item);
      if (!p) return;
      const desc = [item.category, item.location].filter(Boolean).join(' · ');
      const uid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '@whatsonwellington.co.nz';
      const event = [
        'BEGIN:VEVENT',
        'UID:' + uid,
        'SUMMARY:' + escapeICS(item.title),
        'DTSTART:' + calDateStr(p, false),
        'DTEND:'   + calDateStr(p, true),
        'DESCRIPTION:' + escapeICS(desc),
        item.location ? 'LOCATION:' + escapeICS(item.location) : '',
        'END:VEVENT'
      ].filter(Boolean);
      lines.push(...event);
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wellington-weekend.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Calendar file downloaded');
  }

  // ═══════════════════════════════════════
  //  ADD-TO-PLAN BUTTONS — Injected on cards
  // ═══════════════════════════════════════
  function injectAddButtons() {
    // Event cards
    document.querySelectorAll('.card-footer').forEach(footer => {
      if (footer.querySelector('.add-to-plan-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'add-to-plan-btn';
      btn.textContent = '+ Plan';
      btn.onclick = function(e) { e.preventDefault(); addToPlan(this.closest('.card')); };
      footer.prepend(btn);
    });
    // Venue cards (food, walks, parks)
    document.querySelectorAll('.venue-footer').forEach(footer => {
      if (footer.querySelector('.add-to-plan-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'add-to-plan-btn';
      btn.textContent = '+ Plan';
      btn.onclick = function(e) { e.preventDefault(); addToPlan(this.closest('.venue-card')); };
      footer.prepend(btn);
    });
  }

  function updateAddButtons() {
    const addedTitles = new Set(planItems.map(i => i.title));

    document.querySelectorAll('.add-to-plan-btn').forEach(btn => {
      const card = btn.closest('.card') || btn.closest('.venue-card');
      if (!card) return;
      const title = card.querySelector('.card-title')?.textContent?.trim() ||
                    card.querySelector('.venue-name')?.textContent?.trim() || '';
      if (addedTitles.has(title)) {
        btn.classList.add('added');
        btn.textContent = 'In plan';
      } else {
        btn.classList.remove('added');
        btn.textContent = '+ Plan';
      }
    });
  }

  // ── Planner tab click handler ──
  function handlePlannerTabClick(btn) {
    showSection('planner', btn);
    renderPlan();
  }

  // ── Toast notification ──
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ── Drag and drop for plan items ──
  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.plan-item');
    if (!item) return;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.itemId);
  });
  document.addEventListener('dragend', (e) => {
    const item = e.target.closest('.plan-item');
    if (item) item.classList.remove('dragging');
  });
  document.addEventListener('dragover', (e) => {
    const target = e.target.closest('.plan-item');
    if (!target || target.classList.contains('dragging')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = target.closest('.plan-items');
    const dragging = container?.querySelector('.dragging');
    if (!dragging || !container) return;
    const siblings = [...container.querySelectorAll('.plan-item:not(.dragging)')];
    const next = siblings.find(s => {
      const rect = s.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });
    container.insertBefore(dragging, next || null);
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    // Rebuild order from DOM
    const newOrder = [];
    document.querySelectorAll('.plan-item').forEach(el => {
      const id = el.dataset.itemId;
      const item = planItems.find(i => i.id === id);
      if (item) newOrder.push(item);
    });
    if (newOrder.length === planItems.length) {
      planItems = newOrder;
      savePlan();
    }
  });

  // ── Generate weekend tabs + panels for all remaining Saturdays in 2026 ──
  function generateRemainingWeekends() {
    const existingPanels = [...document.querySelectorAll('.weekend-panel[data-weekend]')];
    if (existingPanels.length === 0) return;

    const tabsInner = document.querySelector('.tabs-inner');
    const mainEl    = document.querySelector('#section-events main');
    if (!tabsInner || !mainEl) return;

    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Start one week after the last existing hardcoded panel
    const lastSat = existingPanels[existingPanels.length - 1].dataset.weekend;
    const [ly, lm, ld] = lastSat.split('-').map(Number);
    let sat = new Date(ly, lm - 1, ld + 7);

    let idx = existingPanels.length + 1; // w6, w7, …

    while (sat.getFullYear() === 2026) {
      const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1);
      const id  = 'w' + idx;
      const fmt = d => String(d).padStart(2, '0');
      const satStr = `${sat.getFullYear()}-${fmt(sat.getMonth() + 1)}-${fmt(sat.getDate())}`;

      // Tab label
      const tabLabel = sun.getMonth() === sat.getMonth()
        ? `${sat.getDate()}–${sun.getDate()} ${MONTHS_SHORT[sat.getMonth()]}`
        : `${sat.getDate()} ${MONTHS_SHORT[sat.getMonth()]}–${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`;

      // Tab button
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.id = 'wtab-' + id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-controls', id);
      btn.textContent = tabLabel;
      btn.addEventListener('click', function() { showTab(id, this); });
      tabsInner.appendChild(btn);

      // Weekend panel with empty Saturday + Sunday grids
      const panel = document.createElement('div');
      panel.className = 'weekend-panel';
      panel.id = id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'wtab-' + id);
      panel.setAttribute('data-weekend', satStr);
      panel.innerHTML =
        `<div class="day-label day-sat"><span class="pip"></span>Saturday ${sat.getDate()} ${MONTHS_FULL[sat.getMonth()]}<span class="line"></span></div>` +
        `<div class="events-grid"></div>` +
        `<div class="day-label day-sun"><span class="pip"></span>Sunday ${sun.getDate()} ${MONTHS_FULL[sun.getMonth()]}<span class="line"></span></div>` +
        `<div class="events-grid"></div>`;
      mainEl.appendChild(panel);

      sat = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 7);
      idx++;
    }
  }

  // ── Inject buttons and load guest plan on startup ──
  document.addEventListener('DOMContentLoaded', () => {
    generateRemainingWeekends();
    hidePastWeekendTabs();
    injectAddButtons();
    // If Firebase is not configured, load from localStorage immediately
    // If Firebase IS configured, onAuthStateChanged handles it after sign-in
    if (!firebaseReady) {
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    } else {
      // Still load localStorage for guests who haven't signed in yet
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    }
  });
