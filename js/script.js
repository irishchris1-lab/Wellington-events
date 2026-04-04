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

const SECTION_TITLES = {
    events:     "Events This Weekend — What's On Wellington",
    food:       "Family Cafés & Restaurants — What's On Wellington",
    walks:      "Family Walks & Trails — What's On Wellington",
    parks:      "Best Playgrounds — What's On Wellington",
    activities: "Family Activities — What's On Wellington",
    markets:    "Weekend Markets — What's On Wellington",
    rainy:      "Rainy Day Wellington — What's On Wellington",
  };

  let currentRegion = 'all';
  let currentDuration = 'all';
  let walkTopRatedOnly = false;
  let kidFriendlyFilter = 'all';
  const loadedSections = new Set(['events', 'planner']);

  // ── imgix ──
  // Set IMGIX_HOST once your subdomain is configured (e.g. 'wow.imgix.net').
  // Leave empty to serve images directly (works fine; just no auto-WebP or resizing).
  const IMGIX_HOST = '';

  function imgixSrc(url, w) {
    if (!url) return '';
    if (!IMGIX_HOST) return url;
    return `https://${IMGIX_HOST}/${encodeURIComponent(url)}?auto=format,compress&fit=crop&ar=16:9&w=${w}`;
  }

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

  function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  // Add a domain label to every .card-link that doesn't already have one.
  function enhanceCardLinks(container) {
    const root = container || document;
    root.querySelectorAll('a.card-link').forEach(a => {
      if (a.querySelector('.card-link-domain')) return; // already done
      const domain = extractDomain(a.href);
      if (!domain) return;
      a.setAttribute('rel', 'noopener noreferrer');
      a.insertAdjacentHTML('beforeend', `<span class="card-link-domain">${domain}</span>`);
    });
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
      // Descriptive aria-label on plan buttons
      const title = titleEl?.textContent?.trim();
      if (title) {
        card.querySelectorAll('.add-to-plan-btn').forEach(btn => {
          if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', `Add ${title} to plan`);
        });
      }
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

  const PLACEHOLDER_ICONS = {
    festival: '🎪', culture: '🎭', music: '🎶', outdoor: '🌿',
    market: '🛒', sport: '🏆', whanau: '👨‍👩‍👧',
  };
  // Generic fallback images (Wikimedia Commons, CC-licensed) — 480px thumbnails only.
  // Using 480px (not 960px) and no srcset so the browser makes exactly one small request
  // per type; subsequent cards of the same type hit the HTTP cache instantly.
  const FALLBACK_IMAGES = {
    festival: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/CupaDupa_%2723.jpg/480px-CupaDupa_%2723.jpg',
    culture:  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Exterior_view_of_Te_Papa_from_the_Wellington_Waterfront.jpg/480px-Exterior_view_of_Te_Papa_from_the_Wellington_Waterfront.jpg',
    music:    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Tiki_Taane_in_concert_at_CubaDupa_2017_%285%29.jpg/480px-Tiki_Taane_in_concert_at_CubaDupa_2017_%285%29.jpg',
    outdoor:  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Saturday_morning_cricket%2C_Wellington%2C_New_Zealand%2C_1_December_2007.jpg/480px-Saturday_morning_cricket%2C_Wellington%2C_New_Zealand%2C_1_December_2007.jpg',
    market:   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Harbourside_Market%2C_Wellington%2C_New_Zealand_-_DSC09758.jpg/480px-Harbourside_Market%2C_Wellington%2C_New_Zealand_-_DSC09758.jpg',
    whanau:   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Newtown_Festival_2024_%28078%29.jpg/480px-Newtown_Festival_2024_%28078%29.jpg',
    kids:     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Mt_Cook_Play_Area_Wellington_2024_1.jpg/480px-Mt_Cook_Play_Area_Wellington_2024_1.jpg',
  };
  function cardPlaceholderHTML(type) {
    const src = FALLBACK_IMAGES[type];
    if (src) {
      const esc = src.replace(/"/g, '&quot;');
      // No srcset — one small request, cached across all cards of the same type.
      return `<div class="card-img-wrap"><img class="card-img" src="${esc}" width="480" height="270" loading="lazy" decoding="async" onerror="onImgError(this)" alt=""></div>`;
    }
    const icon = PLACEHOLDER_ICONS[type] || '📅';
    return `<div class="card-img-placeholder"><span>${icon}</span></div>`;
  }

  // For locally-hosted images (path starts with "images/"), emit a <picture>
  // element with WebP source + JPEG fallback.  Pass useThumb=true to use the
  // 400 px thumbnail variant (highlights carousel).
  function localImgHTML(base, altEsc, useThumb) {
    const src = useThumb ? `${base}-thumb` : base;
    return `<div class="card-img-wrap"><picture><source srcset="${src}.webp" type="image/webp"><img class="card-img" src="${src}.jpg" width="960" height="540" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="onImgError(this)" alt="${altEsc}"></picture></div>`;
  }

  function cardImgHTML(url, alt, useThumb) {
    if (!url) return '';
    const altEsc = (alt || '').replace(/"/g, '&quot;');

    // Local repo image — no external request, no srcset needed
    if (url.startsWith('images/')) {
      const base = url.replace(/\.(webp|jpe?g|png)$/i, '');
      return localImgHTML(base, altEsc, useThumb);
    }

    const esc = url.replace(/"/g, '&quot;');
    let srcsetAttr = '';
    if (IMGIX_HOST) {
      srcsetAttr = ` srcset="${imgixSrc(url,400)} 400w,${imgixSrc(url,700)} 700w,${imgixSrc(url,1000)} 1000w" sizes="(max-width:640px) calc(100vw - 32px), 400px"`;
    } else {
      const ws = wikimediaSrcset(url);
      if (ws) srcsetAttr = ` srcset="${ws}" sizes="(max-width:640px) calc(100vw - 32px), 400px"`;
    }
    return `<div class="card-img-wrap"><img class="card-img" src="${IMGIX_HOST ? imgixSrc(url,700) : esc}"${srcsetAttr} width="960" height="540" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="onImgError(this)" alt="${altEsc}"></div>`;
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
      const kidMatch = kidFriendlyFilter === 'all' || card.dataset.kidfriendly === 'true';
      card.classList.toggle('hidden', !(regionMatch && kidMatch));
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

  function applyActivityFilters() {
    document.querySelectorAll('#section-activities .venue-card').forEach(card => {
      const regionMatch = currentRegion === 'all' || card.dataset.region === currentRegion;
      card.classList.toggle('hidden', !regionMatch);
    });
    document.querySelectorAll('#section-activities .venue-grid').forEach(grid => {
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

  function observeCards(container) {
    if (!window.IntersectionObserver) {
      container.querySelectorAll('.card, .venue-card').forEach(c => c.classList.add('revealed'));
      return;
    }
    const cards = [...container.querySelectorAll('.card:not(.revealed), .venue-card:not(.revealed)')];
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
    if (section === 'about') {
      document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.getElementById('section-about').classList.add('active');
      document.querySelectorAll('.tabs-bar').forEach(tb => tb.style.display = 'none');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'planner') {
      handlePlannerTabClick(null);
      return;
    }
    const btn = document.getElementById('tab-' + section);
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

  async function fetchSection(name) {
    if (loadedSections.has(name)) return;
    loadedSections.add(name);
    const main = document.querySelector('#section-' + name + ' main');
    if (!main) return;
    try {
      const res = await fetch('sections/' + name + '.html');
      main.innerHTML = await res.text();
      enhanceStaticImages(main);
      enhanceCardLinks(main);
      enhanceCardAccessibility(main);
    } catch (e) {
      main.innerHTML = '<p style="padding:2rem;color:#999">Unable to load. Please refresh.</p>';
      loadedSections.delete(name);
    }
  }

  function showSection(section, btn) {
    fetchSection(section).then(() => {
      document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.getElementById('section-' + section).classList.add('active');
      if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      }
      document.querySelectorAll('.tabs-bar').forEach(tb => tb.style.display = section === 'events' ? '' : 'none');
      document.title = SECTION_TITLES[section] || "What's On Wellington | Family Events, Cafés, Walks & Activities";
      applyFilter(currentRegion);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      updateHash(section, currentRegion);
      observeCards(document.getElementById('section-' + section));
    });
  }

  async function showRainyDay(btn) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
    document.getElementById('section-rainy').classList.add('active');
    document.querySelectorAll('.tabs-bar').forEach(tb => tb.style.display = 'none');

    const main = document.querySelector('#section-rainy main');
    main.innerHTML = '<p style="padding:2rem;color:#999">Loading indoor options…</p>';

    await Promise.all(['food', 'activities', 'parks'].map(s => fetchSection(s)));

    const groups = [
      {
        label: '🛝 Indoor Play',
        cards: [...document.querySelectorAll('#section-parks .venue-card[data-indoor="true"]')],
      },
      {
        label: '🎯 Indoor Activities & Experiences',
        cards: [...document.querySelectorAll(
          '#section-activities .venue-card[data-weather="rainy"], #section-activities .venue-card[data-weather="both"]'
        )],
      },
      {
        label: '☕ Cafés with Indoor Play',
        cards: [...document.querySelectorAll('#section-food .venue-card[data-indoor="true"]')],
      },
    ];

    main.innerHTML = '';
    let totalShown = 0;

    groups.forEach(({ label, cards }) => {
      const filtered = currentRegion === 'all'
        ? cards
        : cards.filter(c => c.dataset.region === currentRegion);
      if (!filtered.length) return;
      totalShown += filtered.length;

      const labelEl = document.createElement('div');
      labelEl.className = 'day-label';
      labelEl.textContent = label;
      main.appendChild(labelEl);

      const grid = document.createElement('div');
      grid.className = 'venue-grid';
      filtered.forEach(c => {
        const clone = c.cloneNode(true);
        clone.classList.remove('revealed', 'hidden');
        grid.appendChild(clone);
      });
      main.appendChild(grid);
    });

    appendRainyFirestoreEvents(main);

    if (!totalShown && !main.querySelector('.card')) {
      main.innerHTML = '<p style="padding:2rem;color:#999">No indoor options found for the selected area. Try "All regions".</p>';
    }

    injectAddButtons();
    updateAddButtons();
    enhanceCardAccessibility(main);
    observeCards(document.getElementById('section-rainy'));
    updateHash('rainy', currentRegion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function appendRainyFirestoreEvents(main) {
    const panels = [...document.querySelectorAll('.weekend-panel:not([data-pastWeekend])')];
    if (!panels.length) return;
    const panel = panels[0];
    const cards = [...panel.querySelectorAll('.card[data-indoor="1"]')]
      .filter(c => currentRegion === 'all' || c.dataset.region === currentRegion);
    if (!cards.length) return;

    const labelEl = document.createElement('div');
    labelEl.className = 'day-label';
    labelEl.textContent = '🗓 Indoor Events This Weekend';
    main.appendChild(labelEl);

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    cards.forEach(c => {
      const clone = c.cloneNode(true);
      clone.classList.remove('revealed', 'hidden');
      grid.appendChild(clone);
    });
    main.appendChild(grid);
  }

  function showTab(id, btn, dir) {
    document.querySelectorAll('.weekend-panel').forEach(p => {
      p.classList.remove('active', 'slide-left', 'slide-right');
    });
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    const panel = document.getElementById(id);
    panel.classList.add('active');
    if (dir === 1)  panel.classList.add('slide-right');
    if (dir === -1) panel.classList.add('slide-left');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    // Show/hide the "past weekend" banner and muted-link state
    const isPast = !!panel.dataset.pastWeekend;
    const banner = document.getElementById('pastWeekendBanner');
    if (banner) banner.hidden = !isPast;
    document.getElementById('section-events')?.classList.toggle('showing-past-weekend', isPast);
    applyFilter(currentRegion);
    updateWeekendNav();
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

  function filterRegion(region, btn) {
    currentRegion = region;
    document.querySelectorAll('[data-filter-region]').forEach(b => {
      const isActive = b.dataset.filterRegion === region;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const activeSection = document.querySelector('.app-section.active')?.id?.replace('section-', '') || 'events';
    if (activeSection === 'rainy') {
      showRainyDay(document.getElementById('tab-rainy'));
      return;
    }
    applyFilter(region);
    updateHash(activeSection, region);
  }

  function applyFilter(region) {
    const activePanel = document.querySelector('.weekend-panel.active');
    if (activePanel) {
      activePanel.querySelectorAll('.card:not(.dedup-hidden)').forEach(card => {
        const regionHide = region !== 'all' && card.dataset.region !== region;
        card.classList.toggle('hidden', regionHide);
      });
      activePanel.querySelectorAll('.events-grid').forEach(grid => {
        const existing = grid.nextElementSibling;
        if (existing && existing.classList.contains('no-results')) existing.remove();
        const totalCards   = grid.querySelectorAll('.card').length;
        const visibleCards = grid.querySelectorAll('.card:not(.hidden)').length;
        // Only show the message when cards exist but are ALL hidden by a filter.
        // Genuinely empty grids (never had events) are collapsed by CSS :empty — no message needed.
        if (totalCards > 0 && visibleCards === 0) {
          const msg = document.createElement('p');
          msg.className = 'no-results';
          msg.style.cssText = 'color:#bbb;font-size:13px;padding:8px 0 20px;font-style:italic;';
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
    applyActivityFilters();
    ['section-parks', 'section-markets'].forEach(sectionId => {
      document.querySelectorAll('#' + sectionId + ' .venue-grid').forEach(grid => {
        const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
        const label = grid.previousElementSibling;
        if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
        grid.style.display = hasVisible ? '' : 'none';
      });
    });
  }

  // ── CHANGE 5: Restore state from URL on load ──
  document.addEventListener('DOMContentLoaded', () => {
    const { section, region } = readHash();

    // Restore section (default is 'events')
    if (section === 'planner') {
      handlePlannerTabClick(null);
    } else if (section === 'rainy') {
      showRainyDay(document.getElementById('tab-rainy'));
    } else {
      const btn = document.getElementById('tab-' + section);
      if (btn) showSection(section, btn);
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
      loadVenueOverrides();
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
    const catLabel = ev.label || tm.label;
    const catStyle = ev.labelStyle ? ` style="${escHtml(ev.labelStyle)}"` : '';

    // Badges (free → ticketed → family → pick, in display order)
    const badgeParts = [];
    if (ev.free)     badgeParts.push(`<span class="badge badge-free">${escHtml(ev.free)}</span>`);
    if (ev.ticketed) badgeParts.push(`<span class="badge badge-ticketed">Ticketed</span>`);
    if (ev.family)   badgeParts.push(`<span class="badge badge-family">${escHtml(ev.family)}</span>`);
    if (ev.pick)     badgeParts.push(`<span class="badge badge-hot"><span aria-hidden="true">🔥</span><span class="sr-only">Editor's pick</span></span>`);
    const badgesHtml = badgeParts.length ? `<div class="card-badges">${badgeParts.join('')}</div>` : '';

    const meta = [
      ev.time  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">🕐</span>${escHtml(ev.time)}</div>`  : '',
      ev.venue ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">📍</span>${escHtml(ev.venue)}</div>` : '',
      ev.cost  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">💰</span>${escHtml(ev.cost)}</div>`  : '',
    ].join('');
    const footer = [
      ev.url ? `<a class="card-link" href="${escHtml(ev.url)}" target="_blank" rel="noopener noreferrer">Find out more ↗<span class="card-link-domain">${extractDomain(ev.url)}</span></a>` : '',
      `<button class="add-to-plan-btn" aria-label="Add ${escHtml(ev.title)} to plan" onclick="addToPlan(this.closest('.card'))">+ Plan</button>`,
    ].join('');
    const tierClass = ev.pick ? 'card-featured' : 'card-standard';
    const tierAttr  = ev.pick ? 'featured'      : 'standard';
    return `
      <article class="card ${tierClass}" aria-labelledby="${titleId}" data-tier="${tierAttr}" data-region="${escHtml(region)}" ${idAttr} data-weekend="${escHtml(ev.weekend || '')}" data-day="${escHtml(ev.day || 'sat')}"${ev.img ? ` data-img="${escHtml(ev.img)}"` : ''}${ev.pick ? ' data-pick="1"' : ''}${ev.indoor ? ' data-indoor="1"' : ''}>
        ${stripHtml}
        ${ev.img ? cardImgHTML(ev.img, ev.title) : ''}
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-cat"${catStyle}>${catLabel}</div>
              <div class="card-title" id="${titleId}">${escHtml(ev.title)}</div>
            </div>
            ${badgesHtml}
          </div>
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          ${ev.description ? `<div class="card-desc">${escHtml(ev.description)}</div>` : ''}
        </div>
        <div class="card-footer">${footer}</div>
      </article>`;
  }

  function buildHighlightsRow() {
    const track   = document.getElementById('highlightsTrack');
    const section = document.getElementById('highlights-section');
    if (!track || !section) return;

    // First non-past weekend panel = "this weekend"
    const panel = [...document.querySelectorAll('.weekend-panel[data-weekend]')]
      .find(p => !p.dataset.pastWeekend)
      || document.querySelector('.weekend-panel');
    if (!panel) { section.style.display = 'none'; return; }

    const picks = [...panel.querySelectorAll('.card')]
      .filter(c => c.querySelector('.badge-hot') || c.dataset.pick === '1');

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
        imgWrapHtml = `<div class="highlight-card-img"><picture><source srcset="${base}-thumb.webp" type="image/webp"><img src="${base}-thumb.jpg" width="400" height="225" loading="${loadAttr}"${prioAttr} decoding="async" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.remove()" alt="${altH}"></picture></div>`;
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
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-selected', 'false');
      });
      eventsSection.classList.add('active');
      const tabBtn = document.getElementById('tab-events');
      if (tabBtn) { tabBtn.classList.add('active'); tabBtn.setAttribute('aria-selected', 'true'); }
      document.querySelectorAll('.tabs-bar').forEach(tb => tb.style.display = '');
      applyFilter(currentRegion);
      updateHash('events', currentRegion);
    }
    // Ensure card's weekend panel is active
    const cardPanel = card.closest('.weekend-panel');
    if (cardPanel && !cardPanel.classList.contains('active')) {
      document.querySelectorAll('.weekend-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-selected', 'false');
      });
      cardPanel.classList.add('active');
      const panelBtn = document.getElementById('wtab-' + cardPanel.id);
      if (panelBtn) { panelBtn.classList.add('active'); panelBtn.setAttribute('aria-selected', 'true'); }
      applyFilter(currentRegion);
    }
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

  // Update tab button labels dynamically from panel data-weekend attributes
  function updateTabLabels() {
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let visibleCount = 0;
    document.querySelectorAll('.tabs-inner .tab-btn').forEach(btn => {
      if (btn.dataset.pastWeekend) return; // past tabs get their own labels from the date
      const panelId = btn.getAttribute('aria-controls');
      const panel = panelId && document.getElementById(panelId);
      if (!panel || !panel.dataset.weekend) return;
      const sat = new Date(panel.dataset.weekend + 'T00:00:00');
      const fri = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() - 1);
      const mon = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 2);
      const datePart = mon.getMonth() === fri.getMonth()
        ? `${fri.getDate()}–${mon.getDate()} ${MONTHS_SHORT[fri.getMonth()]}`
        : `${fri.getDate()} ${MONTHS_SHORT[fri.getMonth()]}–${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]}`;
      const count = panel.querySelectorAll('.card').length;
      const countBadge = count > 0 ? `<span class="tab-count">${count}</span>` : '';
      visibleCount++;
      if (visibleCount === 1) {
        btn.innerHTML = `<span class="tab-live-dot"></span>This Weekend · ${datePart}${countBadge}`;
      } else if (visibleCount === 2) {
        btn.innerHTML = `Next Weekend · ${datePart}${countBadge}`;
      } else {
        btn.innerHTML = datePart + countBadge;
      }
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
      if (weekendIsPast(panel.dataset.weekend)) {
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
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      const newBtn = document.getElementById('wtab-' + firstFuture.id);
      if (newBtn) { newBtn.classList.add('active'); newBtn.setAttribute('aria-selected', 'true'); }
    }
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
    const panel = document.querySelector(`.weekend-panel[data-weekend="${ev.weekend}"]`);
    if (!panel) {
      console.warn(`[WoW] No panel for weekend "${ev.weekend}" — "${ev.title || ev.id}" not shown. Must be a Saturday in YYYY-MM-DD format within the generated range.`);
      return;
    }
    const grids = panel.querySelectorAll('.events-grid');
    const dayIndex = { fri: 0, sat: 1, sun: 2, mon: 3 };
    const grid = grids[dayIndex[ev.day] ?? 1] || grids[0];
    if (!grid) return;
    grid.insertAdjacentHTML('beforeend', buildEventCardHTML(ev));
  }

  function loadStaticEvents() {
    if (typeof STATIC_EVENTS === 'undefined' || !STATIC_EVENTS.length) return;
    STATIC_EVENTS.forEach((ev, i) => {
      injectEventCard({ ...ev, _static: true, _staticId: `s${i}` });
    });
    applyFilter(currentRegion);
    updateTabLabels();
    updateAddButtons();
    buildHighlightsRow();
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

        applyFilter(currentRegion);
        updateTabLabels();
        updateAddButtons();
        buildHighlightsRow();
        setEagerImages();       // re-run after Firestore cards are injected
        const evSection = document.getElementById('section-events');
        if (evSection) observeCards(evSection);
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
  //  VENUE OVERRIDES — apply admin edits
  // ═══════════════════════════════════════

  // Must match venueSlug() in admin/admin.js exactly
  function venueSlug(name) {
    return name.toLowerCase()
      .replace(/[āáàä]/g, 'a').replace(/[ōóò]/g, 'o')
      .replace(/[ūúù]/g, 'u').replace(/[īíì]/g, 'i').replace(/[ēé]/g, 'e')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      .substring(0, 60);
  }

  function loadVenueOverrides() {
    if (!firebaseReady) return;
    db.collection('venues').onSnapshot(snapshot => {
      const overrides = {};
      snapshot.docs.forEach(doc => { overrides[doc.id] = doc.data(); });
      ['food', 'walks', 'parks', 'activities', 'markets'].forEach(sectionId => {
        document.querySelectorAll(`#section-${sectionId} .venue-card`).forEach(card => {
          const nameEl = card.querySelector('.venue-name');
          if (!nameEl) return;
          const slug = venueSlug(nameEl.textContent.trim());
          const ov = overrides[slug];
          if (!ov) return;

          // Hidden/deleted
          if (ov.deleted) { card.classList.add('hidden'); return; }

          // Name
          if (ov.name) nameEl.textContent = ov.name;

          // Description
          const descEl = card.querySelector('.venue-desc');
          if (descEl && ov.description !== undefined) descEl.textContent = ov.description;

          // Location
          const locEl = card.querySelector('.venue-location');
          if (locEl && ov.location !== undefined) locEl.textContent = '📍 ' + ov.location;

          // Rating
          const ratingEl = card.querySelector('.rating-score');
          if (ratingEl && ov.rating !== undefined) ratingEl.textContent = ov.rating.toFixed(1);

          // Region
          if (ov.region) card.dataset.region = ov.region;

          // Duration (walks)
          if (ov.duration) card.dataset.duration = ov.duration;

          // Link
          const linkEl = card.querySelector('.rating-link');
          if (linkEl) {
            if (ov.linkUrl)   linkEl.href        = ov.linkUrl;
            if (ov.linkLabel) linkEl.textContent = ov.linkLabel;
          }

          // Image
          if (ov.img !== undefined) {
            card.dataset.img = ov.img;
            const wrap = card.querySelector('.card-img-wrap');
            if (ov.img) {
              const html = cardImgHTML(ov.img, ov.name || nameEl.textContent.trim());
              if (wrap) wrap.outerHTML = html;
              else {
                const strip = card.querySelector('.venue-card-strip');
                if (strip) strip.insertAdjacentHTML('afterend', html);
              }
            } else if (wrap) {
              wrap.remove();
            }
          }
        });
      });
      // Re-apply region/walk/food/activity filters now that data may have changed
      applyFoodFilters();
      applyWalkFilters();
      applyActivityFilters();
    }, err => console.warn('Venue overrides error:', err));
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
                     cardEl.closest('#section-parks') ? 'parks' :
                     cardEl.closest('#section-activities') ? 'activities' :
                     cardEl.closest('#section-markets') ? 'markets' : 'other';
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
        const dayMap = { fri: 'friday', sat: 'saturday', sun: 'sunday', mon: 'monday' };
        day = dayMap[cardEl.dataset.day] || 'saturday';
      } else {
        const grid = cardEl.closest('.events-grid');
        const prevLabel = grid?.previousElementSibling;
        if (prevLabel?.classList.contains('day-fri')) day = 'friday';
        else if (prevLabel?.classList.contains('day-sun')) day = 'sunday';
        else if (prevLabel?.classList.contains('day-mon')) day = 'monday';
        else day = 'saturday';
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
    const food = [], walks = [], parks = [], activities = [], markets = [];
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
      } else if (card.closest('#section-activities') && activities.every(s => s.title !== t)) {
        activities.push({ title: t, category, section: 'activities' });
      } else if (card.closest('#section-markets') && markets.every(s => s.title !== t)) {
        markets.push({ title: t, category, section: 'markets' });
      }
    });
    // Interleave: 1 café + 1 activity + 1 walk + 1 park + 1 market + extra café
    const shown = [];
    if (food[0])       shown.push(food[0]);
    if (activities[0]) shown.push(activities[0]);
    if (walks[0])      shown.push(walks[0]);
    if (parks[0])      shown.push(parks[0]);
    if (markets[0])    shown.push(markets[0]);
    if (shown.length === 0) return '';
    const regionLabels = { 'wellington': 'Wellington City', 'lower-hutt': 'Lower Hutt', 'upper-hutt': 'Upper Hutt', 'kapiti': 'Kāpiti', 'porirua': 'Porirua', 'wairarapa': 'Wairarapa' };
    const regionNames = planRegions.map(r => regionLabels[r] || r).join(' & ');
    const icons = { food: '☕', walks: '🌿', parks: '🛝', activities: '🎯', markets: '🛒' };
    let html = '<div class="suggestions-section"><div class="suggestions-header"><span class="suggestions-title">💡 Suggested & Nearby</span><span class="suggestions-sub">Things to do near your plan in ' + regionNames + '</span></div><div class="suggestions-list">';
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
      const sectionIcon = { events: '🗓', food: '☕', walks: '🌿', parks: '🛝', activities: '🎯', markets: '🛒', other: '📌' }[item.section] || '📌';
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
    const count = planItems.length;
    const headerBadge = document.getElementById('planCountBadgeHeader');
    if (headerBadge) {
      headerBadge.textContent = count;
      headerBadge.classList.toggle('visible', count > 0);
    }
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
      const cardTitle = footer.closest('.card')?.querySelector('.card-title')?.textContent?.trim();
      if (cardTitle) btn.setAttribute('aria-label', `Add ${cardTitle} to plan`);
      btn.onclick = function(e) { e.preventDefault(); addToPlan(this.closest('.card')); };
      footer.prepend(btn);
    });
    // Venue cards (food, walks, parks)
    document.querySelectorAll('.venue-footer').forEach(footer => {
      if (footer.querySelector('.add-to-plan-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'add-to-plan-btn';
      btn.textContent = '+ Plan';
      const venueName = footer.closest('.venue-card')?.querySelector('.venue-name, .card-title')?.textContent?.trim();
      if (venueName) btn.setAttribute('aria-label', `Add ${venueName} to plan`);
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
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    showSection('planner', null);
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
  // Toggle compact cards open/closed on click (skip if clicking a link or button)
  document.addEventListener('click', e => {
    const card = e.target.closest('.card-compact');
    if (!card) return;
    if (e.target.closest('a, button')) return;
    card.classList.toggle('open');
  });

  document.addEventListener('DOMContentLoaded', () => {
    generateRemainingWeekends();
    setupPastWeekendTabs();
    updateTabLabels();
    updateWeekendNav();
    enhanceStaticImages();  // add srcset/onerror/width/height to all static card images
    enhanceCardLinks();     // add domain label to all static card links
    setEagerImages();       // promote first 2 visible cards to loading="eager"
    // Scroll the active tab into view (matters on mobile where early tabs may be off-screen)
    setTimeout(() => {
      const activeTab = document.querySelector('.tabs-inner .tab-btn.active');
      if (activeTab) activeTab.scrollIntoView({ block: 'nearest', inline: 'start' });
    }, 0);
    buildHighlightsRow();
    injectAddButtons();
    loadStaticEvents();         // inject STATIC_EVENTS into weekend panels
    enhanceCardAccessibility(); // ARIA roles, labelledby, meta icon aria-hidden, pick badge, plan btn labels
    // If Firebase is not configured, load from localStorage immediately
    // If Firebase IS configured, onAuthStateChanged handles it after sign-in
    if (!firebaseReady) {
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    } else {
      // Still load localStorage for guests who haven't signed in yet
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    }

    // ── HERO WEATHER ──
    (function initWeatherStrip() {
      const heroWeather = document.getElementById('heroWeather');
      if (!heroWeather) return;

      const CACHE_KEY = 'wow_weather';
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
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.ts < CACHE_TTL) {
              renderWeatherStrip(parsed.data.sat, parsed.data.sun);
              return;
            }
          }
        } catch (e) {}

        const sat = getNextSaturday();
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        const fmt = function(d) { return d.toISOString().slice(0, 10); };
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
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
          renderWeatherStrip(data.sat, data.sun);
        } catch (e) {}
      }

      fetchWeather();
    })();
  });
