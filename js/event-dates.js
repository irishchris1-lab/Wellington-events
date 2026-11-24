// Dates are civil days in Wellington. Use UTC only for calendar arithmetic
// so a visitor's timezone or a daylight saving change can't move an event.
const AUCKLAND_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
});
const EVENT_DAY_OFFSETS = { fri: -1, sat: 0, sun: 1, mon: 2, tue: 3, wed: 4, thu: 5 };

function aucklandToday(now = new Date()) {
  const parts = Object.fromEntries(AUCKLAND_DATE_FORMAT.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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
  return day.toISOString().slice(0, 10);
}

function eventDate(ev) {
  if (isCalendarDate(ev.date)) return ev.date;
  if (!isCalendarDate(ev.weekend)) return '';
  const offset = Object.hasOwn(EVENT_DAY_OFFSETS, ev.day) ? EVENT_DAY_OFFSETS[ev.day] : 0;
  return addCalendarDays(ev.weekend, offset);
}

function weekendForDate(iso) {
  const offset = 6 - calendarDay(iso).getUTCDay();
  return addCalendarDays(iso, offset === 6 ? -1 : offset);
}
