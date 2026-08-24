import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../site-chrome';

export const metadata: Metadata = {
  title: 'Methodology — GLP-1 Concentration Plotter',
  description: 'The equations, pharmacokinetic parameters, validation checks, sources, and limitations behind the branded and compounded GLP-1 plotters.',
  openGraph: {
    title: 'Methodology — GLP-1 Concentration Plotter',
    description: 'See exactly how the semaglutide and tirzepatide concentration curves are calculated and validated.',
  },
  twitter: {
    title: 'Methodology — GLP-1 Concentration Plotter',
    description: 'See exactly how the semaglutide and tirzepatide concentration curves are calculated and validated.',
  },
};

const sources = [
  {
    number: '01',
    title: 'Ozempic prescribing information',
    meta: 'FDA / DailyMed · Pharmacokinetics §12.3',
    href: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=979e4df4-0597-48ea-b51c-0f699fa6d166',
  },
  {
    number: '02',
    title: 'Wegovy prescribing information',
    meta: 'FDA / DailyMed · Dose strengths and pharmacokinetics',
    href: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ee06186f-2aa3-4990-a760-757579d8f77b',
  },
  {
    number: '03',
    title: 'Semaglutide s.c. population PK analysis',
    meta: 'Petri et al. · Diabetes Therapy · 2018',
    href: 'https://doi.org/10.1007/s13300-018-0458-5',
  },
  {
    number: '04',
    title: 'Semaglutide clinical pharmacology PK model',
    meta: 'Overgaard et al. · Diabetes Therapy · 2019',
    href: 'https://doi.org/10.1007/s13300-019-0581-y',
  },
  {
    number: '05',
    title: 'Zepbound prescribing information',
    meta: 'FDA / DailyMed · Pharmacokinetics §12.3',
    href: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=487cd7e7-434c-4925-99fa-aa80b1cc776b',
  },
  {
    number: '06',
    title: 'Tirzepatide population PK analysis',
    meta: 'Schneck & Urva · CPT: PSP · 2024',
    href: 'https://doi.org/10.1002/psp4.13099',
  },
  {
    number: '07',
    title: 'Retatrutide discovery and phase 1 PK',
    meta: 'Coskun et al. · Cell Metabolism · 2022',
    href: 'https://doi.org/10.1016/j.cmet.2022.07.013',
  },
  {
    number: '08',
    title: 'Retatrutide phase 2 trial',
    meta: 'Jastreboff et al. · New England Journal of Medicine · 2023',
    href: 'https://doi.org/10.1056/NEJMoa2301972',
  },
  {
    number: '09',
    title: 'FDA concerns with unapproved GLP-1 drugs',
    meta: 'FDA · Compounding status and retatrutide warning',
    href: 'https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss',
  },
];

