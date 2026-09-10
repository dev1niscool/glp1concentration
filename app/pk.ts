export type CompoundId = 'semaglutide' | 'tirzepatide' | 'retatrutide';
export type DoseTime = 'morning' | 'afternoon' | 'night';
export type PkModelMode = 'one-compartment' | 'two-compartment';
export type PkModelSex = 'female' | 'male';

export type Regimen = {
  id: number;
  compound: CompoundId;
  doseMg: number;
  startWeek: number;
  endWeek: number;
  timeOfDay: DoseTime;
  useCustomDoseInterval: boolean;
  doseIntervalDays: number;
  explicitDoseHours?: number[];
};

export type CalendarInjection = {
  id: number;
  compound: 'semaglutide' | 'tirzepatide';
  doseMg: number;
  date: string;
  timeOfDay: DoseTime;
};

export type CalendarDoseBlock = Omit<CalendarInjection, 'date'> & { dates: string[] };

export function calendarBlockSchedule(blocks: CalendarDoseBlock[]) {
  if (blocks.length === 0 || blocks.some((block) => block.dates.length === 0)) {
    return { error: 'Add at least one date to every dose block.' } as const;
  }
  if (blocks.reduce((count, block) => count + block.dates.length, 0) > 100) {
    return { error: 'You can plot up to 100 injection dates at a time.' } as const;
  }
  if (blocks.some((block) => new Set(block.dates.filter(Boolean)).size !== block.dates.filter(Boolean).length)) {
    return { error: 'Choose each date only once within a dose block.' } as const;
  }
  const schedule = calendarSchedule(blocks.flatMap((block) =>
    block.dates.map((date) => ({ ...block, date }))));
  if (schedule.error !== null) return schedule;
  let offset = 0;
  const regimens = blocks.map((block) => {
    const doses = schedule.regimens.slice(offset, offset + block.dates.length);
    offset += block.dates.length;
    const explicitDoseHours = doses.flatMap(regimenDoseHours).sort((a, b) => a - b);
    return { ...doses[0], id: block.id, explicitDoseHours,
      startWeek: Math.floor(explicitDoseHours[0] / HOURS_PER_WEEK) + 1,
      endWeek: Math.floor(explicitDoseHours[explicitDoseHours.length - 1] / HOURS_PER_WEEK) + 1 };
  });
  return { ...schedule, regimens };
}

// Calendar days are modeled as 24 hours, independent of daylight-saving changes.
function calendarDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (date < '0001-01-01' || date > '9999-12-24') return null;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return timestamp / 86_400_000;
}

export function calendarSchedule(injections: CalendarInjection[]) {
  if (injections.length === 0) return { error: 'Add at least one injection.' } as const;
  const days = injections.map((injection) => calendarDay(injection.date));
  if (days.some((day) => day === null)) return { error: 'Choose a valid date for every injection.' } as const;
  if (injections.some((injection) => !COMPOUNDS[injection.compound]?.doses.includes(injection.doseMg) ||
    !Object.hasOwn(DOSE_TIME_OFFSETS, injection.timeOfDay))) {
    return { error: 'Choose a peptide, dose, and time for every injection.' } as const;
  }
  const firstDay = Math.min(...days as number[]);
  const hours = injections.map((injection, index) =>
    ((days[index] as number) - firstDay) * 24 + DOSE_TIME_OFFSETS[injection.timeOfDay]);
  const lastHour = Math.max(...hours) + HOURS_PER_WEEK;
  if (lastHour > 520 * HOURS_PER_WEEK) return { error: 'Keep the full graph, including the final week, within 520 weeks.' } as const;
  const startDate = new Date(firstDay * 86_400_000).toISOString().slice(0, 10);
  const endDate = new Date(firstDay * 86_400_000 + lastHour * 3_600_000).toISOString().slice(0, 10);
  const regimens: Regimen[] = injections.map((injection, index) => ({
    id: injection.id,
    compound: injection.compound,
    doseMg: injection.doseMg,
    startWeek: Math.floor(hours[index] / HOURS_PER_WEEK) + 1,
    endWeek: Math.floor(hours[index] / HOURS_PER_WEEK) + 1,
    timeOfDay: injection.timeOfDay,
    useCustomDoseInterval: false,
    doseIntervalDays: 7,
    explicitDoseHours: [hours[index]],
  }));
  return { error: null, startDate, endDate, totalWeeks: lastHour / HOURS_PER_WEEK,
    firstDoseHour: Math.min(...hours), regimens } as const;
}

