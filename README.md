# Pickleball court auto-booker

Books a court at Club Pickle & Padel (Highland Park) on Plan2Play every night at
midnight Central, 10 days ahead, for the days in `config.json` (default: Mon, Wed,
Fri, 9:30 to 11:30 a.m.). Runs on GitHub Actions, so nothing needs to stay on.

> **Status:** login, scheduling, email and settings are built. The court-sheet and
> reserve steps in `src/plan2play.js` still need mapping to the real site, so a run
> currently stops after login with a "not-mapped" result and screenshots.

## How the timing works

A slot for day D opens at midnight 10 days before D. So a Monday court is booked
the Friday night before (going into Friday), a Wednesday court on Sunday night,
and a Friday court on Tuesday night. The job starts around 11:30 p.m., logs in,
waits for midnight, then keeps trying for up to `retryMinutes`.

## Setup (repo Settings, then Secrets and variables, then Actions)

| Secret | What |
| --- | --- |
| `PLAN2PLAY_USERNAME` | Plan2Play login |
| `PLAN2PLAY_PASSWORD` | Plan2Play password |
| `MAIL_TO` | Where to send results (optional) |
| `SMTP_USERNAME` | Gmail address that sends the email |
| `SMTP_PASSWORD` | A Gmail [app password](https://myaccount.google.com/apppasswords) |

Email is sent only on days that try a booking (not on skipped days).

## Changing days or time

Edit `config.json`, or open `docs/index.html` (the settings page), pick days and
time, and paste the result into `config.json` on GitHub.

## Testing

Actions tab, then "Book pickleball court", then "Run workflow". Leave "Dry run"
ticked to log in and find the court without reserving it. You can also give a
specific date.

Locally:

```sh
npm install && npx playwright install chromium
PLAN2PLAY_USERNAME=... PLAN2PLAY_PASSWORD=... npm run dry-run -- --date 2026-11-16
npm test   # date logic
```

## Sharing with the group organizer

Give them access to this repo and they can change the days with the settings page.
To book under their own login, they make their own copy (template or fork) and add
their own secrets there.
