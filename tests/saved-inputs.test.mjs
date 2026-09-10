import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSavedInputs, parseSavedInputs, readSavedInputs, savedInputsKey, writeSavedInputs } from '../app/saved-inputs.ts';

const inputs = {
  configuredStartDate: '2026-08-11', durationInput: '12',
  draftRegimens: [{ id: 1, compound: 'tirzepatide', doseMg: 5, startWeek: 1, endWeek: 4, timeOfDay: 'night', useCustomDoseInterval: false, doseIntervalDays: 7 }],
  doseBlocks: [{ id: 1, compound: 'tirzepatide', doseMg: 2.5, timeOfDay: 'night', dates: ['2026-08-11', '2026-08-18'] },
    { id: 2, compound: 'tirzepatide', doseMg: 5, timeOfDay: 'night', dates: ['2026-08-25', ''] }],
  mode: 'compare', modelMode: 'two-compartment',
  bodySizeProfile: { measurementSystem: 'us', startingWeight: '220', sex: 'male', heightPrimary: '5', heightSecondary: '9' },
  calculatorInputs: { reference: '609', ceilingOffset: '12.5', doseOverride: { compound: 'tirzepatide', doseMg: 2.5 } },
};
const serialized = (value = inputs, version = 1) => JSON.stringify({ version, inputs: value });
function storage() {
  const data = new Map();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}

test('saved inputs survive a return visit, including multiple dates, incomplete drafts and calculator decimals', () => {
  const browser = storage();
  writeSavedInputs(browser, 'custom-intervals', inputs);
  assert.deepEqual(readSavedInputs(browser, 'custom-intervals'), { inputs, invalid: false });
  const edited = structuredClone(inputs);
  edited.calculatorInputs.ceilingOffset = '0';
  edited.calculatorInputs.doseOverride = null;
  edited.bodySizeProfile.startingWeight = '';
  writeSavedInputs(browser, 'custom-intervals', edited);
  assert.deepEqual(readSavedInputs(browser, 'custom-intervals').inputs, edited);
});

test('each plotter tab has independent saved inputs and Reset removes only its record', () => {
  const browser = storage();
  browser.setItem('glp1-home-screen-prompt-dismissed-at', '123');
  for (const variant of ['branded', 'compounded', 'custom-intervals']) writeSavedInputs(browser, variant, inputs);
  clearSavedInputs(browser, 'custom-intervals');
  assert.equal(browser.getItem(savedInputsKey('custom-intervals')), null);
  assert.deepEqual(readSavedInputs(browser, 'custom-intervals'), { inputs: null, invalid: false });
  assert.deepEqual(readSavedInputs(browser, 'branded').inputs, inputs);
  assert.deepEqual(readSavedInputs(browser, 'compounded').inputs, inputs);
  assert.equal(browser.getItem('glp1-home-screen-prompt-dismissed-at'), '123');
});

test('corrupt, incompatible and excessive records cannot restore unsafe or crashing chart state', () => {
  for (const raw of ['{', 'null', '{}', serialized(inputs, 2), 'x'.repeat(100001)]) assert.equal(parseSavedInputs(raw, 'custom-intervals'), null);
  for (const mutate of [
    (i) => { i.durationInput = '100000000'; },
    (i) => { i.configuredStartDate = '2026-02-30'; },
    (i) => { i.draftRegimens[0].compound = '__proto__'; },
    (i) => { i.draftRegimens[0].explicitDoseHours = [0, 1]; },
    (i) => { i.draftRegimens[0].doseMg = -5; },
    (i) => { i.draftRegimens[0].startWeek = -1; },
    (i) => { i.draftRegimens[0].doseIntervalDays = 0; },
    (i) => { i.doseBlocks = Array(101).fill(i.doseBlocks[0]); },
    (i) => { i.doseBlocks[1].id = 1; },
    (i) => { i.doseBlocks[0].doseMg = 10000; },
    (i) => { i.calculatorInputs.doseOverride.doseMg = 1000; },
  ]) {
    const malformed = structuredClone(inputs); mutate(malformed);
    assert.equal(parseSavedInputs(serialized(malformed), 'custom-intervals'), null);
  }
  const browser = storage(); browser.setItem(savedInputsKey('branded'), '{');
  assert.deepEqual(readSavedInputs(browser, 'branded'), { inputs: null, invalid: true });
});

test('custom compounded doses and intervals restore only within the supported variant', () => {
  const custom = structuredClone(inputs);
  Object.assign(custom.draftRegimens[0], { compound: 'retatrutide', doseMg: 1.123, useCustomDoseInterval: true, doseIntervalDays: 9 });
  assert.deepEqual(parseSavedInputs(serialized(custom), 'compounded'), custom);
  assert.equal(parseSavedInputs(serialized(custom), 'branded'), null);
  assert.equal(parseSavedInputs(serialized(custom), 'custom-intervals'), null);
});

test('storage access failures propagate so the form can report unavailable saving or clearing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  assert.throws(() => readSavedInputs(blocked, 'branded'), /blocked/);
  assert.throws(() => writeSavedInputs(blocked, 'branded', inputs), /quota/);
  assert.throws(() => clearSavedInputs(blocked, 'branded'), /blocked/);
});
