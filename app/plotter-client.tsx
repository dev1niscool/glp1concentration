'use client';

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPOUNDS,
  CompoundId,
  DOSE_TIME_LABELS,
  DOSE_TIME_OFFSETS,
  DoseTime,
  formatConcentration,
  niceScale,
  Regimen,
  sampleRegimen,
  HOURS_PER_WEEK,
  PkModelMode,
  PkModelOptions,
  PkModelSex,
  trapezoidAuc,
} from './pk';
import { SiteFooter, SiteHeader } from './site-chrome';

type PlotMode = 'accumulate' | 'compare';
type PlotterVariant = 'branded' | 'compounded';
type MeasurementSystem = 'us' | 'metric';

type BodySizeProfileForm = {
  measurementSystem: MeasurementSystem;
  startingWeight: string;
  sex: '' | PkModelSex;
  heightPrimary: string;
  heightSecondary: string;
};

type ChartSeries = {
  id: string;
  label: string;
  detail: string;
  color: string;
  values: number[];
};

const STEP_HOURS = 6;
const SERIES_COLORS = ['#174c38', '#a6cf27', '#a85e35', '#4d6da8', '#7f5b91'];
const BRANDED_COMPOUNDS: CompoundId[] = ['semaglutide', 'tirzepatide'];
const COMPOUNDED_COMPOUNDS: CompoundId[] = ['semaglutide', 'tirzepatide', 'retatrutide'];

const DEFAULT_BODY_SIZE_PROFILE: BodySizeProfileForm = {
  measurementSystem: 'us',
  startingWeight: '',
  sex: '',
  heightPrimary: '',
  heightSecondary: '',
};

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function modelFromBodySizeForm(
  form: BodySizeProfileForm,
  firstDoseHour: number,
): PkModelOptions | null {
  const startingInput = parsePositiveNumber(form.startingWeight);
  const heightPrimary = parsePositiveNumber(form.heightPrimary);
  const heightSecondary = form.measurementSystem === 'us'
    ? Number(form.heightSecondary || 0)
    : 0;
  if (
    startingInput === null ||
    heightPrimary === null ||
    form.sex === '' ||
    !Number.isFinite(heightSecondary) ||
    heightSecondary < 0 ||
    heightSecondary >= 12
  ) return null;

  const startingWeightKg = form.measurementSystem === 'us'
    ? startingInput * 0.45359237
    : startingInput;
  const heightCm = form.measurementSystem === 'us'
    ? (heightPrimary * 12 + heightSecondary) * 2.54
    : heightPrimary;
  if (
    startingWeightKg < 30 || startingWeightKg > 350 ||
    heightCm < 120 || heightCm > 230
  ) return null;

  return {
    kind: 'personalized-two-compartment',
    startingWeightKg,
    heightCm,
    sex: form.sex,
    firstDoseHour,
  };
}

function modelDetail(compound: CompoundId, model: PkModelOptions) {
  if (compound === 'retatrutide') return 'one-compartment surrogate';
  if (model.kind === 'one-compartment') return 'one-compartment estimate';
  return 'body-size-adjusted two-compartment estimate';
}

function defaultRegimens(variant: PlotterVariant): Regimen[] {
  return [{
    id: 1,
    compound: 'semaglutide',
    doseMg: variant === 'branded' ? 0.25 : 1,
    startWeek: 1,
    endWeek: 4,
    timeOfDay: 'morning',
    useCustomDoseInterval: false,
    doseIntervalDays: 7,
  }];
}

