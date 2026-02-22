// PWA manifest — references real icon files
  const _manifest = JSON.stringify({
    "name": "What's On Wellington",
    "short_name": "Welly Events",
    "description": "Family-friendly events, cafés, walks and playgrounds across Wellington every weekend.",
    "start_url": "/Wellington-events/",
    "display": "standalone",
    "background_color": "#F7F2EB",
    "theme_color": "#0B5563",
    "orientation": "portrait-primary",
    "icons": [
      { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
      { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
    ],
    "categories": ["lifestyle", "entertainment", "travel"],
    "lang": "en-NZ"
  });
  const _blob = new Blob([_manifest], {type: 'application/manifest+json'});
  document.querySelector('link[rel="manifest"]') && document.querySelector('link[rel="manifest"]').remove();
  const _mlink = document.createElement('link');
  _mlink.rel = 'manifest'; _mlink.href = URL.createObjectURL(_blob);
  document.head.appendChild(_mlink);

let currentRegion = 'all';
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

  function applyFilter(region) {
    const activePanel = document.querySelector('.weekend-panel.active');
    if (activePanel) {
      activePanel.querySelectorAll('.card').forEach(card => {
        card.classList.toggle('hidden', region !== 'all' && card.dataset.region !== region);
      });
      activePanel.querySelectorAll('.events-grid').forEach(grid => {
        const existing = grid.nextElementSibling;
        if (existing && existing.classList.contains('no-results')) existing.remove();
        if (grid.querySelectorAll('.card:not(.hidden)').length === 0) {
          const msg = document.createElement('p');
          msg.className = 'no-results';
          msg.style.cssText = 'color:#bbb;font-size:13px;padding:12px 0 24px;font-style:italic;';
          msg.textContent = 'No events in this area for this day.';
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

    // Restore section
    if (section !== 'events') {
      const navBtns = document.querySelectorAll('.main-nav-btn');
      const map = { food: 1, walks: 2, parks: 3, planner: 4 };
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
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
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
    }
  } catch (e) {
    console.warn('Firebase init failed:', e);
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
  let planItems = []; // Array of { id, title, time, location, category, day, section, region, addedAt }

  function generateItemId(title) {
    return title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 60) + '-' + Date.now().toString(36);
  }

  function getCardData(cardEl) {
    const isVenueCard = cardEl.classList.contains('venue-card');
    let title, time, location, category, region, section;

    if (isVenueCard) {
      title    = cardEl.querySelector('.venue-name')?.textContent?.trim() || '';
      time     = cardEl.querySelector('.walk-duration')?.textContent?.trim() || '';
      location = cardEl.querySelector('.venue-location')?.textContent?.trim()?.replace('📍 ', '') || '';
      category = cardEl.querySelector('.venue-tag')?.textContent?.trim() || '';
      region   = cardEl.dataset.region || '';
      section  = cardEl.closest('#section-food') ? 'food' :
                 cardEl.closest('#section-walks') ? 'walks' :
                 cardEl.closest('#section-parks') ? 'parks' : 'other';
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
    }

    return { title, time, location, category, region, section };
  }

  function addToPlan(cardEl) {
    const data = getCardData(cardEl);
    // Check if already added (by title match)
    if (planItems.some(item => item.title === data.title)) {
      showToast('Already in your plan');
      return;
    }

    const item = {
      id: generateItemId(data.title),
      ...data,
      day: 'saturday', // default — user can change
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
    const nudge     = document.getElementById('plannerSyncNudge');

    // Show sign-in nudge for guests who have items
    if (nudge) nudge.style.display = (!currentUser && planItems.length > 0) ? 'flex' : 'none';

    if (planItems.length === 0) {
      container.innerHTML = '';
      emptyEl.style.display = 'block';
      updatePlanBadge();
      return;
    }
    emptyEl.style.display = 'none';

    const saturday = planItems.filter(i => i.day === 'saturday');
    const sunday   = planItems.filter(i => i.day === 'sunday');

    let html = '';

    if (saturday.length > 0) {
      html += renderDaySection('Saturday', saturday);
    }
    if (sunday.length > 0) {
      html += renderDaySection('Sunday', sunday);
    }

    container.innerHTML = html;
    updatePlanBadge();
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

  // ── Share plan ──
  function sharePlan() {
    if (planItems.length === 0) { showToast('Nothing to share yet'); return; }
    let text = '🗓 My Wellington Weekend Plan\n\n';
    const saturday = planItems.filter(i => i.day === 'saturday');
    const sunday   = planItems.filter(i => i.day === 'sunday');
    if (saturday.length) {
      text += '📅 SATURDAY\n';
      saturday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
      text += '\n';
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

  // ── Inject buttons and load guest plan on startup ──
  document.addEventListener('DOMContentLoaded', () => {
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
