import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPOUNDS,
  DOSE_TIME_LABELS,
  doseConcentrationNgMl,
  modeledWeightAtHour,
  regimenConcentrationNgMl,
  regimenDoseHours,
  sampleRegimen,
  semaglutideParametersForPatient,
  tirzepatideParametersForPatient,
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

test('semaglutide offers the published rich-PK two-compartment model', () => {
  const profile = COMPOUNDS.semaglutide;
  assert.equal(profile.availableModels, 'one-or-two');
  assert.equal(profile.twoCompartmentAbsorptionRatePerHour, 0.0253);
  assert.equal(profile.bioavailability, 0.847);
  assert.equal(profile.clearanceLitersPerHour, 0.0348);
  assert.equal(profile.intercompartmentalClearanceLitersPerHour, 0.304);
  assert.equal(profile.centralVolumeLiters, 3.59);
  assert.equal(profile.peripheralVolumeLiters, 4.10);

  const reference = { kind: 'reference-two-compartment' };
  const singleDose = sampleRegimen({ id: 3, compound: 'semaglutide', doseMg: 0.5, startWeek: 1, endWeek: 1, timeOfDay: 'morning' }, 16, 0.25, reference);
  const modeledAuc = trapezoidAuc(singleDose, 0.25);
  const massBalanceAuc = profile.bioavailability * 0.5 * 1000 / profile.clearanceLitersPerHour;
  assert.ok(Math.abs(modeledAuc / massBalanceAuc - 1) < 0.002, `AUC was ${modeledAuc}, expected ${massBalanceAuc}`);

  const parameters = semaglutideParametersForPatient(100);
  assert.ok(Math.abs(parameters.clearanceLitersPerHour / profile.clearanceLitersPerHour - (100 / 85) ** 1.01) < 1e-12);
  assert.ok(Math.abs(parameters.centralVolumeLiters / profile.centralVolumeLiters - (100 / 85) ** 0.923) < 1e-12);
});

test('tirzepatide offers the published two-compartment fixed effects and exposure', () => {
  const profile = COMPOUNDS.tirzepatide;
  assert.equal(profile.availableModels, 'one-or-two');
  assert.equal(profile.bioavailability, 0.8);
  assert.equal(profile.clearanceLitersPerHour, 0.0329);
  assert.equal(profile.intercompartmentalClearanceLitersPerHour, 0.126);
  assert.equal(profile.centralVolumeLiters, 2.47);
  assert.equal(profile.peripheralVolumeLiters, 3.98);

  let peak = { hour: 0, concentration: 0 };
  const reference = { kind: 'reference-two-compartment' };
  for (let hour = 0; hour <= 168; hour += 0.05) {
    const concentration = doseConcentrationNgMl('tirzepatide', 5, hour, reference);
    if (concentration > peak.concentration) peak = { hour, concentration };
  }
  assert.ok(peak.hour >= 29.5 && peak.hour <= 29.7, `peak was ${peak.hour} hours`);
  assert.ok(peak.concentration >= 514 && peak.concentration <= 516, `peak was ${peak.concentration} ng/mL`);

  const singleDose = sampleRegimen({ id: 4, compound: 'tirzepatide', doseMg: 5, startWeek: 1, endWeek: 1, timeOfDay: 'morning' }, 12, 0.25, reference);
  const modeledAuc = trapezoidAuc(singleDose, 0.25);
  const massBalanceAuc = profile.bioavailability * 5 * 1000 / profile.clearanceLitersPerHour;
  assert.ok(Math.abs(modeledAuc / massBalanceAuc - 1) < 0.002, `AUC was ${modeledAuc}, expected ${massBalanceAuc}`);
});

