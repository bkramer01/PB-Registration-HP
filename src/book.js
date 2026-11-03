// Entry point. Usage:
//   node src/book.js             book for real, if ALLOW_REAL_BOOKING=true (otherwise a dry run)
//   node src/book.js --dry-run   log in, find the slot and open the review screen, but don't book
//   node src/book.js --date 2026-11-14   override the target date (for testing)
//   node src/book.js --time 14:00        override the start time (for testing)
//   node src/book.js --headed    show the browser
//   node src/book.js --no-wait   don't wait for the opening time
//   node src/book.js --scheduled exit quietly unless it's near opening time (used by the cron)
//
// Credentials come from PLAN2PLAY_USERNAME / PLAN2PLAY_PASSWORD.
// Writes result.json and result.md (plus screenshots) into ./out.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { targetFor, msUntilOpen, endTime, weekdayOf, inRunWindow } from './schedule.js';
import { login, findSlot, reserve, BookingLimitError } from './plan2play.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

// Real bookings must be switched on explicitly, because they can carry late-cancel and no-show fees.
const dryRun = flag('--dry-run') || process.env.DRY_RUN === 'true' || process.env.ALLOW_REAL_BOOKING !== 'true';
const outDir = 'out';

async function main() {
  await mkdir(outDir, { recursive: true });
  const config = JSON.parse(await readFile(new URL('../config.json', import.meta.url)));

  if (flag('--scheduled') && !inRunWindow(new Date(), config)) {
    console.log('Not near opening time in', config.timezone, '- this is the off-hour cron. Exiting.');
    return; // no result file, so no email
  }

  const overrideDate = opt('--date') || process.env.TARGET_DATE || '';
  let target;
  if (overrideDate) {
    const [y, m, d] = overrideDate.split('-').map(Number);
    target = { date: overrideDate, weekday: weekdayOf({ year: y, month: m, day: d }), wanted: true };
  } else {
    target = targetFor(new Date(), config);
  }
  const startTime = opt('--time') || config.startTime;
  const slot = { date: target.date, startTime, endTime: endTime(startTime, config.durationMinutes) };
  const label = `${target.weekday} ${slot.date} ${slot.startTime}-${slot.endTime}`;

  if (!target.wanted) {
    return finish({ status: 'skipped', label, message: `${target.weekday} isn't one of the booking days (${config.days.join(', ')}).` });
  }

  const username = process.env.PLAN2PLAY_USERNAME;
  const password = process.env.PLAN2PLAY_PASSWORD;
  if (!username || !password) {
    return finish({ status: 'error', label, message: 'PLAN2PLAY_USERNAME and PLAN2PLAY_PASSWORD must be set.' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: !flag('--headed'),
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    });
    const page = await browser.newPage();
    await login(page, { username, password }, outDir);

    const wait = flag('--no-wait') || overrideDate ? 0 : msUntilOpen(new Date(), config);
    if (wait > 0) {
      console.log(`Logged in. Waiting ${Math.round(wait / 1000)}s for booking to open...`);
      await new Promise((r) => setTimeout(r, wait));
    }

    // Keep trying only on a real run; slots may appear a little after midnight.
    const deadline = dryRun ? 0 : Date.now() + config.retryMinutes * 60_000;
    let found = null;
    while (!found) {
      found = await findSlot(page, slot, outDir);
      if (found || Date.now() > deadline) break;
      await page.waitForTimeout(5_000);
    }
    if (!found) return finish({ status: 'unavailable', label, message: 'No court was free for that exact time (or the date is not open yet).' });

    const outcome = await reserve(page, found, outDir, { submit: !dryRun });
    if (dryRun) return finish({ status: 'dry-run', label, message: `Found ${found.court} and reached the review screen (${outcome.plan}). Dry run, so nothing was reserved.` });
    return finish({ status: 'booked', label, message: `Booked ${found.court}.`, confirmation: outcome });
  } catch (err) {
    const status = err instanceof BookingLimitError ? 'limit-reached' : 'error';
    return finish({ status, label, message: err.message });
  } finally {
    await browser?.close();
  }
}

async function finish(result) {
  result.dryRun = dryRun;
  result.ranAt = new Date().toISOString();
  await writeFile(`${outDir}/result.json`, JSON.stringify(result, null, 2));
  const md = `**Pickleball booking: ${result.status}**\n\n${result.label}\n\n${result.message}\n`;
  await writeFile(`${outDir}/result.md`, md);
  console.log(md);
  if (result.status === 'error') process.exitCode = 1;
}

main();