type CompoundProfileBase = {
  id: CompoundId;
  name: string;
  brands: string;
  doses: number[];
  halfLifeDays: number;
  absorptionRatePerHour: number;
  apparentVolumeLiters: number;
  modelNote: string;
  color: string;
  fill: string;
};

type OneCompartmentOnlyProfile = CompoundProfileBase & {
  availableModels: 'one-only';
};

type DualModelProfile = CompoundProfileBase & {
  availableModels: 'one-or-two';
  twoCompartmentAbsorptionRatePerHour: number;
  bioavailability: number;
  clearanceLitersPerHour: number;
  intercompartmentalClearanceLitersPerHour: number;
  centralVolumeLiters: number;
  peripheralVolumeLiters: number;
  referenceWeightKg: number;
  weightClearanceExponent: number;
  weightVolumeExponent: number;
  bodySizeModel: 'total-weight' | 'fat-free-mass';
};

export type CompoundProfile = OneCompartmentOnlyProfile | DualModelProfile;

export type PkModelOptions =
  | { kind: 'one-compartment' }
  | { kind: 'reference-two-compartment' }
  | {
      kind: 'personalized-two-compartment';
      startingWeightKg: number;
      heightCm: number;
      sex: PkModelSex;
      firstDoseHour: number;
    };

export type TwoCompartmentParameters = {
  clearanceLitersPerHour: number;
  intercompartmentalClearanceLitersPerHour: number;
  centralVolumeLiters: number;
  peripheralVolumeLiters: number;
};

export const COMPOUNDS: Record<CompoundId, CompoundProfile> = {
  semaglutide: {
    id: 'semaglutide',
    name: 'Semaglutide',
    brands: 'Ozempic / Wegovy',
    doses: [0.25, 0.5, 1, 1.7, 2.4],
    halfLifeDays: 7.37,
    absorptionRatePerHour: 0.0286,
    apparentVolumeLiters: 12.2,
    availableModels: 'one-or-two',
    twoCompartmentAbsorptionRatePerHour: 0.0253,
    bioavailability: 0.847,
    clearanceLitersPerHour: 0.0348,
    intercompartmentalClearanceLitersPerHour: 0.304,
    centralVolumeLiters: 3.59,
    peripheralVolumeLiters: 4.10,
    referenceWeightKg: 85,
    weightClearanceExponent: 1.01,
    weightVolumeExponent: 0.923,
    bodySizeModel: 'total-weight',
    modelNote: 'Petri 2018 one-compartment or Overgaard 2019 two-compartment population estimate',
    color: '#174c38',
    fill: 'rgba(60, 124, 86, 0.18)',
  },
  tirzepatide: {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    brands: 'Mounjaro / Zepbound',
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    halfLifeDays: 5.4,
    absorptionRatePerHour: 0.0373,
    apparentVolumeLiters: 10.3,
    availableModels: 'one-or-two',
    twoCompartmentAbsorptionRatePerHour: 0.0373,
    bioavailability: 0.8,
    clearanceLitersPerHour: 0.0329,
    intercompartmentalClearanceLitersPerHour: 0.126,
    centralVolumeLiters: 2.47,
    peripheralVolumeLiters: 3.98,
    referenceWeightKg: 70,
    weightClearanceExponent: 0.8,
    weightVolumeExponent: 1,
    bodySizeModel: 'fat-free-mass',
    modelNote: 'One-compartment reduction or Schneck 2024 two-compartment population estimate',
    color: '#a6cf27',
    fill: 'rgba(181, 220, 55, 0.18)',
  },
  retatrutide: {
    id: 'retatrutide',
    name: 'Retatrutide',
    brands: 'Investigational; not FDA approved',
    doses: [],
    halfLifeDays: 6,
    absorptionRatePerHour: 0.08,
    apparentVolumeLiters: 7.36,
    availableModels: 'one-only',
    modelNote: 'One-compartment surrogate fitted to Coskun 2022 phase 1 PK',
    color: '#a85e35',
    fill: 'rgba(168, 94, 53, 0.18)',
  },
};

