'use client';

import { useEffect, useRef, useState } from 'react';
import { IntervalChart } from './interval-chart';
import type { CalculatorInputs } from './saved-inputs';
import {
  COMPOUNDS,
  DOSE_TIME_LABELS,
  findModeledInterval,
  INTERVAL_PROJECTION_WEEKS,
  latestCalendarDose,
  MAX_SEARCH_INTERVAL_DAYS,
  PkModelOptions,
  Regimen,
} from './pk';

type SearchResult = Awaited<ReturnType<typeof findModeledInterval>>;

function calendarDate(startDate: string, hour: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.parse(`${startDate}T00:00:00Z`) + hour * 3_600_000));
}

function concentration(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function IntervalCalculator({ regimens, model, startDate, needsPlot, inputs, onInputsChange }: {
  regimens: Regimen[];
  model: PkModelOptions;
  startDate: string;
  needsPlot: boolean;
  inputs: CalculatorInputs;
  onInputsChange: (inputs: CalculatorInputs) => void;
}) {
  const latest = latestCalendarDose(regimens);
  const { reference, ceilingOffset, doseOverride } = inputs;
  const [result, setResult] = useState<SearchResult | null>(null);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const matchingOverride = latest && doseOverride?.compound === latest.compound ? doseOverride : null;
  const doseMg = matchingOverride?.doseMg ?? latest?.doseMg ?? 0;
  const ceiling = Number(reference) + Number(ceilingOffset);
  const validOffset = ceilingOffset.trim() !== '' && Number.isFinite(Number(ceilingOffset)) && Number(ceilingOffset) >= 0;
  const validReference = reference.trim() !== '' && Number.isFinite(ceiling) && Number(reference) > 0 && validOffset;
  const mixed = new Set(regimens.map((regimen) => regimen.compound)).size > 1;
  const unavailable = !latest || needsPlot || mixed || latest.ambiguous;

  useEffect(() => () => { run.current += 1; }, []);

  function clearResult() {
    run.current += 1;
    setBusy(false);
    setProgress('');
    setResult(null);
  }

  async function calculate() {
    if (unavailable || !validReference) return;
    const currentRun = ++run.current;
    setResult(null);
    setBusy(true);
    setProgress('Preparing the modeled continuation…');
    try {
      const next = await findModeledInterval(regimens, doseMg, Number(reference), model, Number(ceilingOffset), async (message) => {
        if (run.current !== currentRun) return false;
        setProgress(message);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        return run.current === currentRun;
      });
      if (run.current === currentRun) setResult(next);
    } catch {
      if (run.current === currentRun) setResult({ status: 'invalid', message: 'The model calculation could not finish. Check the plotted schedule and try again.' });
    } finally {
      if (run.current === currentRun) { setBusy(false); setProgress(''); }
    }
  }

  const visibleResult = unavailable ? null : result;
  return (
    <section className="interval-calculator" aria-labelledby="interval-calculator-title">
      <p className="eyebrow">Explore a modeled continuation</p>
      <h2 id="interval-calculator-title">Interval calculator</h2>
      <p className="interval-intro">Compare repeated-dose peaks with a concentration you enter. The dose starts with your most recent dated injection and can be changed below.</p>
      <p className="interval-limit"><strong>A model match is not a dosing recommendation.</strong> These are estimated concentrations, not measured blood levels. Feeling better near a plotted value does not establish a personal tolerability limit. The ceiling offset is a comparison allowance, not a safety margin. Review medication timing and side effects with your prescriber.</p>
      {!latest || needsPlot ? <p className="calendar-error" role="status">Plot your completed dates and model inputs first. The calculator uses the last plotted schedule.</p>
        : mixed ? <p className="calendar-error" role="status">Use a schedule containing one medication. Summed concentrations of different medications cannot define a shared target.</p>
          : latest.ambiguous ? <p className="calendar-error" role="status">The latest injection time appears in more than one block. Resolve that overlap and replot before calculating.</p> : (
            <p className="interval-context">Latest plotted injection: <strong>{COMPOUNDS[latest.compound].name} · {latest.doseMg} mg</strong> · {calendarDate(startDate, latest.hour)} · {DOSE_TIME_LABELS[latest.timeOfDay]}. Using the plotted {model.kind === 'one-compartment' ? 'one-compartment' : 'two-compartment'} model.</p>
          )}
      <div className="interval-inputs">
        <label>Reference concentration (ng/mL)
          <span className="input-with-suffix"><input type="number" min="0.01" step="any" inputMode="decimal" placeholder="Enter reference" value={reference}
            onChange={(event) => { clearResult(); onInputsChange({ ...inputs, reference: event.target.value }); }} /><small>ng/mL</small></span>
        </label>
        <label>Ceiling offset (ng/mL)
          <span className="input-with-suffix"><input type="number" min="0" step="any" inputMode="decimal" value={ceilingOffset}
            aria-invalid={!validOffset} aria-describedby="ceiling-offset-help"
            onChange={(event) => { clearResult(); onInputsChange({ ...inputs, ceilingOffset: event.target.value }); }} /><small>ng/mL</small></span>
        </label>
        <label className="interval-dose-field">Modeled dose per injection
          <select value={matchingOverride ? String(matchingOverride.doseMg) : 'latest'} disabled={!latest} onChange={(event) => {
            clearResult();
            onInputsChange({ ...inputs, doseOverride: event.target.value === 'latest' || !latest ? null : { compound: latest.compound, doseMg: Number(event.target.value) } });
          }}>
            <option value="latest">{latest ? `${latest.doseMg} mg · use latest entered dose` : 'Plot doses first'}</option>
            {latest && COMPOUNDS[latest.compound].doses.map((dose) => <option value={dose} key={dose}>{dose} mg</option>)}
          </select>
        </label>
      </div>
      <p id="ceiling-offset-help">The offset starts at +20 ng/mL. Enter zero or any positive value.</p>
      {!validOffset && <p className="calendar-error" role="status">Enter a ceiling offset of zero or more ng/mL.</p>}
      {validReference && <p className="interval-ceiling">Numeric comparison ceiling: <strong>{concentration(ceiling)} ng/mL</strong> ({concentration(Number(reference))} + {concentration(Number(ceilingOffset))}).</p>}
      <div className="button-row">
        <button className="primary" type="button" disabled={unavailable || !validReference || (busy && !needsPlot)} onClick={calculate}>Estimate modeled interval <span aria-hidden="true">↗</span></button>
        {busy && !needsPlot && <button className="reset-button" type="button" onClick={clearResult}>Cancel</button>}
      </div>
      <div aria-live="polite" aria-busy={busy && !needsPlot}>
        {busy && !needsPlot && <p className="interval-progress">{progress}</p>}
        {visibleResult?.status === 'invalid' && <p className="calendar-error">{visibleResult.message}</p>}
        {visibleResult?.status === 'no-match' && <div className="interval-result">
          <h3>No modeled match found</h3>
          <p>None of the tested whole-day intervals from 1–{MAX_SEARCH_INTERVAL_DAYS} days met {concentration(visibleResult.ceilingNgMl)} ng/mL for this dose over the simulated period. A single injection’s peak may already exceed the reference. This does not identify an alternative treatment schedule.</p>
        </div>}
        {visibleResult?.status === 'match' && <div className="interval-result">
          <span>Model-only interval estimate</span>
          <h3>{visibleResult.intervalDays} {visibleResult.intervalDays === 1 ? 'day' : 'days'}</h3>
          <p>The shortest tested whole-day spacing meeting the numeric ceiling in this simulation, using {visibleResult.doseMg} mg of {COMPOUNDS[visibleResult.compound].name.toLowerCase()}.</p>
          <dl>
            <div><dt>Highest simulated continuation peak</dt><dd>{concentration(visibleResult.peakNgMl)} ng/mL</dd></div>
            <div><dt>Comparison ceiling</dt><dd>{concentration(visibleResult.ceilingNgMl)} ng/mL</dd></div>
          </dl>
          <p>The simulation places its first additional injection {visibleResult.intervalDays} days after the latest plotted injection, then repeats at that spacing for {INTERVAL_PROJECTION_WEEKS} weeks, followed by a decay period. It includes remaining concentration from all plotted doses.</p>
          {visibleResult.existingDosePeakNgMl > visibleResult.ceilingNgMl && <p className="interval-existing-peak"><strong>Existing doses still exceed the ceiling:</strong> their modeled peak before the simulated continuation is {concentration(Math.ceil(visibleResult.existingDosePeakNgMl * 10) / 10)} ng/mL. Changing future spacing cannot undo exposure from doses already entered.</p>}
          <p><strong>This is not a guarantee of your concentration or freedom from side effects.</strong> The result applies only to the modeled period and assumptions. No injection dates have been changed.</p>
        </div>}
      </div>
      {visibleResult?.status === 'match' && <IntervalChart
        preview={visibleResult.preview} firstFutureHour={visibleResult.firstFutureHour}
        ceilingNgMl={visibleResult.ceilingNgMl} intervalDays={visibleResult.intervalDays}
        doseMg={visibleResult.doseMg} startDate={startDate}
      />}
      <details className="interval-methods"><summary>Calculation assumptions and limits</summary>
        <p>Tests 1–{MAX_SEARCH_INTERVAL_DAYS}-day intervals in order. Each scenario repeats the selected dose for {INTERVAL_PROJECTION_WEEKS} weeks, then follows decay for ten reference half-lives. Peaks from the first simulated additional injection onward are screened hourly; a candidate match is rechecked every 15 minutes and rounded upward to 0.1 ng/mL for comparison. Sampling can miss a peak between points.</p>
        <p>The plotted medication history and model are retained. Two-compartment mode continues the site’s assumed 1 lb/week weight loss and 30 kg floor. This is a finite simulation, not an indefinite steady-state guarantee, a validated toxicity threshold, or an approved dosing schedule.</p>
        <p>Tirzepatide labeling uses weekly dosing and clinician assessment of tolerability. <a href="https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=487cd7e7-434c-4925-99fa-aa80b1cc776b" target="_blank" rel="noreferrer">Read the prescribing information.</a></p>
      </details>
    </section>
  );
}
