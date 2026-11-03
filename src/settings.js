// Checks settings coming from the settings page before they are saved to config.json.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Returns `current` with the user's choices applied. Throws if a choice isn't valid.
// Other settings (timezone and so on) always stay as they are in `current`.
export function applySettings(current, { slots, preferredCourts, onlyPreferred }) {
  if (!Array.isArray(slots)) throw new Error('The days and times are missing.');
  const seen = new Set();
  const cleanSlots = slots.map(({ day, start }) => {
    if (!DAYS.includes(day) || seen.has(day)) throw new Error(`Bad day: ${day}`);
    if (!/^([01]\d|2[0-3]):(00|30)$/.test(start)) throw new Error(`Bad start time: ${start}`);
    seen.add(day);
    return { day, start };
  });
  if (!Array.isArray(preferredCourts) || !preferredCourts.every((c) => /^Court \d+$/.test(c))) {
    throw new Error('Preferred courts must look like "Court 7".');
  }
  const { days, startTime, ...rest } = current; // the slots replace the older days + startTime
  return { ...rest, slots: cleanSlots, durationMinutes: 120, preferredCourts, onlyPreferred: Boolean(onlyPreferred) };
}
