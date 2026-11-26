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

const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SECTION_TITLES = {
    events:  "Wellington Events — What's On Wellington",
    about:   "About — What's On Wellington",
    event:   "Event details — What's On Wellington",
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
  const PRICE_LABELS = {
    Free: 'Free entry',
    '$': 'Under NZ$30',
    '$$': 'NZ$30 to under NZ$80',
    '$$$': 'NZ$80 or more',
  };
  const PRICE_TIERS = Object.keys(PRICE_LABELS);
  const MAX_PRICE_LEVEL = PRICE_TIERS.length - 1;
  const PRICE_FILTER_LABELS = ['Free only', 'Under $30', 'Under $80', 'Any price'];
  const staticEvents = (typeof STATIC_EVENTS === 'undefined' ? [] : STATIC_EVENTS)
    .map((ev, i) => ({ ...ev, _static: true, _staticId: `s${i}` }));
  const curatedEvents = new Map(staticEvents.map(ev => [eventListingKey(ev), ev]));
  const legacyEventDates = new Map(staticEvents.filter(ev => isCalendarDate(ev.date))
    .map(ev => [legacyEventKey(ev), ev.date]));
  let calendarEvents = staticEvents;
  let calendarReady = false;
  let liveEventsLoaded = false;
  const scheduleCache = new WeakMap();

  let currentRegion = 'all';
  let currentCategory = 'all';
  let maxPriceLevel = MAX_PRICE_LEVEL;

  function eventListingKey(ev) {
    return `${(ev.title || '').trim()}|${eventDate(ev)}`;
  }

  function scheduleFor(ev) {
    if (!scheduleCache.has(ev)) scheduleCache.set(ev, eventSchedule(ev));
    return scheduleCache.get(ev);
  }

  const MAX_WEEKLY_PICKS = 3;
  // Keys are Wellington Mondays; values are event slugs in editorial order.
  // An explicit week replaces legacy pick flags for that week, without filling empty slots.
  const EDITORIAL_PICKS_BY_WEEK = Object.freeze({
    '2026-11-23': ['johnsonville-rotary-christmas-market-2026-11-28'],
    '2026-11-30': ['upper-hutt-santa-parade-2026-12-06'],
  });

  function pickWeekStart(date) {
    return addCalendarDays(date, -((calendarDay(date).getUTCDay() + 6) % 7));
  }

  function weeklyPickIds(week) {
    const weekEnd = addCalendarDays(week, 6);
    const weekStart = aucklandInstant(week);
    const approved = EDITORIAL_PICKS_BY_WEEK[week];
    const candidates = calendarEvents.flatMap(ev => {
      if (!approved && !ev.pick) return [];
      const date = nextEventDate(scheduleFor(ev), week, weekEnd, weekStart);
      return date ? [{ id: eventSlug(ev), date }] : [];
    });
    const eligible = new Set(candidates.map(({ id }) => id));
    const ordered = approved
      ? approved.filter(id => eligible.has(id))
      : candidates.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map(({ id }) => id);
    return new Set([...new Set(ordered)].slice(0, MAX_WEEKLY_PICKS));
  }

  function legacyEventKey(ev) {
    return `${(ev.title || '').trim()}|${ev.weekend || ''}|${ev.day || 'sat'}`;
  }

  function eventPrice(ev) {
    if (Object.hasOwn(PRICE_LABELS, ev.priceTier)) {
      return { tier: ev.priceTier, estimated: ev.priceEstimated === true };
    }

    // Older and newly imported Firestore events may not have an assigned tier.
    const cost = String(ev.cost || '').trim();
    const freeEntry = /^free(?: entry| to watch| to spectate)?(?:$|\s*[·—–.-])/i;
    if (ev.free === true || freeEntry.test(ev.free || '') || freeEntry.test(cost)) {
      return { tier: 'Free', estimated: false };
    }
    const amount = cost.match(/\$\s*(\d[\d,]*(?:\.\d+)?)/);
    if (amount) {
      const n = Number(amount[1].replace(/,/g, ''));
      return { tier: n === 0 ? 'Free' : n < 30 ? '$' : n < 80 ? '$$' : '$$$', estimated: false };
    }
    if (!cost && Array.isArray(ev.tags) && ev.tags.some(tag => /^free$/i.test(tag))) {
      return { tier: 'Free', estimated: false };
    }
    const curated = curatedEvents.get(eventListingKey(ev));
    if (curated && Object.hasOwn(PRICE_LABELS, curated.priceTier)) {
      return { tier: curated.priceTier, estimated: curated.priceEstimated === true };
    }
    return { tier: eventCategory(ev) === 'music' ? '$$' : '$', estimated: true };
  }

  function priceBadge(tier, estimated) {
    const style = tier === 'Free' ? 'badge-free' : 'badge-ticketed';
    return `<span class="badge badge-price ${style}" title="${PRICE_LABELS[tier]}${estimated ? ' (estimated)' : ''}">${tier}${estimated ? ' <abbr title="Estimated">est.</abbr>' : ''}</span>`;
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

  function setEagerImages() {
    document.querySelectorAll('#calendarResults img.card-img').forEach((img, i) => {
      img.loading = i < 2 ? 'eager' : 'lazy';
      if (i === 0) img.setAttribute('fetchpriority', 'high');
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

  let cardObserver;

  function observeCards(container) {
    cardObserver?.disconnect();
    if (!window.IntersectionObserver) {
      container.querySelectorAll('.card').forEach(c => c.classList.add('revealed'));
      return;
    }
    const cards = [...container.querySelectorAll('.card:not(.revealed)')];
    if (!cards.length) return;
    let revealCount = 0;
    const obs = cardObserver = new IntersectionObserver((entries) => {
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

  const SCHOOL_HOLIDAYS = { start: '2026-12-19', end: '2027-02-02' };
  const CALENDAR_DATE_LABEL = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
  });
  const CALENDAR_DAY_LABEL = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  });
  const CALENDAR_MONTH_LABEL = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  });

  let datePreset = 'this-week';
  let customRange = null;
  let currentToday = aucklandToday();
  let currentSection = 'events';
  let refreshTimer, nextRefresh;
  const linkedEventId = new URLSearchParams(location.search).get('e');

  function selectedRange() {
    if (datePreset === 'custom') return customRange;
    const daysUntilSunday = (7 - calendarDay(currentToday).getUTCDay()) % 7;
    const sunday = addCalendarDays(currentToday, daysUntilSunday);
    if (datePreset === 'next-week') {
      return { start: addCalendarDays(sunday, 1), end: addCalendarDays(sunday, 7) };
    }
    return { start: currentToday, end: sunday };
  }

  // Open saved links to the former presets with their dates selected in the calendar.
  function legacyDateRange(preset, today) {
    switch (preset) {
      case 'next-7':
        return { start: today, end: addCalendarDays(today, 6) };
      case 'today':
        return { start: today, end: today };
      case 'tomorrow': {
        const tomorrow = addCalendarDays(today, 1);
        return { start: tomorrow, end: tomorrow };
      }
      case 'this-weekend':
      case 'next-weekend': {
        const saturday = weekendForDate(today);
        const start = preset === 'next-weekend' ? addCalendarDays(saturday, 7) : saturday;
        return { start, end: addCalendarDays(start, 1) };
      }
      default:
        return null;
    }
  }

  function rangeLabel({ start, end }) {
    const from = CALENDAR_DATE_LABEL.format(calendarDay(start));
    return start === end ? from : `${from} – ${CALENDAR_DATE_LABEL.format(calendarDay(end))}`;
  }

  // Save the selected view without turning relative presets into stale dates.
  function updateHash(section) {
    if (section === 'event') return;
    const params = new URLSearchParams();
    if (section !== 'events') params.set('s', section);
    if (currentRegion !== 'all') params.set('r', currentRegion);
    if (currentCategory !== 'all') params.set('c', currentCategory);
    if (maxPriceLevel === 0) params.set('free', '1');
    else if (maxPriceLevel < MAX_PRICE_LEVEL) params.set('price', PRICE_TIERS[maxPriceLevel]);
    if (datePreset !== 'this-week') params.set('dates', datePreset);
    if (datePreset === 'custom') {
      params.set('from', customRange.start);
      params.set('to', customRange.end);
    }
    // The selector also works when the page is opened directly from disk.
    const query = params.toString();
    try {
      history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
    } catch (e) {}
  }

  function readHash() {
    const params = new URLSearchParams(location.search);
    const section = params.get('s') === 'about' ? 'about' : 'events';
    const region = params.get('r');
    if ([...document.querySelectorAll('[data-filter-region]')].some(b => b.dataset.filterRegion === region)) {
      currentRegion = region;
    }
    if (CATEGORIES.includes(params.get('c'))) currentCategory = params.get('c');
    const priceLevel = PRICE_TIERS.indexOf(params.get('price'));
    if (priceLevel >= 0) maxPriceLevel = priceLevel;
    else if (params.get('free') === '1') maxPriceLevel = 0;
    const preset = params.get('dates');
    const from = params.get('from'), to = params.get('to');
    if (preset === 'next-week') {
      datePreset = preset;
    } else if (preset === 'custom' && isCalendarDate(from) && isCalendarDate(to) && from <= to) {
      datePreset = 'custom';
      customRange = { start: from, end: to };
    } else {
      const legacyRange = legacyDateRange(preset, currentToday);
      if (legacyRange) {
        datePreset = 'custom';
        customRange = legacyRange;
      }
    }
    if (location.hash === '#school-holidays') {
      datePreset = 'custom';
      customRange = SCHOOL_HOLIDAYS;
    }
    return linkedEventId ? 'event' : section;
  }

  function showSection(section) {
    currentSection = section;
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    document.querySelectorAll('.filter-bar').forEach(bar => bar.hidden = section !== 'events');
    document.title = SECTION_TITLES[section];
    const eventRobots = document.getElementById('eventRobots');
    if (section !== 'event' && eventRobots) {
      eventRobots.remove();
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = document.querySelector('meta[property="og:url"]').content;
      document.head.append(canonical);
    }
    document.querySelector('.skip-link').href = section === 'event' ? '#event-detail-content' : '#main-content';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHash(section);
    renderEventView();
  }

  function setPressed(selector, isActive) {
    document.querySelectorAll(selector).forEach(b => {
      const active = isActive(b);
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  function syncFilterControls() {
    setPressed('[data-filter-region]', b => b.dataset.filterRegion === currentRegion);
    setPressed('[data-filter-category]', b => b.dataset.filterCategory === currentCategory);
    const slider = document.getElementById('priceFilter');
    const priceLabel = PRICE_FILTER_LABELS[maxPriceLevel];
    slider.value = maxPriceLevel;
    slider.setAttribute('aria-valuetext', priceLabel);
    document.getElementById('priceFilterValue').textContent = priceLabel;
    const previous = document.querySelector('[data-date-filter].active');
    setPressed('[data-date-filter]', b => b.dataset.dateFilter === datePreset);
    if (previous?.dataset.dateFilter !== datePreset) revealDatePreset();
  }

  function revealDatePreset() {
    const track = document.getElementById('datePresets');
    const active = track.querySelector('.tab-btn.active');
    if (!active) return;
    const viewport = track.getBoundingClientRect();
    const button = active.getBoundingClientRect();
    const offset = Math.min(0, button.left - viewport.left) || Math.max(0, button.right - viewport.right);
    if (offset) track.scrollBy({ left: offset, behavior: 'instant' });
  }

  function setupDateCarousel() {
    const track = document.getElementById('datePresets');
    const back = document.getElementById('datePresetsBack');
    const forward = document.getElementById('datePresetsForward');
    const updateArrows = () => {
      const fullWidth = track.clientWidth + back.offsetWidth + forward.offsetWidth;
      const overflow = track.scrollWidth > fullWidth + 1;
      back.hidden = forward.hidden = !overflow;
      back.disabled = track.scrollLeft < 1;
      forward.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };
    const resize = () => {
      updateArrows();
      revealDatePreset();
    };
    back.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.8 }));
    forward.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.8 }));
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', resize);
    document.fonts?.ready.then(resize);
    updateArrows();
  }

  function filterEvents() {
    renderEventView();
    updateHash('events');
  }

  function renderEventView() {
    const now = Date.now();
    const previousToday = currentToday;
    currentToday = aucklandToday(now);
    if (datePreset === 'custom' && customRange.start < currentToday) {
      if (customRange.end < currentToday) {
        datePreset = 'this-week';
        customRange = null;
      } else {
        customRange = { ...customRange, start: currentToday };
      }
      updateHash(currentSection);
    }

    const dialog = document.getElementById('customDates');
    if (dialog.open && currentToday !== previousToday) {
      pickedRange = { start: laterDate(pickedRange.start), end: laterDate(pickedRange.end) };
      pickerFocus = laterDate(pickerFocus);
      renderDatePicker(Boolean(document.activeElement.dataset.pickerDate));
    }
    document.getElementById('holidayCta').hidden = currentToday > SCHOOL_HOLIDAYS.end;

    if (currentSection === 'event') renderLinkedEvent(now);
    if (currentSection === 'events') {
      syncFilterControls();
      renderCalendar(now);
    }

    nextRefresh = aucklandInstant(addCalendarDays(currentToday, 1));
    for (const event of calendarEvents) {
      for (const period of scheduleFor(event)) {
        const end = period.daily && currentToday >= period.start && currentToday <= period.last
          ? period.expiry(currentToday) : period.endsAt;
        if (end > now && end < nextRefresh) nextRefresh = end;
      }
    }
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(renderEventView, Math.max(1, nextRefresh - Date.now()));
  }

  function laterDate(date) {
    return date < currentToday ? currentToday : date;
  }

  function resetEventFilters() {
    currentRegion = currentCategory = 'all';
    maxPriceLevel = MAX_PRICE_LEVEL;
  }

  let pickedRange, pickerFocus, pickingEnd;

  function shiftPickerMonth(date, offset) {
    const day = calendarDay(date);
    const dayOfMonth = day.getUTCDate();
    // Find the last day of the target month before clamping the focused date.
    day.setUTCMonth(day.getUTCMonth() + offset + 1, 0);
    day.setUTCDate(Math.min(dayOfMonth, day.getUTCDate()));
    const result = day.toISOString().slice(0, 10);
    return isCalendarDate(result) ? result : date;
  }

  function renderDatePicker(focusDay = false) {
    const monthStart = pickerFocus.slice(0, 7) + '-01';
    const month = calendarDay(monthStart);
    const offset = (month.getUTCDay() + 6) % 7; // Monday-first
    document.getElementById('calendarMonth').textContent = CALENDAR_MONTH_LABEL.format(month);
    document.getElementById('previousCalendarMonth').disabled = monthStart.slice(0, 7) <= currentToday.slice(0, 7);
    document.getElementById('nextCalendarMonth').disabled = shiftPickerMonth(pickerFocus, 1) === pickerFocus;
    const { start, end } = pickedRange;
    const weeks = [];
    for (let row = 0; row < 6; row++) {
      const cells = [];
      for (let col = 0; col < 7; col++) {
        const iso = addCalendarDays(monthStart, row * 7 + col - offset);
        if (!isCalendarDate(iso) || iso < currentToday) {
          cells.push('<td></td>');
          continue;
        }
        const day = calendarDay(iso);
        const selected = start <= iso && iso <= end;
        const classes = [
          iso.slice(0, 7) !== monthStart.slice(0, 7) ? 'outside-month' : '',
          selected ? 'in-range' : '',
          iso === start ? 'range-start' : '',
          iso === end ? 'range-end' : '',
          col === 0 ? 'week-start' : '',
          col === 6 ? 'week-end' : '',
        ].filter(Boolean).join(' ');
        cells.push(`<td class="${classes}" aria-selected="${selected}">
          <button type="button" class="calendar-day" data-picker-date="${iso}" tabindex="${iso === pickerFocus ? '0' : '-1'}"
            aria-label="${CALENDAR_DAY_LABEL.format(day)} ${day.getUTCFullYear()}"${iso === currentToday ? ' aria-current="date"' : ''}>${day.getUTCDate()}</button>
        </td>`);
      }
      weeks.push(`<tr>${cells.join('')}</tr>`);
    }
    const grid = document.getElementById('calendarDays');
    grid.innerHTML = weeks.join('');
    document.getElementById('calendarSelection').textContent =
      CALENDAR_DATE_LABEL.formatRange?.(calendarDay(start), calendarDay(end)) ?? rangeLabel(pickedRange);
    if (focusDay) grid.querySelector('[tabindex="0"]')?.focus();
  }

  function showDatePicker() {
    if (Date.now() >= nextRefresh) renderEventView();
    pickedRange = { ...(customRange || selectedRange()) };
    pickedRange = { start: laterDate(pickedRange.start), end: laterDate(pickedRange.end) };
    pickerFocus = pickedRange.start;
    pickingEnd = false;
    renderDatePicker();
    document.getElementById('customDates').showModal();
    document.querySelector('[data-date-filter="custom"]').setAttribute('aria-expanded', 'true');
    document.querySelector('#calendarDays [tabindex="0"]')?.focus();
  }

  function choosePickerDate(date) {
    if (pickingEnd) {
      const first = pickedRange.start;
      pickedRange = date < first ? { start: date, end: first } : { start: first, end: date };
    } else {
      pickedRange = { start: date, end: date };
    }
    pickingEnd = !pickingEnd;
    pickerFocus = date;
    renderDatePicker(true);
  }

  function handleCalendarKeys(event) {
    const date = event.target.dataset.pickerDate;
    if (!date) return;
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    let next;
    if (offset) {
      next = addCalendarDays(date, offset);
    } else if (event.key === 'Home' || event.key === 'End') {
      const dayOfWeek = (calendarDay(date).getUTCDay() + 6) % 7;
      next = addCalendarDays(date, (event.key === 'Home' ? 0 : 6) - dayOfWeek);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      next = shiftPickerMonth(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
    } else {
      return;
    }
    event.preventDefault();
    if (isCalendarDate(next)) {
      pickerFocus = laterDate(next);
      renderDatePicker(true);
    }
  }

  function changeDatePreset(preset) {
    if (preset === 'custom') {
      showDatePicker();
      return;
    }
    datePreset = preset;
    filterEvents();
  }

  function applyCustomDates() {
    datePreset = 'custom';
    customRange = pickedRange;
    document.getElementById('customDates').close();
    filterEvents();
  }

  function eventMatchesFilters(ev) {
    if (currentRegion !== 'all' && ev.region !== currentRegion) return false;
    if (maxPriceLevel < MAX_PRICE_LEVEL && PRICE_TIERS.indexOf(eventPrice(ev).tier) > maxPriceLevel) return false;
    if (currentCategory === 'rainy') return ev.indoor === true;
    return currentCategory === 'all' || eventCategory(ev) === currentCategory;
  }

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
  function eventSlug(ev) {
    const name = String(ev.title || 'event').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
    const iso = eventDate(ev);
    return iso ? `${name}-${iso}` : name;
  }

  function eventLink(card) {
    return new URL(eventHref(card.dataset.eventId), location.href).href;
  }

  function eventHref(id) {
    return `?e=${encodeURIComponent(id)}`;
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
      const day = CALENDAR_DAY_LABEL.format(calendarDay(card.dataset.date));
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

  function renderLinkedEvent(now) {
    const detail = document.getElementById('eventDetail');
    const event = calendarEvents.find(ev => eventSlug(ev) === linkedEventId);
    if (!event) {
      const loading = firebaseReady && !liveEventsLoaded;
      detail.innerHTML = `<p role="status">${loading ? 'Loading event…' : 'Event details are unavailable.'}</p>`;
      return;
    }

    const schedule = scheduleFor(event);
    const past = eventIsPast(schedule, now);
    const dates = schedule.flatMap(period => [period.start, period.end]).sort();
    const dateLabel = dates.length ? rangeLabel({ start: dates[0], end: dates.at(-1) }) : '';
    document.title = `${event.title}${past ? ' (Past event)' : ''} — What's On Wellington`;
    const nextDate = past ? '' : nextEventDate(schedule, currentToday, '9999-12-31', now);
    const picked = Boolean(nextDate && weeklyPickIds(pickWeekStart(nextDate)).has(eventSlug(event)));
    detail.innerHTML = (past ? '<p class="event-detail-status" role="status">Past event · This event has ended.</p>' : '') +
      buildEventCardHTML(event, { detail: true, past, dateLabel, picked }) +
      (past ? buildRecommendations(event, now) : '');
  }

  function buildRecommendations(pastEvent, now) {
    const category = eventCategory(pastEvent);
    const seriesTitle = event => String(event.title || '').replace(/\s+[–—-]\s+(?:opening weekend|final weekend|final day)$/i, '');
    const pastTitle = seriesTitle(pastEvent);
    const candidates = calendarEvents.flatMap(event => {
      const date = nextEventDate(scheduleFor(event), currentToday, '9999-12-31', now);
      if (!date) return [];
      const title = seriesTitle(event);
      const relevance = (title === pastTitle ? 4 : 0) +
        (eventCategory(event) === category ? 2 : 0) + (event.region === pastEvent.region ? 1 : 0);
      return [{ event, title, date, relevance }];
    }).sort((a, b) => b.relevance - a.relevance || a.date.localeCompare(b.date));
    const seen = new Set();
    const suggestions = [];
    for (const { event, title, date } of candidates) {
      if (!title || seen.has(title)) continue;
      seen.add(title);
      suggestions.push(`<li><a href="${eventHref(eventSlug(event))}">${escHtml(event.title)}
        <time datetime="${date}">${CALENDAR_DATE_LABEL.format(calendarDay(date))}</time></a></li>`);
      if (suggestions.length === 3) break;
    }
    return suggestions.length ? `<section class="event-recommendations" aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading">Upcoming events you might like</h2><ul>${suggestions.join('')}</ul>
    </section>` : '';
  }

  function buildEventCardHTML(ev, { detail = false, past = false, dateLabel = '', listingDate = eventDate(ev), picked = false } = {}) {
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

    const price = eventPrice(ev);
    // Price is also shown on collapsed mobile cards.
    const badgeParts = [priceBadge(price.tier, price.estimated)];
    if (ev.free && ev.free !== true && price.tier !== 'Free') badgeParts.push(`<span class="badge badge-free">${escHtml(ev.free)}</span>`);
    if (ev.ticketed && !past) badgeParts.push(`<span class="badge badge-ticketed">Ticketed</span>`);
    if (ev.family)   badgeParts.push(`<span class="badge badge-family">${escHtml(ev.family)}</span>`);
    if (picked && !past) badgeParts.push(`<span class="badge badge-hot"><span aria-hidden="true">🔥</span><span class="sr-only">Editor's pick</span></span>`);
    const badgesHtml = badgeParts.length ? `<div class="card-badges">${badgeParts.join('')}</div>` : '';

    const mapUrl = safeUrl(ev.mapUrl);
    const venue = escHtml(ev.venue || '');
    const venueHtml = mapUrl ? `<a href="${escHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">${venue}</a>` : venue;
    const meta = [
      dateLabel ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">📅</span>${escHtml(dateLabel)}</div>` : '',
      ev.time  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">🕐</span>${escHtml(ev.time)}</div>`  : '',
      ev.venue ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">📍</span>${venueHtml}</div>` : '',
      ev.cost  ? `<div class="meta-row"><span class="meta-icon" aria-hidden="true">💰</span>${escHtml(ev.cost)}</div>`  : '',
    ].join('');
    const detailsUrl = safeUrl(ev.url);
    const detailsLabel = past ? 'Original event details' :
      detailsUrl.startsWith('https://www.google.com/search?') ? 'Search for details' : 'View event';
    const eventId = eventSlug(ev);
    const footer = (detailsUrl
      ? `<a class="event-btn" href="${escHtml(detailsUrl)}" target="_blank" rel="noopener noreferrer">${detailsLabel} <span aria-hidden="true">↗</span><span class="sr-only"> (opens ${escHtml(extractDomain(detailsUrl))} in a new tab)</span></a>`
      : detail ? '' : `<a class="event-btn" href="${eventHref(eventId)}">Event details <span aria-hidden="true">→</span></a>`) +
      `<button type="button" class="share-btn" aria-label="Share ${escHtml(ev.title)}">${SHARE_ICON}<span class="share-btn-label">Share</span></button>`;
    const tierAttr = picked && !past ? 'featured' : 'standard';
    const titleTag = detail ? 'h2' : 'div';
    return `
      <article class="card card-${tierAttr}${ev.imgPoster ? ' card-poster' : ''}${detail ? ' open revealed' : ''}" aria-labelledby="${titleId}" data-tier="${tierAttr}" data-region="${escHtml(region)}" data-event-id="${escHtml(eventId)}" ${idAttr} data-weekend="${escHtml(ev.weekend || '')}" data-day="${escHtml(ev.day || 'sat')}" data-date="${listingDate}" data-category="${eventCategory(ev)}" data-price-tier="${price.tier}"${ev.img ? ` data-img="${escHtml(ev.img)}"` : ''}${ev.imgGenerated ? ' data-img-generated="1"' : ''}${picked && !past ? ' data-pick="1"' : ''}${ev.indoor ? ' data-indoor="1"' : ''}>
        ${stripHtml}
        ${ev.img ? cardImgHTML(ev.img, ev.title, false, ev.imgGenerated) : ''}
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-cat"${catStyle}>${catLabel}</div>
              <${titleTag} class="card-title" id="${titleId}">${escHtml(ev.title)}</${titleTag}>
            </div>
            ${badgesHtml}
          </div>
          ${detail ? '' : `<button type="button" class="card-toggle" aria-expanded="false" aria-controls="${titleId}-more" aria-label="Show details for ${escHtml(ev.title)}"></button>`}
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

    const eyebrow = section.querySelector('.highlights-eyebrow');
    if (eyebrow) eyebrow.textContent = `🔥 Picks for ${rangeLabel(selectedRange())}`;
    const picks = [...document.querySelectorAll('#calendarResults .card[data-pick="1"]')];

    track.innerHTML = '';
    if (!picks.length) { section.style.display = 'none'; return; }
    section.style.display = '';

    picks.forEach((card, pickIdx) => {
      const title     = card.querySelector('.card-title')?.textContent.trim() || '';
      const img       = card.dataset.img || '';
      const metaRows  = [...card.querySelectorAll('.meta-row')];
      const timeText  = metaRows[0]?.textContent.trim() || '';
      const venueText = metaRows[1]?.textContent.trim() || '';
      const price     = card.querySelector('.badge-price')?.outerHTML || '';
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
          <div class="highlight-card-title-row">
            <div class="highlight-card-title">${escHtml(title)}</div>
            ${price}
          </div>
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

  function renderCalendar(now) {
    const results = document.getElementById('calendarResults');
    const openId = results.querySelector('.card.open')?.dataset.eventId;
    const { start, end } = selectedRange();
    const groups = new Map();
    let datesHaveEvents = false;
    const picksByWeek = new Map();
    const displayedPickIds = new Set();
    const isPicked = (ev, date) => {
      const week = pickWeekStart(date);
      if (!picksByWeek.has(week)) picksByWeek.set(week, weeklyPickIds(week));
      const id = eventSlug(ev);
      const key = week + '|' + id;
      if (!picksByWeek.get(week).has(id) || displayedPickIds.has(key)) return false;
      displayedPickIds.add(key);
      return true;
    };

    for (const ev of calendarEvents) {
      const day = nextEventDate(scheduleFor(ev), start, end, now);
      if (!day) continue;
      datesHaveEvents = true;
      if (!eventMatchesFilters(ev)) continue;
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(ev);
    }

    const dates = [...groups.keys()].sort();
    document.getElementById('dateRangeSummary').textContent = rangeLabel({ start, end });
    const headings = dates.map(iso => {
      const d = calendarDay(iso);
      const weekday = CALENDAR_DAY_LABEL.formatToParts(d).find(part => part.type === 'weekday').value;
      return `<div class="day-label day-${weekday.slice(0, 3).toLowerCase()}" id="day-${iso}" data-date="${iso}">
        <span class="pip"></span><h2>${CALENDAR_DAY_LABEL.format(d)}</h2><span class="line"></span>
      </div><div class="events-grid">${groups.get(iso).map(ev => buildEventCardHTML(ev, { listingDate: iso, picked: isPicked(ev, iso) })).join('')}</div>`;
    }).join('');

    if (!dates.length) {
      const message = datesHaveEvents
        ? (maxPriceLevel === 0 ? 'No free events match these filters.' : 'No events match these filters.')
        : 'No events are listed for these dates.';
      results.innerHTML = `<div class="no-results" role="status"><p>${message}</p>
        ${datesHaveEvents ? '<button type="button" class="no-results-reset">Clear event filters</button>' : ''}
      </div>`;
    } else {
      results.innerHTML = headings;
      if (dates.length > 1) renderDaySelector(results, dates, groups);
      if (openId) {
        const openCard = [...results.querySelectorAll('.card')].find(card => card.dataset.eventId === openId);
        if (openCard) setCardOpen(openCard, true);
      }
    }
    buildHighlightsRow();
    setEagerImages();
    observeCards(results);
  }

  function renderDaySelector(results, dates, groups) {
    const selector = document.createElement('nav');
    selector.className = 'day-selector';
    selector.setAttribute('aria-label', 'Jump to day');
    selector.innerHTML = dates.map((iso, i) => {
      const day = calendarDay(iso);
      const name = CALENDAR_DAY_LABEL.formatToParts(day).find(part => part.type === 'weekday').value;
      const count = groups.get(iso).length;
      return `<button class="day-pill${i === 0 ? ' active' : ''}" type="button" data-date="${iso}" aria-label="${CALENDAR_DAY_LABEL.format(day)}, ${count} ${count === 1 ? 'event' : 'events'}">
        <span class="day-pill-name">${name.slice(0, 3)}</span>
        <span class="day-pill-date">${day.getUTCDate()}</span>
        <span class="day-pill-count">${count}</span>
      </button>`;
    }).join('');
    results.prepend(selector);
  }

  function loadFirestoreEvents() {
    if (!firebaseReady) return;
    db.collection('events').where('active', '==', true).onSnapshot(snapshot => {
      const liveEvents = snapshot.docs.map(doc => {
        const ev = doc.data();
        const date = isCalendarDate(ev.date) ? ev.date : (legacyEventDates.get(legacyEventKey(ev)) || eventDate(ev));
        const curated = curatedEvents.get(eventListingKey({ ...ev, date }));
        return { ...eventScheduleFields(curated || {}), ...ev, id: doc.id, date };
      });
      const liveKeys = new Set(liveEvents.map(eventListingKey));
      calendarEvents = [...staticEvents.filter(ev => !liveKeys.has(eventListingKey(ev))), ...liveEvents];
      liveEventsLoaded = true;
      if (calendarReady) renderEventView();
    }, err => {
      console.warn('Firestore events error:', err);
      liveEventsLoaded = true;
      if (calendarReady && currentSection === 'event') renderEventView();
    });
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

    // Calendar filters share the same date range and results.
    document.querySelectorAll('[data-filter-region]').forEach(btn =>
      btn.addEventListener('click', () => { currentRegion = btn.dataset.filterRegion; filterEvents(); })
    );
    document.querySelectorAll('[data-filter-category]').forEach(btn =>
      btn.addEventListener('click', () => { currentCategory = btn.dataset.filterCategory; filterEvents(); })
    );
    on('priceFilter', 'input', e => { maxPriceLevel = e.target.valueAsNumber; filterEvents(); });
    document.querySelectorAll('[data-date-filter]').forEach(btn =>
      btn.addEventListener('click', () => changeDatePreset(btn.dataset.dateFilter))
    );
    setupDateCarousel();
    const dialog = document.getElementById('customDates');
    on('closeCalendar', 'click', () => dialog.close());
    on('customDates', 'close', () => {
      document.querySelector('[data-date-filter="custom"]').setAttribute('aria-expanded', 'false');
    });
    on('customDates', 'click', e => {
      if (e.target !== dialog) return;
      const { left, right, top, bottom } = dialog.getBoundingClientRect();
      if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) dialog.close();
    });
    on('previousCalendarMonth', 'click', () => {
      pickerFocus = laterDate(shiftPickerMonth(pickerFocus, -1));
      renderDatePicker();
    });
    on('nextCalendarMonth', 'click', () => {
      pickerFocus = shiftPickerMonth(pickerFocus, 1);
      renderDatePicker();
    });
    on('calendarDays', 'click', e => {
      const button = e.target.closest('[data-picker-date]');
      if (button) choosePickerDate(button.dataset.pickerDate);
    });
    on('calendarDays', 'keydown', handleCalendarKeys);
    on('applyCalendarDates', 'click', applyCustomDates);
    on('calendarResults', 'click', e => {
      if (e.target.closest('.no-results-reset')) {
        resetEventFilters();
        filterEvents();
        document.querySelector('[data-filter-category="all"]').focus();
        return;
      }
      const pill = e.target.closest('.day-pill');
      if (!pill) return;
      pill.closest('.day-selector').querySelector('.day-pill.active')?.classList.remove('active');
      pill.classList.add('active');
      const label = document.getElementById('day-' + pill.dataset.date);
      const offset = document.querySelector('.tabs-bar').offsetHeight + 12;
      window.scrollTo({ top: window.scrollY + label.getBoundingClientRect().top - offset, behavior: 'smooth' });
    });

    const holidayLink = document.getElementById('holidayCta');
    holidayLink.querySelector('.holiday-cta-text').textContent = 'School holidays · 19 Dec – 2 Feb';
    holidayLink.addEventListener('click', e => {
      e.preventDefault();
      datePreset = 'custom';
      customRange = SCHOOL_HOLIDAYS;
      showSection('events');
      document.getElementById('eventDateFilters').scrollIntoView();
    });

    // Install banner
    on('installBannerInstallBtn', 'click', () => triggerInstall());
    on('installBannerCloseBtn',   'click', () => dismissInstall());

    // iOS install modal
    on('iosInstallOverlay', 'click', e => { if (e.target === e.currentTarget) closeIOSModal(); });
    on('iosDoneBtn',        'click', () => closeIOSModal());
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEventListeners();
    const section = readHash();
    calendarReady = true;
    showSection(section);

    const refreshIfDue = () => { if (Date.now() >= nextRefresh) renderEventView(); };
    document.addEventListener('visibilitychange', refreshIfDue);
    window.addEventListener('pageshow', refreshIfDue);

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

      async function fetchWeather() {
        const satKey = weekendForDate(aucklandToday());
        const sunKey = addCalendarDays(satKey, 1);

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
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=-41.2865&longitude=174.7762&daily=weathercode,temperature_2m_max,precipitation_probability_max&start_date=' + satKey + '&end_date=' + sunKey + '&timezone=Pacific%2FAuckland';

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
