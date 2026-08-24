'use client';

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPOUNDS,
  CompoundId,
  formatConcentration,
  niceScale,
  Regimen,
  sampleRegimen,
  trapezoidAuc,
} from './pk';

type PlotMode = 'accumulate' | 'compare';

type ChartSeries = {
  id: string;
  label: string;
  detail: string;
  color: string;
  fill: string;
  values: number[];
};

const STEP_HOURS = 6;
const SERIES_COLORS = ['#174c38', '#a6cf27', '#a85e35', '#4d6da8', '#7f5b91'];

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function defaultRegimens(): Regimen[] {
  return [{ id: 1, compound: 'semaglutide', doseMg: 0.25, startWeek: 1, endWeek: 4 }];
}

function dateAtHour(startDate: string, hour: number) {
  const date = startDate ? new Date(`${startDate}T12:00:00`) : new Date();
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

function rgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function ConcentrationChart({
  regimens,
  mode,
  totalWeeks,
  startDate,
}: {
  regimens: Regimen[];
  mode: PlotMode;
  totalWeeks: number;
  startDate: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 760, height: 420 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const individualSeries = useMemo<ChartSeries[]>(
    () =>
      regimens.map((regimen, index) => {
        const profile = COMPOUNDS[regimen.compound];
        const color = SERIES_COLORS[index % SERIES_COLORS.length];
        return {
          id: String(regimen.id),
          label: profile.name,
          detail: `${regimen.doseMg} mg · weeks ${regimen.startWeek}–${regimen.endWeek}`,
          color,
          fill: rgba(color, 0.15),
          values: sampleRegimen(regimen, totalWeeks, STEP_HOURS),
        };
      }),
    [regimens, totalWeeks],
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
      fill: 'rgba(64, 128, 86, 0.2)',
      values: total,
    }];
  }, [individualSeries, mode]);

  const maxValue = useMemo(
    () => Math.max(0, ...displaySeries.flatMap((series) => series.values)),
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
  const tooltipLeft = hoverIndex === null ? 0 : 62 + (hoverIndex / Math.max(1, pointCount - 1)) * (size.width - 78);
  const tooltipOnRight = tooltipLeft > size.width * 0.66;

  return (
    <div className="chart-wrap">
      <div
        className="chart-frame"
        ref={frameRef}
        style={{ height: `${chartHeight}px` }}
      >
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
              setHoverIndex((current) => Math.min(pointCount - 1, (current ?? 0) + 4));
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setHoverIndex((current) => Math.max(0, (current ?? pointCount - 1) - 4));
            }
          }}
        />
        {hoverIndex !== null && (
          <div
            className={`chart-tooltip ${tooltipOnRight ? 'tooltip-left' : ''}`}
            style={{ left: `${tooltipLeft}px` }}
            role="status"
          >
            <strong>{longDate(dateAtHour(startDate, hoverHour))}</strong>
            <small>Week {(hoverHour / 168 + 1).toFixed(1)}</small>
            {displaySeries.map((series) => (
              <div className="tooltip-row" key={series.id}>
                <span style={{ background: series.color }} />
                <p><b>{formatConcentration(series.values[hoverIndex] ?? 0)} ng/mL</b>{series.label}</p>
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
  onChange,
  onRemove,
}: {
  regimen: Regimen;
  index: number;
  totalWeeks: number;
  removable: boolean;
  onChange: (next: Regimen) => void;
  onRemove: () => void;
}) {
  const profile = COMPOUNDS[regimen.compound];
  const update = (partial: Partial<Regimen>) => onChange({ ...regimen, ...partial });

  return (
    <fieldset className="dose-card">
      <legend className="sr-only">Compound {index + 1}</legend>
      <div className="dose-card-head">
        <span className="dose-number">{index + 1}</span>
        <div><strong>{profile.name}</strong><small>{profile.brands}</small></div>
        {removable && <button className="remove-button" type="button" onClick={onRemove} aria-label={`Remove ${profile.name}`}>×</button>}
      </div>
      <label>
        Peptide
        <select
          value={regimen.compound}
          onChange={(event) => {
            const compound = event.target.value as CompoundId;
            update({ compound, doseMg: COMPOUNDS[compound].doses[0] });
          }}
        >
          <option value="semaglutide">Semaglutide · Ozempic / Wegovy</option>
          <option value="tirzepatide">Tirzepatide · Mounjaro / Zepbound</option>
        </select>
      </label>
      <div className="compound-grid">
        <label>
          Weekly dose
          <select value={regimen.doseMg} onChange={(event) => update({ doseMg: Number(event.target.value) })}>
            {profile.doses.map((dose) => <option key={dose} value={dose}>{dose} mg</option>)}
          </select>
        </label>
        <label>
          From week
          <input
            type="number"
            min="1"
            max={totalWeeks}
            value={regimen.startWeek}
            onChange={(event) => {
              const startWeek = Math.max(1, Math.min(totalWeeks, Number(event.target.value)));
              update({ startWeek, endWeek: Math.max(startWeek, regimen.endWeek) });
            }}
          />
        </label>
        <label>
          To week
          <input
            type="number"
            min={regimen.startWeek}
            max={totalWeeks}
            value={regimen.endWeek}
            onChange={(event) => update({ endWeek: Math.max(regimen.startWeek, Math.min(totalWeeks, Number(event.target.value))) })}
          />
        </label>
      </div>
      <p className="pk-inline"><span /> {profile.halfLifeDays}-day half-life · weekly injection model</p>
    </fieldset>
  );
}

export default function Home() {
  const [startDate, setStartDate] = useState(todayInputValue);
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [draftRegimens, setDraftRegimens] = useState<Regimen[]>(defaultRegimens);
  const [plottedRegimens, setPlottedRegimens] = useState<Regimen[]>(defaultRegimens);
  const [mode, setMode] = useState<PlotMode>('accumulate');
  const [plotPulse, setPlotPulse] = useState(false);

  const samples = useMemo(
    () => plottedRegimens.map((regimen) => sampleRegimen(regimen, totalWeeks, STEP_HOURS)),
    [plottedRegimens, totalWeeks],
  );
  const combined = useMemo(
    () => samples[0]?.map((_, index) => samples.reduce((sum, values) => sum + values[index], 0)) ?? [0],
    [samples],
  );
  const summaryValues = mode === 'accumulate' ? combined : samples.flat();
  const peak = Math.max(0, ...summaryValues);
  const mainSeries = mode === 'accumulate' ? combined : samples.reduce((best, values) => Math.max(...values) > Math.max(...best) ? values : best, samples[0] ?? [0]);
  const peakIndex = mainSeries.indexOf(Math.max(...mainSeries));
  const endValue = mode === 'accumulate' ? combined.at(-1) ?? 0 : samples.reduce((sum, values) => sum + (values.at(-1) ?? 0), 0);
  const auc = mode === 'accumulate' ? trapezoidAuc(combined, STEP_HOURS) : samples.reduce((sum, values) => sum + trapezoidAuc(values, STEP_HOURS), 0);

  function updateRegimen(index: number, next: Regimen) {
    setDraftRegimens((current) => current.map((regimen, regimenIndex) => regimenIndex === index ? next : regimen));
  }

  function plot() {
    setPlottedRegimens(draftRegimens.map((regimen) => ({ ...regimen })));
    setPlotPulse(true);
    window.setTimeout(() => setPlotPulse(false), 520);
  }

  function reset() {
    const defaults = defaultRegimens();
    setStartDate(todayInputValue());
    setTotalWeeks(16);
    setDraftRegimens(defaults);
    setPlottedRegimens(defaults);
    setMode('accumulate');
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Half Life home"><span className="brand-mark" aria-hidden="true">H</span><span>HALF LIFE</span></a>
        <a className="science-chip" href="#method">Science-backed PK model <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">GLP-1 concentration plotter</p>
          <h1>See how each weekly dose<br />builds in your system.</h1>
          <p className="lede">Explore a research-based estimate for injected semaglutide and tirzepatide—week by week, dose by dose.</p>
        </div>
        <div className="hero-stat" aria-label="Drug half-life reference">
          <span>Reference half-lives</span>
          <strong>7d <i>SEMA</i></strong>
          <strong>5d <i>TIRZ</i></strong>
        </div>
      </section>

      <section className={`workspace ${plotPulse ? 'plot-pulse' : ''}`} aria-label="GLP-1 plot builder">
        <aside className="control-panel">
          <div className="panel-heading">
            <span>01</span>
            <div><p>Build your regimen</p><small>Add weekly doses across your timeline</small></div>
          </div>

          <div className="setup-grid">
            <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>Graph duration
              <select
                value={totalWeeks}
                onChange={(event) => {
                  const weeks = Number(event.target.value);
                  setTotalWeeks(weeks);
                  setDraftRegimens((current) => current.map((regimen) => ({ ...regimen, startWeek: Math.min(regimen.startWeek, weeks), endWeek: Math.min(regimen.endWeek, weeks) })));
                  setPlottedRegimens((current) => current.map((regimen) => ({ ...regimen, startWeek: Math.min(regimen.startWeek, weeks), endWeek: Math.min(regimen.endWeek, weeks) })));
                }}
              >
                {[4, 8, 12, 16, 24, 32, 52].map((weeks) => <option key={weeks} value={weeks}>{weeks} weeks</option>)}
              </select>
            </label>
          </div>

          <div className="mode-label"><span>Chart mode</span><small>{mode === 'accumulate' ? 'Sum active concentrations' : 'Keep each line separate'}</small></div>
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
                totalWeeks={totalWeeks}
                removable={draftRegimens.length > 1}
                onChange={(next) => updateRegimen(index, next)}
                onRemove={() => setDraftRegimens((current) => current.filter((item) => item.id !== regimen.id))}
              />
            ))}
          </div>

          <button
            className="add-button"
            type="button"
            disabled={draftRegimens.length >= 5}
            onClick={() => setDraftRegimens((current) => {
              const compound: CompoundId = current.at(-1)?.compound === 'semaglutide' ? 'tirzepatide' : 'semaglutide';
              const nextId = Math.max(0, ...current.map((item) => item.id)) + 1;
              return [...current, { id: nextId, compound, doseMg: COMPOUNDS[compound].doses[0], startWeek: 1, endWeek: Math.min(4, totalWeeks) }];
            })}
          ><span aria-hidden="true">+</span> Another compound</button>

          <div className="button-row">
            <button className="primary" type="button" onClick={plot}>Plot concentration <span aria-hidden="true">↗</span></button>
            <button className="reset-button" type="button" onClick={reset}>Reset</button>
          </div>
        </aside>

        <div className="chart-panel">
          <div className="chart-head">
            <div><p>Estimated concentration</p><h2>Plasma level over time</h2></div>
            <span className="unit-chip">ng / mL</span>
          </div>
          <ConcentrationChart regimens={plottedRegimens} mode={mode} totalWeeks={totalWeeks} startDate={startDate} />
          <p className="chart-note"><span /> Hover or tap the curve for an estimate at that point in time.</p>
          {mode === 'accumulate' && plottedRegimens.length > 1 && <p className="sum-note">The combined line sums medication mass concentrations for visual context only; it does not imply dose or effect equivalence.</p>}

          <div className="metric-grid">
            <div><span>Modeled peak</span><strong>{formatConcentration(peak)} <small>ng/mL</small></strong><p>{longDate(dateAtHour(startDate, peakIndex * STEP_HOURS))}</p></div>
            <div><span>Timeline AUC</span><strong>{Math.round(auc).toLocaleString()} <small>ng·h/mL</small></strong><p>Area under the displayed curve</p></div>
            <div><span>At graph end</span><strong>{formatConcentration(endValue)} <small>ng/mL</small></strong><p>After {totalWeeks} plotted weeks</p></div>
          </div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-intro">
          <p className="eyebrow">Under the curve</p>
          <h2>A useful estimate.<br />Not a blood test.</h2>
          <p>This tool uses a one-compartment, first-order absorption and elimination model. Each weekly injection is added to what remains from prior doses, which is why the curve builds toward steady state.</p>
        </div>
        <div className="method-cards">
          <article><span>SEMA</span><h3>Semaglutide</h3><strong>~7 day half-life</strong><p>Model inputs: k<sub>a</sub> 0.0286 h⁻¹ and apparent V/F 12.2 L. FDA labeling reports peak concentration 1–3 days after injection and steady state after 4–5 weeks.</p></article>
          <article><span>TIRZ</span><h3>Tirzepatide</h3><strong>~5 day half-life</strong><p>Model inputs: k<sub>a</sub> 0.0373 h⁻¹ and apparent V/F 10.3 L. FDA labeling reports peak concentration 8–72 hours after injection and steady state after 4 weeks.</p></article>
        </div>
      </section>

      <section className="caveat-section">
        <div><span className="caveat-icon" aria-hidden="true">i</span><h2>Know the limits</h2></div>
        <div>
          <p>Actual exposure varies with body size, injection timing and site, formulation, individual pharmacokinetics, adherence, and other factors. This visualization is educational and must not be used to choose, change, combine, or stop a medication. Ask a licensed clinician or pharmacist for personal guidance.</p>
          <p><strong>Rybelsus note:</strong> Rybelsus is daily oral semaglutide with different doses and highly variable absorption, so it is not represented by this once-weekly injection model.</p>
        </div>
      </section>

      <section className="sources-section" aria-labelledby="sources-title">
        <div><p className="eyebrow">Evidence base</p><h2 id="sources-title">Sources</h2></div>
        <ol>
          <li><a href="https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=979e4df4-0597-48ea-b51c-0f699fa6d166" target="_blank" rel="noreferrer"><span>01</span><p><strong>Ozempic prescribing information</strong><small>FDA / DailyMed · Pharmacokinetics §12.3</small></p><b aria-hidden="true">↗</b></a></li>
          <li><a href="https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=78aad975-4971-49fa-b4b0-6aa39f76d2e7" target="_blank" rel="noreferrer"><span>02</span><p><strong>Mounjaro prescribing information</strong><small>FDA / DailyMed · Pharmacokinetics §12.3</small></p><b aria-hidden="true">↗</b></a></li>
          <li><a href="https://doi.org/10.1007/s13300-018-0458-5" target="_blank" rel="noreferrer"><span>03</span><p><strong>Semaglutide population PK analysis</strong><small>Petri et al. · Diabetes Therapy · 2018</small></p><b aria-hidden="true">↗</b></a></li>
          <li><a href="https://doi.org/10.1002/psp4.13099" target="_blank" rel="noreferrer"><span>04</span><p><strong>Tirzepatide population PK analysis</strong><small>Schneck et al. · CPT: PSP · 2024</small></p><b aria-hidden="true">↗</b></a></li>
        </ol>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">H</span><span>HALF LIFE</span></a><p>Educational visualization. Not medical advice.</p><small>Made by Devin Kancherla</small></footer>
    </main>
  );
}
