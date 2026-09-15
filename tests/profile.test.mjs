import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProfile, profileBlocks, serializeProfile, readLocalProfile, writeLocalProfile, PROFILE_STORAGE_KEY } from '../app/profile-data.ts';
import { calendarBlockSchedule } from '../app/pk.ts';

const profile = { updatedAt: '2026-09-14T12:00:00Z', blocks: [
  { id: 1, compound: 'tirzepatide', doseMg: 2.5, timeOfDay: 'night', dates: ['2026-08-11', '2026-08-18'] },
  { id: 2, compound: 'tirzepatide', doseMg: 5, timeOfDay: 'night', dates: ['2026-08-25'] },
  { id: 3, compound: 'tirzepatide', doseMg: 2.5, timeOfDay: 'night', dates: ['2026-09-01', '2026-09-03'] },
] };

test('profile export/import preserves multiple dates per dose block and produces the same graph', () => {
  const restored = parseProfile(serializeProfile(profile));
  assert.deepEqual(restored, profile);
  assert.deepEqual(calendarBlockSchedule(restored.blocks), calendarBlockSchedule(profile.blocks));
  const input = JSON.parse(serializeProfile(profile));
  input.password = 'must not be exported'; input.blocks[0].explicitDoseHours = [0]; input.blocks[0].id = 999;
  const clean = parseProfile(JSON.stringify(input));
  assert.deepEqual(clean, profile);
  assert.ok(!serializeProfile(clean).includes('password'));
});

test('profile storage retains later edits and incomplete drafts without overwriting plotter inputs', () => {
  const data = new Map([['glp1concentration:inputs:v1:custom-intervals','unchanged']]);
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(readLocalProfile(storage),null);
  writeLocalProfile(storage,profile);
  const edited = structuredClone(profile); edited.blocks[0].dates.push(''); edited.blocks[1].doseMg = 7.5;
  writeLocalProfile(storage,edited);
  assert.deepEqual(readLocalProfile(storage),edited);
  assert.equal(data.get('glp1concentration:inputs:v1:custom-intervals'),'unchanged');
  assert.throws(() => serializeProfile(edited),/valid date/);
  assert.throws(() => profileBlocks(edited.blocks),/valid date/);
  edited.blocks = [];
  writeLocalProfile(storage,edited);
  assert.deepEqual(readLocalProfile(storage),edited);
  assert.ok(data.has(PROFILE_STORAGE_KEY));
});

test('profile import rejects incompatible, oversized, malformed, and incomplete histories', () => {
  for (const raw of ['{}','{','null','x'.repeat(100001)]) assert.throws(() => parseProfile(raw));
  const raw = JSON.parse(serializeProfile(profile));
  for (const mutation of [
    (p) => { p.version = 2; }, (p) => { p.format = 'another-site'; },
    (p) => { p.blocks[0].dates = ['2026-02-30']; }, (p) => { p.blocks[0].dates = ['']; },
    (p) => { p.blocks[0].dates.push(p.blocks[0].dates[0]); },
    (p) => { p.blocks[0].doseMg = 999; }, (p) => { p.blocks[0].compound = '__proto__'; },
    (p) => { p.blocks[0].timeOfDay = 'unknown'; },
    (p) => { p.blocks[0].dates = Array(101).fill('2026-08-11'); },
  ]) { const invalid = structuredClone(raw); mutation(invalid); assert.throws(() => parseProfile(JSON.stringify(invalid))); }
});

test('loading profile blocks makes an independent copy and renumbers duplicate IDs', () => {
  const source = structuredClone(profile.blocks); source[1].id = 1;
  const loaded = profileBlocks(source);
  assert.deepEqual(loaded.map((block) => block.id), [1,2,3]);
  loaded[0].dates[0] = '2026-08-12'; loaded[1].doseMg = 10;
  assert.equal(source[0].dates[0], '2026-08-11'); assert.equal(source[1].doseMg, 5);
});
