import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPOUNDS,
  calendarSchedule,
  calendarBlockSchedule,
  findModeledInterval,
  latestCalendarDose,
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

const customExample = ['2026-08-11', '2026-08-18', '2026-08-25', '2026-09-01', '2026-09-03']
  .map((date, index) => ({ id: index + 1, date, compound: 'tirzepatide', doseMg: index === 2 ? 5 : 2.5, timeOfDay: 'morning' }));

const customBlocks = [
  { id: 1, compound: 'tirzepatide', doseMg: 2.5, dates: ['2026-08-11', '2026-08-18'], timeOfDay: 'morning' },
  { id: 2, compound: 'tirzepatide', doseMg: 5, dates: ['2026-08-25'], timeOfDay: 'morning' },
  { id: 3, compound: 'tirzepatide', doseMg: 2.5, dates: ['2026-09-01', '2026-09-03'], timeOfDay: 'morning' },
];

const intervalHistory = calendarBlockSchedule([
  { id: 1, compound: 'tirzepatide', doseMg: 2.5, dates: ['2026-08-11', '2026-08-18', '2026-08-25'], timeOfDay: 'night' },
  { id: 2, compound: 'tirzepatide', doseMg: 5, dates: ['2026-08-31', '2026-09-07'], timeOfDay: 'night' },
]);

test('interval dose default follows chronological injection time rather than block order', () => {
  assert.equal(latestCalendarDose([...intervalHistory.regimens].reverse()).doseMg, 5);
  assert.equal(latestCalendarDose(intervalHistory.regimens).hour, 666);
  assert.equal(latestCalendarDose([]), null);
  assert.equal(latestCalendarDose([...intervalHistory.regimens, intervalHistory.regimens[1]]).ambiguous, true);
});

test('interval search includes accumulation and matches an independent steady-state peak calculation', async () => {
  const result = await findModeledInterval(intervalHistory.regimens, 5, 609, { kind: 'one-compartment' });
  assert.equal(result.status, 'match');
  assert.equal(result.ceilingNgMl, 629);
  assert.equal(result.intervalDays, 8);
  const { absorptionRatePerHour: ka, halfLifeDays, apparentVolumeLiters: volume } = COMPOUNDS.tirzepatide;
  const ke = Math.log(2) / (halfLifeDays * 24);
  const steadyPeak = (days) => {
    const tau = days * 24;
    const phase = Math.log(ka * (1 - Math.exp(-ke * tau)) / (ke * (1 - Math.exp(-ka * tau)))) / (ka - ke);
    return (5 * 1000 * ka / (volume * (ka - ke))) *
      (Math.exp(-ke * phase) / (1 - Math.exp(-ke * tau)) - Math.exp(-ka * phase) / (1 - Math.exp(-ka * tau)));
  };
  assert.ok(steadyPeak(7) > result.ceilingNgMl);
  assert.ok(steadyPeak(8) < result.ceilingNgMl);
  assert.ok(Math.abs(result.peakNgMl - steadyPeak(8)) < 0.2);
  assert.equal(result.firstFutureHour, 666 + 8 * 24);
  assert.ok(result.endHour > result.firstFutureHour + 52 * 168);
  const smallerDose = await findModeledInterval(intervalHistory.regimens, 2.5, 609, { kind: 'one-compartment' });
  assert.equal(smallerDose.status, 'match');
  assert.equal(smallerDose.doseMg, 2.5);
  assert.ok(smallerDose.intervalDays < result.intervalDays);
});

test('interval search carries existing exposure and the changing body-size model forward', async () => {
  const model = { kind: 'personalized-two-compartment', startingWeightKg: 100, heightCm: 175, sex: 'male', firstDoseHour: intervalHistory.firstDoseHour };
  const result = await findModeledInterval(intervalHistory.regimens, 5, 609, model);
  assert.equal(result.status, 'match');
  assert.ok(result.peakNgMl <= 629);
  assert.ok(result.existingDosePeakNgMl > 629);
  assert.ok(result.peakHour > result.firstFutureHour + 26 * 168);
  const futureHours = [];
  for (let hour = result.firstFutureHour; hour < result.firstFutureHour + 52 * 168; hour += result.intervalDays * 24) futureHours.push(hour);
  const future = { ...intervalHistory.regimens[1], explicitDoseHours: futureHours };
  const combined = [...intervalHistory.regimens, future].map((regimen) => sampleRegimen(regimen, result.endHour / 168, 0.25, model));
  let measuredPeak = 0;
  for (let index = result.firstFutureHour * 4; index < combined[0].length; index++) {
    measuredPeak = Math.max(measuredPeak, combined.reduce((sum, series) => sum + series[index], 0));
  }
  assert.equal(result.peakNgMl, Math.ceil(measuredPeak * 10) / 10);
});

