// Pure date logic: which day should we book, and is it one of the configured days?
// Kept free of Playwright so it can be unit tested.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Returns the calendar date (Y, M, D) and wall-clock time in `timeZone` for an instant.
export function zonedParts(instant, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour), minute: Number(p.minute), second: Number(p.second),
  };
}

// Adds days to a calendar date without timezone surprises.
export function addDays({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function weekdayOf({ year, month, day }) {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function isoDate({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// The job starts a few minutes before midnight so it is ready when booking opens.
// "Booking day" is the calendar day that starts at the next opening time.
// If we're already past opening time today (e.g. a late or manual run), it's today.
export function bookingDay(instant, config) {
  const now = zonedParts(instant, config.timezone);
  const [oh, om] = config.opensAt.split(':').map(Number);
  const minutesNow = now.hour * 60 + now.minute;
  const today = { year: now.year, month: now.month, day: now.day };
  // Within the hour before opening: treat as the next day's run.
  const openMin = oh * 60 + om;
  const lead = (openMin - minutesNow + 1440) % 1440;
  return lead > 0 && lead <= 60 ? addDays(today, 1) : today;
}

// The days to book and their start times. Older settings have one startTime for a list of days.
export function slotsFor(config) {
  return config.slots ?? (config.days ?? []).map((day) => ({ day, start: config.startTime }));
}

export function startTimeFor(weekday, config) {
  return slotsFor(config).find((slot) => slot.day === weekday)?.start;
}

function targetOn(date, config) {
  const weekday = weekdayOf(date);
  return { date: isoDate(date), weekday, wanted: slotsFor(config).some((slot) => slot.day === weekday) };
}

// Works out what to book. Returns { date, weekday, wanted }.
export function targetFor(instant, config) {
  return targetOn(addDays(bookingDay(instant, config), config.daysAhead), config);
}

// The furthest-out date that is both open and wanted, for test runs on nights with nothing to book.
export function latestOpenTarget(instant, config) {
  for (let back = 0; back <= config.daysAhead; back++) {
    const target = targetOn(addDays(bookingDay(instant, config), config.daysAhead - back), config);
    if (target.wanted) return target;
  }
  return targetFor(instant, config);
}

// Milliseconds until the opening time on `bookingDay` (0 if already open).
export function msUntilOpen(instant, config) {
  const now = zonedParts(instant, config.timezone);
  const [oh, om] = config.opensAt.split(':').map(Number);
  const nowMin = now.hour * 60 + now.minute + now.second / 60;
  const openMin = oh * 60 + om;
  const lead = (openMin - nowMin + 1440) % 1440;
  if (lead > 60) return 0; // not in the pre-opening window, so it's already open
  return Math.round(lead * 60 * 1000);
}

export function endTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const t = h * 60 + m + durationMinutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// Scheduled runs only proceed from 60 minutes before opening to 20 minutes after.
// GitHub fires two crons a day (to cover daylight saving time); this drops the
// one that lands at the wrong hour while tolerating GitHub's start-up delays.
export function inRunWindow(instant, config) {
  const now = zonedParts(instant, config.timezone);
  const [oh, om] = config.opensAt.split(':').map(Number);
  const diff = ((now.hour * 60 + now.minute) - (oh * 60 + om) + 1440) % 1440; // minutes past opening
  return diff <= 20 || diff >= 1440 - 60;
}
