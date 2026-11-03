# Pickleball court auto-booker

Books a court at Club Pickle & Padel (Highland Park) on Plan2Play every night at
midnight Central, 10 days ahead, for the days in `config.json` (default: Mon, Wed,
Fri, 9:30 to 11:30 a.m.). Runs on GitHub Actions, so nothing needs to stay on.

> **Status:** the whole flow is mapped and tested in dry runs, but real bookings are
> **off**. A run stays a dry run unless `ALLOW_REAL_BOOKING=true` is set, because a
> booking can carry late-cancel and no-show fees. The final submit has never been
> run, so the confirmation step is untested.
>
> **Cloudflare:** Plan2Play's security check blocks cloud servers and headless
> browsers, so the GitHub Actions schedule below won't get through. A normal
> visible browser (`--headed`) on a home PC did get through.

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
# put PLAN2PLAY_USERNAME and PLAN2PLAY_PASSWORD in .env (gitignored), then:
npm run dry-run:local -- --date 2026-11-16
npm run dry-run:local -- --date 2026-11-13 --time 14:00   # any other start time
npm test   # date logic
```

## Sharing with the group organizer

Give them access to this repo and they can change the days with the settings page.
To book under their own login, they make their own copy (template or fork) and add
their own secrets there.
