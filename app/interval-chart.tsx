'use client';

import { type PointerEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DOSE_TIME_LABELS, DOSE_TIME_OFFSETS, formatConcentration, INTERVAL_PREVIEW_WEEKS, IntervalPreview, niceScale } from './pk';

const HISTORY_COLOR = '#174c38';
const PROJECTION_COLOR = '#967039';

function dateLabel(startDate: string, hour: number, short = false) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(short ? {} : { year: 'numeric' as const }), timeZone: 'UTC',
  }).format(new Date(Date.parse(`${startDate}T00:00:00Z`) + hour * 3_600_000));
}

function timeLabel(hour: number) {
  const offset = hour % 24;
  const entry = Object.entries(DOSE_TIME_OFFSETS).find(([, value]) => value === offset);
  return entry ? DOSE_TIME_LABELS[entry[0] as keyof typeof DOSE_TIME_LABELS] : 'Midnight';
}

export function IntervalChart({ preview, firstFutureHour, ceilingNgMl, intervalDays, doseMg, startDate }: {
  preview: IntervalPreview;
  firstFutureHour: number;
  ceilingNgMl: number;
  intervalDays: number;
  doseMg: number;
  startDate: string;
}) {
  const id = useId();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [selected, setSelected] = useState(() => preview.points.findIndex((point) => point.hour === firstFutureHour));
  useEffect(() => {
    if (!frame.current) return;
    const update = () => setWidth(Math.max(260, frame.current!.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const left = 55;
  const right = width - 15;
  const top = 30;
  const bottom = 270;
  const yMax = niceScale(Math.max(ceilingNgMl, preview.points.reduce((max, point) => Math.max(max, point.concentration), 0)));
  const x = (hour: number) => left + hour / preview.endHour * (right - left);
  const y = (value: number) => bottom - value / yMax * (bottom - top);
  const paths = useMemo(() => {
    const path = (projected: boolean) => preview.points
      .filter((point) => projected ? point.hour >= firstFutureHour : point.hour <= firstFutureHour)
      .map((point, index) => `${index ? 'L' : 'M'}${(left + point.hour / preview.endHour * (width - 15 - left)).toFixed(2)},${(bottom - point.concentration / yMax * (bottom - top)).toFixed(2)}`).join(' ');
    return { history: path(false), projection: path(true) };
  }, [preview, firstFutureHour, width, yMax]);
  const point = preview.points[selected];
  const selectedDoses = preview.doses.filter((dose) => dose.hour === point.hour);
  const readout = `${dateLabel(startDate, point.hour)} · ${timeLabel(point.hour)} · ${formatConcentration(point.concentration)} ng/mL · ${point.hour >= firstFutureHour ? 'Modeled continuation' : 'Entered history'}`;
  const tickCount = width < 480 ? 3 : 5;

  function inspectPoint(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const hour = Math.max(0, Math.min(preview.endHour, ((event.clientX - bounds.left) * width / bounds.width - left) / (right - left) * preview.endHour));
    let low = 0;
    let high = preview.points.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (preview.points[mid].hour < hour) low = mid + 1;
      else high = mid;
    }
    setSelected(low > 0 && hour - preview.points[low - 1].hour < preview.points[low].hour - hour ? low - 1 : low);
  }

  return (
    <section className="interval-preview" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>History &amp; modeled continuation</h3>
      <p>All entered doses, followed by {INTERVAL_PREVIEW_WEEKS} weeks from the first projected injection on <strong>{dateLabel(startDate, firstFutureHour)}</strong>. The bronze curve includes remaining concentration from earlier doses.</p>
      <div className="interval-preview-legend">
        <span><i style={{ borderColor: HISTORY_COLOR }} />Entered history</span>
        <span><i className="projected-line" style={{ borderColor: PROJECTION_COLOR }} />Modeled · {doseMg} mg every {intervalDays} {intervalDays === 1 ? 'day' : 'days'}</span>
        <span><i className="ceiling-line" />Ceiling · {formatConcentration(ceilingNgMl)} ng/mL</span>
      </div>
      <div ref={frame} className="interval-preview-frame">
        <svg viewBox={`0 0 ${width} 330`} role="img" aria-labelledby={`${id}-title ${id}-description`}
          onPointerMove={inspectPoint} onPointerDown={inspectPoint}>
          <desc id={`${id}-description`}>Estimated concentration in ng/mL by calendar date. Solid green shows entered doses and their decay until the first projected injection. Dashed bronze continues the same total concentration with modeled injections for ten weeks. Marks below the curve indicate injections. Use the slider below for values.</desc>
          <rect x={x(firstFutureHour)} y={top} width={right - x(firstFutureHour)} height={bottom - top} fill="#967039" opacity="0.05" />
          {[0, 1, 2, 3, 4].map((tick) => <g key={tick}>
            <line x1={left} x2={right} y1={y(yMax * tick / 4)} y2={y(yMax * tick / 4)} stroke="#d9e1d9" />
            <text x={left - 8} y={y(yMax * tick / 4) + 4} textAnchor="end">{formatConcentration(yMax * tick / 4)}</text>
          </g>)}
          <text x={left} y={17}>ng/mL</text>
          <line x1={left} x2={right} y1={y(ceilingNgMl)} y2={y(ceilingNgMl)} stroke="#69776d" strokeDasharray="2 5" />
          <line x1={x(firstFutureHour)} x2={x(firstFutureHour)} y1={top} y2={bottom} stroke={PROJECTION_COLOR} strokeDasharray="4 5" opacity="0.65" />
          <path d={paths.history} fill="none" stroke={HISTORY_COLOR} strokeWidth="2.5" strokeLinejoin="round" />
          <path d={paths.projection} fill="none" stroke={PROJECTION_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="7 3" />
          {preview.doses.map((dose, index) => <line key={index} x1={x(dose.hour)} x2={x(dose.hour)} y1={bottom + 5} y2={bottom + 13}
            stroke={dose.projected ? PROJECTION_COLOR : HISTORY_COLOR} strokeWidth="2">
            <title>{`${dateLabel(startDate, dose.hour)} · ${timeLabel(dose.hour)} · ${dose.doseMg} mg · ${dose.projected ? 'Projected' : 'Entered'}`}</title>
          </line>)}
          {Array.from({ length: tickCount }, (_, index) => {
            const hour = index / (tickCount - 1) * preview.endHour;
            return <text key={index} x={x(hour)} y={bottom + 35} textAnchor={index === 0 ? 'start' : index === tickCount - 1 ? 'end' : 'middle'}>{dateLabel(startDate, hour, true)}</text>;
          })}
          <line x1={x(point.hour)} x2={x(point.hour)} y1={top} y2={bottom} stroke="#9aa79d" strokeDasharray="4 4" />
          <circle cx={x(point.hour)} cy={y(point.concentration)} r="4" fill="#fcfdf9" stroke={point.hour >= firstFutureHour ? PROJECTION_COLOR : HISTORY_COLOR} strokeWidth="2" />
        </svg>
      </div>
      <p className="interval-preview-readout" aria-live="off">{readout}{selectedDoses.length > 0 && <strong> · {selectedDoses.map((dose) => `${dose.doseMg} mg ${dose.projected ? 'projected' : 'entered'} injection`).join('; ')}</strong>}</p>
      <label className="interval-preview-slider">Explore the timeline
        <input type="range" min="0" max={preview.points.length - 1} value={selected} step="1" onChange={(event) => setSelected(Number(event.target.value))} aria-valuetext={readout} />
      </label>
      <p className="interval-preview-note">Hover, tap, or use the slider to inspect estimates. Small marks show injections. The calculator checks 52 weeks of repeated doses plus decay; its highest simulated peak may fall beyond this preview.</p>
      <details className="interval-methods"><summary>Injection dates shown in this preview</summary>
        <div className="interval-preview-table"><table>
          <caption>Entered and projected injections · {dateLabel(startDate, 0)} through {dateLabel(startDate, preview.endHour)}</caption>
          <thead><tr><th scope="col">Date / time</th><th scope="col">Dose</th><th scope="col">Source</th></tr></thead>
          <tbody>{preview.doses.map((dose, index) => <tr key={index}>
            <td>{dateLabel(startDate, dose.hour)} · {timeLabel(dose.hour)}</td><td>{dose.doseMg} mg</td><td>{dose.projected ? 'Projected' : 'Entered'}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </section>
  );
}
