import { calendarBlockSchedule, COMPOUNDS, type CalendarDoseBlock } from './pk.ts';

export const PROFILE_STORAGE_KEY = 'glp1concentration:profile:v1:local';
export const PROFILE_FORMAT = 'glp1concentration-profile';
export const PROFILE_MAX_BYTES = 100_000;
export type InjectionProfile = { blocks: CalendarDoseBlock[]; updatedAt: string };
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Return only known fields, never arbitrary properties from imported files. */
export function profileBlocks(value: unknown, allowDrafts = false): CalendarDoseBlock[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Use up to 100 dose blocks and injection dates.');
  let count = 0;
  const blocks = value.map((entry, index): CalendarDoseBlock => {
    if (!record(entry) || !['semaglutide', 'tirzepatide'].includes(String(entry.compound)) ||
      typeof entry.doseMg !== 'number' || !['morning', 'afternoon', 'night'].includes(String(entry.timeOfDay)) ||
      !Array.isArray(entry.dates) || !entry.dates.length || entry.dates.length > 100) throw new Error(`Dose block ${index + 1} is invalid.`);
    const compound = entry.compound as CalendarDoseBlock['compound'];
    if (!COMPOUNDS[compound].doses.includes(entry.doseMg)) throw new Error(`Choose a supported dose in block ${index + 1}.`);
    const dates = entry.dates.map((date) => {
      if (date === '' && allowDrafts) return '';
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01' || date > '9999-12-24' ||
        !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
        throw new Error(`Enter a valid date in block ${index + 1}.`);
      }
      return date;
    });
    count += dates.length;
    return { id: index + 1, compound, doseMg: entry.doseMg, timeOfDay: entry.timeOfDay as CalendarDoseBlock['timeOfDay'], dates };
  });
  if (count > 100) throw new Error('Use up to 100 injection dates in total.');
  if (!allowDrafts && blocks.length) {
    const schedule = calendarBlockSchedule(blocks);
    if (schedule.error) throw new Error(schedule.error);
  }
  return blocks;
}

export function parseProfile(raw: string, allowDrafts = false): InjectionProfile {
  if (raw.length > PROFILE_MAX_BYTES) throw new Error('Profile files must be smaller than 100 KB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Choose a JSON profile exported from this site.'); }
  if (!record(value) || value.format !== PROFILE_FORMAT || value.version !== 1) throw new Error('This file is not a supported GLP-1 Concentration Plotter profile.');
  const blocks = profileBlocks(value.blocks, allowDrafts);
  const updatedAt = typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : '';
  return { blocks, updatedAt };
}

export function serializeProfile(profile: InjectionProfile, allowDrafts = false) {
  return JSON.stringify({ format: PROFILE_FORMAT, version: 1, updatedAt: profile.updatedAt,
    blocks: profileBlocks(profile.blocks, allowDrafts) }, null, 2);
}

export function readLocalProfile(storage: StorageLike): InjectionProfile | null {
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  return raw ? parseProfile(raw, true) : null;
}

export function writeLocalProfile(storage: StorageLike, profile: InjectionProfile) {
  storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile, true));
}

export function profileSummary(blocks: CalendarDoseBlock[]) {
  const dates = blocks.flatMap((block) => block.dates).filter(Boolean).sort();
  return { count: dates.length, blockCount: blocks.length, firstDate: dates[0] ?? '', lastDate: dates.at(-1) ?? '' };
}
