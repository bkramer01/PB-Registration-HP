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

import { inRunWindow, slotsFor, startTimeFor, latestOpenTarget } from '../src/schedule.js';
import { applySettings } from '../src/settings.js';

const perDay = { ...config, days: undefined, slots: [{ day: 'Mon', start: '09:30' }, { day: 'Fri', start: '14:00' }] };

test('each day can have its own start time', () => {
  assert.equal(startTimeFor('Mon', perDay), '09:30');
  assert.equal(startTimeFor('Fri', perDay), '14:00');
  assert.equal(startTimeFor('Wed', perDay), undefined);
  // Booking day Fri 2026-11-06 -> Mon 11-16 is wanted; booking day Wed 11-04 -> Sat 11-14 is not.
  assert.equal(targetFor(new Date('2026-11-06T05:50:00Z'), perDay).wanted, true);
  assert.equal(targetFor(new Date('2026-11-04T05:50:00Z'), perDay).wanted, false);
});

test('older settings with one start time still work', () => {
  const old = { days: ['Mon', 'Wed'], startTime: '10:00' };
  assert.deepEqual(slotsFor(old), [{ day: 'Mon', start: '10:00' }, { day: 'Wed', start: '10:00' }]);
  assert.equal(startTimeFor('Wed', old), '10:00');
});

test('latestOpenTarget finds the furthest open date that is wanted', () => {
  // Tue 2026-11-03 afternoon: open through Fri 11-13, which is wanted.
  assert.equal(latestOpenTarget(new Date('2026-11-03T22:00:00Z'), perDay).date, '2026-11-13');
  // Sun 2026-11-08 afternoon: open through Wed 11-18; the latest wanted day is Mon 11-16.
  assert.equal(latestOpenTarget(new Date('2026-11-08T22:00:00Z'), perDay).date, '2026-11-16');
});

test('saving settings keeps other values and replaces the older fields', () => {
  const current = { days: ['Mon'], startTime: '09:30', timezone: 'America/Chicago', retryMinutes: 10 };
  const saved = applySettings(current, { slots: [{ day: 'Fri', start: '14:30' }], preferredCourts: ['Court 7'], onlyPreferred: true });
  assert.deepEqual(saved, {
    timezone: 'America/Chicago',
    retryMinutes: 10,
    slots: [{ day: 'Fri', start: '14:30' }],
    durationMinutes: 120,
    preferredCourts: ['Court 7'],
    onlyPreferred: true,
  });
});

test('saving settings refuses bad values', () => {
  const ok = { slots: [], preferredCourts: [], onlyPreferred: false };
  assert.throws(() => applySettings({}, { ...ok, slots: [{ day: 'Funday', start: '09:30' }] }));
  assert.throws(() => applySettings({}, { ...ok, slots: [{ day: 'Mon', start: '09:15' }] }));
  assert.throws(() => applySettings({}, { ...ok, slots: [{ day: 'Mon', start: '09:30' }, { day: 'Mon', start: '10:00' }] }));
  assert.throws(() => applySettings({}, { ...ok, preferredCourts: ['<script>'] }));
});
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

import { buttonTime, cardTime, cardDate, durationLabel, pickCourt } from '../src/plan2play.js';
test('courts are picked by preference, then whatever is free', () => {
  const free = ['First Bank Court 1', 'Audi Exchange Court 8', 'Etruscan Court 10'];
  assert.equal(pickCourt(free, ['Court 10', 'Court 8']), 'Etruscan Court 10');
  assert.equal(pickCourt(free, ['Court 7', 'Court 8']), 'Audi Exchange Court 8');
  assert.equal(pickCourt(free, ['Court 1']), 'First Bank Court 1');
  assert.equal(pickCourt(free, ['Audi Exchange Court 8']), 'Audi Exchange Court 8');
  assert.equal(pickCourt(free, ['Court 7']), 'First Bank Court 1');
  assert.equal(pickCourt(free), 'First Bank Court 1');
  assert.equal(pickCourt([], ['Court 7']), null);
});
test('onlyPreferred refuses other courts, unless no preference is set', () => {
  const free = ['First Bank Court 1', 'Audi Exchange Court 8'];
  assert.equal(pickCourt(free, ['Court 7'], true), null);
  assert.equal(pickCourt(free, ['Court 7', 'Court 8'], true), 'Audi Exchange Court 8');
  assert.equal(pickCourt(free, [], true), 'First Bank Court 1');
});
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