test('two-compartment patient model applies published covariates and the 1 lb/week assumption', () => {
  const parameters = tirzepatideParametersForPatient(100, 175, 'male');
  assert.ok(Math.abs(parameters.clearanceLitersPerHour - 0.043764046) < 1e-8);
  assert.ok(Math.abs(parameters.intercompartmentalClearanceLitersPerHour - 0.167606985) < 1e-8);
  assert.ok(Math.abs(parameters.centralVolumeLiters - 2.934560875) < 1e-8);
  assert.ok(Math.abs(parameters.peripheralVolumeLiters - 4.728563676) < 1e-8);

  const model = {
    kind: 'personalized-two-compartment',
    startingWeightKg: 100,
    heightCm: 175,
    sex: 'male',
    firstDoseHour: 0,
  };
  assert.equal(modeledWeightAtHour(model, 0), 100);
  assert.ok(Math.abs(modeledWeightAtHour(model, 4 * 168) - 98.18563052) < 1e-10);
  assert.ok(Math.abs(modeledWeightAtHour(model, 8 * 168) - 96.37126104) < 1e-10);
  assert.equal(modeledWeightAtHour(model, 520 * 168), 30);

  const values = sampleRegimen({ id: 5, compound: 'tirzepatide', doseMg: 5, startWeek: 1, endWeek: 8, timeOfDay: 'morning' }, 12, 6, model);
  assert.equal(values.length, 337);
  assert.ok(values.every(Number.isFinite));
  assert.ok(Math.max(...values) > 0);

  const semaglutideValues = sampleRegimen({ id: 6, compound: 'semaglutide', doseMg: 1, startWeek: 1, endWeek: 8, timeOfDay: 'morning' }, 12, 6, model);
  assert.equal(semaglutideValues.length, 337);
  assert.ok(semaglutideValues.every(Number.isFinite));
  assert.ok(Math.max(...semaglutideValues) > 0);
});

test('tirzepatide defaults to the documented one-compartment reduction', () => {
  let peak = { hour: 0, concentration: 0 };
  for (let hour = 0; hour <= 168; hour += 0.05) {
    const concentration = doseConcentrationNgMl('tirzepatide', 5, hour);
    if (concentration > peak.concentration) peak = { hour, concentration };
  }
  assert.ok(peak.hour >= 60.7 && peak.hour <= 60.9, `peak was ${peak.hour} hours`);
  assert.ok(peak.concentration >= 350 && peak.concentration <= 351, `peak was ${peak.concentration} ng/mL`);
});

test('dose time offsets delay the first contribution until the selected category', () => {
  const regimen = { id: 1, compound: 'semaglutide', doseMg: 0.5, startWeek: 1, endWeek: 1, timeOfDay: 'night' };
  assert.equal(regimenConcentrationNgMl(regimen, 17.99), 0);
  assert.equal(regimenConcentrationNgMl(regimen, 18), 0);
  assert.ok(regimenConcentrationNgMl(regimen, 24) > 0);
  assert.deepEqual(DOSE_TIME_LABELS, { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' });
});

test('custom compounded intervals schedule doses every selected number of days', () => {
  const standard = {
    id: 10,
    compound: 'semaglutide',
    doseMg: 0.5,
    startWeek: 1,
    endWeek: 4,
    timeOfDay: 'morning',
    useCustomDoseInterval: false,
    doseIntervalDays: 5,
  };
  const custom = { ...standard, useCustomDoseInterval: true };
  assert.deepEqual(regimenDoseHours(standard), [6, 174, 342, 510]);
  assert.deepEqual(regimenDoseHours(custom), [6, 126, 246, 366, 486, 606]);
  assert.ok(regimenConcentrationNgMl(custom, 130) > regimenConcentrationNgMl(standard, 130));
});

test('retatrutide surrogate reproduces phase 1 timing, Cmax, and AUC targets', () => {
  const profile = COMPOUNDS.retatrutide;
  assert.equal(profile.availableModels, 'one-only');
  const ke = Math.log(2) / (profile.halfLifeDays * 24);
  const tMaxHours = Math.log(profile.absorptionRatePerHour / ke) / (profile.absorptionRatePerHour - ke);
  const cMax = doseConcentrationNgMl('retatrutide', 1, tMaxHours);
  const auc = 1000 / (profile.apparentVolumeLiters * ke);

  assert.ok(tMaxHours >= 12 && tMaxHours <= 72, `peak was ${tMaxHours} hours`);
  assert.ok(Math.abs(cMax - 110) / 110 < 0.05, `expected about 110 ng/mL, got ${cMax}`);
  assert.ok(Math.abs(auc - 28_300) / 28_300 < 0.01, `expected about 28,300 ng·h/mL, got ${auc}`);
  assert.equal(
    doseConcentrationNgMl('retatrutide', 1, 48, { kind: 'reference-two-compartment' }),
    doseConcentrationNgMl('retatrutide', 1, 48, { kind: 'one-compartment' }),
  );
});
