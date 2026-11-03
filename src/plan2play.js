// Everything that touches the Plan2Play website lives here.
//
// STATUS: the login step uses the known login URL and generic form selectors.
// The court-sheet and booking steps are NOT yet mapped to the real site, because
// the build environment could not reach work1.plan2play.com. Until they are,
// `findSlot` stops with a clear "not mapped yet" error and saves screenshots
// and page HTML so the flow can be finished quickly.

export const ORG_ID = 453;
export const BASE = 'https://work1.plan2play.com';
export const LOGIN_URL = `${BASE}/login-popup?orgid=${ORG_ID}`;

export class NotMappedError extends Error {}

export async function snapshot(page, outDir, name) {
  try {
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(`${outDir}/${name}.html`, await page.content());
  } catch { /* snapshots are best effort */ }
}

export async function login(page, { username, password }, outDir) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await snapshot(page, outDir, '01-login-page');

  const user = page.locator('input[type="email"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]').first();
  const pass = page.locator('input[type="password"]').first();
  await user.fill(username);
  await pass.fill(password);

  const submit = page.locator('button[type="submit"], input[type="submit"], button:has-text("Log In"), button:has-text("Login"), button:has-text("Sign In")').first();
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    submit.click(),
  ]);
  await snapshot(page, outDir, '02-after-login');

  if (await page.locator('input[type="password"]').first().isVisible().catch(() => false)) {
    throw new Error('Login did not go through. Check PLAN2PLAY_USERNAME / PLAN2PLAY_PASSWORD.');
  }
}

// Opens the court sheet for `date` (YYYY-MM-DD) and returns a handle for the
// 2-hour block starting at `startTime`, or null if no court is free.
export async function findSlot(page, { date, startTime, endTime }, outDir) {
  await snapshot(page, outDir, '03-before-court-sheet');
  throw new NotMappedError(
    `The court-sheet step isn't mapped to the Plan2Play site yet (wanted ${date} ${startTime}-${endTime}).`,
  );
}

// Clicks through to a confirmed reservation. Only called when not in dry-run.
export async function reserve(page, slot, outDir) {
  throw new NotMappedError('The reserve step is not mapped to the Plan2Play site yet.');
}
