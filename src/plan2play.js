// Everything that touches the Plan2Play website lives here.
//
// The site has no court grid. Booking is a four-step wizard under
// Profile > Bookings > New Booking: 1 Appointment Type, 2 Appointment Details,
// 3 Payment, 4 Confirmation. Things worth knowing:
//   - Time buttons don't mean a court is free. Picking a full time silently lists
//     the next openings instead, so a card only counts if its own time matches.
//   - The button that submits the booking on step 3 is labelled "Next".
//   - Dates beyond the booking window are disabled in the calendar.

export const ORG_ID = 453;
export const BASE = 'https://work1.plan2play.com';
export const LOGIN_URL = `${BASE}/login-popup?orgid=${ORG_ID}`;

const RESOURCE_TYPE = 'Pickleball Courts';
const POLICIES = ['latePolicy', 'cancelationPolicy', 'noShowPolicy'];
const NEXT_DISABLED_COLOR = '178, 240, 151';
const DURATION_LABELS = { 30: '30 min', 60: '1 hr', 90: '90 min', 120: '2 hr' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The site already holds the maximum (2 hours a day) for this date.
export class BookingLimitError extends Error {}

// "09:30" -> "9:30 AM", "12:00" -> "12 PM" (the wizard's time buttons).
export function buttonTime(hhmm) {
  return cardTime(hhmm).replace(':00 ', ' ');
}

// "14:00" -> "2:00 PM" (the time shown on court cards).
export function cardTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "2026-11-13" -> "Friday, November 13th 2026" (the date shown on court cards).
export function cardDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const suffix = d % 100 >= 11 && d % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th';
  return `${weekday}, ${MONTHS[m - 1]} ${d}${suffix} ${y}`;
}

export function durationLabel(startTime, endTime) {
  const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const label = DURATION_LABELS[mins(endTime) - mins(startTime)];
  if (!label) throw new Error(`The site only offers 30, 60, 90 or 120 minutes (got ${startTime}-${endTime}).`);
  return label;
}

export async function snapshot(page, outDir, name) {
  try {
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(`${outDir}/${name}.html`, await page.content());
  } catch { /* snapshots are best effort */ }
}

// Login is two steps: email + "CHECK EMAIL", then password + "SIGN IN".
export async function login(page, { username, password }, outDir) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[type="email"]').first();
  await email.waitFor({ timeout: 20_000 }).catch(() => {});
  await snapshot(page, outDir, '01-login-page');
  if (!(await email.isVisible())) {
    if (/just a moment/i.test(await page.title())) throw new Error('Cloudflare stopped this browser with a security check, so nothing was attempted.');
    throw new Error('The login page did not show an email field.');
  }

  await email.fill(username);
  await page.getByRole('button', { name: /check email/i }).click();

  const pass = page.locator('input[type="password"]').first();
  await pass.waitFor({ timeout: 20_000 });
  await pass.fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.includes('login-popup'), { timeout: 30_000 }).catch(() => {
    throw new Error('Login did not go through. Check PLAN2PLAY_USERNAME / PLAN2PLAY_PASSWORD.');
  });
  await snapshot(page, outDir, '02-after-login');
}

const wizard = (page) => page.locator('aside', { hasText: 'Schedule Appointment' }).first();

async function currentStep(page) {
  return (await wizard(page).locator('.step-circle.current-step').innerText()).trim();
}

// Waits for Next to light up, then moves on from `fromStep`, refusing to press it on any other step.
async function pressNext(page, fromStep) {
  const button = wizard(page).locator('.modal-submit-button');
  const deadline = Date.now() + 15_000;
  while (((await button.getAttribute('style')) || '').includes(NEXT_DISABLED_COLOR)) {
    if (Date.now() > deadline) throw new Error(`Next never became available on step ${fromStep}.`);
    await page.waitForTimeout(200);
  }
  const step = await currentStep(page);
  if (step !== fromStep) throw new Error(`Expected to be on step ${fromStep} but the wizard is on step ${step}.`);
  await button.click();
}

// Reads and clears any popup. A daily-limit popup becomes a BookingLimitError.
async function checkPopup(page) {
  const popup = page.locator('.swal-overlay--show-modal');
  if (!(await popup.count())) return;
  const text = (await popup.innerText()).trim().replace(/\s+/g, ' ');
  await popup.locator('button').first().click();
  if (/limit is reached|only \d+ hours?/i.test(text)) throw new BookingLimitError(text);
  throw new Error(`Plan2Play said: ${text}`);
}

// Moves the calendar to the month of `iso`. Returns false if it can't get there.
async function showMonth(page, iso) {
  const [y, m] = iso.split('-').map(Number);
  const wanted = `${MONTHS[m - 1]} ${y}`;
  const panel = wizard(page);
  for (let i = 0; i < 3; i++) {
    if ((await panel.locator('.MuiPickersCalendarHeader-switchHeader p').innerText()).trim() === wanted) return true;
    const forward = panel.locator('.MuiPickersCalendarHeader-iconButton').last();
    if (await forward.isDisabled()) return false;
    await forward.click();
    await page.waitForTimeout(800);
  }
  return false;
}

