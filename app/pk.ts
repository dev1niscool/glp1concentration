export type CompoundId = 'semaglutide' | 'tirzepatide' | 'retatrutide';
export type DoseTime = 'morning' | 'afternoon' | 'night';

export type Regimen = {
  id: number;
  compound: CompoundId;
  doseMg: number;
  startWeek: number;
  endWeek: number;
  timeOfDay: DoseTime;
};

type CompoundProfileBase = {
  id: CompoundId;
  name: string;
  brands: string;
  doses: number[];
  halfLifeDays: number;
  absorptionRatePerHour: number;
  modelNote: string;
  color: string;
  fill: string;
};

type OneCompartmentProfile = CompoundProfileBase & {
  model: 'one-compartment';
  apparentVolumeLiters: number;
};

type TwoCompartmentProfile = CompoundProfileBase & {
  model: 'two-compartment';
  bioavailability: number;
  clearanceLitersPerHour: number;
  intercompartmentalClearanceLitersPerHour: number;
  centralVolumeLiters: number;
  peripheralVolumeLiters: number;
  referenceWeightKg: number;
  simplifiedApparentVolumeLiters: number;
};

export type CompoundProfile = OneCompartmentProfile | TwoCompartmentProfile;

export type TirzepatideModelSex = 'female' | 'male';

export type TirzepatideModelOptions =
  | { kind: 'reference-two-compartment' }
  | { kind: 'one-compartment' }
  | {
      kind: 'personalized-two-compartment';
      startingWeightKg: number;
      currentWeightKg?: number;
      heightCm: number;
      sex: TirzepatideModelSex;
      firstDoseHour: number;
      currentWeightHour: number;
    };

export type TirzepatideTwoCompartmentParameters = {
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
    model: 'one-compartment',
    apparentVolumeLiters: 12.2,
    modelNote: 'Petri 2018 one-compartment population estimate',
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
    model: 'two-compartment',
    bioavailability: 0.8,
    clearanceLitersPerHour: 0.0329,
    intercompartmentalClearanceLitersPerHour: 0.126,
    centralVolumeLiters: 2.47,
    peripheralVolumeLiters: 3.98,
    referenceWeightKg: 70,
    simplifiedApparentVolumeLiters: 10.3,
    modelNote: 'Schneck 2024 two-compartment population fixed effects at 70 kg',
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
    model: 'one-compartment',
    apparentVolumeLiters: 7.36,
    modelNote: 'One-compartment surrogate fitted to Coskun 2022 phase 1 PK',
    color: '#a85e35',
    fill: 'rgba(168, 94, 53, 0.18)',
  },
};

export const HOURS_PER_WEEK = 168;
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

export function tirzepatideWeightAtHour(
  model: Extract<TirzepatideModelOptions, { kind: 'personalized-two-compartment' }>,
  timelineHour: number,
) {
  if (model.currentWeightKg === undefined) return model.startingWeightKg;
  if (model.currentWeightHour <= model.firstDoseHour) return model.startingWeightKg;
  if (timelineHour <= model.firstDoseHour) return model.startingWeightKg;
  if (timelineHour >= model.currentWeightHour) return model.currentWeightKg;
  const fraction = (timelineHour - model.firstDoseHour) /
    (model.currentWeightHour - model.firstDoseHour);
  return model.startingWeightKg + (model.currentWeightKg - model.startingWeightKg) * fraction;
}

export function tirzepatideParametersForPatient(
  weightKg: number,
  heightCm: number,
  sex: TirzepatideModelSex,
): TirzepatideTwoCompartmentParameters {
  const profile = COMPOUNDS.tirzepatide;
  if (profile.model !== 'two-compartment') throw new Error('Tirzepatide profile must use two compartments.');
  const heightMeters = heightCm / 100;
  const bmi = weightKg / heightMeters ** 2;
  const fatFreeMass = sex === 'male'
    ? (9270 * weightKg) / (6680 + 216 * bmi)
    : (9270 * weightKg) / (8780 + 244 * bmi);
  const fatMass = weightKg - fatFreeMass;
  const clearanceScale = (weightKg / profile.referenceWeightKg) ** 0.8;
  const volumeScale = (fatFreeMass + 0.482 * fatMass) / profile.referenceWeightKg;
  return {
    clearanceLitersPerHour: profile.clearanceLitersPerHour * clearanceScale,
    intercompartmentalClearanceLitersPerHour:
      profile.intercompartmentalClearanceLitersPerHour * clearanceScale,
    centralVolumeLiters: profile.centralVolumeLiters * volumeScale,
    peripheralVolumeLiters: profile.peripheralVolumeLiters * volumeScale,
  };
}

/**
 * Population-reference plasma concentration after one subcutaneous dose.
 * Semaglutide and retatrutide use a one-compartment Bateman function with
 * apparent volume V/F. Tirzepatide uses the published two-compartment fixed
 * effects with first-order absorption and central elimination. The result is
 * ng/mL (numerically equivalent to micrograms/L).
 */