test('interval search reports no modeled match and supports cancellation', async () => {
  const result = await findModeledInterval(intervalHistory.regimens, 5, 1, { kind: 'one-compartment' });
  assert.equal(result.status, 'no-match');
  assert.ok(result.lowestPeakNgMl > result.ceilingNgMl);
  let checkpoints = 0;
  const cancelled = await findModeledInterval(intervalHistory.regimens, 5, 609, { kind: 'one-compartment' }, async () => ++checkpoints < 4);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(checkpoints, 4);
});

test('interval calculator rejects incomplete inputs, mixed drugs, and ambiguous latest doses', async () => {
  for (const [regimens, dose, reference] of [
    [[], 5, 609], [intervalHistory.regimens, 5, 0], [intervalHistory.regimens, 5, NaN],
    [intervalHistory.regimens, 5, Infinity], [intervalHistory.regimens, 100, 609],
    [[...intervalHistory.regimens, { ...intervalHistory.regimens[0], compound: 'semaglutide' }], 5, 609],
    [[...intervalHistory.regimens, intervalHistory.regimens[1]], 5, 609],
    [[{ ...intervalHistory.regimens[0], explicitDoseHours: [NaN] }], 5, 609],
  ]) {
    assert.equal((await findModeledInterval(regimens, dose, reference, { kind: 'one-compartment' })).status, 'invalid');
  }
  assert.equal((await findModeledInterval(intervalHistory.regimens, 5, 609, {
    kind: 'personalized-two-compartment', startingWeightKg: NaN, heightCm: 175, sex: 'male', firstDoseHour: 18,
  })).status, 'invalid');
});

test('multiple dates per block preserve all five example doses and both model outputs', () => {
  const grouped = calendarBlockSchedule(customBlocks);
  const individual = calendarSchedule(customExample);
  assert.equal(grouped.error, null);
  assert.equal(grouped.startDate, '2026-08-11');
  assert.equal(grouped.endDate, '2026-09-10');
  assert.equal(grouped.firstDoseHour, 6);
  assert.equal(grouped.totalWeeks, individual.totalWeeks);
  assert.deepEqual(grouped.regimens.map(regimenDoseHours), [[6, 174], [342], [510, 558]]);
  assert.deepEqual(grouped.regimens.map((regimen) => regimen.doseMg), [2.5, 5, 2.5]);
  for (const model of [{ kind: 'one-compartment' }, {
    kind: 'personalized-two-compartment', startingWeightKg: 100, heightCm: 175,
    sex: 'male', firstDoseHour: grouped.firstDoseHour,
  }]) {
    const separate = individual.regimens.map((regimen) => sampleRegimen(regimen, individual.totalWeeks, 6, model));
    const together = grouped.regimens.map((regimen) => sampleRegimen(regimen, grouped.totalWeeks, 6, model));
    for (const [blockIndex, doseIndices] of [[0, [0, 1]], [1, [2]], [2, [3, 4]]]) {
      together[blockIndex].forEach((value, index) => {
        const expected = doseIndices.reduce((sum, doseIndex) => sum + separate[doseIndex][index], 0);
        assert.ok(Math.abs(value - expected) < 1e-8);
      });
    }
  }
});

test('dose blocks validate dates and recalculate the range after dates or blocks change', () => {
  for (const blocks of [[], [{ ...customBlocks[0], dates: [] }], [{ ...customBlocks[0], dates: [''] }],
    [{ ...customBlocks[0], dates: ['2026-08-11', '2026-08-11'] }],
    [{ ...customBlocks[0], dates: Array(101).fill('2026-08-11') }]]) {
    assert.ok(calendarBlockSchedule(blocks).error);
  }
  const reordered = calendarBlockSchedule([...customBlocks].reverse().map((block) => ({ ...block, dates: [...block.dates].reverse() })));
  assert.equal(reordered.startDate, '2026-08-11');
  assert.equal(reordered.endDate, '2026-09-10');
  assert.deepEqual(regimenDoseHours(reordered.regimens[0]), [510, 558]);
  const removedDate = calendarBlockSchedule([...customBlocks.slice(0, 2), { ...customBlocks[2], dates: ['2026-09-01'] }]);
  assert.equal(removedDate.endDate, '2026-09-08');
  assert.equal(calendarBlockSchedule(customBlocks.slice(0, 2)).endDate, '2026-09-01');
  assert.equal(calendarBlockSchedule([{ ...customBlocks[0], dates: ['2026-08-18'] }, ...customBlocks.slice(1)]).startDate, '2026-08-18');
});

