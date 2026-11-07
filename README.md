# Pickleball court auto-booker

Books a court at Club Pickle & Padel (Highland Park) on Plan2Play every night at
midnight Central, 10 days ahead, for the days in `config.json` (default: Mon, Wed,
Fri, 9:30 to 11:30 a.m.). Runs on a Windows PC or a Mac, which has to be awake and logged in.

**Setting it up? Open `INSTRUCTIONS.html` (Windows) or `INSTRUCTIONS-MAC.html` (Mac) for the
step-by-step guide.**

> **Status:** the whole flow works, including one real test booking on 2026-11-03. Real
> bookings are still **off** by default: a run stays a dry run unless
> `ALLOW_REAL_BOOKING=true` is set, because a booking can carry late-cancel and no-show
> fees. A midnight run hasn't happened yet.
>
> **Cloudflare:** Plan2Play's security check blocks cloud servers and headless
> browsers, so the GitHub Actions schedule won't get through. A normal visible
> browser (`--headed`) on a home PC did get through.

## How booking works on the site

Profile, Bookings, New Booking, then a four-step wizard: Resource; Pickleball Courts,
location, duration, date and time; a review screen; confirmation. Things the code
relies on:

- A time button doesn't mean a court is free. Picking a full time lists the next
  openings instead, so only a court card showing the exact time counts.
- The button that submits the booking on the review screen is labelled "Next".
- The site allows 2 hours of pickleball courts a day, so a date you already hold
  ends with a `limit-reached` result.
- The booking stops if the plan offered isn't free.

## Running on a Windows PC

Double-click `setup.cmd`. It installs Node.js if needed, the packages and the browser,
creates `.env`, and sets up the nightly task. You can run it again safely: it never
changes an existing `.env`. To remove the task, double-click `uninstall.cmd`.

The task is called "Pickleball Booker" in Windows Task Scheduler. It runs at 11:45 p.m.
every night, logs in, waits for midnight, and keeps trying for up to `retryMinutes`. On
nights with nothing to book it exits straight away.

For it to work:

- **The PC must be awake, not asleep.** Plug it in and set its sleep time when plugged in
  to Never. The task asks Windows to wake the PC, but don't rely on that: on a PC with
  Modern Standby it stayed asleep at 11:45 p.m., and Windows refused the task when it
  briefly woke at 3:36 a.m. (`0x800710E0`).
- **You must be logged in.** A locked screen should be fine. A browser window opens
  during the run, because Cloudflare stops hidden browsers.

Put these in a `.env` file in this folder (it is gitignored):

