// Dates are civil days in Wellington. Use UTC only for calendar arithmetic
// so a visitor's timezone or a daylight saving change can't move an event.
const AUCKLAND_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const EVENT_DAY_OFFSETS = { fri: -1, sat: 0, sun: 1, mon: 2, tue: 3, wed: 4, thu: 5 };
const EVENT_WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const EVENT_SCHEDULE_TYPES = ['one-off', 'multi-day', 'recurring', 'ongoing'];
const DAY_MS = 86_400_000;

function aucklandDateTime(now) {
  const parts = Object.fromEntries(AUCKLAND_DATE_FORMAT.formatToParts(now).map(part => [part.type, part.value]));
  const year = parts.year.length > 4 ? `+${parts.year.padStart(6, '0')}` : parts.year.padStart(4, '0');
  return `${year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function aucklandToday(now = new Date()) {
  return aucklandDateTime(now).split('T')[0];
}

function calendarDay(iso) {
  return new Date(iso + 'T00:00:00Z');
}

function isCalendarDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const day = calendarDay(iso);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === iso;
}

function addCalendarDays(iso, offset) {
  const day = calendarDay(iso);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().split('T')[0];
}

function eventDate(ev) {
  if (isCalendarDate(ev.date)) return ev.date;
  if (isCalendarDate(ev.weekend)) {
    const offset = Object.hasOwn(EVENT_DAY_OFFSETS, ev.day) ? EVENT_DAY_OFFSETS[ev.day] : 0;
    return addCalendarDays(ev.weekend, offset);
  }
  return readEventDateTime(ev.start)?.date || '';
}

function legacyEventSlug(ev) {
  const name = String(ev.slugTitle || ev.title || 'event').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
  const date = eventDate(ev);
  return date ? `${name}-${date}` : name;
}

function eventSlug(ev) {
  return typeof ev.publicId === 'string' && /^[\w-]+$/.test(ev.publicId) ? ev.publicId : legacyEventSlug(ev);
}

function eventWeekStart(date) {
  return addCalendarDays(date, -((calendarDay(date).getUTCDay() + 6) % 7));
}

function eventStartDate(ev) {
  return readEventDateTime(ev.start)?.date || eventDate(ev);
}

function eventEndDate(ev) {
  return readEventDateTime(ev.end)?.date || (isCalendarDate(ev.endDate) ? ev.endDate : '');
}

function eventScheduleType(ev) {
  if (EVENT_SCHEDULE_TYPES.includes(ev.scheduleType)) return ev.scheduleType;
  const start = eventStartDate(ev);
  const end = eventEndDate(ev);
  if (start && ev.category === 'exhibitions' && end > addCalendarDays(start, 6)) return 'ongoing';
  if (ev.occurrences?.length || ev.daysOfOperation?.length) return 'recurring';
  return end > start ? 'multi-day' : 'one-off';
}

function weekendForDate(iso) {
  const offset = 6 - calendarDay(iso).getUTCDay();
  return addCalendarDays(iso, offset === 6 ? -1 : offset);
}

function aucklandInstant(date, time = '00:00:00', preferLater = true) {
  const local = `${date}T${time}`;
  const utc = Date.parse(local + 'Z');
  if (!Number.isFinite(utc)) return NaN;
  const offsetAt = instant => Date.parse(aucklandDateTime(instant) + 'Z') - instant;
  const before = utc - offsetAt(utc - DAY_MS);
  const after = utc - offsetAt(utc + DAY_MS);
  if (before === after) return before;
  // Fall-back repeats an hour. For closing times use the later occurrence.
  const matches = [before, after].filter(instant => aucklandDateTime(instant) === local);
  if (matches.length) return preferLater ? Math.max(...matches) : Math.min(...matches);
  // A clock time skipped in spring moves forward by the size of the gap.
  return Math.max(before, after);
}

function readEventDateTime(value) {
  if (isCalendarDate(value)) return { date: value };
  if (typeof value?.toMillis === 'function') {
    const instant = value.toMillis();
    if (!Number.isFinite(instant)) return null;
    const [date, time] = aucklandDateTime(instant).split('T');
    return { date, time, instant };
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/i.exec(value);
  if (!match || !isCalendarDate(match[1])) return null;
  const [, date, hours, minutes, seconds = '00', fraction, zone] = match;
  if (zone) {
    const instant = Date.parse(value);
    if (!Number.isFinite(instant)) return null;
    const [localDate, time] = aucklandDateTime(instant).split('T');
    return { date: localDate, time, instant };
  }
  return { date, time: `${hours}:${minutes}:${seconds}`, milliseconds: fraction ? Number(fraction) * 1000 : 0 };
}

function eventClock(value, impliedPeriod = '') {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'midnight' || text === '24:00') return '24:00:00';
  if (text === 'noon') return '12:00:00';
  const match = /^(\d{1,2})(?::([0-5]\d)(?::([0-5]\d))?)?\s*(am|pm)?$/.exec(text);
  if (!match) return '';
  const [, hours, minutes, seconds = '00', meridiem = impliedPeriod] = match;
  const hour = Number(hours);
  if (meridiem && hour >= 1 && hour <= 12) {
    return `${String(hour % 12 + (meridiem === 'pm' ? 12 : 0)).padStart(2, '0')}:${minutes || '00'}:${seconds}`;
  }
  return !meridiem && minutes && hour < 24 ? `${hours.padStart(2, '0')}:${minutes}:${seconds}` : '';
}

function legacyEventHours(label) {
  // Use explicit ranges or closing times. A standalone time may be a start time.
  const clock = '(?:noon|midnight|\\d{1,2}(?::[0-5]\\d)?\\s*(?:am|pm)?)';
  const closing = new RegExp(`\\b(?:closes at|ends at|finishes at)\\s+(${clock})\\b`, 'i');
  const ranges = new RegExp(`(?<![\\d:])(${clock})\\s*[-–—]\\s*(${clock})\\b`, 'gi');
  const text = String(label || '').replace(/\b([ap])\.m\.?/gi, '$1m');
  const statedClose = eventClock(closing.exec(text)?.[1]);
  if (statedClose) return { end: statedClose };
  for (const [, from, to] of text.matchAll(ranges)) {
    const end = eventClock(to);
    if (!end) continue;
    const period = to.match(/(am|pm)$/i)?.[1].toLowerCase();
    const start = eventClock(from);
    const impliedStart = !start && period ? eventClock(from, period) : '';
    if (start) return { start, end };
    if (impliedStart) {
      return { start: impliedStart > end ? eventClock(from, period === 'pm' ? 'am' : 'pm') : impliedStart, end };
    }
  }
  return {};
}

function eventPeriod(ev, date, { days = null, openEnded = false, opens, closes } = {}) {
  const startStamp = readEventDateTime(ev.start);
  const first = startStamp?.date || date;
  if (!first) return null;
  const suppliedEnd = readEventDateTime(ev.end);
  const endStamp = suppliedEnd?.date >= first ? suppliedEnd : null;
  const endDate = endStamp?.date || (isCalendarDate(ev.endDate) ? ev.endDate : '');
  const finalDay = endDate >= first ? endDate : first;
  const start = days ? operatingDate(first, days) : first;
  const last = openEnded ? null : days ? operatingDate(finalDay, days, -1) : finalDay;
  if (last && last < start) return null;
  const hours = legacyEventHours(ev.time);
  const opening = opens || startStamp?.time || eventClock(ev.startTime) || hours.start || '';
  const closing = closes || endStamp?.time || eventClock(ev.endTime) || hours.end || '';
  const overnight = !closing || closing === '24:00:00' ||
    ((days || !endDate || endDate === first) && (days || !endStamp?.time) &&
      (closing === '00:00:00' || (opening && closing < opening)));
  const expiry = day => aucklandInstant(overnight ? addCalendarDays(day, 1) : day,
    closing && closing !== '24:00:00' ? closing : '00:00:00');
  const explicitEnd = endStamp?.time && !days;
  const startsAt = startStamp?.instant !== undefined && !days ? startStamp.instant
    : aucklandInstant(start, opening && opening !== '24:00:00' ? opening : undefined, false) + (startStamp?.milliseconds || 0);
  let endsAt = Infinity;
  if (last) {
    endsAt = explicitEnd ? endStamp.instant ?? (expiry(last) + (endStamp.milliseconds || 0)) : expiry(last);
    if (endsAt <= startsAt) endsAt = aucklandInstant(addCalendarDays(last, 1));
    if (!Number.isFinite(endsAt)) return null;
  }
  return { start, last, end: last ? aucklandToday(endsAt - 1) : null, startsAt, endsAt, days, opening, closing, overnight, expiry };
}

function operatingDate(date, days, direction = 1) {
  const weekday = calendarDay(date).getUTCDay();
  for (let offset = 0; offset < 7; offset++) {
    if (days.includes(EVENT_WEEKDAYS[(weekday + offset * direction + 7) % 7])) {
      return addCalendarDays(date, offset * direction);
    }
  }
}

function eventScheduleFields(ev) {
  const fields = ['publicId', 'scheduleType', 'start', 'startTime', 'end', 'endDate', 'endTime', 'daily', 'occurrences',
    'daysOfOperation', 'openingHours', 'pickWeek'];
  return Object.fromEntries(fields.filter(field => Object.hasOwn(ev, field)).map(field => [field, ev[field]]));
}

function eventSchedule(ev) {
  if (Array.isArray(ev.occurrences) && ev.occurrences.length) {
    const periods = ev.occurrences.map(session => {
      if (typeof session === 'string') session = { date: session };
      if (!session || typeof session !== 'object') return null;
      return eventPeriod({ time: ev.time, startTime: ev.startTime, endTime: ev.endTime, ...session }, eventDate(session));
    }).filter(Boolean);
    if (periods.length) return periods;
  }
  const type = eventScheduleType(ev);
  const chosenDays = EVENT_WEEKDAYS.filter(day => Array.isArray(ev.daysOfOperation) && ev.daysOfOperation.includes(day));
  const repeating = ev.daily === true || chosenDays.length || ev.openingHours || type === 'recurring' ||
    (type === 'ongoing' && !readEventDateTime(ev.end)?.time);
  if (repeating) {
    const days = chosenDays.length ? chosenDays : EVENT_WEEKDAYS;
    const hoursByDay = new Map();
    for (const day of days) {
      const opens = eventClock(ev.openingHours?.[day]?.opens);
      const closes = eventClock(ev.openingHours?.[day]?.closes);
      const key = `${opens}|${closes}`;
      if (!hoursByDay.has(key)) hoursByDay.set(key, { opens, closes, days: [] });
      hoursByDay.get(key).days.push(day);
    }
    const openEnded = !eventEndDate(ev) && (type === 'ongoing' || type === 'recurring');
    return [...hoursByDay.values()].map(hours => eventPeriod(ev, eventDate(ev), { ...hours, openEnded })).filter(Boolean);
  }
  const period = eventPeriod(ev, eventDate(ev));
  return period ? [period] : [];
}

function eventIsPast(periods, now = Date.now()) {
  return periods.length > 0 && periods.every(period => period.endsAt <= now);
}

function nextEventDate(periods, start, end, now) {
  let next = '';
  for (const period of periods) {
    if (period.endsAt <= now) continue;
    let day = period.start > start ? period.start : start;
    if (period.days) day = nextOperatingDay(period, day, now);
    if (day && day <= end && (!period.end || day <= period.end) && (!next || day < next)) next = day;
  }
  return next;
}

function nextOperatingDay(period, start, now) {
  const today = aucklandToday(now);
  const day = start > today ? start : today;
  const overnight = period.overnight && period.closing && !['00:00:00', '24:00:00'].includes(period.closing);
  if (overnight) {
    const previous = addCalendarDays(day, -1);
    if (previous >= period.start && (!period.last || previous <= period.last) &&
        period.days.includes(EVENT_WEEKDAYS[calendarDay(previous).getUTCDay()]) && period.expiry(previous) > now) return day;
  }
  let session = operatingDate(day, period.days);
  if (session === today && period.expiry(session) <= now) {
    session = operatingDate(addCalendarDays(session, 1), period.days);
  }
  return !period.last || session <= period.last ? session : '';
}

function eventScheduleRange(periods) {
  if (!periods.length) return null;
  const start = periods.map(period => period.start).sort()[0];
  const end = periods.some(period => !period.last) ? null : periods.map(period => period.last).sort().at(-1);
  return { start, end };
}