function dateAtHour(startDate: string, hour: number) {
  const date = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  date.setHours(date.getHours() + hour);
  return date;
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function longDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function timeCategory(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  return 'Night';
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function maxOf(values: number[]) {
  return values.reduce((maximum, value) => Math.max(maximum, value), 0);
}

function BodySizeProfilePanel({
  form,
  valid,
  onChange,
}: {
  form: BodySizeProfileForm;
  valid: boolean;
  onChange: (next: BodySizeProfileForm) => void;
}) {
  const update = (partial: Partial<BodySizeProfileForm>) => onChange({ ...form, ...partial });
  const isUs = form.measurementSystem === 'us';
  return (
    <section className="body-size-profile" aria-labelledby="body-size-profile-title">
      <div className="body-size-profile-head">
        <span>PK</span>
        <div>
          <strong id="body-size-profile-title">Two-compartment body-size inputs</strong>
          <small>Required only while the two-compartment model is selected.</small>
        </div>
      </div>

      <div className="profile-unit-switch" role="group" aria-label="Measurement system">
        <button type="button" className={isUs ? 'active' : ''} onClick={() => !isUs && update({ measurementSystem: 'us', startingWeight: '', heightPrimary: '', heightSecondary: '' })}>lb · ft/in</button>
        <button type="button" className={!isUs ? 'active' : ''} onClick={() => isUs && update({ measurementSystem: 'metric', startingWeight: '', heightPrimary: '', heightSecondary: '' })}>kg · cm</button>
      </div>

      <fieldset>
        <legend className="sr-only">Two-compartment patient model inputs</legend>
        <div className="profile-grid">
          <label>Weight at first dose
            <span className="input-with-suffix">
              <input type="number" min={isUs ? 66 : 30} max={isUs ? 772 : 350} step="0.1" inputMode="decimal" placeholder={isUs ? 'e.g. 220' : 'e.g. 100'} value={form.startingWeight} onChange={(event) => update({ startingWeight: event.target.value })} />
              <small>{isUs ? 'lb' : 'kg'}</small>
            </span>
          </label>
          <label>Sex used in PK equation
            <select value={form.sex} onChange={(event) => update({ sex: event.target.value as '' | PkModelSex })}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          {isUs ? (
            <div className="height-field">
              <label>Height
                <span className="height-inputs">
                  <span className="input-with-suffix"><input type="number" min="3" max="7" step="1" inputMode="numeric" placeholder="ft" aria-label="Height in feet" value={form.heightPrimary} onChange={(event) => update({ heightPrimary: event.target.value })} /><small>ft</small></span>
                  <span className="input-with-suffix"><input type="number" min="0" max="11" step="0.1" inputMode="decimal" placeholder="in" aria-label="Additional height in inches" value={form.heightSecondary} onChange={(event) => update({ heightSecondary: event.target.value })} /><small>in</small></span>
                </span>
              </label>
            </div>
          ) : (
            <label>Height
              <span className="input-with-suffix">
                <input type="number" min="120" max="230" step="0.1" inputMode="decimal" placeholder="e.g. 175" value={form.heightPrimary} onChange={(event) => update({ heightPrimary: event.target.value })} />
                <small>cm</small>
              </span>
            </label>
          )}
        </div>
        <p className="profile-assumption"><strong>Weight assumption:</strong> the model subtracts 1 lb per week after the first dose. It never models weight below 30 kg (66 lb).</p>
        <p className="profile-privacy">These values are used only in your browser for this graph and are not saved or uploaded. Semaglutide uses the published weight covariate; sex and height additionally inform tirzepatide’s body-composition equation.</p>
      </fieldset>
      {!valid && <p className="profile-required" role="status">Complete weight at first dose, sex, and height before plotting the two-compartment model.</p>}
    </section>
  );
}

function EstimateChart({
  regimens,
  mode,
  totalWeeks,
  startDate,
  pkModel,
}: {
  regimens: Regimen[];
  mode: PlotMode;
  totalWeeks: number;
  startDate: string;
  pkModel: PkModelOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 760, height: 420 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const unit = 'ng/mL';

  const individualSeries = useMemo<ChartSeries[]>(
    () => regimens.map((regimen, index) => {
      const profile = COMPOUNDS[regimen.compound];
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      return {
        id: String(regimen.id),
        label: profile.name,
        detail: `${regimen.doseMg} mg · weeks ${regimen.startWeek}–${regimen.endWeek} · ${DOSE_TIME_LABELS[regimen.timeOfDay]} · every ${regimen.useCustomDoseInterval ? regimen.doseIntervalDays : 7} days · ${modelDetail(regimen.compound, pkModel)}`,
        color,
        values: sampleRegimen(regimen, totalWeeks, STEP_HOURS, pkModel),
      };
    }),
    [pkModel, regimens, totalWeeks],
  );

  const displaySeries = useMemo<ChartSeries[]>(() => {
    if (mode === 'compare' || individualSeries.length === 1) return individualSeries;
    const total = individualSeries[0]?.values.map((_, index) =>
      individualSeries.reduce((sum, series) => sum + series.values[index], 0),
    ) ?? [0];
    return [{
      id: 'combined',
      label: 'Combined estimate',
      detail: `${individualSeries.length} active regimens`,
      color: '#174c38',
      values: total,
    }];
  }, [individualSeries, mode]);

  const maxValue = useMemo(
    () => displaySeries.reduce((maximum, series) => Math.max(maximum, maxOf(series.values)), 0),
    [displaySeries],
  );
  const yMax = niceScale(maxValue);
  const pointCount = displaySeries[0]?.values.length ?? 1;
  const chartHeight = Math.min(458, 380 + Math.log10(Math.max(1, yMax)) * 16);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setSize({ width: frame.clientWidth, height: frame.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [chartHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const compact = size.width < 560;
    const margin = { left: compact ? 48 : 62, right: 16, top: 24, bottom: 48 };
    const plotWidth = Math.max(1, size.width - margin.left - margin.right);
    const plotHeight = Math.max(1, size.height - margin.top - margin.bottom);
    const xAt = (index: number) => margin.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
    const yAt = (value: number) => margin.top + plotHeight - (value / yMax) * plotHeight;

    context.font = '11px Arial';
    context.textBaseline = 'middle';
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = (yMax / 4) * tick;
      const y = yAt(value);
      context.beginPath();
      context.strokeStyle = tick === 0 ? 'rgba(34,59,46,.24)' : 'rgba(34,59,46,.10)';
      context.lineWidth = 1;
      context.moveTo(margin.left, y);
      context.lineTo(size.width - margin.right, y);
      context.stroke();
      context.fillStyle = '#7a847d';
      context.textAlign = 'right';
      context.fillText(formatConcentration(value), margin.left - 10, y);
    }

    const xTickCount = compact ? 4 : 6;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (let tick = 0; tick <= xTickCount; tick += 1) {
      const fraction = tick / xTickCount;
      const x = margin.left + fraction * plotWidth;
      const hour = fraction * totalWeeks * 168;
      context.fillStyle = '#7a847d';
      context.fillText(shortDate(dateAtHour(startDate, hour)), x, size.height - margin.bottom + 15);
    }

    displaySeries.forEach((series) => {
      const gradient = context.createLinearGradient(0, margin.top, 0, margin.top + plotHeight);
      gradient.addColorStop(0, rgba(series.color, 0.23));
      gradient.addColorStop(1, rgba(series.color, 0.025));
      context.beginPath();
      context.moveTo(xAt(0), yAt(series.values[0]));
      series.values.forEach((value, index) => context.lineTo(xAt(index), yAt(value)));
      context.lineTo(xAt(series.values.length - 1), yAt(0));
      context.lineTo(xAt(0), yAt(0));
      context.closePath();
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      context.moveTo(xAt(0), yAt(series.values[0]));
      series.values.forEach((value, index) => context.lineTo(xAt(index), yAt(value)));
      context.strokeStyle = series.color;
      context.lineWidth = 2.5;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
    });

    if (hoverIndex !== null) {
      const x = xAt(hoverIndex);
      context.beginPath();
      context.setLineDash([4, 5]);
      context.strokeStyle = 'rgba(20,34,28,.45)';
      context.moveTo(x, margin.top);
      context.lineTo(x, margin.top + plotHeight);
      context.stroke();
      context.setLineDash([]);
      displaySeries.forEach((series) => {
        const y = yAt(series.values[hoverIndex] ?? 0);
        context.beginPath();
        context.arc(x, y, 4.5, 0, Math.PI * 2);
        context.fillStyle = '#fbfcf8';
        context.fill();
        context.strokeStyle = series.color;
        context.lineWidth = 2.5;
        context.stroke();
      });
    }
  }, [displaySeries, hoverIndex, pointCount, size, startDate, totalWeeks, yMax]);

  function setHoverFromPointer(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = bounds.width < 560 ? 48 : 62;
    const right = 16;
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left - left) / (bounds.width - left - right)));
    setHoverIndex(Math.round(ratio * Math.max(1, pointCount - 1)));
  }

  const hoverHour = (hoverIndex ?? 0) * STEP_HOURS;
  const hoverDate = dateAtHour(startDate, hoverHour);
  const tooltipLeft = hoverIndex === null ? 0 : 62 + (hoverIndex / Math.max(1, pointCount - 1)) * (size.width - 78);
  const tooltipOnRight = tooltipLeft > size.width * 0.66;

  return (
    <div className="chart-wrap">
      <div className="chart-frame" ref={frameRef} style={{ height: `${chartHeight}px` }}>
        <canvas
          ref={canvasRef}
          className="plot-canvas"
          aria-label={`Estimated plasma concentration chart from ${shortDate(dateAtHour(startDate, 0))} for ${totalWeeks} weeks. Use left and right arrow keys to inspect values.`}
          tabIndex={0}
          onPointerMove={setHoverFromPointer}
          onPointerDown={setHoverFromPointer}
          onPointerLeave={() => setHoverIndex(null)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              setHoverIndex((current) => Math.min(pointCount - 1, (current ?? 0) + 1));
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setHoverIndex((current) => Math.max(0, (current ?? pointCount - 1) - 1));
            }
          }}
        />
        {hoverIndex !== null && (
          <div className={`chart-tooltip ${tooltipOnRight ? 'tooltip-left' : ''}`} style={{ left: `${tooltipLeft}px` }} role="status">
            <strong>{longDate(hoverDate)}</strong>
            <small>{timeCategory(hoverDate)} · week {(hoverHour / 168 + 1).toFixed(1)}</small>
            {displaySeries.map((series) => (
              <div className="tooltip-row" key={series.id}>
                <span style={{ background: series.color }} />
                <p><b>{formatConcentration(series.values[hoverIndex] ?? 0)} {unit}</b>{series.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="legend" aria-label="Chart legend">
        {displaySeries.map((series) => (
          <div key={series.id}><span style={{ background: series.color }} /><p><strong>{series.label}</strong><small>{series.detail}</small></p></div>
        ))}
      </div>
    </div>
  );
}

function CompoundCard({
  regimen,
  index,
  totalWeeks,
  removable,
  variant,
  modelMode,
  onChange,
  onRemove,
}: {
  regimen: Regimen;
  index: number;
  totalWeeks: number;
  removable: boolean;
  variant: PlotterVariant;
  modelMode: PkModelMode;
  onChange: (next: Regimen) => void;
  onRemove: () => void;
}) {
  const profile = COMPOUNDS[regimen.compound];
  const available = variant === 'branded' ? BRANDED_COMPOUNDS : COMPOUNDED_COMPOUNDS;
  const update = (partial: Partial<Regimen>) => onChange({ ...regimen, ...partial });
  const displayName = variant === 'compounded' && regimen.compound !== 'retatrutide'
    ? `Compounded ${profile.name}`
    : profile.name;
  const [doseMgDraft, setDoseMgDraft] = useState<string | null>(null);
  const [startWeekDraft, setStartWeekDraft] = useState<string | null>(null);
  const [endWeekDraft, setEndWeekDraft] = useState<string | null>(null);
  const [intervalDaysDraft, setIntervalDaysDraft] = useState<string | null>(null);

  function applyDoseMg(rawValue: string) {
    const parsedDose = Number(rawValue);
    if (!Number.isFinite(parsedDose)) return;
    update({ doseMg: Math.max(0.001, Math.min(100, parsedDose)) });
  }

  function applyStartWeek(rawValue: string) {
    const startWeek = Math.max(1, Math.min(totalWeeks, Math.round(Number(rawValue)) || 1));
    update({ startWeek, endWeek: Math.max(startWeek, regimen.endWeek) });
  }

  function applyEndWeek(rawValue: string) {
    const endWeek = Math.max(
      regimen.startWeek,
      Math.min(totalWeeks, Math.round(Number(rawValue)) || regimen.startWeek),
    );
    update({ endWeek });
  }

  function applyIntervalDays(rawValue: string) {
    const doseIntervalDays = Math.max(1, Math.min(365, Math.round(Number(rawValue)) || 7));
    update({ doseIntervalDays });
  }

  return (
    <fieldset className="dose-card">
      <legend className="sr-only">Compound {index + 1}</legend>
      <div className="dose-card-head">
        <span className="dose-number">{index + 1}</span>
        <div><strong>{displayName}</strong><small>{profile.brands}</small></div>
        {removable && <button className="remove-button" type="button" onClick={onRemove} aria-label={`Remove ${displayName}`}>×</button>}
      </div>
      <label>
        Peptide
        <select
          value={regimen.compound}
          onChange={(event) => {
            const compound = event.target.value as CompoundId;
            update({
              compound,
              doseMg: variant === 'branded' ? COMPOUNDS[compound].doses[0] : regimen.doseMg,
            });
          }}
        >
          {available.map((compound) => {
            const item = COMPOUNDS[compound];
            const label = variant === 'branded'
              ? `${item.name} · ${item.brands}`
              : compound === 'retatrutide'
                ? 'Retatrutide · investigational'
                : `Compounded ${item.name}`;
            return <option key={compound} value={compound}>{label}</option>;
          })}
        </select>
      </label>
      <div className="compound-grid">
        <div className="dose-field">
          <label>
            {variant === 'compounded'
              ? regimen.useCustomDoseInterval ? 'Dose per injection (mg)' : 'Weekly dose (mg)'
              : 'Weekly dose'}
            {variant === 'branded' ? (
              <select value={regimen.doseMg} onChange={(event) => update({ doseMg: Number(event.target.value) })}>
                {profile.doses.map((dose) => <option key={dose} value={dose}>{dose} mg</option>)}
              </select>
            ) : (
              <span className="input-with-suffix">
                <input
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.001"
                  inputMode="decimal"
                  value={doseMgDraft ?? String(regimen.doseMg)}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    setDoseMgDraft(rawValue);
                    if (rawValue !== '') applyDoseMg(rawValue);
                  }}
                  onBlur={(event) => {
                    if (event.target.value !== '') applyDoseMg(event.target.value);
                    setDoseMgDraft(null);
                  }}
                  aria-label={regimen.useCustomDoseInterval ? 'Custom dose per injection in mg' : 'Custom weekly dose in mg'}
                />
                <small>mg</small>
              </span>
            )}
          </label>
          {variant === 'compounded' && (
            <details className="dose-help">
              <summary>Need to calculate your dose?</summary>
              <div>
                <p>Use this calculator to convert your vial concentration (mg/mL or mg/0.5 mL) and syringe units into an estimated dose per injection in milligrams.</p>
                <a href="https://www.fatscientist.com/reverse-dosage-calculator" target="_blank" rel="noreferrer">Open the reverse dosage calculator <span aria-hidden="true">↗</span></a>
              </div>
            </details>
          )}
        </div>
        <label>
          Dose time
          <select value={regimen.timeOfDay} onChange={(event) => update({ timeOfDay: event.target.value as DoseTime })}>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label>
          From week
          <input
            type="number"
            min="1"
            max={totalWeeks}
            value={startWeekDraft ?? String(regimen.startWeek)}
            onChange={(event) => {
              const rawValue = event.target.value;
              setStartWeekDraft(rawValue);
              if (rawValue !== '') applyStartWeek(rawValue);
            }}
            onBlur={(event) => {
              if (event.target.value !== '') applyStartWeek(event.target.value);
              setStartWeekDraft(null);
            }}
          />
        </label>
        <label>
          To week
          <input
            type="number"
            min={regimen.startWeek}
            max={totalWeeks}
            value={endWeekDraft ?? String(regimen.endWeek)}
            onChange={(event) => {
              const rawValue = event.target.value;
              setEndWeekDraft(rawValue);
              if (rawValue !== '') applyEndWeek(rawValue);
            }}
            onBlur={(event) => {
              if (event.target.value !== '') applyEndWeek(event.target.value);
              setEndWeekDraft(null);
            }}
          />
        </label>
      </div>
      {variant === 'compounded' && (
        <div className="custom-interval-control">
          <label className="custom-interval-toggle">
            <input
              type="checkbox"
              checked={regimen.useCustomDoseInterval}
              onChange={(event) => update({
                useCustomDoseInterval: event.target.checked,
                doseIntervalDays: regimen.doseIntervalDays || 7,
              })}
            />
            <span><strong>Use a custom injection interval</strong><small>Inject every X days instead of once every 7 days.</small></span>
          </label>
          {regimen.useCustomDoseInterval && (
            <label className="interval-days-field">Inject once every
              <span className="input-with-suffix">
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  inputMode="numeric"
                  value={intervalDaysDraft ?? String(regimen.doseIntervalDays)}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    setIntervalDaysDraft(rawValue);
                    if (rawValue !== '') applyIntervalDays(rawValue);
                  }}
                  onBlur={(event) => {
                    if (event.target.value !== '') applyIntervalDays(event.target.value);
                    setIntervalDaysDraft(null);
                  }}
                  aria-label="Days between injections"
                />
                <small>days</small>
              </span>
            </label>
          )}
        </div>
      )}
      <p className="pk-inline"><span /> {profile.halfLifeDays}-day half-life · {profile.id === 'retatrutide'
        ? 'one-compartment only'
        : modelMode === 'two-compartment'
          ? 'body-size-adjusted two-compartment model'
          : 'one-compartment model'}</p>
    </fieldset>
  );
}

