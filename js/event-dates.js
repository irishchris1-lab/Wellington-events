// Dates are civil days in Wellington. Use UTC only for calendar arithmetic
// so a visitor's timezone or a daylight saving change can't move an event.
const AUCKLAND_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const EVENT_DAY_OFFSETS = { fri: -1, sat: 0, sun: 1, mon: 2, tue: 3, wed: 4, thu: 5 };
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

function eventPeriod(ev, date) {
  const startStamp = readEventDateTime(ev.start);
  const start = startStamp?.date || date;
  if (!start) return null;
  const suppliedEnd = readEventDateTime(ev.end);
  const endStamp = suppliedEnd?.date >= start ? suppliedEnd : null;
  const endDate = endStamp?.date || (isCalendarDate(ev.endDate) ? ev.endDate : '');
  const last = endDate >= start ? endDate : start;
  const daily = ev.daily === true && last > start;
  const hours = legacyEventHours(ev.time);
  const opening = startStamp?.time || eventClock(ev.startTime) || hours.start;
  const closing = endStamp?.time || eventClock(ev.endTime) || hours.end;
  const overnight = !closing || closing === '24:00:00' ||
    ((daily || !endDate || endDate === start) && !endStamp?.time && opening && closing < opening);
  const expiry = day => aucklandInstant(overnight ? addCalendarDays(day, 1) : day,
    closing && closing !== '24:00:00' ? closing : '00:00:00');
  const explicitEnd = endStamp?.time && endDate >= start && !daily;
  let endsAt = explicitEnd ? endStamp.instant ?? (expiry(last) + (endStamp.milliseconds || 0)) : expiry(last);
  if (endsAt <= aucklandInstant(start, opening && opening !== '24:00:00' ? opening : undefined, false)) {
    endsAt = aucklandInstant(addCalendarDays(last, 1));
  }
  if (!Number.isFinite(endsAt)) return null;
  return { start, last, end: aucklandToday(endsAt - 1), endsAt, daily, expiry };
}

function eventScheduleFields(ev) {
  const fields = ['start', 'startTime', 'end', 'endDate', 'endTime', 'daily', 'occurrences'];
  return Object.fromEntries(fields.filter(field => Object.hasOwn(ev, field)).map(field => [field, ev[field]]));
}

// Each dated listing is one occurrence unless it supplies a daily run or explicit sessions.
function eventSchedule(ev) {
  if (Array.isArray(ev.occurrences) && ev.occurrences.length) {
    const periods = ev.occurrences.map(session => {
      if (typeof session === 'string') session = { date: session };
      if (!session || typeof session !== 'object') return null;
      return eventPeriod({ time: ev.time, startTime: ev.startTime, endTime: ev.endTime, ...session }, eventDate(session));
    }).filter(Boolean);
    if (periods.length) return periods;
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
    if (period.daily && day <= period.last && period.expiry(day) <= now) day = addCalendarDays(day, 1);
    if (day <= end && day <= period.end && (!next || day < next)) next = day;
  }
  return next;
}