export const HOURS_PER_WEEK = 168;
export const ASSUMED_WEEKLY_WEIGHT_LOSS_KG = 0.45359237;
export const MIN_MODELED_WEIGHT_KG = 30;
export const DOSE_TIME_OFFSETS: Record<DoseTime, number> = {
  morning: 6,
  afternoon: 12,
  night: 18,
};
export const DOSE_TIME_LABELS: Record<DoseTime, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

export function regimenIntervalDays(regimen: Regimen) {
  if (!regimen.useCustomDoseInterval) return 7;
  return Number.isFinite(regimen.doseIntervalDays) && regimen.doseIntervalDays >= 1
    ? regimen.doseIntervalDays
    : 7;
}

export function regimenDoseHours(regimen: Regimen) {
  if (regimen.explicitDoseHours) return regimen.explicitDoseHours;
  const firstDoseHour = (regimen.startWeek - 1) * HOURS_PER_WEEK +
    DOSE_TIME_OFFSETS[regimen.timeOfDay];
  const endExclusiveHour = regimen.endWeek * HOURS_PER_WEEK;
  const intervalHours = regimenIntervalDays(regimen) * 24;
  const doseHours: number[] = [];
  for (let doseHour = firstDoseHour; doseHour < endExclusiveHour; doseHour += intervalHours) {
    doseHours.push(doseHour);
  }
  return doseHours;
}

function oneCompartmentConcentration(
  doseMg: number,
  hoursAfterDose: number,
  absorptionRatePerHour: number,
  halfLifeDays: number,
  apparentVolumeLiters: number,
) {
  const ke = Math.log(2) / (halfLifeDays * 24);
  const scale = (doseMg * absorptionRatePerHour * 1000) /
    (apparentVolumeLiters * (absorptionRatePerHour - ke));
  return Math.max(0, scale * (
    Math.exp(-ke * hoursAfterDose) - Math.exp(-absorptionRatePerHour * hoursAfterDose)
  ));
}

function requireDualModelProfile(compound: CompoundId): DualModelProfile {
  const profile = COMPOUNDS[compound];
  if (profile.availableModels !== 'one-or-two') {
    throw new Error(`${profile.name} does not have a two-compartment model in this calculator.`);
  }
  return profile;
}

export function modeledWeightAtHour(
  model: Extract<PkModelOptions, { kind: 'personalized-two-compartment' }>,
  timelineHour: number,
) {
  if (timelineHour <= model.firstDoseHour) return model.startingWeightKg;
  const weeksSinceFirstDose = (timelineHour - model.firstDoseHour) / HOURS_PER_WEEK;
  return Math.max(
    MIN_MODELED_WEIGHT_KG,
    model.startingWeightKg - weeksSinceFirstDose * ASSUMED_WEEKLY_WEIGHT_LOSS_KG,
  );
}