export function PlotterClient({ variant }: { variant: PlotterVariant }) {
  const [startDate, setStartDate] = useState(todayInputValue);
  const [durationInput, setDurationInput] = useState('');
  const [draftRegimens, setDraftRegimens] = useState<Regimen[]>(() => defaultRegimens(variant));
  const [plottedRegimens, setPlottedRegimens] = useState<Regimen[]>(() => defaultRegimens(variant));
  const [mode, setMode] = useState<PlotMode>('accumulate');
  const [plotPulse, setPlotPulse] = useState(false);
  const [modelMode, setModelMode] = useState<PkModelMode>('one-compartment');
  const [bodySizeProfile, setBodySizeProfile] = useState<BodySizeProfileForm>(DEFAULT_BODY_SIZE_PROFILE);
  const [plottedPkModel, setPlottedPkModel] = useState<PkModelOptions>({ kind: 'one-compartment' });
  const totalWeeks = durationInput === '' ? null : Number(durationInput);
  const hasDraftRetatrutide = draftRegimens.some((regimen) => regimen.compound === 'retatrutide');
  const firstDraftTwoCompartmentDoseHourValue = draftRegimens
    .filter((regimen) => regimen.compound !== 'retatrutide')
    .reduce((earliest, regimen) => Math.min(
      earliest,
      (regimen.startWeek - 1) * HOURS_PER_WEEK + DOSE_TIME_OFFSETS[regimen.timeOfDay],
    ), Number.POSITIVE_INFINITY);
  const firstDraftTwoCompartmentDoseHour = Number.isFinite(firstDraftTwoCompartmentDoseHourValue)
    ? firstDraftTwoCompartmentDoseHourValue
    : 0;
  const draftPkModel = useMemo<PkModelOptions | null>(
    () => modelMode === 'one-compartment' || hasDraftRetatrutide
      ? { kind: 'one-compartment' }
      : modelFromBodySizeForm(bodySizeProfile, firstDraftTwoCompartmentDoseHour),
    [bodySizeProfile, firstDraftTwoCompartmentDoseHour, hasDraftRetatrutide, modelMode],
  );
  const bodySizeProfileValid = draftPkModel !== null;

  const samples = useMemo(
    () => totalWeeks === null
      ? []
      : plottedRegimens.map((regimen) => sampleRegimen(regimen, totalWeeks, STEP_HOURS, plottedPkModel)),
    [plottedPkModel, plottedRegimens, totalWeeks],
  );
  const combined = useMemo(
    () => samples[0]?.map((_, index) => samples.reduce((sum, values) => sum + values[index], 0)) ?? [0],
    [samples],
  );
  const summaryValues = mode === 'accumulate' ? combined : samples.flat();
  const peak = maxOf(summaryValues);
  const mainSeries = mode === 'accumulate'
    ? combined
    : samples.reduce((best, values) => maxOf(values) > maxOf(best) ? values : best, samples[0] ?? [0]);
  const peakIndex = Math.max(0, mainSeries.indexOf(maxOf(mainSeries)));
  const endValue = mode === 'accumulate'
    ? combined.at(-1) ?? 0
    : samples.reduce((sum, values) => sum + (values.at(-1) ?? 0), 0);
  const auc = mode === 'accumulate'
    ? trapezoidAuc(combined, STEP_HOURS)
    : samples.reduce((sum, values) => sum + trapezoidAuc(values, STEP_HOURS), 0);
  const unit = 'ng/mL';

  function updateRegimen(index: number, next: Regimen) {
    setDraftRegimens((current) => current.map((regimen, regimenIndex) => regimenIndex === index ? next : regimen));
    if (next.compound === 'retatrutide') setModelMode('one-compartment');
  }

  function updateDuration(rawValue: string) {
    if (rawValue === '') {
      setDurationInput('');
      return;
    }
    const rawWeeks = Number(rawValue);
    if (!Number.isFinite(rawWeeks)) return;
    const weeks = Math.max(1, Math.min(520, Math.round(rawWeeks)));
    const clamp = (regimen: Regimen) => {
      const startWeek = Math.min(regimen.startWeek, weeks);
      return { ...regimen, startWeek, endWeek: Math.max(startWeek, Math.min(regimen.endWeek, weeks)) };
    };
    setDurationInput(String(weeks));
    setDraftRegimens((current) => current.map(clamp));
    setPlottedRegimens((current) => current.map(clamp));
  }

  function updateStartDate(nextStartDate: string) {
    setStartDate(nextStartDate);
  }

  function plot() {
    if (totalWeeks === null || !startDate) return;
    if (draftPkModel === null) return;
    setPlottedRegimens(draftRegimens.map((regimen) => ({ ...regimen })));
    setPlottedPkModel(draftPkModel);
    setPlotPulse(true);
    window.setTimeout(() => setPlotPulse(false), 520);
  }

  function reset() {
    const defaults = defaultRegimens(variant);
    setStartDate(todayInputValue());
    setDurationInput('');
    setDraftRegimens(defaults);
    setPlottedRegimens(defaults);
    setMode('accumulate');
    setModelMode('one-compartment');
    setBodySizeProfile(DEFAULT_BODY_SIZE_PROFILE);
    setPlottedPkModel({ kind: 'one-compartment' });
  }

  return (
    <main className={`site-shell ${variant === 'compounded' ? 'compounded-page' : ''}`}>
      <SiteHeader active={variant === 'branded' ? 'plotter' : 'compounded'} />

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">{variant === 'branded' ? 'GLP-1 concentration plotter' : 'Compounded & investigational simulator'}</p>
          <h1>{variant === 'branded' ? <>See how each weekly dose<br />builds in your system.</> : <>Explore custom doses<br />without false precision.</>}</h1>
        </div>
        <div className="hero-stat" aria-label="Drug half-life reference">
          <span>Reference half-lives</span>
          <strong>7.37d <i>SEMA</i></strong>
          <strong>5.4d <i>TIRZ</i></strong>
          {variant === 'compounded' && <strong>~6d <i>RETA</i></strong>}
        </div>
      </section>

      {variant === 'compounded' && (
        <aside className="compounded-alert" role="note">
          <strong>Important status distinction</strong>
          <p>Compounded products are not FDA approved. Retatrutide is investigational, and FDA states it cannot be used in compounding under federal law. Its curve here is for pharmacokinetic education only.</p>
          <a href="https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss" target="_blank" rel="noreferrer">Read the FDA notice <span aria-hidden="true">↗</span></a>
        </aside>
      )}

      <section className={`workspace ${plotPulse ? 'plot-pulse' : ''}`} aria-label="GLP-1 plot builder">
        <aside className="control-panel">
          <div className="panel-heading">
            <span>01</span>
            <div><p>Build your regimen</p><small>{variant === 'compounded' ? 'Add doses across your timeline' : 'Add weekly doses across your timeline'}</small></div>
          </div>

          <div className="setup-grid">
            <label>Start date<input type="date" required value={startDate} onChange={(event) => updateStartDate(event.target.value)} /></label>
            <label>Graph duration
              <span className="input-with-suffix">
                <input
                  type="number"
                  min="1"
                  max="520"
                  step="1"
                  required
                  placeholder="Enter weeks"
                  aria-label="Graph duration in weeks"
                  value={durationInput}
                  onChange={(event) => updateDuration(event.target.value)}
                />
                <small>weeks</small>
              </span>
            </label>
          </div>

          <div className="model-choice" aria-labelledby="pk-model-label">
            <div className="mode-label"><span id="pk-model-label">PK model</span><small>{modelMode === 'one-compartment' ? 'Fewer inputs' : 'More distribution detail'}</small></div>
            <div className="mode-switch model-switch" role="group" aria-label="Pharmacokinetic model">
              <span className={modelMode === 'two-compartment' ? 'switch-right' : ''} aria-hidden="true" />
              <button type="button" className={modelMode === 'one-compartment' ? 'active' : ''} onClick={() => setModelMode('one-compartment')}>One compartment</button>
              <button type="button" className={modelMode === 'two-compartment' ? 'active' : ''} disabled={hasDraftRetatrutide} onClick={() => setModelMode('two-compartment')}>Two compartment</button>
            </div>
            <p className="model-summary">Two-compartment modeling more faithfully represents the early central-plasma peak and later redistribution seen in richly sampled pharmacokinetic data. It requires weight at first dose, sex, and height to apply the published body-size covariates.</p>
            {hasDraftRetatrutide && <p className="model-unavailable" role="status">Only the one-compartment model is available for retatrutide, so this chart has switched to one compartment.</p>}
          </div>

          {modelMode === 'two-compartment' && !hasDraftRetatrutide && (
            <BodySizeProfilePanel
              form={bodySizeProfile}
              valid={bodySizeProfileValid}
              onChange={setBodySizeProfile}
            />
          )}

          <div className="mode-label"><span>Chart mode</span><small>{mode === 'accumulate' ? 'Sum active estimates' : 'Keep each line separate'}</small></div>
          <div className="mode-switch" role="group" aria-label="Chart mode">
            <span className={mode === 'compare' ? 'switch-right' : ''} aria-hidden="true" />
            <button type="button" className={mode === 'accumulate' ? 'active' : ''} onClick={() => setMode('accumulate')}>Accumulate</button>
            <button type="button" className={mode === 'compare' ? 'active' : ''} onClick={() => setMode('compare')}>Compare</button>
          </div>

          <div className="regimen-stack">
            {draftRegimens.map((regimen, index) => (
              <CompoundCard
                key={regimen.id}
                regimen={regimen}
                index={index}
                totalWeeks={totalWeeks ?? 520}
                removable={draftRegimens.length > 1}
                variant={variant}
                modelMode={modelMode}
                onChange={(next) => updateRegimen(index, next)}
                onRemove={() => setDraftRegimens((current) => current.filter((item) => item.id !== regimen.id))}
              />
            ))}
          </div>

          <button
            className="add-button"
            type="button"
            disabled={totalWeeks === null || draftRegimens.length >= 5}
            onClick={() => setDraftRegimens((current) => {
              const available = variant === 'branded' ? BRANDED_COMPOUNDS : COMPOUNDED_COMPOUNDS;
              const previous = current.at(-1);
              const first = current[0];
              const compound = first?.compound ?? available[0];
              const weeks = totalWeeks ?? 1;
              const nextId = current.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
              const startWeek = Math.min(weeks, (previous?.endWeek ?? 0) + 1);
              return [...current, {
                id: nextId,
                compound,
                doseMg: variant === 'branded' ? COMPOUNDS[compound].doses[0] : first?.doseMg ?? 1,
                startWeek,
                endWeek: Math.min(weeks, startWeek + 3),
                timeOfDay: previous?.timeOfDay ?? 'morning',
                useCustomDoseInterval: variant === 'compounded' ? first?.useCustomDoseInterval ?? false : false,
                doseIntervalDays: variant === 'compounded' ? first?.doseIntervalDays ?? 7 : 7,
              }];
            })}
          ><span aria-hidden="true">+</span> Add next dose &amp; duration</button>

          <div className="button-row">
            <button className="primary" type="button" disabled={!startDate || totalWeeks === null || !bodySizeProfileValid} onClick={plot}>Plot concentration <span aria-hidden="true">↗</span></button>
            <button className="reset-button" type="button" onClick={reset}>Reset</button>
          </div>
        </aside>

        <div className="chart-panel">
          <div className="chart-head">
            <div><p>Estimated concentration</p><h2>Plasma level over time</h2></div>
            <span className="unit-chip">ng / mL</span>
          </div>
          {totalWeeks === null ? (
            <div className="chart-empty" role="status">
              <span aria-hidden="true">↗</span>
              <strong>Enter a graph duration to begin.</strong>
              <p>Choose any whole number of weeks, then plot your concentration estimate.</p>
            </div>
          ) : (
            <>
              <EstimateChart regimens={plottedRegimens} mode={mode} totalWeeks={totalWeeks} startDate={startDate} pkModel={plottedPkModel} />
              <p className="chart-note"><span /> Hover or tap the curve for an estimate and time-of-day category.</p>
              {mode === 'accumulate' && plottedRegimens.length > 1 && <p className="sum-note">The combined line sums modeled mass concentrations for visual context only; it does not imply dose, safety, or effect equivalence.</p>}

              <div className="metric-grid">
                <div><span>Modeled peak</span><strong>{formatConcentration(peak)} <small>{unit}</small></strong><p>{longDate(dateAtHour(startDate, peakIndex * STEP_HOURS))}</p></div>
                <div><span>Timeline AUC</span><strong>{Math.round(auc).toLocaleString()} <small>ng·h/mL</small></strong><p>Area under the displayed curve</p></div>
                <div><span>At graph end</span><strong>{formatConcentration(endValue)} <small>{unit}</small></strong><p>After {totalWeeks} plotted {totalWeeks === 1 ? 'week' : 'weeks'}</p></div>
              </div>
            </>
          )}
          {variant === 'compounded' && (
            <aside className="compounded-disclaimer" role="note">
              <strong>How to read this estimate</strong>
              <p>Compounded semaglutide and tirzepatide reuse the published brand-name pharmacokinetic parameters. A compounded formulation may differ in concentration, absorption, bioavailability, purity, and handling, so the real curve may not match this estimate. Retatrutide uses a transparent one-compartment surrogate fitted to published phase 1 human PK data; it is investigational and not an approved compounded drug.</p>
            </aside>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