// Opens the wizard fresh and fills step 1 and the top of step 2, up to the calendar.
async function openWizard(page, { startTime, endTime }) {
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Bookings', { exact: true }).locator('visible=true').first().click();
  await page.getByText('New Booking', { exact: true }).locator('visible=true').first().click();

  const panel = wizard(page);
  await panel.locator('.MuiSelect-root').first().click();
  await page.locator('[role=listbox] [role=option]').filter({ hasText: 'Club Pickle' }).first().click();
  await page.waitForTimeout(2000); // the appointment types load after the organization is chosen
  await panel.locator('.appointment-type-container', { hasText: 'Resource' }).click();
  await pressNext(page, '1');

  await panel.locator('.blue-border-box', { hasText: RESOURCE_TYPE }).click();
  await panel.locator('.select-search').first().click();
  await panel.locator('[class*="-option"]').first().click();
  await panel.getByText(durationLabel(startTime, endTime), { exact: true }).click();
  await panel.locator('button.MuiPickersDay-day').first().waitFor();
}

// Opens the court list for `date` (YYYY-MM-DD) and returns a handle for a court
// whose block is exactly startTime-endTime, or null if there isn't one (or the
// date isn't open yet). Throws BookingLimitError if the daily limit is used up.
export async function findSlot(page, { date, startTime, endTime }, outDir) {
  await openWizard(page, { startTime, endTime });
  const panel = wizard(page);

  if (!(await showMonth(page, date))) return null;
  const dayNumber = String(Number(date.split('-')[2]));
  const day = panel.getByRole('button', { name: new RegExp(`^${dayNumber}$`) }).first();
  if ((await day.getAttribute('class')).includes('dayDisabled')) return null;
  await day.click();
  await page.waitForTimeout(1000);
  await checkPopup(page);

  const time = panel.locator('.blue-border-box', { hasText: new RegExp(`^${buttonTime(startTime)}$`) });
  if (!(await time.count())) return null;
  const listed = page.waitForResponse(/resource-calender/, { timeout: 10_000 }).catch(() => null);
  await time.click();
  await listed;
  await page.waitForTimeout(800);
  await checkPopup(page);
  await snapshot(page, outDir, '03-court-list');

  const wantedTime = `${cardTime(startTime)} - ${cardTime(endTime)}`;
  const wantedDate = cardDate(date);
  for (const card of await panel.locator('.trainers-card').all()) {
    const [cardTimeText, cardDateText] = (await card.locator('.scheduler-label').allInnerTexts()).map((t) => t.trim());
    if (cardTimeText === wantedTime && cardDateText === wantedDate) {
      const court = (await card.locator('.appointment-details .scheduler-label-bold').first().innerText()).trim();
      return { court, date, startTime, endTime };
    }
  }
  return null;
}

// Continues from findSlot: selects the court and goes to the review screen, checking
// it shows the right court, time and date and that the plan is free. With
// submit: false it stops there, having ticked nothing. With submit: true it accepts
// the policies and presses the final button, once. Never retried, to avoid a double
// booking.
export async function reserve(page, slot, outDir, { submit = false } = {}) {
  const panel = wizard(page);
  const timeText = `${cardTime(slot.startTime)} - ${cardTime(slot.endTime)}`;
  const card = panel.locator('.trainers-card')
    .filter({ hasText: slot.court })
    .filter({ hasText: timeText })
    .first();
  await card.click();
  await pressNext(page, '2');

  const preview = panel.locator('.appointment-preview').first();
  await preview.waitFor({ timeout: 15_000 });
  const summary = await preview.innerText();
  for (const expected of [slot.court, timeText, slot.date]) {
    if (!summary.includes(expected)) throw new Error(`The review screen doesn't show "${expected}". It shows: ${summary}`);
  }

  const plan = panel.locator('.subscription-card').first();
  await plan.waitFor({ timeout: 15_000 });
  const planText = (await plan.innerText()).trim().replace(/\s+/g, ' ');
  if (!/\bFREE\b/i.test(planText)) throw new Error(`Stopped: the plan offered isn't free, so booking could cost money (${planText}).`);
  await snapshot(page, outDir, '04-review');

  if (!submit) return { stoppedAt: 'review', court: slot.court, plan: planText };

  await plan.click();
  for (const id of POLICIES) await panel.locator(`label[for="${id}"]`).click();
  await pressNext(page, '3');

  await page.waitForTimeout(6000);
  await snapshot(page, outDir, '05-after-submit');
  await checkPopup(page);
  const step = await currentStep(page);
  if (step !== '4') throw new Error(`The booking may not have gone through: the wizard is on step ${step}. Check Bookings on Plan2Play.`);
  return { stoppedAt: 'confirmation', court: slot.court, plan: planText, text: (await panel.innerText()).slice(0, 500) };
}