export function twoCompartmentParametersForPatient(
  compound: CompoundId,
  weightKg: number,
  heightCm: number,
  sex: PkModelSex,
): TwoCompartmentParameters {
  const profile = requireDualModelProfile(compound);
  const clearanceScale = (weightKg / profile.referenceWeightKg) ** profile.weightClearanceExponent;
  let volumeScale: number;
  if (profile.bodySizeModel === 'fat-free-mass') {
    const heightMeters = heightCm / 100;
    const bmi = weightKg / heightMeters ** 2;
    const fatFreeMass = sex === 'male'
      ? (9270 * weightKg) / (6680 + 216 * bmi)
      : (9270 * weightKg) / (8780 + 244 * bmi);
    const fatMass = weightKg - fatFreeMass;
    volumeScale = (fatFreeMass + 0.482 * fatMass) / profile.referenceWeightKg;
  } else {
    volumeScale = (weightKg / profile.referenceWeightKg) ** profile.weightVolumeExponent;
  }
  return {
    clearanceLitersPerHour: profile.clearanceLitersPerHour * clearanceScale,
    intercompartmentalClearanceLitersPerHour:
      profile.intercompartmentalClearanceLitersPerHour * clearanceScale,
    centralVolumeLiters: profile.centralVolumeLiters * volumeScale,
    peripheralVolumeLiters: profile.peripheralVolumeLiters * volumeScale,
  };
}

export function semaglutideParametersForPatient(weightKg: number): TwoCompartmentParameters {
  return twoCompartmentParametersForPatient('semaglutide', weightKg, 170, 'female');
}

export function tirzepatideParametersForPatient(
  weightKg: number,
  heightCm: number,
  sex: PkModelSex,
): TwoCompartmentParameters {
  return twoCompartmentParametersForPatient('tirzepatide', weightKg, heightCm, sex);
}

function twoCompartmentConcentration(
  profile: DualModelProfile,
  parameters: TwoCompartmentParameters,
  doseMg: number,
  hoursAfterDose: number,
) {
  const ka = profile.twoCompartmentAbsorptionRatePerHour;
  const k10 = parameters.clearanceLitersPerHour / parameters.centralVolumeLiters;
  const k12 = parameters.intercompartmentalClearanceLitersPerHour / parameters.centralVolumeLiters;
  const k21 = parameters.intercompartmentalClearanceLitersPerHour / parameters.peripheralVolumeLiters;
  const rateSum = k10 + k12 + k21;
  const rateRoot = Math.sqrt(rateSum ** 2 - 4 * k10 * k21);
  const alpha = (rateSum + rateRoot) / 2;
  const beta = (rateSum - rateRoot) / 2;
  const alphaWeight = (alpha - k21) / (alpha - beta);
  const betaWeight = (k21 - beta) / (alpha - beta);
  const absorbedTerm = (rate: number) =>
    (ka / (ka - rate)) * (Math.exp(-rate * hoursAfterDose) - Math.exp(-ka * hoursAfterDose));
  const doseOverCentralVolume = profile.bioavailability * doseMg * 1000 /
    parameters.centralVolumeLiters;
  return Math.max(0, doseOverCentralVolume * (
    alphaWeight * absorbedTerm(alpha) + betaWeight * absorbedTerm(beta)
  ));
}

/**
 * Population-reference plasma concentration after one subcutaneous dose.
 * One-compartment mode uses a Bateman function with apparent volume V/F.
 * Reference two-compartment mode uses the published fixed effects with
 * first-order absorption, intercompartmental exchange, and central elimination.
 */
export function doseConcentrationNgMl(
  compound: CompoundId,
  doseMg: number,
  hoursAfterDose: number,
  model: PkModelOptions = { kind: 'one-compartment' },
): number {
  if (hoursAfterDose < 0) return 0;
  const profile = COMPOUNDS[compound];
  if (model.kind !== 'one-compartment' && profile.availableModels === 'one-or-two') {
    const parameters = model.kind === 'personalized-two-compartment'
      ? twoCompartmentParametersForPatient(
        compound,
        model.startingWeightKg,
        model.heightCm,
        model.sex,
      )
      : {
        clearanceLitersPerHour: profile.clearanceLitersPerHour,
        intercompartmentalClearanceLitersPerHour: profile.intercompartmentalClearanceLitersPerHour,
        centralVolumeLiters: profile.centralVolumeLiters,
        peripheralVolumeLiters: profile.peripheralVolumeLiters,
      };
    return twoCompartmentConcentration(profile, parameters, doseMg, hoursAfterDose);
  }
  return oneCompartmentConcentration(
    doseMg,
    hoursAfterDose,
    profile.absorptionRatePerHour,
    profile.halfLifeDays,
    profile.apparentVolumeLiters,
  );
}

