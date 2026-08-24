import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPOUNDS,
  DOSE_TIME_LABELS,
  doseConcentrationNgMl,
  regimenConcentrationNgMl,
  sampleRegimen,
  trapezoidAuc,
} from '../app/pk.ts';

test('concentration is zero before a dose and positive after absorption begins', () => {
  assert.equal(doseConcentrationNgMl('semaglutide', 0.5, -1), 0);
  assert.equal(doseConcentrationNgMl('semaglutide', 0.5, 0), 0);
  assert.ok(doseConcentrationNgMl('semaglutide', 0.5, 24) > 0);
});

test('concentration and AUC are dose proportional', () => {
  const half = sampleRegimen({ id: 1, compound: 'semaglutide', doseMg: 0.5, startWeek: 1, endWeek: 12, timeOfDay: 'morning' }, 12);
  const one = sampleRegimen({ id: 2, compound: 'semaglutide', doseMg: 1, startWeek: 1, endWeek: 12, timeOfDay: 'morning' }, 12);
  half.forEach((value, index) => {
    if (value === 0) assert.equal(one[index], 0);
    else assert.ok(Math.abs(one[index] / value - 2) < 1e-8);
  });
  assert.ok(Math.abs(trapezoidAuc(one) / trapezoidAuc(half) - 2) < 1e-10);
});

test('semaglutide steady-state average reproduces the published model check', () => {
  const values = sampleRegimen({ id: 1, compound: 'semaglutide', doseMg: 0.5, startWeek: 1, endWeek: 32, timeOfDay: 'morning' }, 32);
  const lastWeek = values.slice(-29);
  const average = trapezoidAuc(lastWeek) / 168;
  assert.ok(Math.abs(average - 62.3) < 0.5, `expected about 62.3 ng/mL, got ${average}`);
});

test('tirzepatide reduced-model peak time falls inside the FDA observed range', () => {
  const profile = COMPOUNDS.tirzepatide;
  const ke = Math.log(2) / (profile.halfLifeDays * 24);
  const tMaxHours = Math.log(profile.absorptionRatePerHour / ke) / (profile.absorptionRatePerHour - ke);
  assert.ok(tMaxHours >= 8 && tMaxHours <= 72, `peak was ${tMaxHours} hours`);
});

test('dose time offsets delay the first contribution until the selected category', () => {
  const regimen = { id: 1, compound: 'semaglutide', doseMg: 0.5, startWeek: 1, endWeek: 1, timeOfDay: 'night' };
  assert.equal(regimenConcentrationNgMl(regimen, 17.99), 0);
  assert.equal(regimenConcentrationNgMl(regimen, 18), 0);
  assert.ok(regimenConcentrationNgMl(regimen, 24) > 0);
  assert.deepEqual(DOSE_TIME_LABELS, { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' });
});

test('retatrutide surrogate reproduces phase 1 timing, Cmax, and AUC targets', () => {
  const profile = COMPOUNDS.retatrutide;
  const ke = Math.log(2) / (profile.halfLifeDays * 24);
  const tMaxHours = Math.log(profile.absorptionRatePerHour / ke) / (profile.absorptionRatePerHour - ke);
  const cMax = doseConcentrationNgMl('retatrutide', 1, tMaxHours);
  const auc = 1000 / (profile.apparentVolumeLiters * ke);

  assert.ok(tMaxHours >= 12 && tMaxHours <= 72, `peak was ${tMaxHours} hours`);
  assert.ok(Math.abs(cMax - 110) / 110 < 0.05, `expected about 110 ng/mL, got ${cMax}`);
  assert.ok(Math.abs(auc - 28_300) / 28_300 < 0.01, `expected about 28,300 ng·h/mL, got ${auc}`);
});