export default function MethodologyPage() {
  return (
    <main className="site-shell methodology-page">
      <SiteHeader active="methodology" />

      <section className="method-hero">
        <div>
          <p className="eyebrow">Model methodology</p>
          <h1>What the curve means—and exactly how it is drawn.</h1>
        </div>
        <div className="method-hero-note">
          <span>Model scope</span>
          <strong>Weekly subcutaneous injection</strong>
          <p>Population-average concentration estimate—not an individual prediction or measured blood level.</p>
          <Link href="/">Open the plotter <b aria-hidden="true">↗</b></Link>
        </div>
      </section>

      <section className="method-nav" aria-label="Methodology contents">
        <a href="#model">01 · Model</a>
        <a href="#parameters">02 · Parameters</a>
        <a href="#checks">03 · Validation</a>
        <a href="#limits">04 · Limits</a>
        <a href="#sources">05 · Sources</a>
      </section>

      <section className="method-block" id="model">
        <div className="method-block-title"><span>01</span><div><p className="eyebrow">The model</p><h2>One dose, then every dose.</h2></div></div>
        <div className="method-copy">
          <p className="method-lede">Every curve uses a one-compartment model with first-order absorption and first-order elimination. This is the published phase 3 model structure for subcutaneous semaglutide, a transparent reduction of the published two-compartment tirzepatide model, and a fitted one-compartment surrogate for investigational retatrutide.</p>
          <div className="equation-card">
            <span>Concentration from one injection</span>
            <code>Cᵢ(t) = (Dᵢ × 1000 / V) × [kₐ / (kₐ − kₑ)] × (e⁻ᵏᵉΔᵗ − e⁻ᵏᵃΔᵗ)</code>
            <small>for Δt = t − tᵢ ≥ 0; otherwise Cᵢ(t) = 0</small>
          </div>
          <div className="equation-card surrogate-card">
            <span>Retatrutide surrogate targets</span>
            <code>t½ ≈ 6 d · Vz/F = 7.36 L · kₐ = 0.08 h⁻¹</code>
            <small>The half-life and mean terminal apparent volume come from phase 1 cohorts. kₐ is fitted so the simplified curve reproduces the observed timing and exposure.</small>
          </div>
          <p className="model-distinction"><strong>How the compounded tab differs.</strong> Compounded semaglutide and tirzepatide run through the exact same equation and published parameters as their branded counterparts. This produces a useful reference curve, but assumes brand-like pharmacokinetics that a compounded formulation may not reproduce. Retatrutide uses the same equation with the explicitly fitted surrogate parameters above.</p>
          <div className="equation-grid">
            <div><span>Elimination</span><code>kₑ = ln(2) / t½</code><p>The elimination rate comes directly from the modeled half-life.</p></div>
            <div><span>Repeated doses</span><code>Ctotal(t) = Σ Cᵢ(t)</code><p>Every scheduled weekly injection contributes its own curve; the contributions are added.</p></div>
            <div><span>Unit conversion</span><code>1 mg/L = 1000 ng/mL</code><p>Dose is entered in mg, volume in L, and the chart reports ng/mL.</p></div>
            <div><span>Area under curve</span><code>AUC ≈ Σ ½(Cⱼ + Cⱼ₋₁)Δt</code><p>The displayed AUC uses the trapezoidal rule over six-hour samples.</p></div>
          </div>
          <ol className="process-list">
            <li><span>1</span><div><strong>Schedule doses</strong><p>The selected start date begins at midnight. Morning, Afternoon, and Night map internally to +6, +12, and +18 hours; later weekly doses remain exactly 168 hours apart.</p></div></li>
            <li><span>2</span><div><strong>Sample the timeline</strong><p>The applicable equation is evaluated every 6 hours through any whole-number graph duration from 1 to 520 weeks.</p></div></li>
            <li><span>3</span><div><strong>Accumulate or compare</strong><p>Accumulate sums the active regimen curves. Compare keeps them as separate lines. Different compounds are never treated as dose-equivalent.</p></div></li>
            <li><span>4</span><div><strong>Scale and inspect</strong><p>The y-axis rounds upward to a clean 1–2–5–10 scale above the maximum. Hover and keyboard readings snap to the nearest six-hour sample.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="method-block" id="parameters">
        <div className="method-block-title"><span>02</span><div><p className="eyebrow">Parameter set</p><h2>Values used in the code.</h2></div></div>
        <div className="method-copy">
          <div className="parameter-table-wrap">
            <table className="parameter-table">
              <thead><tr><th>Input</th><th>Semaglutide</th><th>Tirzepatide</th><th>Retatrutide</th></tr></thead>
              <tbody>
                <tr><th>Absorption rate kₐ</th><td>0.0286 h⁻¹</td><td>0.0373 h⁻¹</td><td>0.08 h⁻¹ fitted</td></tr>
                <tr><th>Half-life used</th><td>7.37 days</td><td>5.4 days</td><td>≈6 days</td></tr>
                <tr><th>Apparent volume V/F</th><td>12.2 L</td><td>10.3 L</td><td>7.36 L cohort mean</td></tr>
                <tr><th>Elimination rate kₑ</th><td>0.003918 h⁻¹</td><td>0.005348 h⁻¹</td><td>0.004814 h⁻¹</td></tr>
                <tr><th>Model status</th><td>Published one compartment</td><td>Published model reduced</td><td>Phase 1 fitted surrogate</td></tr>
              </tbody>
            </table>
          </div>
          <div className="parameter-notes">
            <article><span>SEMA</span><h3>Semaglutide</h3><p>Petri et al. reported kₐ 0.0286 h⁻¹, CL/F 0.0478 L/h, and V/F 12.2 L for the phase 3 one-compartment model. The code uses kₑ = (CL/F)/(V/F), giving t½ = 7.37 days—consistent with the FDA label’s “approximately 1 week.”</p></article>
            <article><span>TIRZ</span><h3>Tirzepatide</h3><p>Schneck & Urva reported kₐ 0.0373 h⁻¹, a population mean half-life of 5.4 days, and apparent V 10.3 L. Their full model has two compartments. The plotter preserves the published absorption rate, half-life, and apparent volume in a simpler one-compartment curve.</p></article>
            <article><span>RETA</span><h3>Retatrutide</h3><p>Coskun et al. reported dose-level half-lives of 134–165 hours, T<sub>max</sub> values of 12–72 hours, C<sub>max</sub> of 110 ng/mL and AUC<sub>0–∞</sub> of 28,300 ng·h/mL at 1 mg, plus Vz/F values across six cohorts. The code uses the approximately six-day half-life, the 7.36 L cohort-mean Vz/F, and fits kₐ to 0.08 h⁻¹. This is a transparent surrogate, not a published population model.</p></article>
          </div>
        </div>
      </section>

      <section className="method-block" id="checks">
        <div className="method-block-title"><span>03</span><div><p className="eyebrow">Math checks</p><h2>Internal and external validation.</h2></div></div>
        <div className="method-copy">
          <div className="check-grid">
            <article><span className="check-mark">✓</span><h3>Steady-state semaglutide</h3><p>The model predicts average steady-state concentrations of 62.3 ng/mL at 0.5 mg and 124.5 ng/mL at 1 mg. The Ozempic label reports approximately 65 and 123 ng/mL—differences of 4.2% and 1.2%.</p></article>
            <article><span className="check-mark">✓</span><h3>Tirzepatide peak timing</h3><p>The reduced model predicts a single-dose peak at 60.8 hours. FDA labeling reports a median of 24 hours and a range of 8–72 hours, so the modeled peak remains inside the observed range.</p></article>
            <article><span className="check-mark">✓</span><h3>Dose proportionality</h3><p>The equation is linear in dose: doubling a dose doubles every concentration and AUC value. That matches the dose-proportional exposure reported for semaglutide, tirzepatide, and retatrutide.</p></article>
            <article><span className="check-mark">✓</span><h3>Accumulation behavior</h3><p>Repeated weekly doses approach a plateau over roughly 4–5 half-lives. This matches labeled steady state at 4–5 weeks for semaglutide and 4 weeks for tirzepatide.</p></article>
            <article><span className="check-mark">✓</span><h3>Dose-time scheduling</h3><p>Automated checks confirm that a dose contributes zero before its selected Morning, Afternoon, or Night offset and begins contributing after that scheduled point.</p></article>
            <article><span className="check-mark">✓</span><h3>Retatrutide phase 1 fit</h3><p>At 1 mg, the surrogate predicts T<sub>max</sub> 37.4 hours, C<sub>max</sub> 113.5 ng/mL, and AUC 28,227 ng·h/mL. Phase 1 observations were 12–72 hours overall, 110 ng/mL, and 28,300 ng·h/mL.</p></article>
          </div>
          <div className="audit-strip"><span>Automated calculation checks</span><strong>positive concentration</strong><strong>dose ratio = 2.000</strong><strong>AUC &gt; 0</strong><strong>zero before dose</strong></div>
        </div>
      </section>

      <section className="method-block" id="limits">
        <div className="method-block-title"><span>04</span><div><p className="eyebrow">Model limits</p><h2>What this cannot tell you.</h2></div></div>
        <div className="method-copy limit-copy">
          <p>Actual exposure varies with body size, injection timing and site, formulation, adherence, individual clearance, assay method, and other clinical factors. The published population models include variability and covariates that this deliberately simple plotter does not attempt to personalize.</p>
          <ul>
            <li><strong>Not a measured level.</strong> The tooltip is a population-model estimate, not a laboratory result.</li>
            <li><strong>Not dose equivalence.</strong> Adding semaglutide and tirzepatide concentrations is a mass visualization only and does not imply equal effect or safety.</li>
            <li><strong>Not oral semaglutide.</strong> Rybelsus and Wegovy tablets use daily oral dosing with highly condition-dependent bioavailability, so they are outside this weekly injection model.</li>
            <li><strong>Compounded products are not FDA approved.</strong> Their formulation, labeled concentration, absorption, quality, and bioavailability can differ. The compounded semaglutide and tirzepatide curves assume the published brand-name parameters and may not represent a particular vial.</li>
            <li><strong>Retatrutide is investigational.</strong> FDA states it cannot be used in compounding under federal law. Its curve is a simplified fit to phase 1 human PK, not an approved dosing model or support for use or sourcing.</li>
            <li><strong>Not treatment advice.</strong> Do not use the graph to start, stop, combine, or change medication. Ask a licensed clinician or pharmacist.</li>
          </ul>
        </div>
      </section>

      <section className="sources-section method-sources" id="sources" aria-labelledby="sources-title">
        <div><p className="eyebrow">Evidence base</p><h2 id="sources-title">Primary sources</h2><p className="source-note">FDA labels establish approved dose strengths and observed clinical PK. Peer-reviewed population analyses supply model parameters, and the retatrutide phase 1 trial supplies the surrogate-fitting targets. The FDA notice establishes current compounding and approval status.</p></div>
        <ol>
          {sources.map((source) => (
            <li key={source.number}><a href={source.href} target="_blank" rel="noreferrer"><span>{source.number}</span><p><strong>{source.title}</strong><small>{source.meta}</small></p><b aria-hidden="true">↗</b></a></li>
          ))}
        </ol>
      </section>

      <SiteFooter />
    </main>
  );
}