export function doseConcentrationNgMl(
  compound: CompoundId,
  doseMg: number,
  hoursAfterDose: number,
  tirzepatideModel: TirzepatideModelOptions = { kind: 'reference-two-compartment' },
): number {
  if (hoursAfterDose < 0) return 0;
  const profile = COMPOUNDS[compound];
  const ka = profile.absorptionRatePerHour;

  if (compound === 'tirzepatide' && tirzepatideModel.kind === 'one-compartment') {
    const tirzepatide = COMPOUNDS.tirzepatide;
    if (tirzepatide.model !== 'two-compartment') throw new Error('Tirzepatide profile must use two compartments.');
    return oneCompartmentConcentration(
      doseMg,
      hoursAfterDose,
      tirzepatide.absorptionRatePerHour,
      tirzepatide.halfLifeDays,
      tirzepatide.simplifiedApparentVolumeLiters,
    );
  }

  if (profile.model === 'two-compartment') {
    const k10 = profile.clearanceLitersPerHour / profile.centralVolumeLiters;
    const k12 = profile.intercompartmentalClearanceLitersPerHour / profile.centralVolumeLiters;
    const k21 = profile.intercompartmentalClearanceLitersPerHour / profile.peripheralVolumeLiters;
    const rateSum = k10 + k12 + k21;
    const rateRoot = Math.sqrt(rateSum ** 2 - 4 * k10 * k21);
    const alpha = (rateSum + rateRoot) / 2;
    const beta = (rateSum - rateRoot) / 2;
    const alphaWeight = (alpha - k21) / (alpha - beta);
    const betaWeight = (k21 - beta) / (alpha - beta);
    const absorbedTerm = (rate: number) =>
      (ka / (ka - rate)) * (Math.exp(-rate * hoursAfterDose) - Math.exp(-ka * hoursAfterDose));
    const doseOverCentralVolume = profile.bioavailability * doseMg * 1000 / profile.centralVolumeLiters;
    return Math.max(0, doseOverCentralVolume * (
      alphaWeight * absorbedTerm(alpha) + betaWeight * absorbedTerm(beta)
    ));
  }

  return oneCompartmentConcentration(
    doseMg,
    hoursAfterDose,
    ka,
    profile.halfLifeDays,
    profile.apparentVolumeLiters,
  );
}

export function regimenConcentrationNgMl(
  regimen: Regimen,
  timelineHour: number,
  tirzepatideModel: TirzepatideModelOptions = { kind: 'reference-two-compartment' },
): number {
  let total = 0;
  for (let week = regimen.startWeek; week <= regimen.endWeek; week += 1) {
    const doseHour = (week - 1) * HOURS_PER_WEEK + DOSE_TIME_OFFSETS[regimen.timeOfDay];
    total += doseConcentrationNgMl(
      regimen.compound,
      regimen.doseMg,
      timelineHour - doseHour,
      tirzepatideModel,
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

function samplePersonalizedTirzepatideRegimen(
  regimen: Regimen,
  totalWeeks: number,
  stepHours: number,
  model: Extract<TirzepatideModelOptions, { kind: 'personalized-two-compartment' }>,
) {
  const profile = COMPOUNDS.tirzepatide;
  if (profile.model !== 'two-compartment') throw new Error('Tirzepatide profile must use two compartments.');
  const lastHour = totalWeeks * HOURS_PER_WEEK;
  const integrationStep = Math.min(1, stepHours);
  const integrationCount = Math.round(lastHour / integrationStep);
  const outputStride = Math.max(1, Math.round(stepHours / integrationStep));
  const doseSteps = new Set<number>();
  for (let week = regimen.startWeek; week <= regimen.endWeek; week += 1) {
    const doseHour = (week - 1) * HOURS_PER_WEEK + DOSE_TIME_OFFSETS[regimen.timeOfDay];
    doseSteps.add(Math.round(doseHour / integrationStep));
  }

  const derivative = (
    state: [number, number, number],
    timelineHour: number,
  ): [number, number, number] => {
    const weightKg = tirzepatideWeightAtHour(model, timelineHour);
    const parameters = tirzepatideParametersForPatient(weightKg, model.heightCm, model.sex);
    const [depotAmount, centralAmount, peripheralAmount] = state;
    const centralConcentration = centralAmount / parameters.centralVolumeLiters;
    const peripheralConcentration = peripheralAmount / parameters.peripheralVolumeLiters;
    const distribution = parameters.intercompartmentalClearanceLitersPerHour *
      (centralConcentration - peripheralConcentration);
    return [
      -profile.absorptionRatePerHour * depotAmount,
      profile.bioavailability * profile.absorptionRatePerHour * depotAmount -
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
      const weightKg = tirzepatideWeightAtHour(model, timelineHour);
      const parameters = tirzepatideParametersForPatient(weightKg, model.heightCm, model.sex);
      samples.push(Math.max(0, state[1] / parameters.centralVolumeLiters));
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
  tirzepatideModel: TirzepatideModelOptions = { kind: 'reference-two-compartment' },
): number[] {
  if (regimen.compound === 'tirzepatide' && tirzepatideModel.kind === 'personalized-two-compartment') {
    return samplePersonalizedTirzepatideRegimen(regimen, totalWeeks, stepHours, tirzepatideModel);
  }
  const lastHour = totalWeeks * HOURS_PER_WEEK;
  const samples: number[] = [];
  for (let hour = 0; hour <= lastHour; hour += stepHours) {
    samples.push(regimenConcentrationNgMl(regimen, hour, tirzepatideModel));
  }
  return samples;
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
