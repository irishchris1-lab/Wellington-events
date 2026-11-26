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

const PRICE_LABELS = {
  Free: 'Free entry',
  '$': 'Under NZ$30',
  '$$': 'NZ$30 to under NZ$80',
  '$$$': 'NZ$80 or more',
};

function eventPrice(ev, curatedEvents) {
  if (ev.priceUnknown === true) return { tier: 'Unknown', estimated: false };
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
  const curated = curatedEvents?.get(eventListingKey(ev));
  if (curated && Object.hasOwn(PRICE_LABELS, curated.priceTier)) {
    return { tier: curated.priceTier, estimated: curated.priceEstimated === true };
  }
  return { tier: eventCategory(ev) === 'music' ? '$$' : '$', estimated: true };
}

function priceBadge(tier, estimated) {
  if (tier === 'Unknown') return '<span class="badge badge-price badge-ticketed" title="Price not confirmed">Price TBC</span>';
  const style = tier === 'Free' ? 'badge-free' : 'badge-ticketed';
  return `<span class="badge badge-price ${style}" title="${PRICE_LABELS[tier]}${estimated ? ' (estimated)' : ''}">${tier}${estimated ? ' <abbr title="Estimated">est.</abbr>' : ''}</span>`;
}

function eventListingKey(ev) {
  return `${(ev.title || '').trim()}|${eventDate(ev)}`;
}

function legacyEventKey(ev) {
  return `${(ev.title || '').trim()}|${ev.weekend || ''}|${ev.day || 'sat'}`;
}

// Merge live records the same way in Admin and on the public calendar. A draft
// can be edited independently of its published catalogue listing.
function eventCatalogue(staticEvents, liveEvents) {
  const byListing = new Map(staticEvents.map(ev => [eventListingKey(ev), ev]));
  const byId = new Map(staticEvents.map(ev => [eventSlug(ev), ev]));
  const legacyDates = new Map(staticEvents.filter(ev => isCalendarDate(ev.date)).map(ev => [legacyEventKey(ev), ev.date]));
  const records = liveEvents.map(ev => {
    const date = isCalendarDate(ev.date) ? ev.date : (legacyDates.get(legacyEventKey(ev)) || eventDate(ev));
    const original = byId.get(ev.publicId) || byListing.get(eventListingKey({ ...ev, date }));
    return { ...eventScheduleFields(original || {}), ...ev, date };
  });
  const active = records.filter(ev => ev.active === true);
  const liveKeys = new Set(active.map(eventListingKey));
  const liveIds = new Set(active.map(eventSlug));
  const published = staticEvents.filter(ev => !liveKeys.has(eventListingKey(ev)) && !liveIds.has(eventSlug(ev))).concat(active);
  return { published, drafts: records.filter(ev => ev.active !== true) };
}

const MAX_WEEKLY_PICKS = 3;
const EDITORIAL_PICKS_BY_WEEK = Object.freeze({
  '2026-11-23': ['johnsonville-rotary-christmas-market-2026-11-28'],
  '2026-11-30': ['upper-hutt-santa-parade-2026-12-06'],
});

function readWeeklyPicks(value) {
  return Object.fromEntries(Object.entries(value || {}).flatMap(([week, ids]) => {
    if (!isCalendarDate(week) || eventWeekStart(week) !== week || !Array.isArray(ids)) return [];
    return [[week, [...new Set(ids.filter(id => typeof id === 'string' && /^[\w-]+$/.test(id)))].slice(0, MAX_WEEKLY_PICKS)]];
  }));
}

function eventDateInWeek(schedule, week, now) {
  const today = aucklandToday(now);
  return nextEventDate(schedule, today > week ? today : week, addCalendarDays(week, 6), now);
}

function resolveWeeklyPicks(events, week, saved, now, scheduleFor = eventSchedule) {
  const custom = Object.hasOwn(saved, week);
  const approved = custom ? saved[week] : EDITORIAL_PICKS_BY_WEEK[week];
  const candidates = events.flatMap(ev => {
    const id = eventSlug(ev);
    const rank = approved?.findIndex(key => key === id || key === legacyEventSlug(ev)) ?? -1;
    const scheduled = !custom && ev.pick === true && ev.pickWeek === week;
    const legacy = !approved && ev.pick && !ev.pickWeek;
    if (rank < 0 && !scheduled && !legacy) return [];
    const date = eventDateInWeek(scheduleFor(ev), week, now);
    return date ? [{ id, priority: rank >= 0 ? rank : scheduled ? MAX_WEEKLY_PICKS : MAX_WEEKLY_PICKS + 1, date }] : [];
  });
  candidates.sort((a, b) => a.priority - b.priority || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return [...new Set(candidates.map(ev => ev.id))].slice(0, MAX_WEEKLY_PICKS);
}
