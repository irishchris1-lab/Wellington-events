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
    ['installMenuBtn', 'headerInstallBtn', 'infoInstallBtn'].forEach(id => {
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
      ['installMenuBtn', 'headerInstallBtn', 'infoInstallBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      });
    }
    if (isIOS() && !isStandalone() && !localStorage.getItem('installDismissed')) {
      setTimeout(showIOSModal, 5000);
    }
  });

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SECTION_TITLES = {
    events:  "Events This Weekend — What's On Wellington",
    about:   "About — What's On Wellington",
  };

  // Event categories, shown as the "Show" filter. Every event has exactly one.
  // Keep in step with the filter buttons in index.html, the admin form and
  // scripts/validate.js.
  const EVENT_CATEGORIES = {
    music:       'Concerts & Gigs',
    festivals:   'Festivals & Lifestyle',
    sports:      'Sports & Outdoors',
    exhibitions: 'Exhibitions',
    workshops:   'Workshops, Conferences & Classes',
    food:        'Food & Drink',
  };
  // Events saved before categories existed fall back on their type
  const TYPE_TO_CATEGORY = {
    music: 'music', culture: 'music', festival: 'festivals', market: 'festivals',
    outdoor: 'sports', kids: 'festivals', whanau: 'festivals', other: 'festivals',
  };
  function eventCategory(ev) {
    return EVENT_CATEGORIES[ev.category] ? ev.category : (TYPE_TO_CATEGORY[ev.type] || 'festivals');
  }
  // Filter values: 'all', a category, or 'rainy' (anything marked indoor)
  const CATEGORIES = ['all', ...Object.keys(EVENT_CATEGORIES), 'rainy'];

  let currentRegion = 'all';
  let currentCategory = 'all';

  // Generate a 2-stop srcset from a Wikimedia thumb URL by swapping the width token.
  // Input:  .../thumb/a/ab/File.jpg/960px-File.jpg
  // Output: ".../480px-File.jpg 480w, .../960px-File.jpg 960w"
  function wikimediaSrcset(url) {
    const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/thumb\/[^/]+\/[^/]+\/[^/]+\/)(\d+)px-(.+)$/);
    if (!m) return '';
    const [, base, , name] = m;
    return `${base}480px-${name} 480w, ${url} 960w`;
  }

  // Shared onerror: hides broken img and marks the wrap so CSS can show a fallback state.
  function onImgError(img) {
    img.onerror = null;
    img.parentElement.classList.add('img-failed');
    img.remove();
  }

  // Walk all img.card-img in `container` (or entire document) and:
  //   • add width/height if missing  • add Wikimedia srcset if not already set
  //   • set onerror/onload  • add .loaded immediately for already-cached images
  function enhanceStaticImages(container) {
    const root = container || document;
    root.querySelectorAll('img.card-img').forEach(img => {
      if (!img.getAttribute('width'))  img.setAttribute('width',  '960');
      if (!img.getAttribute('height')) img.setAttribute('height', '540');
      if (!img.onerror) img.onerror = function() { onImgError(this); };
      // Fade-in: add .loaded when image resolves; handle already-cached images
      if (!img.onload) img.onload = function() { this.classList.add('loaded'); };
      if (img.complete) img.classList.add('loaded');
      if (!img.srcset) {
        const ws = wikimediaSrcset(img.getAttribute('src') || '');
        if (ws) {
          img.srcset = ws;
          img.sizes  = '(max-width:640px) calc(100vw - 32px), 400px';
        }
      }
    });
  }

  // Returns the URL only if it is http(s); blocks javascript:, data: etc.
  function safeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url, location.href);
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (e) { return ''; }
  }

  function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  // Enhance static HTML event cards with ARIA attributes.
  function enhanceCardAccessibility(container) {
    const root = container || document;
    root.querySelectorAll('.card').forEach((card, i) => {
      // Add role="article" to div.card elements (article elements already have implicit role)
      if (card.tagName !== 'ARTICLE' && !card.getAttribute('role')) {
        card.setAttribute('role', 'article');
      }
      // aria-labelledby pointing to the card title
      const titleEl = card.querySelector('.card-title');
      if (titleEl && !titleEl.id) {
        const uid = 'ctitle-' + i + '-' + Math.random().toString(36).slice(2, 7);
        titleEl.id = uid;
        if (!card.getAttribute('aria-labelledby')) card.setAttribute('aria-labelledby', uid);
      }
      // Hide decorative meta icons from screen readers
      card.querySelectorAll('.meta-icon').forEach(icon => {
        if (!icon.getAttribute('aria-hidden')) icon.setAttribute('aria-hidden', 'true');
      });
      // Fix "🔥 Pick" badge so screen readers say "Editor's pick" not "fire emoji Pick"
      card.querySelectorAll('.badge-hot').forEach(badge => {
        if (!badge.querySelector('.sr-only')) {
          badge.innerHTML = '<span aria-hidden="true">🔥</span><span class="sr-only">Editor\'s pick</span>';
        }
      });
    });
  }

  // Set the first 2 visible card images in the active weekend panel to eager + high priority.
  function setEagerImages() {
    const panel = document.querySelector('.weekend-panel.active');
    if (!panel) return;
    panel.querySelectorAll('img.card-img').forEach((img, i) => {
      if (i < 2) {
        img.loading = 'eager';
        if (i === 0) img.setAttribute('fetchpriority', 'high');
      } else {
        img.loading = 'lazy';
      }
    });
  }

  const generatedImageCredit = '<span class="event-image-credit">AI-generated image</span>';

  // For locally-hosted images (path starts with "images/"), emit a <picture>
  // element with WebP source + JPEG fallback.  Pass useThumb=true to use the
  // 400 px thumbnail variant (highlights carousel).
  function localImgHTML(base, altEsc, useThumb, generated) {
    const src = useThumb ? `${base}-thumb` : base;
    return `<div class="card-img-wrap"><picture><source srcset="${src}.webp" type="image/webp"><img class="card-img" src="${src}.jpg" width="960" height="540" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="onImgError(this)" alt="${altEsc}"></picture>${generated ? generatedImageCredit : ''}</div>`;
  }

  function cardImgHTML(url, alt, useThumb, generated) {
    if (!url) return '';
    const altEsc = (alt || '').replace(/"/g, '&quot;');

    // Local repo image — no external request, no srcset needed
    if (url.startsWith('images/')) {
      const base = url.replace(/\.(webp|jpe?g|png)$/i, '');
      return localImgHTML(base, altEsc, useThumb, generated);
    }

    const esc = url.replace(/"/g, '&quot;');
    const ws = wikimediaSrcset(url);
    const srcsetAttr = ws ? ` srcset="${ws}" sizes="(max-width:640px) calc(100vw - 32px), 400px"` : '';
    return `<div class="card-img-wrap"><img class="card-img" src="${esc}"${srcsetAttr} width="960" height="540" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="onImgError(this)" alt="${altEsc}"></div>`;
  }

  // ── Focus trap helpers ──
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

  function observeCards(container) {
    if (!window.IntersectionObserver) {
      container.querySelectorAll('.card').forEach(c => c.classList.add('revealed'));
      return;
    }
    const cards = [...container.querySelectorAll('.card:not(.revealed)')];
    if (!cards.length) return;
    let revealCount = 0;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        entry.target.style.transitionDelay = Math.min(revealCount, 6) * 50 + 'ms';
        entry.target.classList.add('revealed');
        revealCount++;
      });
    }, { threshold: 0.05 });
    cards.forEach(card => obs.observe(card));
  }

  function toggleInfoPopover() {
    const open = document.getElementById('infoPopover').classList.toggle('open');
    document.getElementById('infoPopoverOverlay').classList.toggle('open', open);
  }
  function closeInfoPopover() {
    document.getElementById('infoPopover').classList.remove('open');
    document.getElementById('infoPopoverOverlay').classList.remove('open');
  }

  function showSectionFromMenu(section) {
    showSection(section);
  }

  // ── URL state (?s=section&r=region) ──
  function updateHash(section) {
    try {
      const params = new URLSearchParams();
      if (section && section !== 'events') params.set('s', section);
      if (currentRegion !== 'all') params.set('r', currentRegion);
      if (currentCategory !== 'all') params.set('c', currentCategory);
      history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    } catch (e) {
      // Silently ignore — happens when opened as a local file rather than served
    }
  }

  function readHash() {
    const params = new URLSearchParams(window.location.search);
    const section  = SECTION_TITLES[params.get('s')] ? params.get('s') : 'events';
    const region   = params.get('r') || 'all';
    const category = CATEGORIES.includes(params.get('c')) ? params.get('c') : 'all';
    return { section, region, category };
  }

  // Sections: events (the main page) and about
  function showSection(section) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    // The filter bars only apply to events
    document.querySelectorAll('.filter-bar').forEach(bar => bar.hidden = section !== 'events');
    document.title = SECTION_TITLES[section];
    applyFilter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHash(section);
    observeCards(document.getElementById('section-' + section));
  }

  // Highlight the tab for a weekend panel: its own tab, or the School
  // Holidays tab (plus that weekend's chip) when it falls in the holidays.
  function markActiveTab(panel) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    const inHoliday = !!panel.dataset.holiday;
    const btn = document.getElementById(inHoliday ? 'holidayTab' : 'wtab-' + panel.id);
    btn?.classList.add('active');
    btn?.setAttribute('aria-selected', 'true');
    const bar = document.getElementById('holidayBar');
    if (bar) {
      bar.hidden = !inHoliday;
      bar.querySelectorAll('.holiday-chip').forEach(chip => {
        const on = chip.dataset.panel === panel.id;
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', String(on));
      });
    }
    return btn;
  }

  function showTab(id, btn, dir) {
    document.querySelectorAll('.weekend-panel').forEach(p => {
      p.classList.remove('active', 'slide-left', 'slide-right');
    });
    const panel = document.getElementById(id);
    panel.classList.add('active');
    if (dir === 1)  panel.classList.add('slide-right');
    if (dir === -1) panel.classList.add('slide-left');
    markActiveTab(panel)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    buildHighlightsRow();
    // Show/hide the "past weekend" banner and muted-link state
    const isPast = !!panel.dataset.pastWeekend;
    const banner = document.getElementById('pastWeekendBanner');
    if (banner) banner.hidden = !isPast;
    document.getElementById('section-events')?.classList.toggle('showing-past-weekend', isPast);
    applyFilter();
    updateWeekendNav();
    // Reset day selector to first pill in newly active panel
    const activePanel = document.querySelector('.weekend-panel.active');
    if (activePanel) {
      const pills = activePanel.querySelectorAll('.day-pill');
      pills.forEach((p, i) => p.classList.toggle('active', i === 0));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateWeekend(dir) {
    const panels = [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .filter(p => !p.dataset.pastWeekend);
    const active = document.querySelector('.weekend-panel.active');
    const idx = panels.indexOf(active);
    const target = panels[idx + dir];
    if (!target) return;
    const btn = document.getElementById('wtab-' + target.id);
    if (btn) showTab(target.id, btn, dir);
  }

  function updateWeekendNav() {
    const panels = [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .filter(p => !p.dataset.pastWeekend);
    const active = document.querySelector('.weekend-panel.active');
    const idx = panels.indexOf(active);
    const prevBtn = document.getElementById('wnavPrev');
    const nextBtn = document.getElementById('wnavNext');
    const posEl   = document.getElementById('wnavPos');
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= panels.length - 1;
    if (posEl)   posEl.textContent = panels.length > 0 ? `${idx + 1} of ${panels.length}` : '';
  }

  function setPressed(selector, isActive) {
    document.querySelectorAll(selector).forEach(b => {
      const active = isActive(b);
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function filterRegion(region) {
    currentRegion = region;
    setPressed('[data-filter-region]', b => b.dataset.filterRegion === region);
    applyFilter();
    buildHighlightsRow();
    updateHash('events');
  }

  function filterCategory(category) {
    currentCategory = category;
    setPressed('[data-filter-category]', b => b.dataset.filterCategory === category);
    applyFilter();
    buildHighlightsRow();
    updateHash('events');
  }

  function cardMatchesFilters(card) {
    if (currentRegion !== 'all' && card.dataset.region !== currentRegion) return false;
    if (currentCategory === 'rainy') return card.dataset.indoor === '1';
    if (currentCategory !== 'all') return card.dataset.category === currentCategory;
    return true;
  }



  function applyFilter() {
    const activePanel = document.querySelector('.weekend-panel.active');
    if (!activePanel) return;
    activePanel.querySelectorAll('.card:not(.dedup-hidden)').forEach(card => {
      card.classList.toggle('hidden', !cardMatchesFilters(card));
    });

    // A day whose events are all filtered out loses its heading too.
    // (Days that never had events are collapsed by CSS :empty.)
    let anyVisible = false, anyCards = false;
    activePanel.querySelectorAll('.events-grid').forEach(grid => {
      const cards = grid.querySelectorAll('.card:not(.dedup-hidden)');
      const visible = grid.querySelectorAll('.card:not(.dedup-hidden):not(.hidden)');
      anyCards = anyCards || cards.length > 0;
      anyVisible = anyVisible || visible.length > 0;
      const filteredOut = cards.length > 0 && visible.length === 0;
      grid.classList.toggle('filtered-out', filteredOut);
      const label = grid.previousElementSibling;
      if (label?.classList.contains('day-label')) label.classList.toggle('filtered-out', filteredOut);
    });
    activePanel.querySelector('.day-selector')?.classList.toggle('filtered-out', !anyVisible);

    // One message for the whole weekend, with a way back to everything
    activePanel.querySelector('.no-results')?.remove();
    if (anyCards && !anyVisible) {
      const what = currentCategory === 'rainy' ? 'No indoor events'
        : EVENT_CATEGORIES[currentCategory] ? `No ${EVENT_CATEGORIES[currentCategory].toLowerCase()} events` : 'No events match';
      const where = currentRegion === 'all' ? '' : ' in this area';
      const msg = document.createElement('div');
      msg.className = 'no-results';
      msg.innerHTML = `<p>${what}${where} this weekend.</p><button type="button" class="no-results-reset">Show all events</button>`;
      msg.querySelector('button').addEventListener('click', () => { filterCategory('all'); filterRegion('all'); });
      activePanel.append(msg);
    }
  }

  // ── Restore state from URL on load ──
  document.addEventListener('DOMContentLoaded', () => {
    const { section, region, category } = readHash();
    if (document.querySelector(`[data-filter-region="${region}"]`)) filterRegion(region);
    filterCategory(category);
    showSection(section);

    // ── Arrow key navigation for tablists ──
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
      tablist.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const tabs = [...tablist.querySelectorAll('[role="tab"]')].filter(t => !t.hidden);
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
  // ✏️  FIREBASE — events added in the admin portal, and the About text
  //
  //  The public site only reads Firestore. Lock it down with security rules:
  //  the admin email check in admin/admin.js is client-side only, so the
  //  rules are what actually stop strangers writing events.
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
  let db = null;
  try {
    if (!firebaseConfig.apiKey.startsWith('YOUR_')) {
      firebase.initializeApp(firebaseConfig);
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
    festival: { strip: 'strip-festival', label: '<span aria-hidden="true">🎪</span> Festival' },
    culture:  { strip: 'strip-culture',  label: '<span aria-hidden="true">🎨</span> Arts & Culture' },
    market:   { strip: 'strip-market',   label: '<span aria-hidden="true">🛒</span> Market' },
    music:    { strip: 'strip-music',    label: '<span aria-hidden="true">🎵</span> Music' },
    outdoor:  { strip: 'strip-outdoor',  label: '<span aria-hidden="true">🏃</span> Outdoor' },
    whanau:   { strip: 'strip-whanau',   label: '<span aria-hidden="true">👨‍👩‍👧</span> whānau' },
  };

  // ── Event links & sharing ────────────────────────────────────────────────────
  // Every event gets a stable id from its title and date, e.g.
  // "dermot-kennedy-the-weight-of-the-woods-2026-11-27", so ?e=<id> can open
  // that event's card directly. Shared links use it.
  const DAY_OFFSETS = { fri: -1, sat: 0, sun: 1, mon: 2, tue: 3 };

  // An event's calendar date: an explicit `date` (needed for Wed/Thu events in
  // the school holidays), else its weekend Saturday plus the day offset.
  function eventDate(ev) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ev.date || '')) return ev.date;
    if (!ev.weekend) return '';
    const [y, m, d] = ev.weekend.split('-').map(Number);
    return _ds(new Date(y, m - 1, d + (DAY_OFFSETS[ev.day] ?? 0)));
  }

  function eventSlug(ev) {
    const name = String(ev.title || 'event').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
    const iso = eventDate(ev);
    return iso ? `${name}-${iso}` : name;
  }

  function eventLink(card) {
    return `${location.origin}${location.pathname}?e=${encodeURIComponent(card.dataset.eventId)}`;
  }

  const SHARE_ICON = '<svg class="share-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

  function trackShare(method, card) {
    try { if (typeof gtag === 'function') gtag('event', 'share', { method, content_type: 'event', item_id: card.dataset.eventId }); } catch (e) {}
  }

  // Phones: the native share sheet (Messenger, WhatsApp, Messages…).
  // Elsewhere: copy the link.
  async function shareEvent(card) {
    const url = eventLink(card);
    const title = card.querySelector('.card-title')?.textContent.trim() || "What's On Wellington";
    let when = card.querySelector('.meta-row')?.textContent.replace('🕐', '').trim() || '';
    // Times like "5:00 pm" need the date in front to make sense in a message
    if (!MONTHS_FULL.some(mo => when.includes(mo)) && card.dataset.date) {
      const [y, m, d] = card.dataset.date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const day = date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });
      when = when ? `${day} · ${when}` : day;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text: when ? `${title} — ${when}` : title, url });
        trackShare('native', card);
      } catch (e) { /* closed the share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied — paste it anywhere to share');
      trackShare('copy', card);
    } catch (e) {
      window.prompt('Copy this link to share the event:', url);
      trackShare('prompt', card);
    }
  }

  // ?e=<id>: open that event once its card exists. Firestore events arrive
  // after the static ones, so this is retried when they load.
  let pendingEventLink = new URLSearchParams(location.search).get('e');

  function openLinkedEvent() {
    if (!pendingEventLink) return;
    const card = [...document.querySelectorAll('.card[data-event-id]')]
      .find(c => c.dataset.eventId === pendingEventLink && !c.classList.contains('dedup-hidden'));
    if (!card) return;
    pendingEventLink = null;
    const panel = card.closest('.weekend-panel');
    if (panel && !panel.classList.contains('active')) showTab(panel.id);
    scrollToPickCard(card);
  }

  function buildEventCardHTML(ev) {
    const tm = EVENT_TYPE_MAP[ev.type] || { strip: 'strip-other', label: '<span aria-hidden="true">📅</span> Event' };
    const region  = ev.region || 'all';
    const idSuffix = ev._static ? escHtml(ev._staticId || 'sx') : escHtml(ev.id || 'fx');
    const titleId  = `card-title-${idSuffix}`;
    const idAttr   = ev._static
      ? `data-static="${escHtml(ev._staticId || '')}"`
      : `data-firestore="${escHtml(ev.id || '')}"`;

    // Strip: prefer inline style (custom), then explicit class, then type-mapped class
    const stripHtml = ev.stripStyle
      ? `<div class="card-strip" style="${escHtml(ev.stripStyle)}"></div>`
      : ev.stripClass
        ? `<div class="card-strip ${escHtml(ev.stripClass)}"></div>`
        : `<div class="card-strip ${tm.strip}"></div>`;

    // Category label
    const catLabel = ev.label ? escHtml(ev.label) : tm.label;   // ev.label is data; tm.label is trusted markup
    const catStyle = ev.labelStyle ? ` style="${escHtml(ev.labelStyle)}"` : '';

    // Badges (free → ticketed → family → pick, in display order)
    const badgeParts = [];
    if (ev.free)     badgeParts.push(`<span class="badge badge-free">${escHtml(ev.free)}</span>`);
    if (ev.ticketed) badgeParts.push(`<span class="badge badge-ticketed">Ticketed</span>`);
    if (ev.family)   badgeParts.push(`<span class="badge badge-family">${escHtml(ev.family)}</span>`);
    if (ev.pick)     badgeParts.push(`<span class="badge badge-hot"><span aria-hidden="true">🔥</span><span class="sr-only">Editor's pick</span></span>`);
    const badgesHtml = badgeParts.length ? `<div class="card-badges">${badgeParts.join('')}</div>` : '';

    const mapUrl = safeUrl(ev.mapUrl);
    const venue = escHtml(ev.venue || '');
    const venueHtml = mapUrl ? `<a href="${escHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">${venue}</a>` : venue;
    const meta = [
      ev.time  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">🕐</span>${escHtml(ev.time)}</div>`  : '',
      ev.venue ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">📍</span>${venueHtml}</div>` : '',
      ev.cost  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">💰</span>${escHtml(ev.cost)}</div>`  : '',
    ].join('');
    const detailsUrl = safeUrl(ev.url);
    const detailsLabel = detailsUrl.startsWith('https://www.google.com/search?')
      ? 'Search for details'
      : 'View event';
    const eventId = eventSlug(ev);
    const footer = (detailsUrl
      ? `<a class="event-btn" href="${escHtml(detailsUrl)}" target="_blank" rel="noopener noreferrer">${detailsLabel} <span aria-hidden="true">↗</span><span class="sr-only"> (opens ${escHtml(extractDomain(detailsUrl))} in a new tab)</span></a>`
      : '') +
      `<button type="button" class="share-btn" aria-label="Share ${escHtml(ev.title)}">${SHARE_ICON}<span class="share-btn-label">Share</span></button>`;
    const tierClass = ev.pick ? 'card-featured' : 'card-standard';
    const tierAttr  = ev.pick ? 'featured'      : 'standard';
    return `
      <article class="card ${tierClass}${ev.imgPoster ? ' card-poster' : ''}" aria-labelledby="${titleId}" data-tier="${tierAttr}" data-region="${escHtml(region)}" data-event-id="${escHtml(eventId)}" ${idAttr} data-weekend="${escHtml(ev.weekend || '')}" data-day="${escHtml(ev.day || 'sat')}" data-date="${eventDate(ev)}" data-category="${eventCategory(ev)}"${ev.img ? ` data-img="${escHtml(ev.img)}"` : ''}${ev.imgGenerated ? ' data-img-generated="1"' : ''}${ev.pick ? ' data-pick="1"' : ''}${ev.indoor ? ' data-indoor="1"' : ''}>
        ${stripHtml}
        ${ev.img ? cardImgHTML(ev.img, ev.title, false, ev.imgGenerated) : ''}
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-cat"${catStyle}>${catLabel}</div>
              <div class="card-title" id="${titleId}">${escHtml(ev.title)}</div>
            </div>
            ${badgesHtml}
          </div>
          <button type="button" class="card-toggle" aria-expanded="false" aria-controls="${titleId}-more" aria-label="Show details for ${escHtml(ev.title)}"></button>
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          ${ev.description ? `<div class="card-desc" id="${titleId}-more">${escHtml(ev.description)}</div>` : `<div id="${titleId}-more" hidden></div>`}
        </div>
        <div class="card-footer">${footer}</div>
      </article>`;
  }

  function buildHighlightsRow() {
    const track   = document.getElementById('highlightsTrack');
    const section = document.getElementById('highlights-section');
    if (!track || !section) return;

    // Picks follow the weekend being viewed
    const panel = document.querySelector('.weekend-panel.active')
      || document.querySelector('.weekend-panel[data-weekend]:not([data-past-weekend])');
    if (!panel) { section.style.display = 'none'; return; }

    const thisWeekend = [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .find(p => !p.dataset.pastWeekend);
    const eyebrow = section.querySelector('.highlights-eyebrow');
    if (eyebrow) {
      eyebrow.textContent = panel === thisWeekend
        ? "🔥 This Weekend's Picks"
        : `🔥 Picks for ${weekendRangeLabel(panel)}`;
    }

    const picks = [...panel.querySelectorAll('.card:not(.dedup-hidden)')]
      .filter(c => (c.querySelector('.badge-hot') || c.dataset.pick === '1') && cardMatchesFilters(c));

    track.innerHTML = '';
    if (!picks.length) { section.style.display = 'none'; return; }
    section.style.display = '';

    picks.forEach((card, pickIdx) => {
      const title     = card.querySelector('.card-title')?.textContent.trim() || '';
      const img       = card.dataset.img || '';
      const metaRows  = [...card.querySelectorAll('.meta-row')];
      const timeText  = metaRows[0]?.textContent.trim() || '';
      const venueText = metaRows[1]?.textContent.trim() || '';
      const el        = document.createElement('div');
      el.className    = 'highlight-card';
      const altH = escHtml(title);
      // Highlights are always above the fold — eager-load all of them; high-priority for the first.
      const loadAttr = 'eager';
      const prioAttr = pickIdx === 0 ? ' fetchpriority="high"' : '';
      let imgWrapHtml;
      if (!img) {
        imgWrapHtml = '<div class="highlight-card-img"></div>';
      } else if (img.startsWith('images/')) {
        const base = img.replace(/\.(webp|jpe?g|png)$/i, '');
        const credit = card.dataset.imgGenerated === '1' ? generatedImageCredit : '';
        imgWrapHtml = `<div class="highlight-card-img"><picture><source srcset="${base}-thumb.webp" type="image/webp"><img src="${base}-thumb.jpg" width="400" height="225" loading="${loadAttr}"${prioAttr} decoding="async" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.remove()" alt="${altH}"></picture>${credit}</div>`;
      } else {
        imgWrapHtml = `<div class="highlight-card-img"><img src="${img.replace(/"/g,'&quot;')}" width="400" height="225" loading="${loadAttr}"${prioAttr} decoding="async" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.remove()" alt="${altH}"></div>`;
      }
      el.innerHTML    = `
        ${imgWrapHtml}
        <div class="highlight-card-body">
          <div class="highlight-card-title">${escHtml(title)}</div>
          <div class="highlight-card-meta">
            ${timeText  ? `<span>${escHtml(timeText)}</span>`  : ''}
            ${venueText ? `<span>${escHtml(venueText)}</span>` : ''}
          </div>
        </div>`;
      el.onclick = () => scrollToPickCard(card);
      track.appendChild(el);
    });
  }

  function scrollToPickCard(card) {
    const eventsSection = document.getElementById('section-events');
    // Switch to Events section without the scroll-to-top that showSection() applies
    if (!eventsSection.classList.contains('active')) {
      document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      eventsSection.classList.add('active');
      document.querySelectorAll('.filter-bar').forEach(bar => bar.hidden = false);
      applyFilter();
      updateHash('events');
    }
    // Ensure card's weekend panel is active
    const cardPanel = card.closest('.weekend-panel');
    if (cardPanel && !cardPanel.classList.contains('active')) {
      document.querySelectorAll('.weekend-panel').forEach(p => p.classList.remove('active'));
      cardPanel.classList.add('active');
      markActiveTab(cardPanel);
      applyFilter();
    }
    if (card.classList.contains('hidden')) {
      filterCategory('all');
      filterRegion('all');
    }
    if (compactCards.matches) setCardOpen(card, true);
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('card-flash');
      card.addEventListener('animationend', () => card.classList.remove('card-flash'), { once: true });
    });
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Returns true from Tuesday 00:00 onwards after a Fri–Mon block
  function weekendIsPast(satDateStr) {
    if (!satDateStr) return false;
    const tuesday = new Date(satDateStr + 'T00:00:00');
    tuesday.setDate(tuesday.getDate() + 3); // Sat+3 = Tue
    tuesday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= tuesday;
  }

  // A panel is past once its last day is over. Generated panels date their
  // day labels; the older hand-written ones fall back to the Fri–Mon rule.
  function panelIsPast(panel) {
    const labels = panel.querySelectorAll('.day-label[data-date]');
    if (!labels.length) return weekendIsPast(panel.dataset.weekend);
    return _ds(new Date()) > labels[labels.length - 1].dataset.date;
  }

  // Update tab button labels dynamically from panel data-weekend attributes
  function updateTabLabels() {
    const countBadge = n => n > 0 ? `<span class="tab-count">${n}</span>` : '';
    const panelCount = panel => panel.querySelectorAll('.card:not(.dedup-hidden)').length;
    let visibleCount = 0;
    document.querySelectorAll('.tabs-inner .tab-btn').forEach(btn => {
      if (btn.dataset.pastWeekend || btn.hidden) return; // past tabs keep their date labels
      visibleCount++;
      if (btn.id === 'holidayTab') {
        const total = [...document.querySelectorAll('.weekend-panel[data-holiday]')].reduce((n, p) => n + panelCount(p), 0);
        const lead = visibleCount === 1 ? '<span class="tab-live-dot"></span>' : '';
        btn.innerHTML = `${lead}<span aria-hidden="true">🎄</span> School Holidays · ${SCHOOL_HOLIDAYS.label}${countBadge(total)}`;
        return;
      }
      const panel = document.getElementById(btn.getAttribute('aria-controls') || '');
      if (!panel || !panel.dataset.weekend) return;
      const datePart = weekendRangeLabel(panel) + countBadge(panelCount(panel));
      if (visibleCount === 1)      btn.innerHTML = `<span class="tab-live-dot"></span>This Weekend · ${datePart}`;
      else if (visibleCount === 2) btn.innerHTML = `Next Weekend · ${datePart}`;
      else                         btn.innerHTML = datePart;
    });
    document.querySelectorAll('.holiday-chip').forEach(chip => {
      const panel = document.getElementById(chip.dataset.panel);
      if (panel) chip.innerHTML = weekendRangeLabel(panel) + countBadge(panelCount(panel));
    });
  }

  // Hide tabs and panels for weekends that have already passed
  function setupPastWeekendTabs() {
    const tabsInner = document.querySelector('.tabs-inner');
    if (!tabsInner) return;

    const pastBtns = [];
    let firstFuture = null;

    document.querySelectorAll('.weekend-panel[data-weekend]').forEach(panel => {
      const btn = document.getElementById('wtab-' + panel.id);
      if (panelIsPast(panel)) {
        panel.dataset.pastWeekend = '1';
        if (btn) {
          btn.dataset.pastWeekend = '1';
          pastBtns.push(btn);
        }
      } else if (!firstFuture) {
        firstFuture = panel;
      }
    });

    if (pastBtns.length) {
      // Add "Past weekends" toggle and collapsible group to the tab bar
      const toggle = document.createElement('button');
      toggle.className = 'past-tabs-toggle';
      toggle.id = 'pastTabsToggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = 'Past weekends <span class="past-tabs-chevron">▾</span>';
      toggle.onclick = togglePastTabs;

      const group = document.createElement('div');
      group.className = 'past-tabs-group';
      group.id = 'pastTabsGroup';

      // Sort most-recent past first
      pastBtns.sort((a, b) => {
        const pa = document.getElementById(a.getAttribute('aria-controls'));
        const pb = document.getElementById(b.getAttribute('aria-controls'));
        return (pb?.dataset.weekend || '').localeCompare(pa?.dataset.weekend || '');
      });
      pastBtns.forEach(btn => group.appendChild(btn));

      tabsInner.appendChild(toggle);
      tabsInner.appendChild(group);
    }

    // Inject the "past weekend" banner once into the events main area
    const evMain = document.querySelector('#section-events main');
    if (evMain && !document.getElementById('pastWeekendBanner')) {
      const banner = document.createElement('div');
      banner.id = 'pastWeekendBanner';
      banner.className = 'past-weekend-banner';
      banner.hidden = true;
      banner.textContent = '📅 This weekend has passed — showing for reference only.';
      evMain.prepend(banner);
    }

    // If the active panel is past, switch to the first future panel
    const active = document.querySelector('.weekend-panel.active');
    if (active?.dataset.pastWeekend && firstFuture) {
      active.classList.remove('active');
      firstFuture.classList.add('active');
    }
  }

  // ── School holidays ──────────────────────────────────────────────────────────
  // The summer break gets one 🎄 tab in the weekend bar instead of a tab per
  // weekend; choosing it opens a row of the holiday weekends to pick from.
  // Term 4 ends by Fri 18 Dec 2026; Term 1 2027 starts between Thu 28 Jan and
  // Wed 3 Feb depending on the school (NZ Gazette). Update each year.
  // Holiday weeks run Saturday to Friday and show every day, not just the
  // weekend: firstDay–lastDay is the span shown.
  const SCHOOL_HOLIDAYS = {
    firstWeekend: '2026-12-19',   // Saturdays, inclusive
    lastWeekend:  '2027-01-30',
    firstDay:     '2026-12-19',
    lastDay:      '2027-02-02',
    label:        '19 Dec – 2 Feb',
    note:         'Most schools go back between 28 Jan and 3 Feb',
  };

  function setupSchoolHolidays() {
    const { firstWeekend, lastWeekend } = SCHOOL_HOLIDAYS;
    const panels = [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .filter(p => !p.dataset.pastWeekend && p.dataset.weekend >= firstWeekend && p.dataset.weekend <= lastWeekend);
    if (!panels.length) return;

    panels.forEach(p => {
      p.dataset.holiday = '1';
      const b = document.getElementById('wtab-' + p.id);
      if (b) b.hidden = true;
    });

    const tab = document.createElement('button');
    tab.className = 'tab-btn holiday-tab';
    tab.id = 'holidayTab';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.addEventListener('click', () => {
      const current = panels.find(p => p.classList.contains('active')) || panels[0];
      showTab(current.id);
    });
    document.getElementById('wtab-' + panels[0].id)?.before(tab);

    const bar = document.createElement('div');
    bar.className = 'holiday-bar';
    bar.id = 'holidayBar';
    bar.hidden = true;
    bar.innerHTML = `<div class="holiday-bar-inner">
        <div class="holiday-bar-title"><span aria-hidden="true">🎄</span> School holidays <span class="holiday-bar-note">${escHtml(SCHOOL_HOLIDAYS.note)}</span></div>
        <div class="holiday-chips" role="group" aria-label="Holiday weekends">
          ${panels.map(p => `<button type="button" class="holiday-chip" data-panel="${p.id}" aria-pressed="false"></button>`).join('')}
        </div>
      </div>`;
    bar.addEventListener('click', e => {
      const chip = e.target.closest('.holiday-chip');
      if (chip) showTab(chip.dataset.panel);
    });
    document.querySelector('.tabs-inner')?.after(bar);

    // Header link — the holidays are the season's big event
    const cta = document.getElementById('holidayCta');
    if (cta) {
      cta.querySelector('.holiday-cta-text').textContent = `School holidays · ${SCHOOL_HOLIDAYS.label}`;
      cta.hidden = false;
      cta.addEventListener('click', e => { e.preventDefault(); openSchoolHolidays(); });
    }
    if (location.hash === '#school-holidays') openSchoolHolidays();
  }

  // Show the holidays tab and bring the weekend bar to the top of the screen
  function openSchoolHolidays() {
    const panels = [...document.querySelectorAll('.weekend-panel[data-holiday]')];
    if (!panels.length) return;
    if (!document.getElementById('section-events').classList.contains('active')) showSection('events');
    const current = panels.find(p => p.classList.contains('active')) || panels[0];
    showTab(current.id);
    const bars = document.querySelectorAll('.filter-bar');
    const above = bars[bars.length - 1];
    const y = above ? above.getBoundingClientRect().bottom + window.scrollY : 0;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // Fri–Mon label for a weekend panel, e.g. "18–21 Dec" or "29 Jan–1 Feb"
  function weekendRangeLabel(panel) {
    if (panel.dataset.holiday) {
      const labels = panel.querySelectorAll('.day-label[data-date]');
      if (labels.length) {
        const [a, b] = [labels[0], labels[labels.length - 1]].map(l => {
          const [y, m, d] = l.dataset.date.split('-').map(Number);
          return new Date(y, m - 1, d);
        });
        return a.getMonth() === b.getMonth()
          ? `${a.getDate()}–${b.getDate()} ${MONTHS_SHORT[a.getMonth()]}`
          : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]}–${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`;
      }
    }
    const sat = new Date(panel.dataset.weekend + 'T00:00:00');
    const fri = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() - 1);
    const mon = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 2);
    return mon.getMonth() === fri.getMonth()
      ? `${fri.getDate()}–${mon.getDate()} ${MONTHS_SHORT[fri.getMonth()]}`
      : `${fri.getDate()} ${MONTHS_SHORT[fri.getMonth()]}–${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]}`;
  }

  function togglePastTabs() {
    const group  = document.getElementById('pastTabsGroup');
    const toggle = document.getElementById('pastTabsToggle');
    if (!group || !toggle) return;
    const isOpen = group.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.querySelector('.past-tabs-chevron').textContent = isOpen ? '▴' : '▾';
  }

  function injectEventCard(ev) {
    // Generated panels label each day with its date, so route by date first:
    // that is what puts a Wednesday school-holiday event on its own day.
    const date = eventDate(ev);
    const dayLabel = date && document.querySelector(`.weekend-panel .day-label[data-date="${date}"]`);
    const dayGrid = dayLabel?.nextElementSibling;
    if (dayGrid?.classList.contains('events-grid')) {
      dayGrid.insertAdjacentHTML('beforeend', buildEventCardHTML(ev));
      return;
    }
    const panel = document.querySelector(`.weekend-panel[data-weekend="${ev.weekend}"]`);
    if (!panel) {
      console.warn(`[WoW] No panel for weekend "${ev.weekend}" — "${ev.title || ev.id}" not shown. Must be a Saturday in YYYY-MM-DD format within the generated range.`);
      return;
    }
    // Route by the day label's class, never by grid position — panels don't all
    // have the same set of days, and a positional lookup silently misfiles cards.
    const label = panel.querySelector(`.day-label.day-${ev.day || 'sat'}`)
               || panel.querySelector('.day-label.day-sat');
    const grid = label && label.nextElementSibling;
    if (!grid || !grid.classList.contains('events-grid')) return;
    grid.insertAdjacentHTML('beforeend', buildEventCardHTML(ev));
  }

  // ── Day Selector ─────────────────────────────────────────────────────────────

  const _DAY_OFFSET = { 'day-fri': -1, 'day-sat': 0, 'day-sun': 1, 'day-mon': 2, 'day-tue': 3 };
  const _DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let   _dsObserver = null;

  function _ds(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function buildDaySelectors() {
    if (_dsObserver) { _dsObserver.disconnect(); _dsObserver = null; }

    document.querySelectorAll('.weekend-panel[data-weekend]').forEach(panel => {
      panel.querySelector('.day-selector')?.remove();

      const satDate = new Date(panel.dataset.weekend + 'T00:00:00');
      const banner  = panel.querySelector('.banner, .banner-sponsored');
      // Hand-written weekends put the day pills under their banner; school
      // holiday weeks (up to 8 days) get them at the top of the panel.
      if (!banner && !panel.dataset.holiday) return;

      // Collect days that have visible event cards
      const days = [];
      panel.querySelectorAll('.day-label').forEach(label => {
        const grid = label.nextElementSibling;
        if (!grid?.classList.contains('events-grid')) return;
        let date;
        if (label.dataset.date) {
          const [y, m, d] = label.dataset.date.split('-').map(Number);
          date = new Date(y, m - 1, d);
        } else {
          const dayClass = [...label.classList].find(c => c in _DAY_OFFSET);
          if (!dayClass) return;
          date = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate() + _DAY_OFFSET[dayClass]);
        }
        const ds    = _ds(date);
        const count = grid.querySelectorAll('.card:not(.dedup-hidden)').length;
        if (count === 0) return;
        label.dataset.date = ds;
        days.push({ ds, name: _DAY_SHORT[date.getDay()], num: date.getDate(), count, label });
      });

      if (days.length < 2) return;

      const sel = document.createElement('div');
      sel.className = 'day-selector';
      sel.setAttribute('aria-label', 'Jump to day');
      sel.innerHTML = days.map((d, i) =>
        `<button class="day-pill${i === 0 ? ' active' : ''}" data-date="${d.ds}" type="button">` +
          `<span class="day-pill-name">${d.name}</span>` +
          `<span class="day-pill-date">${d.num}</span>` +
          `<span class="day-pill-count">${d.count}</span>` +
        `</button>`
      ).join('');

      if (banner) banner.after(sel);
      else panel.prepend(sel);

      sel.addEventListener('click', e => {
        const pill = e.target.closest('.day-pill');
        if (!pill) return;
        sel.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const target = days.find(d => d.ds === pill.dataset.date);
        if (target) {
          const navH = document.querySelector('.tabs-bar')?.offsetHeight || 52;
          const y = target.label.getBoundingClientRect().top + window.scrollY - navH - 16;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });

    // Scroll-sync: update active pill as day headings enter view
    const navH = document.querySelector('.tabs-bar')?.offsetHeight || 52;
    _dsObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const label = entry.target;
        const panel = label.closest('.weekend-panel');
        if (!panel?.classList.contains('active')) return;
        const sel = panel.querySelector('.day-selector');
        if (!sel) return;
        const ds  = label.dataset.date;
        if (!ds) return;
        const pill = sel.querySelector(`.day-pill[data-date="${ds}"]`);
        if (pill) {
          sel.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
      });
    }, { rootMargin: `-${navH + 24}px 0px -52% 0px` });

    document.querySelectorAll('.weekend-panel .day-label[data-date]').forEach(l => _dsObserver.observe(l));
  }

  // ─────────────────────────────────────────────────────────────────────────────

  function loadStaticEvents() {
    if (typeof STATIC_EVENTS === 'undefined' || !STATIC_EVENTS.length) return;
    STATIC_EVENTS.forEach((ev, i) => {
      injectEventCard({ ...ev, _static: true, _staticId: `s${i}` });
    });
    applyFilter();
    updateTabLabels();
    buildHighlightsRow();
    buildDaySelectors();
    setEagerImages();
    const evSection = document.getElementById('section-events');
    if (evSection) observeCards(evSection);
  }

  function loadFirestoreEvents() {
    if (!firebaseReady) return;
    db.collection('events')
      .where('active', '==', true)
      .onSnapshot(snapshot => {
        // Remove previously injected Firestore cards
        document.querySelectorAll('.card[data-firestore]').forEach(el => el.remove());
        snapshot.docs.forEach(doc => injectEventCard({ id: doc.id, ...doc.data() }));

        // Dedup: hide static cards whose event now exists in Firestore
        const firestoreKeys = new Set(
          snapshot.docs.map(doc => {
            const d = doc.data();
            return `${(d.title || '').trim()}|${d.weekend || ''}|${d.day || 'sat'}`;
          })
        );
        document.querySelectorAll('.card[data-static]').forEach(card => {
          const titleEl = card.querySelector('.card-title');
          const key = `${(titleEl ? titleEl.textContent.trim() : '')}|${card.dataset.weekend || ''}|${card.dataset.day || 'sat'}`;
          card.classList.toggle('dedup-hidden', firestoreKeys.has(key));
        });

        applyFilter();
        updateTabLabels();
        buildHighlightsRow();
        buildDaySelectors();
        setEagerImages();       // re-run after Firestore cards are injected
        const evSection = document.getElementById('section-events');
        if (evSection) observeCards(evSection);
        openLinkedEvent();
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

  // ── Toast notification ──
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // Day groups in each weekend panel, with their offset from the Saturday
  const WEEKEND_DAYS = [
    { short: 'Fri', label: 'Friday',   offset: -1 },
    { short: 'Sat', label: 'Saturday', offset: 0 },
    { short: 'Sun', label: 'Sunday',   offset: 1 },
    { short: 'Mon', label: 'Monday',   offset: 2 },
    { short: 'Tue', label: 'Tuesday',  offset: 3 },
  ];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // The days a panel shows: Fri–Tue normally; in the school holidays every
  // day of the week (Sat–Fri), clipped to the holiday span.
  function panelDays(sat, satStr) {
    const at = offset => new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + offset);
    const { firstWeekend, lastWeekend, firstDay, lastDay } = SCHOOL_HOLIDAYS;
    if (satStr < firstWeekend || satStr > lastWeekend) return WEEKEND_DAYS.map(d => at(d.offset));
    const days = [];
    for (let i = -1; i <= 6; i++) {
      const d = at(i), iso = _ds(d);
      if (iso >= firstDay && iso <= lastDay && (i >= 0 || satStr === firstWeekend)) days.push(d);
    }
    return days;
  }

  // ── Generate weekend tabs + panels for the next 18 months ──
  function generateRemainingWeekends() {
    const existingPanels = [...document.querySelectorAll('.weekend-panel[data-weekend]')];
    if (existingPanels.length === 0) return;

    const tabsInner = document.querySelector('.tabs-inner');
    const mainEl    = document.querySelector('#section-events main');
    if (!tabsInner || !mainEl) return;


    // Start one week after the last existing hardcoded panel
    const lastSat = existingPanels[existingPanels.length - 1].dataset.weekend;
    const [ly, lm, ld] = lastSat.split('-').map(Number);
    let sat = new Date(ly, lm - 1, ld + 7);

    let idx = existingPanels.length + 1; // w6, w7, …

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() + 18);
    while (sat <= cutoff) {
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

      // Weekend panel with Fri–Tue day groups.
      // Empty groups are hidden by CSS (.day-label:has(+ .events-grid:empty)).
      const panel = document.createElement('div');
      panel.className = 'weekend-panel';
      panel.id = id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'wtab-' + id);
      panel.setAttribute('data-weekend', satStr);
      panel.innerHTML = panelDays(sat, satStr)
        .map(d => {
          const name = DAY_NAMES[d.getDay()];
          return `<div class="day-label day-${name.slice(0, 3).toLowerCase()}" data-date="${_ds(d)}"><span class="pip"></span>${name} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]}<span class="line"></span></div>` +
                 `<div class="events-grid"></div>`;
        }).join('');
      mainEl.appendChild(panel);

      sat = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 7);
      idx++;
    }
  }

  // ── Collapsible event cards (phones) ──
  // On narrow screens cards start as a compact row (thumbnail, title, time,
  // venue). Tapping one expands it to the full card and closes any other
  // open card, so the list stays easy to scan.
  const compactCards = window.matchMedia('(max-width: 600px)');

  function setCardOpen(card, open) {
    card.classList.toggle('open', open);
    const toggle = card.querySelector('.card-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      const title = card.querySelector('.card-title')?.textContent.trim() || 'event';
      toggle.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} details for ${title}`);
    }
  }

  function toggleCard(card) {
    const open = !card.classList.contains('open');
    if (open) document.querySelectorAll('.events-grid .card.open').forEach(c => { if (c !== card) setCardOpen(c, false); });
    setCardOpen(card, open);
    if (open) {
      requestAnimationFrame(() => {
        const top = card.getBoundingClientRect().top;
        const navH = document.querySelector('.tabs-bar')?.offsetHeight || 0;
        if (top < navH + 8) window.scrollBy({ top: top - navH - 8, behavior: 'smooth' });
      });
    }
  }

  document.addEventListener('click', e => {
    if (!compactCards.matches) return;
    const card = e.target.closest('.events-grid .card');
    if (!card) return;
    // Links and other buttons keep working; the chevron button toggles
    if (e.target.closest('a, button:not(.card-toggle)')) return;
    toggleCard(card);
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.share-btn');
    if (!btn) return;
    const card = btn.closest('.card');
    if (card) shareEvent(card);
  });

  function bindEventListeners() {
    const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);

    // Header
    on('headerInstallBtn', 'click', () => handleInstallClick());
    on('mobileInfoBtn',    'click', () => toggleInfoPopover());
    on('hamburgerBtn',     'click', () => toggleMenu());

    // Highlights
    document.querySelector('.highlights-see-all')
      ?.addEventListener('click', () => showSection('events'));

    // Dropdown menu
    on('dropdownMenu',  'click', () => closeMenu());
    on('dropdownClose', 'click', () => closeMenu());
    document.querySelectorAll('.dropdown-nav-btn[data-nav]').forEach(btn =>
      btn.addEventListener('click', () => { showSectionFromMenu(btn.dataset.nav); closeMenu(); })
    );
    on('installMenuBtn', 'click', () => { handleInstallClick(); closeMenu(); });

    // Info popover
    on('infoPopoverOverlay', 'click', () => closeInfoPopover());
    document.querySelector('.info-popover-btn[data-action="about"]')
      ?.addEventListener('click', () => { showSectionFromMenu('about'); closeInfoPopover(); });
    on('infoInstallBtn', 'click', () => { handleInstallClick(); closeInfoPopover(); });

    // Contact email obfuscation
    document.querySelectorAll('.contact-email').forEach(a =>
      a.addEventListener('click', () => { a.href = 'mailto:' + atob('d2hhdHNvbndlbGx5QGdtYWlsLmNvbQ=='); })
    );

    // Region filters
    document.querySelectorAll('.filter-btn[data-filter-region]').forEach(btn =>
      btn.addEventListener('click', () => filterRegion(btn.dataset.filterRegion))
    );

    // Event type filter
    document.querySelectorAll('[data-filter-category]').forEach(btn =>
      btn.addEventListener('click', () => filterCategory(btn.dataset.filterCategory))
    );

    // Weekend tabs
    document.querySelectorAll('.tab-btn[aria-controls]').forEach(btn =>
      btn.addEventListener('click', () => showTab(btn.getAttribute('aria-controls'), btn))
    );

    // Weekend nav
    on('wnavPrev', 'click', () => navigateWeekend(-1));
    on('wnavNext', 'click', () => navigateWeekend(1));

    // Install banner
    on('installBannerInstallBtn', 'click', () => triggerInstall());
    on('installBannerCloseBtn',   'click', () => dismissInstall());

    // iOS install modal
    on('iosInstallOverlay', 'click', e => { if (e.target === e.currentTarget) closeIOSModal(); });
    on('iosDoneBtn',        'click', () => closeIOSModal());
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEventListeners();
    generateRemainingWeekends();
    setupPastWeekendTabs();
    setupSchoolHolidays();
    const startPanel = document.querySelector('.weekend-panel.active');
    if (startPanel) markActiveTab(startPanel);
    updateTabLabels();
    updateWeekendNav();
    enhanceStaticImages();  // add srcset/onerror/width/height to all static card images
    setEagerImages();       // promote first 2 visible cards to loading="eager"
    // Scroll the active tab into view (matters on mobile where early tabs may be off-screen)
    setTimeout(() => {
      const activeTab = document.querySelector('.tabs-inner .tab-btn.active');
      if (activeTab) activeTab.scrollIntoView({ block: 'nearest', inline: 'start' });
    }, 0);
    buildHighlightsRow();
    loadStaticEvents();         // inject STATIC_EVENTS into weekend panels
    openLinkedEvent();          // ?e=<event id> from a shared link
    enhanceCardAccessibility(); // ARIA roles, labelledby, meta icon aria-hidden, pick badge

    // ── HERO WEATHER ──
    (function initWeatherStrip() {
      const heroWeather = document.getElementById('heroWeather');
      if (!heroWeather) return;

      const CACHE_KEY = 'wow_weather_v2';   // v2: drops forecasts cached with the UTC date bug
      const CACHE_TTL = 3 * 60 * 60 * 1000;

      function wmoEmoji(code) {
        if (code === 0) return '☀️';
        if (code <= 2) return '⛅';
        if (code === 3) return '☁️';
        if (code <= 49) return '🌫️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '🌨️';
        if (code <= 82) return '🌦️';
        if (code <= 86) return '🌨️';
        if (code <= 99) return '⛈️';
        return '🌡️';
      }

      function isRainy(code, rainChance) {
        return rainChance > 50 || code >= 51;
      }

      function weatherMessage(sat, sun) {
        const satRainy = isRainy(sat.code, sat.rainChance);
        const sunRainy = isRainy(sun.code, sun.rainChance);
        if (satRainy && sunRainy) return 'A wet one — perfect for indoor adventures';
        if (satRainy && !sunRainy) return 'Rainy Saturday, better Sunday ahead';
        if (!satRainy && sunRainy) return 'Get outside Saturday — rain on Sunday';
        return 'Great weekend ahead — get outside!';
      }

      function renderWeatherStrip(sat, sun) {
        document.getElementById('heroWeatherSatIcon').textContent = wmoEmoji(sat.code);
        document.getElementById('heroWeatherSatTemp').textContent = Math.round(sat.maxTemp) + '°';
        document.getElementById('heroWeatherSunIcon').textContent = wmoEmoji(sun.code);
        document.getElementById('heroWeatherSunTemp').textContent = Math.round(sun.maxTemp) + '°';
        document.getElementById('heroWeatherMsg').textContent = weatherMessage(sat, sun);
        heroWeather.style.display = '';
      }

      function getNextSaturday() {
        const today = new Date();
        const day = today.getDay();
        const daysUntilSat = day === 6 ? 0 : (6 - day);
        const sat = new Date(today);
        sat.setDate(today.getDate() + daysUntilSat);
        return sat;
      }

      async function fetchWeather() {
        const sat = getNextSaturday();
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        // Local date, not toISOString(): UTC is a day behind NZ before midday/1pm
        const fmt = function(d) {
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };
        const satKey = fmt(sat);

        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            // Only reuse a forecast for the same weekend
            if (parsed.sat === satKey && Date.now() - parsed.ts < CACHE_TTL) {
              renderWeatherStrip(parsed.data.sat, parsed.data.sun);
              return;
            }
          }
        } catch (e) {}
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=-41.2865&longitude=174.7762&daily=weathercode,temperature_2m_max,precipitation_probability_max&start_date=' + fmt(sat) + '&end_date=' + fmt(sun) + '&timezone=Pacific%2FAuckland';

        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const json = await res.json();
          const daily = json.daily;
          const data = {
            sat: { code: daily.weathercode[0], maxTemp: daily.temperature_2m_max[0], rainChance: daily.precipitation_probability_max[0] || 0 },
            sun: { code: daily.weathercode[1], maxTemp: daily.temperature_2m_max[1], rainChance: daily.precipitation_probability_max[1] || 0 },
          };
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), sat: satKey, data })); } catch (e) {}
          renderWeatherStrip(data.sat, data.sun);
        } catch (e) {}
      }

      fetchWeather();
    })();
  });
