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
};

export type CompoundProfile = OneCompartmentProfile | TwoCompartmentProfile;

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
): number {
  if (hoursAfterDose < 0) return 0;
  const profile = COMPOUNDS[compound];
  const ka = profile.absorptionRatePerHour;

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

  const volume = profile.apparentVolumeLiters;
  const ke = Math.log(2) / (profile.halfLifeDays * 24);
  const scale = (doseMg * ka * 1000) / (volume * (ka - ke));
  return Math.max(0, scale * (Math.exp(-ke * hoursAfterDose) - Math.exp(-ka * hoursAfterDose)));
}

export function regimenConcentrationNgMl(regimen: Regimen, timelineHour: number): number {
  let total = 0;
  for (let week = regimen.startWeek; week <= regimen.endWeek; week += 1) {
    const doseHour = (week - 1) * HOURS_PER_WEEK + DOSE_TIME_OFFSETS[regimen.timeOfDay];
    total += doseConcentrationNgMl(regimen.compound, regimen.doseMg, timelineHour - doseHour);
  }
  return total;
}

export function sampleRegimen(
  regimen: Regimen,
  totalWeeks: number,
  stepHours = 6,
): number[] {
  const lastHour = totalWeeks * HOURS_PER_WEEK;
  const samples: number[] = [];
  for (let hour = 0; hour <= lastHour; hour += stepHours) {
    samples.push(regimenConcentrationNgMl(regimen, hour));
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