export function regimenConcentrationNgMl(
  regimen: Regimen,
  timelineHour: number,
  model: PkModelOptions = { kind: 'one-compartment' },
): number {
  let total = 0;
  for (const doseHour of regimenDoseHours(regimen)) {
    total += doseConcentrationNgMl(
      regimen.compound,
      regimen.doseMg,
      timelineHour - doseHour,
      model,
    );
  }
  return total;
}

function addState(
  state: [number, number, number],
  derivative: [number, number, number],
  multiplier: number,
): [number, number, number] {
  return state.map((value, index) => value + derivative[index] * multiplier) as [number, number, number];
}

function samplePersonalizedTwoCompartmentRegimen(
  regimen: Regimen,
  totalWeeks: number,
  stepHours: number,
  model: Extract<PkModelOptions, { kind: 'personalized-two-compartment' }>,
) {
  const profile = requireDualModelProfile(regimen.compound);
  const lastHour = totalWeeks * HOURS_PER_WEEK;
  const integrationStep = Math.min(1, stepHours);
  const integrationCount = Math.round(lastHour / integrationStep);
  const outputStride = Math.max(1, Math.round(stepHours / integrationStep));
  const doseSteps = new Set(regimenDoseHours(regimen).map((doseHour) =>
    Math.round(doseHour / integrationStep)));

  const parametersAt = (timelineHour: number) => twoCompartmentParametersForPatient(
    regimen.compound,
    modeledWeightAtHour(model, timelineHour),
    model.heightCm,
    model.sex,
  );
  const derivative = (
    state: [number, number, number],
    timelineHour: number,
  ): [number, number, number] => {
    const parameters = parametersAt(timelineHour);
    const [depotAmount, centralAmount, peripheralAmount] = state;
    const centralConcentration = centralAmount / parameters.centralVolumeLiters;
    const peripheralConcentration = peripheralAmount / parameters.peripheralVolumeLiters;
    const distribution = parameters.intercompartmentalClearanceLitersPerHour *
      (centralConcentration - peripheralConcentration);
    return [
      -profile.twoCompartmentAbsorptionRatePerHour * depotAmount,
      profile.bioavailability * profile.twoCompartmentAbsorptionRatePerHour * depotAmount -
        parameters.clearanceLitersPerHour * centralConcentration - distribution,
      distribution,
    ];
  };

  let state: [number, number, number] = [0, 0, 0];
  const samples: number[] = [];
  for (let integrationIndex = 0; integrationIndex <= integrationCount; integrationIndex += 1) {
    const timelineHour = integrationIndex * integrationStep;
    if (doseSteps.has(integrationIndex)) state[0] += regimen.doseMg * 1000;
    if (integrationIndex % outputStride === 0) {
      samples.push(Math.max(0, state[1] / parametersAt(timelineHour).centralVolumeLiters));
    }
    if (integrationIndex === integrationCount) break;
    const k1 = derivative(state, timelineHour);
    const k2 = derivative(addState(state, k1, integrationStep / 2), timelineHour + integrationStep / 2);
    const k3 = derivative(addState(state, k2, integrationStep / 2), timelineHour + integrationStep / 2);
    const k4 = derivative(addState(state, k3, integrationStep), timelineHour + integrationStep);
    state = state.map((value, index) => value + (integrationStep / 6) *
      (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index])) as [number, number, number];
  }
  return samples;
}

export function sampleRegimen(
  regimen: Regimen,
  totalWeeks: number,
  stepHours = 6,
  model: PkModelOptions = { kind: 'one-compartment' },
): number[] {
  const profile = COMPOUNDS[regimen.compound];
  if (model.kind === 'personalized-two-compartment' && profile.availableModels === 'one-or-two') {
    return samplePersonalizedTwoCompartmentRegimen(regimen, totalWeeks, stepHours, model);
  }
  const lastHour = totalWeeks * HOURS_PER_WEEK;
  const samples: number[] = [];
  // Fractional weeks can round just below a six-hour boundary. Include that sample.
  const sampleCount = Math.floor(lastHour / stepHours + 1e-9);
  for (let index = 0; index <= sampleCount; index += 1) {
    samples.push(regimenConcentrationNgMl(regimen, index * stepHours, model));
  }
  return samples;
}

