'use client';

import { COMPOUNDS, DOSE_TIME_LABELS, type CalendarDoseBlock, type DoseTime } from './pk';

export function defaultDoseBlocks(): CalendarDoseBlock[] {
  return [{ id: 1, compound: 'semaglutide', doseMg: 0.25, dates: [''], timeOfDay: 'morning' }];
}

export function DoseBlockCard({ block, index, removable, canAddDate, onChange, onRemove }: {
  block: CalendarDoseBlock;
  index: number;
  removable: boolean;
  canAddDate: boolean;
  onChange: (next: CalendarDoseBlock) => void;
  onRemove: () => void;
}) {
  const update = (partial: Partial<CalendarDoseBlock>) => onChange({ ...block, ...partial });
  return (
    <fieldset className="dose-card injection-card">
      <legend className="sr-only">Dose block {index + 1}</legend>
      <div className="dose-card-head">
        <span className="dose-number">{index + 1}</span>
        <div><strong>{COMPOUNDS[block.compound].name} · {block.doseMg} mg</strong><small>Dose block {index + 1}</small></div>
        {removable && <button className="remove-button" type="button" onClick={onRemove} aria-label={`Remove dose block ${index + 1}`}>×</button>}
      </div>
      <label>Peptide
        <select value={block.compound} onChange={(event) => {
          const compound = event.target.value as CalendarDoseBlock['compound'];
          update({ compound, doseMg: COMPOUNDS[compound].doses[0] });
        }}>
          {(['semaglutide', 'tirzepatide'] as const).map((compound) => <option key={compound} value={compound}>{COMPOUNDS[compound].name} · {COMPOUNDS[compound].brands}</option>)}
        </select>
      </label>
      <div className="compound-grid">
        <label>Dose per injection
          <select value={block.doseMg} onChange={(event) => update({ doseMg: Number(event.target.value) })}>
            {COMPOUNDS[block.compound].doses.map((dose) => <option key={dose} value={dose}>{dose} mg</option>)}
          </select>
        </label>
        <label>Dose time
          <select value={block.timeOfDay} onChange={(event) => update({ timeOfDay: event.target.value as DoseTime })}>
            {Object.entries(DOSE_TIME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="injection-dates" role="group" aria-label={`Injection dates for dose block ${index + 1}`}>
        <p>Injection dates</p>
        <small>Use the dose and time above on every date below.</small>
        {block.dates.map((date, dateIndex) => (
          <div className="injection-date-row" key={dateIndex}>
            <label>Date {dateIndex + 1}
              <input type="date" required min="0001-01-01" max="9999-12-24" value={date}
                onChange={(event) => update({ dates: block.dates.map((value, currentIndex) => currentIndex === dateIndex ? event.target.value : value) })} />
            </label>
            {block.dates.length > 1 && <button className="remove-button" type="button"
              onClick={() => update({ dates: block.dates.filter((_, currentIndex) => currentIndex !== dateIndex) })}
              aria-label={`Remove date ${dateIndex + 1} from dose block ${index + 1}`}>×</button>}
          </div>
        ))}
        <button className="add-button add-date-button" type="button" disabled={!canAddDate}
          onClick={() => update({ dates: [...block.dates, ''] })}><span aria-hidden="true">+</span> Add another date</button>
      </div>
    </fieldset>
  );
}
