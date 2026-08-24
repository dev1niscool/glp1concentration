export type CompoundId = 'semaglutide' | 'tirzepatide';

export type Regimen = {
  id: number;
  compound: CompoundId;
  doseMg: number;
  startWeek: number;
  endWeek: number;
};

export type CompoundProfile = {
  id: CompoundId;
  name: string;
  brands: string;
  doses: number[];
  halfLifeDays: number;
  absorptionRatePerHour: number;
  apparentVolumeLiters: number;
  color: string;
  fill: string;
};

export const COMPOUNDS: Record<CompoundId, CompoundProfile> = {
  semaglutide: {
    id: 'semaglutide',
    name: 'Semaglutide',
    brands: 'Ozempic / Wegovy',
    doses: [0.25, 0.5, 1, 1.7, 2.4],
    halfLifeDays: 7,
    absorptionRatePerHour: 0.0286,
    apparentVolumeLiters: 12.2,
    color: '#174c38',
    fill: 'rgba(60, 124, 86, 0.18)',
  },
  tirzepatide: {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    brands: 'Mounjaro / Zepbound',
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    halfLifeDays: 5,
    absorptionRatePerHour: 0.0373,
    apparentVolumeLiters: 10.3,
    color: '#a6cf27',
    fill: 'rgba(181, 220, 55, 0.18)',
  },
};

export const HOURS_PER_WEEK = 168;

/**
 * One-compartment, first-order absorption and elimination estimate after a
 * subcutaneous dose. V/F is apparent volume, so dose is not multiplied by F.
 * The result is ng/mL (numerically equivalent to micrograms/L).
 */
export function doseConcentrationNgMl(
  compound: CompoundId,
  doseMg: number,
  hoursAfterDose: number,
): number {
  if (hoursAfterDose < 0) return 0;
  const profile = COMPOUNDS[compound];
  const ka = profile.absorptionRatePerHour;
  const ke = Math.log(2) / (profile.halfLifeDays * 24);
  const scale = (doseMg * ka * 1000) / (profile.apparentVolumeLiters * (ka - ke));
  return Math.max(0, scale * (Math.exp(-ke * hoursAfterDose) - Math.exp(-ka * hoursAfterDose)));
}

export function regimenConcentrationNgMl(regimen: Regimen, timelineHour: number): number {
  let total = 0;
  for (let week = regimen.startWeek; week <= regimen.endWeek; week += 1) {
    const doseHour = (week - 1) * HOURS_PER_WEEK;
    total += doseConcentrationNgMl(regimen.compound, regimen.doseMg, timelineHour - doseHour);
  }
  return total;
}

export function sampleRegimen(regimen: Regimen, totalWeeks: number, stepHours = 6): number[] {
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