export const INTERVAL_REFERENCE_ALLOWANCE = 20;
export const INTERVAL_PROJECTION_WEEKS = 52;
export const MAX_SEARCH_INTERVAL_DAYS = 365;

export function latestCalendarDose(regimens: Regimen[]) {
  const doses = regimens.flatMap((regimen) => (regimen.explicitDoseHours ?? [])
    .map((hour) => ({ compound: regimen.compound, doseMg: regimen.doseMg, timeOfDay: regimen.timeOfDay, hour })));
  doses.sort((a, b) => b.hour - a.hour);
  if (!doses.length) return null;
  return { ...doses[0], ambiguous: doses.length > 1 && doses[1].hour === doses[0].hour };
}

type IntervalSearchResult =
  | { status: 'invalid'; message: string }
  | { status: 'cancelled' }
  | { status: 'no-match'; ceilingNgMl: number; lowestPeakNgMl: number }
  | { status: 'match'; intervalDays: number; doseMg: number; compound: CompoundId;
      ceilingNgMl: number; peakNgMl: number; peakHour: number;
      existingDosePeakNgMl: number; firstFutureHour: number; endHour: number };

/** Numerical scenario search only; a reference concentration is not a clinical target. */
export async function findModeledInterval(
  regimens: Regimen[],
  doseMg: number,
  referenceNgMl: number,
  model: PkModelOptions,
  checkpoint: (message: string) => Promise<boolean> = async () => true,
): Promise<IntervalSearchResult> {
  const latest = latestCalendarDose(regimens);
  if (!latest || regimens.some((regimen) => !regimen.explicitDoseHours?.length)) {
    return { status: 'invalid', message: 'Plot a dated dose schedule before calculating.' };
  }
  if (regimens.some((regimen) => !Number.isFinite(regimen.doseMg) || regimen.doseMg <= 0 ||
    regimen.explicitDoseHours!.some((hour) => !Number.isInteger(hour) || hour < 0 || hour > 520 * HOURS_PER_WEEK))) {
    return { status: 'invalid', message: 'The plotted schedule contains invalid doses or times. Check the entries and replot.' };
  }
  if (new Set(regimens.map((regimen) => regimen.compound)).size !== 1 || latest.compound === 'retatrutide') {
    return { status: 'invalid', message: 'This calculator requires a schedule containing only semaglutide or only tirzepatide. Concentrations of different medications cannot define one shared target.' };
  }
  if (latest.ambiguous) return { status: 'invalid', message: 'The latest injection time appears in multiple blocks. Resolve that overlap before calculating.' };
  if (!Number.isFinite(referenceNgMl) || referenceNgMl <= 0 || !Number.isFinite(referenceNgMl + INTERVAL_REFERENCE_ALLOWANCE)) {
    return { status: 'invalid', message: 'Enter a positive reference concentration in ng/mL.' };
  }
  if (!COMPOUNDS[latest.compound].doses.includes(doseMg)) {
    return { status: 'invalid', message: 'Select a dose for the modeled medication.' };
  }
  if (model.kind === 'personalized-two-compartment' && (
    !Number.isFinite(model.startingWeightKg) || model.startingWeightKg < 30 || model.startingWeightKg > 350 ||
    !Number.isFinite(model.heightCm) || model.heightCm < 120 || model.heightCm > 230 ||
    !['female', 'male'].includes(model.sex) || !Number.isFinite(model.firstDoseHour)
  )) return { status: 'invalid', message: 'Complete valid two-compartment body-size inputs before calculating.' };

  const ceilingNgMl = referenceNgMl + INTERVAL_REFERENCE_ALLOWANCE;
  const repeatHours = INTERVAL_PROJECTION_WEEKS * HOURS_PER_WEEK;
  const followupHours = Math.ceil(COMPOUNDS[latest.compound].halfLifeDays * 10 * 24 / 6) * 6;
  const longestHour = latest.hour + MAX_SEARCH_INTERVAL_DAYS * 24 + repeatHours + followupHours;
  const history = new Map<number, number[]>();
  async function historyAt(step: number) {
    const cached = history.get(step);
    if (cached) return cached;
    const total = Array(Math.round(longestHour / step) + 1).fill(0) as number[];
    for (const regimen of regimens) {
      if (!await checkpoint('Calculating remaining concentration from the plotted doses…')) return null;
      const samples = sampleRegimen(regimen, longestHour / HOURS_PER_WEEK, step, model);
      samples.forEach((value, index) => { total[index] += value; });
    }
    history.set(step, total);
    return total;
  }
  async function evaluate(intervalDays: number, step: number) {
    const remaining = await historyAt(step);
    if (!remaining) return null;
    const firstFutureHour = latest!.hour + intervalDays * 24;
    const endHour = firstFutureHour + repeatHours + followupHours;
    const doseHours: number[] = [];
    for (let hour = firstFutureHour; hour < firstFutureHour + repeatHours; hour += intervalDays * 24) doseHours.push(hour);
    const future: Regimen = { ...regimens[0], doseMg, explicitDoseHours: doseHours };
    const values = sampleRegimen(future, endHour / HOURS_PER_WEEK, step, model);
    let peakNgMl = 0;
    let peakHour = firstFutureHour;
    let existingDosePeakNgMl = 0;
    for (let index = Math.round(latest!.hour / step); index < Math.round(firstFutureHour / step); index++) {
      existingDosePeakNgMl = Math.max(existingDosePeakNgMl, remaining[index]);
    }
    for (let index = Math.round(firstFutureHour / step); index < values.length; index++) {
      const total = remaining[index] + values[index];
      if (!Number.isFinite(total)) throw new Error('The projection produced a non-finite concentration.');
      if (total > peakNgMl) { peakNgMl = total; peakHour = index * step; }
    }
    return { peakNgMl, peakHour, existingDosePeakNgMl, firstFutureHour, endHour };
  }

  let lowestPeakNgMl = Number.POSITIVE_INFINITY;
  for (let intervalDays = 1; intervalDays <= MAX_SEARCH_INTERVAL_DAYS; intervalDays++) {
    if (!await checkpoint(`Checking a ${intervalDays}-day modeled interval…`)) return { status: 'cancelled' };
    const coarse = await evaluate(intervalDays, 1);
    if (!coarse) return { status: 'cancelled' };
    lowestPeakNgMl = Math.min(lowestPeakNgMl, coarse.peakNgMl);
    if (coarse.peakNgMl > ceilingNgMl) continue;
    if (!await checkpoint('Refining the candidate peak at 15-minute intervals…')) return { status: 'cancelled' };
    const refined = await evaluate(intervalDays, 0.25);
    if (!refined) return { status: 'cancelled' };
    // Round upward for the numerical comparison and result display.
    const peakNgMl = Math.ceil(refined.peakNgMl * 10) / 10;
    if (peakNgMl <= ceilingNgMl) {
      return { status: 'match', intervalDays, doseMg, compound: latest.compound,
        ceilingNgMl, ...refined, peakNgMl };
    }
  }
  return { status: 'no-match', ceilingNgMl, lowestPeakNgMl };
}

export function trapezoidAuc(values: number[], stepHours = 6): number {
  let auc = 0;
  for (let i = 1; i < values.length; i += 1) {
    auc += ((values[i - 1] + values[i]) / 2) * stepHours;
  }
  return auc;
}

export function formatConcentration(value: number): string {
  if (value < 0.01) return value.toFixed(3);
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return Math.round(value).toLocaleString('en-US');
}

export function niceScale(maxValue: number): number {
  if (maxValue <= 0) return 1;
  const rough = maxValue * 1.12;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
}
