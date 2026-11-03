import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetFor, msUntilOpen, endTime } from '../src/schedule.js';

const config = { days: ['Mon', 'Wed', 'Fri'], timezone: 'America/Chicago', opensAt: '00:00', daysAhead: 10 };

test('run at 11:50pm Thursday (CST) targets the Monday 10 days after Friday', () => {
  // Thu 2026-11-05 23:50 CST = 2026-11-06 05:50 UTC
  const t = targetFor(new Date('2026-11-06T05:50:00Z'), config);
  assert.deepEqual(t, { date: '2026-11-16', weekday: 'Mon', wanted: true });
});

test('run just after midnight still targets the same day', () => {
  const t = targetFor(new Date('2026-11-06T06:03:00Z'), config);
  assert.equal(t.date, '2026-11-16');
});

test('a day that is not configured is skipped', () => {
  // Booking day Wed 2026-11-04 -> Sat 2026-11-14
  const t = targetFor(new Date('2026-11-04T05:50:00Z'), config);
  assert.deepEqual(t, { date: '2026-11-14', weekday: 'Sat', wanted: false });
});

test('daylight saving time (CDT) is handled', () => {
  // Thu 2026-06-04 23:50 CDT = 2026-06-05 04:50 UTC -> booking day Fri 06-05 -> Mon 06-15
  const t = targetFor(new Date('2026-06-05T04:50:00Z'), config);
  assert.deepEqual(t, { date: '2026-06-15', weekday: 'Mon', wanted: true });
});

test('msUntilOpen counts down to midnight and is 0 after it', () => {
  assert.equal(msUntilOpen(new Date('2026-11-06T05:50:00Z'), config), 10 * 60 * 1000);
  assert.equal(msUntilOpen(new Date('2026-11-06T06:01:00Z'), config), 0);
});

test('endTime adds the duration', () => {
  assert.equal(endTime('09:30', 120), '11:30');
});

import { inRunWindow } from '../src/schedule.js';
test('run window keeps the right cron and drops the other', () => {
  // Winter (CST, midnight = 06:00 UTC)
  assert.equal(inRunWindow(new Date('2026-11-06T05:30:00Z'), config), true);
  assert.equal(inRunWindow(new Date('2026-11-06T04:30:00Z'), config), false);
  // Summer (CDT, midnight = 05:00 UTC)
  assert.equal(inRunWindow(new Date('2026-06-05T04:30:00Z'), config), true);
  assert.equal(inRunWindow(new Date('2026-06-05T05:30:00Z'), config), false);
  // Delayed start a few minutes after midnight still runs
  assert.equal(inRunWindow(new Date('2026-11-06T06:12:00Z'), config), true);
});

import { buttonTime, cardTime, cardDate, durationLabel } from '../src/plan2play.js';
test('times and dates match the wording on the Plan2Play wizard', () => {
  assert.equal(buttonTime('09:30'), '9:30 AM');
  assert.equal(buttonTime('12:00'), '12 PM');
  assert.equal(buttonTime('14:00'), '2 PM');
  assert.equal(cardTime('09:30'), '9:30 AM');
  assert.equal(cardTime('14:00'), '2:00 PM');
  assert.equal(cardTime('00:30'), '12:30 AM');
  assert.equal(cardDate('2026-11-13'), 'Friday, November 13th 2026');
  assert.equal(cardDate('2026-12-01'), 'Tuesday, December 1st 2026');
  assert.equal(cardDate('2026-11-22'), 'Sunday, November 22nd 2026');
  assert.equal(durationLabel('09:30', '11:30'), '2 hr');
  assert.throws(() => durationLabel('09:30', '12:30'));
});