| Setting | What |
| --- | --- |
| `PLAN2PLAY_USERNAME`, `PLAN2PLAY_PASSWORD` | Plan2Play login |
| `ALLOW_REAL_BOOKING` | `true` to really book. Anything else is a dry run |
| `SMTP_USERNAME` | Gmail address that sends the email |
| `SMTP_PASSWORD` | A Gmail [app password](https://myaccount.google.com/apppasswords) |
| `MAIL_TO` | Where to send results |

## Running on a Mac

Move the folder into your home folder first (not Documents, Desktop, Downloads or iCloud
Drive, which macOS keeps nightly jobs out of). Then, the first time, run `bash setup.command`
in Terminal, because macOS blocks double-clicking scripts from a downloaded zip. Setup
installs Node.js if needed (with Homebrew if you have it, or the nodejs.org installer), the
packages and the browser, creates `.env`, and sets up the nightly job. It also clears the
download block, so the other `.command` files open with a double-click afterwards.

The job is a LaunchAgent, `~/Library/LaunchAgents/com.pickleball.booker.plist`, which runs
`scripts/mac/run-booker.sh` at 11:45 p.m. every night. It works like the Windows task:

- **The Mac must be awake with the lid open.** Setup offers to wake it at 11:40 p.m. each
  night (`pmset repeat wakeorpoweron`, which needs your password and replaces any other
  repeating wake schedule). Once a run starts, `caffeinate` keeps the Mac awake until it ends.
  If the Mac was asleep, launchd runs the job when it wakes, and the booker exits because
  it's outside the run window.
- **You must be logged in.** A LaunchAgent runs only in your login session.

`status.command` shows whether the job is set up and lists the recent runs, `uninstall.command`
removes it, and `settings.command`, `dry-run.command` and `share.command` do the same as the
Windows `.cmd` files. Results show as Mac notifications through `osascript`.

### Notifications

Every night that tries a booking sends an email to `MAIL_TO` and shows a Windows or Mac
notification, whether it worked or not. Nights with nothing to book stay quiet. The
email needs all three mail settings. Details of each run are in `logs/booker.log`, and
screenshots of the latest run are in `out/`.

## How the timing works

A slot for day D opens at midnight 10 days before D. So a Monday court is booked
the Friday night before (going into Friday), a Wednesday court on Sunday night,
and a Friday court on Tuesday night. The job starts around 11:30 p.m., logs in,
waits for midnight, then keeps trying for up to `retryMinutes`.

## GitHub Actions setup (blocked by Cloudflare, see above)

Repo Settings, then Secrets and variables, then Actions:

| Secret | What |
| --- | --- |
| `PLAN2PLAY_USERNAME` | Plan2Play login |
| `PLAN2PLAY_PASSWORD` | Plan2Play password |
| `MAIL_TO` | Where to send results (optional) |
| `SMTP_USERNAME` | Gmail address that sends the email |
| `SMTP_PASSWORD` | A Gmail [app password](https://myaccount.google.com/apppasswords) |

Email is sent only on days that try a booking (not on skipped days).

## Changing days, times or courts

Double-click `settings.cmd` (or `settings.command` on a Mac). It opens a page showing your current settings: pick each
day's start time and your preferred courts, then click Save settings. Or edit
`config.json` directly:

- `slots`: the days to book and each day's start time, such as
  `{ "day": "Mon", "start": "09:30" }`. Courts are booked for 2 hours.
- `preferredCourts`: courts to try in order, such as `["Court 7", "Court 4"]`. If none of
  them is free, or the list is empty, the first free court is booked.
- `onlyPreferred`: set to `true` to book nothing rather than another court.

The courts are First Bank Court 1, Banner Kitchen & Bath Court 2, AARP Court 3, Studio
41 Court 4, HP Bank & Trust Court 5, Delos Therapy Court 6, Porsche Exchange Court 7,
Audi Exchange Court 8, Chevy Exchange Court 9 and Etruscan Court 10.

## Testing

Double-click `dry-run.cmd` (or `dry-run.command` on a Mac), or use the commands below. They log in and look for the court
without reserving it:

```sh
npm install && npx playwright install chromium
# put PLAN2PLAY_USERNAME and PLAN2PLAY_PASSWORD in .env (gitignored), then:
npm run dry-run:local
npm run dry-run:local -- --date 2026-11-16
npm run dry-run:local -- --date 2026-11-13 --time 14:00   # any other start time
npm test   # date logic
```

## Share with a friend

Double-click `share.cmd` (or `share.command` on a Mac). It makes two zips in `dist/`:

| Zip | For | Holds |
| --- | --- | --- |
| `PB-Registration-HP.zip` | a Windows PC | the shared code plus the Windows files (`.cmd`, `.ps1`, `INSTRUCTIONS.html`) |
| `PB-Registration-HP-Mac.zip` | a Mac | the shared code plus the Mac files (`.command`, `scripts/mac/`, `INSTRUCTIONS-MAC.html`) |

Both leave out your `.env`, logs, screenshots and installed packages. Don't zip the folder
by hand, because that would include your passwords. Your friend starts from the default
settings in git (Mon, Wed, Fri at 9:30 a.m.), not your own.

Your friend then:

1. On Windows, unzips it somewhere permanent, such as Documents. On a Mac, moves the
   unzipped folder into their home folder.
2. Opens `INSTRUCTIONS.html` (Windows) or `INSTRUCTIONS-MAC.html` (Mac) and follows the steps.

Their computer must be awake and logged in on booking nights. Bookings
go on their account, and the site's fees and daily limit apply to them. The booker stops
without booking if the plan offered isn't free, which depends on their membership.
