// Entry point. Usage:
//   node src/book.js             book for real
//   node src/book.js --dry-run   log in and find the slot, but don't reserve
//   node src/book.js --date 2026-11-14   override the target date (for testing)
//   node src/book.js --no-wait   don't wait for the opening time
//   node src/book.js --scheduled exit quietly unless it's near opening time (used by the cron)
//
// Credentials come from PLAN2PLAY_USERNAME / PLAN2PLAY_PASSWORD.
// Writes result.json and result.md (plus screenshots) into ./out.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { targetFor, msUntilOpen, endTime, weekdayOf, inRunWindow } from './schedule.js';
import { login, findSlot, reserve, NotMappedError } from './plan2play.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const dryRun = flag('--dry-run') || process.env.DRY_RUN === 'true';
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
  const slot = { date: target.date, startTime: config.startTime, endTime: endTime(config.startTime, config.durationMinutes) };
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
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage();
    await login(page, { username, password }, outDir);

    const wait = flag('--no-wait') || overrideDate ? 0 : msUntilOpen(new Date(), config);
    if (wait > 0) {
      console.log(`Logged in. Waiting ${Math.round(wait / 1000)}s for booking to open...`);
      await new Promise((r) => setTimeout(r, wait));
    }

    const deadline = Date.now() + config.retryMinutes * 60_000;
    let found = null;
    while (!found) {
      found = await findSlot(page, slot, outDir);
      if (found || Date.now() > deadline) break;
      await page.waitForTimeout(15_000); // slots may appear a little after midnight
      await page.reload();
    }
    if (!found) return finish({ status: 'unavailable', label, message: 'No court was free for that time.' });

    if (dryRun) return finish({ status: 'dry-run', label, message: `Found an open court (${found.court ?? 'court'}). Dry run, so nothing was reserved.` });

    const confirmation = await reserve(page, found, outDir);
    return finish({ status: 'booked', label, message: `Booked ${found.court ?? 'a court'}.`, confirmation });
  } catch (err) {
    const status = err instanceof NotMappedError ? 'not-mapped' : 'error';
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
  if (['error', 'not-mapped'].includes(result.status)) process.exitCode = 1;
}

main();
