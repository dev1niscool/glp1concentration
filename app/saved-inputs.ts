import { COMPOUNDS, type CalendarDoseBlock, type CompoundId, type Regimen } from './pk.ts';

export type PlotterVariant = 'branded' | 'compounded' | 'custom-intervals';
export type CalculatorInputs = {
  reference: string;
  ceilingOffset: string;
  doseOverride: { compound: CompoundId; doseMg: number } | null;
};
export type SavedInputs = {
  configuredStartDate: string;
  durationInput: string;
  draftRegimens: Regimen[];
  doseBlocks: CalendarDoseBlock[];
  mode: 'accumulate' | 'compare';
  modelMode: 'one-compartment' | 'two-compartment';
  bodySizeProfile: {
    measurementSystem: 'us' | 'metric'; startingWeight: string;
    sex: '' | 'female' | 'male'; heightPrimary: string; heightSecondary: string;
  };
  calculatorInputs: CalculatorInputs;
};

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const savedInputsKey = (variant: PlotterVariant) => `glp1concentration:inputs:v1:${variant}`;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const shortString = (value: unknown): value is string => typeof value === 'string' && value.length <= 64;
const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number) => finite(value, min, max) && Number.isInteger(value);
const date = (value: unknown) => value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= '0001-01-01' && value <= '9999-12-24' && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const compound = (value: unknown): value is CompoundId => typeof value === 'string' && Object.hasOwn(COMPOUNDS, value);
const uniqueIds = (values: { id: number }[]) => new Set(values.map((value) => value.id)).size === values.length;

/** Stored data is untrusted: bound sizes and validate before restoring controls. */
export function parseSavedInputs(raw: string, variant: PlotterVariant): SavedInputs | null {
  if (raw.length > 100_000) return null;
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!record(envelope) || envelope.version !== 1 || !record(envelope.inputs)) return null;
    const inputs = envelope.inputs;
    if (!date(inputs.configuredStartDate) || !(inputs.durationInput === '' ||
      (typeof inputs.durationInput === 'string' && /^\d{1,3}$/.test(inputs.durationInput) && integer(Number(inputs.durationInput), 1, 520))) ||
      !['accumulate', 'compare'].includes(String(inputs.mode)) || !['one-compartment', 'two-compartment'].includes(String(inputs.modelMode))) return null;
    const body = inputs.bodySizeProfile;
    if (!record(body) || !['us', 'metric'].includes(String(body.measurementSystem)) || !['', 'female', 'male'].includes(String(body.sex)) ||
      ![body.startingWeight, body.heightPrimary, body.heightSecondary].every(shortString)) return null;
    const regimens = inputs.draftRegimens;
    if (!Array.isArray(regimens) || regimens.length < 1 || regimens.length > 5 || !regimens.every((r) => record(r) &&
      integer(r.id, 1, Number.MAX_SAFE_INTEGER - 100) && compound(r.compound) &&
      (variant === 'compounded' || r.compound !== 'retatrutide') &&
      (variant === 'branded' ? COMPOUNDS[r.compound].doses.includes(r.doseMg as number) : finite(r.doseMg, 0.001, 100)) &&
      integer(r.startWeek, 1, 520) && integer(r.endWeek, r.startWeek as number, 520) &&
      ['morning', 'afternoon', 'night'].includes(String(r.timeOfDay)) && typeof r.useCustomDoseInterval === 'boolean' &&
      (variant === 'compounded' || !r.useCustomDoseInterval) && integer(r.doseIntervalDays, 1, 365) && !('explicitDoseHours' in r)) || !uniqueIds(regimens)) return null;
    const blocks = inputs.doseBlocks;
    if (!Array.isArray(blocks) || blocks.length < 1 || blocks.length > 100 || !blocks.every((b) => record(b) &&
      integer(b.id, 1, Number.MAX_SAFE_INTEGER - 100) && compound(b.compound) && b.compound !== 'retatrutide' &&
      COMPOUNDS[b.compound].doses.includes(b.doseMg as number) && ['morning', 'afternoon', 'night'].includes(String(b.timeOfDay)) &&
      Array.isArray(b.dates) && b.dates.length >= 1 && b.dates.length <= 100 && b.dates.every(date)) ||
      blocks.reduce((count, block) => count + block.dates.length, 0) > 100 || !uniqueIds(blocks)) return null;
    const calculator = inputs.calculatorInputs;
    if (!record(calculator) || !shortString(calculator.reference) || !shortString(calculator.ceilingOffset) ||
      !(calculator.doseOverride === null || (record(calculator.doseOverride) && compound(calculator.doseOverride.compound) &&
        calculator.doseOverride.compound !== 'retatrutide' && COMPOUNDS[calculator.doseOverride.compound].doses.includes(calculator.doseOverride.doseMg as number)))) return null;
    return inputs as SavedInputs;
  } catch {
    return null;
  }
}

export function readSavedInputs(storage: BrowserStorage, variant: PlotterVariant) {
  const raw = storage.getItem(savedInputsKey(variant));
  const inputs = raw === null ? null : parseSavedInputs(raw, variant);
  return { inputs, invalid: raw !== null && inputs === null };
}

export function writeSavedInputs(storage: BrowserStorage, variant: PlotterVariant, inputs: SavedInputs) {
  storage.setItem(savedInputsKey(variant), JSON.stringify({ version: 1, inputs }));
}

export function clearSavedInputs(storage: BrowserStorage, variant: PlotterVariant) {
  storage.removeItem(savedInputsKey(variant));
}