test('exact dates preserve the requested five doses and finish one week after the last injection', () => {
  const schedule = calendarSchedule(customExample);
  assert.equal(schedule.error, null);
  assert.equal(schedule.startDate, '2026-08-11');
  assert.equal(schedule.endDate, '2026-09-10');
  assert.deepEqual(schedule.regimens.flatMap(regimenDoseHours), [6, 174, 342, 510, 558]);
  assert.deepEqual(schedule.regimens.map((regimen) => regimen.doseMg), [2.5, 2.5, 5, 2.5, 2.5]);
  assert.equal(schedule.totalWeeks * 168, 726);
  const values = schedule.regimens.map((regimen) => sampleRegimen(regimen, schedule.totalWeeks));
  assert.ok(values.every((series) => series.length === 122));
  for (let index = 0; index < 122; index++) {
    const expected = [6, 174, 342, 510, 558].reduce((sum, hour, doseIndex) =>
      sum + doseConcentrationNgMl('tirzepatide', doseIndex === 2 ? 5 : 2.5, index * 6 - hour), 0);
    assert.ok(Math.abs(values.reduce((sum, series) => sum + series[index], 0) - expected) < 1e-9);
  }
});

test('calendar range follows earliest and latest dates after reordering, edits, and removal', () => {
  const reordered = calendarSchedule([...customExample].reverse());
  assert.equal(reordered.startDate, '2026-08-11');
  assert.equal(reordered.endDate, '2026-09-10');
  assert.equal(reordered.firstDoseHour, 6);
  assert.equal(calendarSchedule(customExample.slice(0, -1)).endDate, '2026-09-08');
  assert.equal(calendarSchedule([{ ...customExample[0], date: '2027-12-30' }]).endDate, '2028-01-06');
});

test('calendar schedules validate drafts and keep calendar-day intervals across DST and leap days', () => {
  assert.ok(calendarSchedule([]).error);
  for (const date of ['', '2026-02-29', '2026-13-01', 'invalid']) {
    assert.ok(calendarSchedule([{ ...customExample[0], date }]).error);
  }
  assert.ok(calendarSchedule([{ ...customExample[0], doseMg: NaN }]).error);
  assert.ok(calendarSchedule([customExample[0], { ...customExample[1], date: '2040-01-01' }]).error);
  for (const [first, last, gap] of [['2026-03-07', '2026-03-09', 48], ['2026-10-31', '2026-11-02', 48], ['2028-02-28', '2028-03-01', 48]]) {
    const schedule = calendarSchedule([{ ...customExample[0], date: first }, { ...customExample[1], date: last, timeOfDay: 'night' }]);
    assert.equal(schedule.error, null);
    assert.deepEqual(schedule.regimens.flatMap(regimenDoseHours), [6, gap + 18]);
    assert.equal(sampleRegimen(schedule.regimens[0], schedule.totalWeeks).length, (gap + 18 + 168) / 6 + 1);
  }
});

test('calendar injections use both compartment models and retain simultaneous injections', () => {
  const schedule = calendarSchedule([customExample[0], { ...customExample[0], id: 2, doseMg: 5 }, { ...customExample[1], compound: 'semaglutide', doseMg: 0.5 }]);
  for (const model of [{ kind: 'reference-two-compartment' }, {
    kind: 'personalized-two-compartment', startingWeightKg: 100, heightCm: 175,
    sex: 'male', firstDoseHour: schedule.firstDoseHour,
  }]) {
    const values = schedule.regimens.map((regimen) => sampleRegimen(regimen, schedule.totalWeeks, 6, model));
    assert.ok(values.flat().every(Number.isFinite));
    values[0].forEach((value, index) => assert.ok(Math.abs(values[1][index] - 2 * value) < 1e-8));
    assert.ok(values[2].slice(0, 30).every((value) => value === 0));
    assert.ok(values[2][30] > 0);
    assert.ok(values.every((series) => series.length === schedule.totalWeeks * 168 / 6 + 1));
  }
});

test('fractional-week timelines retain the exact final sample despite floating-point rounding', () => {
  for (let day = 1; day <= 30; day++) {
    for (const [timeOfDay, offset] of [['morning', 6], ['afternoon', 12], ['night', 18]]) {
      const schedule = calendarSchedule([customExample[0], { ...customExample[1], date: `2026-09-${String(day).padStart(2, '0')}`, timeOfDay }]);
      const expectedEndHour = (21 + day - 1) * 24 + offset + 168;
      const values = sampleRegimen(schedule.regimens[1], schedule.totalWeeks);
      assert.equal(values.length, expectedEndHour / 6 + 1);
      assert.ok(Math.abs(values.at(-1) - doseConcentrationNgMl('tirzepatide', 2.5, 168)) < 1e-9);
    }
  }
});

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
