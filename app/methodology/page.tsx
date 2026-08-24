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
          <strong>Subcutaneous injection schedules</strong>
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
          <p className="method-lede">Semaglutide and tirzepatide default to a simpler one-compartment estimate and offer an optional two-compartment population model based on richly sampled clinical pharmacology data. Retatrutide has only the fitted one-compartment surrogate because a parameter-complete two-compartment population model is not available for this calculator.</p>
          <div className="equation-card">
            <span>One-compartment option — one injection</span>
            <div className="math-scroll math-stack">
              <math className="math-display" display="block" aria-label="P sub i equals dose sub i times 1000 over apparent volume, times k a over k a minus k e">
                <msub><mi>P</mi><mi>i</mi></msub><mo>=</mo>
                <mfrac><mrow><msub><mi>D</mi><mi>i</mi></msub><mo>·</mo><mn>1000</mn></mrow><mrow><mi>V</mi><mo>/</mo><mi>F</mi></mrow></mfrac>
                <mo>·</mo><mfrac><msub><mi>k</mi><mi>a</mi></msub><mrow><msub><mi>k</mi><mi>a</mi></msub><mo>−</mo><msub><mi>k</mi><mi>e</mi></msub></mrow></mfrac>
              </math>
              <math className="math-display" display="block" aria-label="C sub i of t equals P sub i times the difference of the elimination and absorption exponentials">
                <msub><mi>E</mi><mi>r</mi></msub><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>=</mo><msup><mi>e</mi><mrow><mo>−</mo><mi>rΔt</mi></mrow></msup>
              </math>
              <math className="math-display" display="block" aria-label="C sub i of t equals P sub i times E sub k e minus E sub k a">
                <msub><mi>C</mi><mi>i</mi></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><msub><mi>P</mi><mi>i</mi></msub>
                <mrow><mo>[</mo><msub><mi>E</mi><msub><mi>k</mi><mi>e</mi></msub></msub><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>−</mo><msub><mi>E</mi><msub><mi>k</mi><mi>a</mi></msub></msub><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>]</mo></mrow>
              </math>
              <math className="math-secondary" display="block" aria-label="Delta t equals t minus dose time sub i and concentration is zero when delta t is less than zero">
                <mi>Δt</mi><mo>=</mo><mi>t</mi><mo>−</mo><msub><mi>t</mi><mi>i</mi></msub><mo>;</mo>
                <mspace width="1em" /><msub><mi>C</mi><mi>i</mi></msub><mo>=</mo><mn>0</mn><mspace width=".4em" /><mtext>when</mtext><mspace width=".4em" /><mi>Δt</mi><mo>&lt;</mo><mn>0</mn>
              </math>
            </div>
            <small>This Bateman function is the default for semaglutide and tirzepatide and the only available structure for retatrutide. For Δt = t − tᵢ &lt; 0, Cᵢ(t) = 0.</small>
          </div>
          <div className="equation-card">
            <span>Semaglutide and tirzepatide — two-compartment macro rates</span>
            <div className="math-scroll math-stack">
              <div className="math-pair-grid">
                <math className="math-display" display="block" aria-label="k 10 equals clearance over central volume"><msub><mi>k</mi><mn>10</mn></msub><mo>=</mo><mfrac><mi>CL</mi><msub><mi>V</mi><mi>c</mi></msub></mfrac></math>
                <math className="math-display" display="block" aria-label="k 12 equals Q over central volume"><msub><mi>k</mi><mn>12</mn></msub><mo>=</mo><mfrac><mi>Q</mi><msub><mi>V</mi><mi>c</mi></msub></mfrac></math>
                <math className="math-display" display="block" aria-label="k 21 equals Q over peripheral volume"><msub><mi>k</mi><mn>21</mn></msub><mo>=</mo><mfrac><mi>Q</mi><msub><mi>V</mi><mi>p</mi></msub></mfrac></math>
                <math className="math-display" display="block" aria-label="S equals the sum of k 10, k 12, and k 21"><mi>S</mi><mo>=</mo><msub><mi>k</mi><mn>10</mn></msub><mo>+</mo><msub><mi>k</mi><mn>12</mn></msub><mo>+</mo><msub><mi>k</mi><mn>21</mn></msub></math>
                <math className="math-display math-wide" display="block" aria-label="alpha and beta equal one half of S plus or minus the square root of S squared minus four k 10 k 21">
                  <mi>α</mi><mo>,</mo><mi>β</mi><mo>=</mo><mfrac><mrow><mi>S</mi><mo>±</mo><msqrt><mrow><msup><mi>S</mi><mn>2</mn></msup><mo>−</mo><mn>4</mn><msub><mi>k</mi><mn>10</mn></msub><msub><mi>k</mi><mn>21</mn></msub></mrow></msqrt></mrow><mn>2</mn></mfrac>
                </math>
              </div>
            </div>
            <small>The central and peripheral compartments exchange drug through Q; elimination occurs from the central compartment through CL.</small>
          </div>
          <div className="equation-card">
            <span>Two-compartment central plasma concentration</span>
            <div className="math-scroll math-stack">
              <math className="math-display" display="block" aria-label="g of r and delta t equals k a over k a minus r times the difference of the r and k a exponentials">
                <mi>g</mi><mo stretchy="false">(</mo><mi>r</mi><mo>,</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>=</mo>
                <mfrac><msub><mi>k</mi><mi>a</mi></msub><mrow><msub><mi>k</mi><mi>a</mi></msub><mo>−</mo><mi>r</mi></mrow></mfrac>
                <mrow><mo>[</mo><msub><mi>E</mi><mi>r</mi></msub><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>−</mo><msub><mi>E</mi><msub><mi>k</mi><mi>a</mi></msub></msub><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>]</mo></mrow>
              </math>
              <div className="math-pair-grid">
                <math className="math-display" display="block" aria-label="w alpha equals alpha minus k 21 over alpha minus beta"><msub><mi>w</mi><mi>α</mi></msub><mo>=</mo><mfrac><mrow><mi>α</mi><mo>−</mo><msub><mi>k</mi><mn>21</mn></msub></mrow><mrow><mi>α</mi><mo>−</mo><mi>β</mi></mrow></mfrac></math>
                <math className="math-display" display="block" aria-label="w beta equals k 21 minus beta over alpha minus beta"><msub><mi>w</mi><mi>β</mi></msub><mo>=</mo><mfrac><mrow><msub><mi>k</mi><mn>21</mn></msub><mo>−</mo><mi>β</mi></mrow><mrow><mi>α</mi><mo>−</mo><mi>β</mi></mrow></mfrac></math>
                <math className="math-display" display="block" aria-label="B sub i equals bioavailability times dose sub i times 1000 over central volume"><msub><mi>B</mi><mi>i</mi></msub><mo>=</mo><mfrac><mrow><mi>F</mi><msub><mi>D</mi><mi>i</mi></msub><mo>·</mo><mn>1000</mn></mrow><msub><mi>V</mi><mi>c</mi></msub></mfrac></math>
                <math className="math-display math-wide" display="block" aria-label="R of delta t equals w alpha times g of alpha and delta t plus w beta times g of beta and delta t"><mi>R</mi><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>=</mo><msub><mi>w</mi><mi>α</mi></msub><mi>g</mi><mo stretchy="false">(</mo><mi>α</mi><mo>,</mo><mi>Δt</mi><mo stretchy="false">)</mo><mo>+</mo><msub><mi>w</mi><mi>β</mi></msub><mi>g</mi><mo stretchy="false">(</mo><mi>β</mi><mo>,</mo><mi>Δt</mi><mo stretchy="false">)</mo></math>
                <math className="math-display math-emphasis math-wide" display="block" aria-label="C sub i of t equals B sub i times R of delta t"><msub><mi>C</mi><mi>i</mi></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><msub><mi>B</mi><mi>i</mi></msub><mi>R</mi><mo stretchy="false">(</mo><mi>Δt</mi><mo stretchy="false">)</mo></math>
              </div>
            </div>
            <small>The reference-parameter calculation uses this closed-form solution; body-size-adjusted graphs integrate the equivalent differential equations below.</small>
          </div>
          <div className="equation-card">
            <span>Changing body size — differential equations integrated by the plotter</span>
            <div className="math-scroll math-stack">
              <math className="math-display" display="block" aria-label="J equals Q times central concentration minus peripheral concentration"><mi>J</mi><mo>=</mo><mi>Q</mi><mrow><mo>(</mo><msub><mi>C</mi><mi>c</mi></msub><mo>−</mo><msub><mi>C</mi><mi>p</mi></msub><mo>)</mo></mrow></math>
              <math className="math-display" display="block" aria-label="depot rate equals negative k a times depot amount">
                <mfrac><mrow><mi>d</mi><msub><mi>A</mi><mi>d</mi></msub></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mo>−</mo><msub><mi>k</mi><mi>a</mi></msub><msub><mi>A</mi><mi>d</mi></msub>
              </math>
              <math className="math-display" display="block" aria-label="central amount rate equals F k a depot amount minus clearance times central concentration minus J">
                <mfrac><mrow><mi>d</mi><msub><mi>A</mi><mi>c</mi></msub></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo>
                <mi>F</mi><msub><mi>k</mi><mi>a</mi></msub><msub><mi>A</mi><mi>d</mi></msub><mo>−</mo><mi>CL</mi><msub><mi>C</mi><mi>c</mi></msub><mo>−</mo><mi>J</mi>
              </math>
              <div className="math-pair-grid">
                <math className="math-display" display="block" aria-label="peripheral amount rate equals J"><mfrac><mrow><mi>d</mi><msub><mi>A</mi><mi>p</mi></msub></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>J</mi></math>
                <math className="math-display" display="block" aria-label="central concentration equals central amount over central volume"><msub><mi>C</mi><mi>c</mi></msub><mo>=</mo><mfrac><msub><mi>A</mi><mi>c</mi></msub><msub><mi>V</mi><mi>c</mi></msub></mfrac></math>
                <math className="math-display" display="block" aria-label="peripheral concentration equals peripheral amount over peripheral volume"><msub><mi>C</mi><mi>p</mi></msub><mo>=</mo><mfrac><msub><mi>A</mi><mi>p</mi></msub><msub><mi>V</mi><mi>p</mi></msub></mfrac></math>
              </div>
              <math className="math-secondary" display="block" aria-label="At each dose time, depot amount after the dose equals depot amount before the dose plus 1000 times dose in milligrams">
                <msub><mi>A</mi><mi>d</mi></msub><mo stretchy="false">(</mo><msubsup><mi>t</mi><mi>i</mi><mo>+</mo></msubsup><mo stretchy="false">)</mo><mo>=</mo>
                <msub><mi>A</mi><mi>d</mi></msub><mo stretchy="false">(</mo><msubsup><mi>t</mi><mi>i</mi><mo>−</mo></msubsup><mo stretchy="false">)</mo><mo>+</mo><mn>1000</mn><msub><mi>D</mi><mi>i</mi></msub>
              </math>
            </div>
            <small>The three amount equations use mg-to-µg dose impulses and time-varying CL, Q, Vc, and Vp. The site advances them with one-hour fourth-order Runge–Kutta steps.</small>
          </div>
          <div className="equation-card">
            <span>Semaglutide — published body-weight covariates and fixed effects</span>
            <div className="math-scroll math-stack">
              <div className="math-pair-grid">
                <math className="math-display" display="block" aria-label="Semaglutide clearance equals 0.0348 times body weight over 85 to the 1.01 power"><mi>CL</mi><mo>=</mo><mn>0.0348</mn><msup><mrow><mo>(</mo><mfrac><mi>BW</mi><mn>85</mn></mfrac><mo>)</mo></mrow><mn>1.01</mn></msup></math>
                <math className="math-display" display="block" aria-label="Semaglutide Q equals 0.304 times body weight over 85 to the 1.01 power"><mi>Q</mi><mo>=</mo><mn>0.304</mn><msup><mrow><mo>(</mo><mfrac><mi>BW</mi><mn>85</mn></mfrac><mo>)</mo></mrow><mn>1.01</mn></msup></math>
                <math className="math-display" display="block" aria-label="Semaglutide central volume equals 3.59 times body weight over 85 to the 0.923 power"><msub><mi>V</mi><mi>c</mi></msub><mo>=</mo><mn>3.59</mn><msup><mrow><mo>(</mo><mfrac><mi>BW</mi><mn>85</mn></mfrac><mo>)</mo></mrow><mn>0.923</mn></msup></math>
                <math className="math-display" display="block" aria-label="Semaglutide peripheral volume equals 4.10 times body weight over 85 to the 0.923 power"><msub><mi>V</mi><mi>p</mi></msub><mo>=</mo><mn>4.10</mn><msup><mrow><mo>(</mo><mfrac><mi>BW</mi><mn>85</mn></mfrac><mo>)</mo></mrow><mn>0.923</mn></msup></math>
                <math className="math-secondary" display="block" aria-label="Semaglutide bioavailability is 0.847"><mi>F</mi><mo>=</mo><mn>0.847</mn></math>
                <math className="math-secondary" display="block" aria-label="Semaglutide absorption rate is 0.0253 per hour"><msub><mi>k</mi><mi>a</mi></msub><mo>=</mo><mn>0.0253</mn><msup><mi>h</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup></math>
              </div>
            </div>
            <small>The Overgaard et al. rich-sampling model uses an 85 kg reference. Body weight affects clearance, intercompartmental clearance, and both volumes; sex and height were not retained as important semaglutide covariates.</small>
          </div>
          <div className="equation-card">
            <span>Tirzepatide — published body-size covariates and fixed effects</span>
            <div className="math-scroll math-stack">
              <math className="math-display" display="block" aria-label="BMI equals body weight divided by height in meters squared">
                <mi>BMI</mi><mo>=</mo><mfrac><mi>BW</mi><msup><mrow><mo>(</mo><mi>H</mi><mo>/</mo><mn>100</mn><mo>)</mo></mrow><mn>2</mn></msup></mfrac>
              </math>
              <math className="math-display math-piecewise" display="block" aria-label="Fat free mass equals 9270 body weight over 6680 plus 216 BMI for males, or 9270 body weight over 8780 plus 244 BMI for females">
                <mi>FFM</mi><mo>=</mo><mo>&#123;</mo>
                <mtable columnalign="left left"><mtr><mtd><mfrac><mrow><mn>9270</mn><mi>BW</mi></mrow><mrow><mn>6680</mn><mo>+</mo><mn>216</mn><mi>BMI</mi></mrow></mfrac></mtd><mtd><mtext>male</mtext></mtd></mtr>
                <mtr><mtd><mfrac><mrow><mn>9270</mn><mi>BW</mi></mrow><mrow><mn>8780</mn><mo>+</mo><mn>244</mn><mi>BMI</mi></mrow></mfrac></mtd><mtd><mtext>female</mtext></mtd></mtr></mtable>
              </math>
              <math className="math-display" display="block" aria-label="clearance scale equals body weight over 70 to the 0.8 power">
                <msub><mi>s</mi><mi>CL</mi></msub><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>BW</mi><mn>70</mn></mfrac><mo>)</mo></mrow><mn>0.8</mn></msup>
              </math>
              <math className="math-display" display="block" aria-label="volume scale equals fat free mass plus 0.482 times fat mass over 70">
                <msub><mi>s</mi><mi>V</mi></msub><mo>=</mo><mfrac><mrow><mi>FFM</mi><mo>+</mo><mn>0.482</mn><mrow><mo>(</mo><mi>BW</mi><mo>−</mo><mi>FFM</mi><mo>)</mo></mrow></mrow><mn>70</mn></mfrac>
              </math>
              <div className="math-pair-grid">
                <math className="math-display" display="block" aria-label="Tirzepatide clearance equals 0.0329 times the clearance scale"><mi>CL</mi><mo>=</mo><mn>0.0329</mn><msub><mi>s</mi><mi>CL</mi></msub></math>
                <math className="math-display" display="block" aria-label="Tirzepatide Q equals 0.126 times the clearance scale"><mi>Q</mi><mo>=</mo><mn>0.126</mn><msub><mi>s</mi><mi>CL</mi></msub></math>
                <math className="math-display" display="block" aria-label="Tirzepatide central volume equals 2.47 times the volume scale"><msub><mi>V</mi><mi>c</mi></msub><mo>=</mo><mn>2.47</mn><msub><mi>s</mi><mi>V</mi></msub></math>
                <math className="math-display" display="block" aria-label="Tirzepatide peripheral volume equals 3.98 times the volume scale"><msub><mi>V</mi><mi>p</mi></msub><mo>=</mo><mn>3.98</mn><msub><mi>s</mi><mi>V</mi></msub></math>
                <math className="math-secondary" display="block" aria-label="Tirzepatide bioavailability is 0.80"><mi>F</mi><mo>=</mo><mn>0.80</mn></math>
                <math className="math-secondary" display="block" aria-label="Tirzepatide absorption rate is 0.0373 per hour"><msub><mi>k</mi><mi>a</mi></msub><mo>=</mo><mn>0.0373</mn><msup><mi>h</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup></math>
              </div>
            </div>
            <small>FFM = 9270BW/(6680+216BMI) for males or 9270BW/(8780+244BMI) for females. The volume equation is applied to both Vc and Vp.</small>
          </div>
          <div className="equation-card">
            <span>Default one-compartment parameter reductions</span>
            <div className="math-scroll math-stack parameter-math">
              <div className="math-parameter-group">
                <strong>Semaglutide</strong>
                <div className="math-pair-grid">
                  <math className="math-display" display="block" aria-label="Semaglutide half-life is 7.37 days"><msub><mi>t</mi><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msub><mo>=</mo><mn>7.37</mn><mi>d</mi></math>
                  <math className="math-display" display="block" aria-label="Semaglutide apparent volume is 12.2 liters"><mi>V</mi><mo>/</mo><mi>F</mi><mo>=</mo><mn>12.2</mn><mi>L</mi></math>
                  <math className="math-display" display="block" aria-label="Semaglutide absorption rate is 0.0286 per hour"><msub><mi>k</mi><mi>a</mi></msub><mo>=</mo><mn>0.0286</mn><msup><mi>h</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup></math>
                  <math className="math-display" display="block" aria-label="Semaglutide apparent clearance is 0.0478 liters per hour"><mi>CL</mi><mo>/</mo><mi>F</mi><mo>=</mo><mn>0.0478</mn><mi>L</mi><mo>/</mo><mi>h</mi></math>
                </div>
              </div>
              <div className="math-parameter-group">
                <strong>Tirzepatide</strong>
                <div className="math-pair-grid">
                  <math className="math-display" display="block" aria-label="Tirzepatide half-life is 5.4 days"><msub><mi>t</mi><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msub><mo>=</mo><mn>5.4</mn><mi>d</mi></math>
                  <math className="math-display" display="block" aria-label="Tirzepatide apparent volume is 10.3 liters"><mi>V</mi><mo>/</mo><mi>F</mi><mo>=</mo><mn>10.3</mn><mi>L</mi></math>
                  <math className="math-display" display="block" aria-label="Tirzepatide absorption rate is 0.0373 per hour"><msub><mi>k</mi><mi>a</mi></msub><mo>=</mo><mn>0.0373</mn><msup><mi>h</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup></math>
                </div>
              </div>
            </div>
            <small>The semaglutide values come from its published phase 3 population model. Tirzepatide uses its population half-life and apparent volume as a transparent reduced model; no overall personal-accuracy percentage is claimed.</small>
          </div>
          <div className="equation-card surrogate-card">
            <span>Retatrutide surrogate targets</span>
            <div className="math-scroll">
              <div className="math-pair-grid math-three-up">
                <math className="math-display" display="block" aria-label="Retatrutide half-life is approximately 6 days"><msub><mi>t</mi><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msub><mo>≈</mo><mn>6</mn><mi>d</mi></math>
                <math className="math-display" display="block" aria-label="Retatrutide apparent terminal volume is 7.36 liters"><msub><mi>V</mi><mi>z</mi></msub><mo>/</mo><mi>F</mi><mo>=</mo><mn>7.36</mn><mi>L</mi></math>
                <math className="math-display" display="block" aria-label="Retatrutide absorption rate is 0.08 per hour"><msub><mi>k</mi><mi>a</mi></msub><mo>=</mo><mn>0.08</mn><msup><mi>h</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup></math>
              </div>
            </div>
            <small>The half-life and mean terminal apparent volume come from phase 1 cohorts. kₐ is fitted so the simplified curve reproduces the observed timing and exposure. Only one-compartment retatrutide plotting is available.</small>
          </div>
          <p className="model-distinction"><strong>How the compounded tab differs.</strong> Compounded semaglutide and tirzepatide run through the same respective model and published parameters as their branded counterparts. This produces a useful reference curve, but assumes brand-like pharmacokinetics that a compounded formulation may not reproduce. Retatrutide uses the one-compartment equation with the explicitly fitted surrogate parameters above.</p>
          <div className="equation-grid">
            <div><span>One-compartment elimination</span><math className="math-mini" display="block" aria-label="k e equals natural log of 2 divided by half-life in hours"><msub><mi>k</mi><mi>e</mi></msub><mo>=</mo><mfrac><mrow><mi>ln</mi><mo stretchy="false">(</mo><mn>2</mn><mo stretchy="false">)</mo></mrow><msub><mi>t</mi><mrow><mn>1</mn><mo>/</mo><mn>2</mn></mrow></msub></mfrac></math><p>All one-compartment curves derive elimination from the stated half-life after converting days to hours.</p></div>
            <div><span>Modeled weight</span><div className="math-mini-stack"><math className="math-mini" display="block" aria-label="W of t equals the maximum of zero and elapsed hours after the first dose divided by 168"><mi>W</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><mi>max</mi><mrow><mo>(</mo><mn>0</mn><mo>,</mo><mfrac><mrow><mi>t</mi><mo>−</mo><msub><mi>t</mi><mn>0</mn></msub></mrow><mn>168</mn></mfrac><mo>)</mo></mrow></math><math className="math-mini" display="block" aria-label="L of t equals 0.45359237 kilograms times W of t"><mi>L</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><mn>0.45359237</mn><mi>W</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo></math><math className="math-mini" display="block" aria-label="body weight at time t is the maximum of 30 kilograms and starting weight minus L of t"><mi>BW</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><mi>max</mi><mrow><mo>(</mo><mn>30</mn><mo>,</mo><msub><mi>BW</mi><mn>0</mn></msub><mo>−</mo><mi>L</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>)</mo></mrow></math></div><p>Two-compartment mode assumes 1 lb/week loss after the first dose and floors weight at 30 kg.</p></div>
            <div><span>Dose schedule</span><div className="math-mini-stack"><math className="math-mini" display="block" aria-label="base dose time equals the first active week offset plus the time-of-day offset"><msub><mi>t</mi><mi>base</mi></msub><mo>=</mo><mrow><mo>(</mo><msub><mi>w</mi><mi>from</mi></msub><mo>−</mo><mn>1</mn><mo>)</mo></mrow><mn>168</mn><mo>+</mo><mi>δ</mi></math><math className="math-mini" display="block" aria-label="dose time sub n equals base dose time plus n times 24 times interval days"><msub><mi>t</mi><mi>n</mi></msub><mo>=</mo><msub><mi>t</mi><mi>base</mi></msub><mo>+</mo><mi>n</mi><mo stretchy="false">(</mo><mn>24</mn><mi>I</mi><mo stretchy="false">)</mo></math><math className="math-mini" display="block" aria-label="dose time sub n is less than 168 times the final active week"><msub><mi>t</mi><mi>n</mi></msub><mo>&lt;</mo><mn>168</mn><msub><mi>w</mi><mi>to</mi></msub></math></div><p>δ is 6, 12, or 18 hours for Morning, Afternoon, or Night. I is 7 days normally or the selected compounded interval; doses stop before 168 × “To week.”</p></div>
            <div><span>Repeated doses</span><math className="math-mini" display="block" aria-label="total concentration at time t equals the sum over all scheduled doses of dose concentration sub i at time t"><msub><mi>C</mi><mi>total</mi></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mo>=</mo><munder><mo>∑</mo><mi>i</mi></munder><msub><mi>C</mi><mi>i</mi></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo></math><p>Every scheduled injection contributes its own curve; Accumulate adds all active regimen curves while Compare displays them separately.</p></div>
            <div><span>Unit conversion</span><math className="math-mini" display="block" aria-label="one milligram per liter equals one thousand nanograms per milliliter"><mfrac><mn>1 mg</mn><mn>1 L</mn></mfrac><mo>=</mo><mfrac><mn>1000 ng</mn><mn>1 mL</mn></mfrac></math><p>Dose is entered in mg, amount states use µg, volume is in L, and the chart reports ng/mL.</p></div>
            <div><span>Area under curve</span><div className="math-mini-stack"><math className="math-mini" display="block" aria-label="T sub j equals the average of concentration j minus one and concentration j"><msub><mi>T</mi><mi>j</mi></msub><mo>=</mo><mfrac><mrow><msub><mi>C</mi><mrow><mi>j</mi><mo>−</mo><mn>1</mn></mrow></msub><mo>+</mo><msub><mi>C</mi><mi>j</mi></msub></mrow><mn>2</mn></mfrac></math><math className="math-mini" display="block" aria-label="AUC is approximated by the sum from j equals 1 to N of T sub j times delta t"><mi>AUC</mi><mo>≈</mo><munderover><mo>∑</mo><mrow><mi>j</mi><mo>=</mo><mn>1</mn></mrow><mi>N</mi></munderover><msub><mi>T</mi><mi>j</mi></msub><mi>Δt</mi></math><math className="math-mini" display="block" aria-label="delta t equals six hours"><mi>Δt</mi><mo>=</mo><mn>6</mn><mi>h</mi></math></div><p>The displayed AUC uses the trapezoidal rule with six-hour samples.</p></div>
          </div>
          <ol className="process-list">
            <li><span>1</span><div><strong>Schedule doses</strong><p>The selected start date begins at midnight. Morning, Afternoon, and Night map internally to +6, +12, and +18 hours. Standard regimens repeat every 168 hours; a compounded custom interval repeats every X × 24 hours until the end of the selected final week.</p></div></li>
            <li><span>2</span><div><strong>Apply the weight assumption</strong><p>In two-compartment mode, modeled weight begins at the entered first-dose weight and decreases continuously by 1 lb per week. To prevent impossible values on very long graphs, the calculation floors modeled weight at 30 kg (66 lb).</p></div></li>
            <li><span>3</span><div><strong>Sample the timeline</strong><p>The body-size-adjusted semaglutide and tirzepatide differential equations are integrated in one-hour Runge–Kutta steps. All graph curves and AUC values are retained at six-hour intervals through 1–520 weeks.</p></div></li>
            <li><span>4</span><div><strong>Accumulate or compare</strong><p>Accumulate sums the active regimen curves. Compare keeps them as separate lines. Different compounds are never treated as dose-equivalent.</p></div></li>
            <li><span>5</span><div><strong>Scale and inspect</strong><p>The y-axis rounds upward to a clean 1–2–5–10 scale above the maximum. Hover and keyboard readings snap to the nearest six-hour sample.</p></div></li>
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
                <tr><th>Model structure</th><td>One compartment by default; optional two compartments</td><td>One compartment by default; optional two compartments</td><td>One-compartment surrogate only</td></tr>
                <tr><th>Absorption rate kₐ</th><td>0.0286 h⁻¹ one-comp; 0.0253 h⁻¹ two-comp</td><td>0.0373 h⁻¹</td><td>0.08 h⁻¹ fitted</td></tr>
                <tr><th>Half-life reference</th><td>7.37 days</td><td>5.4 days population mean</td><td>≈6 days</td></tr>
                <tr><th>Bioavailability F</th><td>Included in V/F one-comp; 0.847 two-comp</td><td>Included in V/F one-comp; 0.80 two-comp</td><td>Included in Vz/F</td></tr>
                <tr><th>Clearance CL</th><td>CL/F 0.0478 L/h one-comp; 0.0348 L/h / 85 kg two-comp</td><td>0.0329 L/h / 70 kg two-comp</td><td>—</td></tr>
                <tr><th>Intercompartmental Q</th><td>0.304 L/h / 85 kg</td><td>0.126 L/h / 70 kg</td><td>—</td></tr>
                <tr><th>Central volume Vc</th><td>3.59 L / 85 kg</td><td>2.47 L / 70 kg</td><td>—</td></tr>
                <tr><th>Peripheral volume Vp</th><td>4.10 L / 85 kg</td><td>3.98 L / 70 kg</td><td>—</td></tr>
                <tr><th>One-compartment V/F</th><td>12.2 L</td><td>10.3 L</td><td>7.36 L cohort mean</td></tr>
                <tr><th>Body-size scaling</th><td>BW exponent 1.01 for CL/Q; 0.923 for Vc/Vp</td><td>BW exponent 0.8 for CL/Q; FFM-adjusted Vc/Vp</td><td>None</td></tr>
                <tr><th>Model status</th><td>Both structures published</td><td>Published two-compartment model; transparent one-compartment reduction</td><td>Phase 1 fitted surrogate</td></tr>
              </tbody>
            </table>
          </div>
          <div className="parameter-notes">
            <article><span>SEMA</span><h3>Semaglutide</h3><p>The default uses the Petri et al. phase 3 one-compartment values: kₐ 0.0286 h⁻¹, CL/F 0.0478 L/h, and V/F 12.2 L. The optional Overgaard et al. rich-sampling two-compartment model uses F 0.847, kₐ 0.0253 h⁻¹, CL 0.0348 L/h, Q 0.304 L/h, Vc 3.59 L, and Vp 4.10 L at 85 kg, with the published body-weight exponents.</p></article>
            <article><span>TIRZ</span><h3>Tirzepatide</h3><p>The default one-compartment reduction uses t½ 5.4 days, V/F 10.3 L, and kₐ 0.0373 h⁻¹. The optional Schneck & Urva two-compartment model uses F 0.80, CL 0.0329 L/h, Q 0.126 L/h, Vc 2.47 L, and Vp 3.98 L at 70 kg, scaling CL/Q with total weight and Vc/Vp with sex-, height-, and BMI-derived fat-free mass.</p></article>
            <article><span>RETA</span><h3>Retatrutide</h3><p>Coskun et al. reported dose-level half-lives of 134–165 hours, T<sub>max</sub> values of 12–72 hours, C<sub>max</sub> of 110 ng/mL and AUC<sub>0–∞</sub> of 28,300 ng·h/mL at 1 mg, plus Vz/F values across six cohorts. The code uses the approximately six-day half-life, the 7.36 L cohort-mean Vz/F, and fits kₐ to 0.08 h⁻¹. This is a transparent surrogate, not a published population model.</p></article>
          </div>
        </div>
      </section>

      <section className="method-block" id="checks">
        <div className="method-block-title"><span>03</span><div><p className="eyebrow">Math checks</p><h2>Internal and external validation.</h2></div></div>
        <div className="method-copy">
          <div className="check-grid">
            <article><span className="check-mark">✓</span><h3>Steady-state semaglutide</h3><p>The default one-compartment model predicts average steady-state concentrations of 62.3 ng/mL at 0.5 mg and 124.5 ng/mL at 1 mg. The Ozempic label reports approximately 65 and 123 ng/mL—differences of 4.2% and 1.2%.</p></article>
            <article><span className="check-mark">✓</span><h3>Semaglutide rich-PK model</h3><p>Automated checks reproduce Overgaard et al.’s two-compartment fixed effects, body-weight exponents, dose proportionality, and expected F·Dose/CL exposure at the 85 kg reference.</p></article>
            <article><span className="check-mark">✓</span><h3>Tirzepatide peak timing</h3><p>The published two-compartment fixed effects predict a single-dose central-plasma peak at 29.6 hours. FDA labeling reports a median of 24 hours and a range of 8–72 hours.</p></article>
            <article><span className="check-mark">✓</span><h3>Tirzepatide body-size equations</h3><p>Automated checks reproduce the 0.8 allometric scaling for CL and Q, the sex-specific fat-free mass equations, and the 0.482 fat-mass fraction used for volumes.</p></article>
            <article><span className="check-mark">✓</span><h3>One- versus two-compartment</h3><p>At 5 mg and the fixed 70 kg tirzepatide reference, the one-compartment option peaks at 350.7 ng/mL after 60.8 hours versus 515.0 ng/mL after 29.6 hours for the two-compartment model. This compares structures, not personal accuracy.</p></article>
            <article><span className="check-mark">✓</span><h3>Dose proportionality</h3><p>The equation is linear in dose: doubling a dose doubles every concentration and AUC value. That matches the dose-proportional exposure reported for semaglutide, tirzepatide, and retatrutide.</p></article>
            <article><span className="check-mark">✓</span><h3>Accumulation behavior</h3><p>Repeated weekly doses approach a plateau over roughly 4–5 half-lives. This matches labeled steady state at 4–5 weeks for semaglutide and 4 weeks for tirzepatide.</p></article>
            <article><span className="check-mark">✓</span><h3>Dose-time scheduling</h3><p>Automated checks confirm that a dose contributes zero before its selected Morning, Afternoon, or Night offset and begins contributing after that scheduled point.</p></article>
            <article><span className="check-mark">✓</span><h3>Custom interval scheduling</h3><p>Automated checks confirm that compounded schedules repeat at the selected whole-day interval and stop before the week following the chosen “To week.”</p></article>
            <article><span className="check-mark">✓</span><h3>Retatrutide phase 1 fit</h3><p>At 1 mg, the surrogate predicts T<sub>max</sub> 37.4 hours, C<sub>max</sub> 113.5 ng/mL, and AUC 28,227 ng·h/mL. Phase 1 observations were 12–72 hours overall, 110 ng/mL, and 28,300 ng·h/mL.</p></article>
          </div>
          <div className="audit-strip"><span>Automated calculation checks</span><strong>two published semaglutide structures</strong><strong>body-size covariates</strong><strong>1 lb/week assumption</strong><strong>two-compartment AUC balance</strong></div>
        </div>
      </section>

      <section className="method-block" id="limits">
        <div className="method-block-title"><span>04</span><div><p className="eyebrow">Model limits</p><h2>What this cannot tell you.</h2></div></div>
        <div className="method-copy limit-copy">
          <p>Actual exposure varies with body size, injection timing and site, formulation, adherence, individual clearance, assay method, and other clinical factors. The optional body-size inputs refine population-model parameters but do not identify an individual’s true pharmacokinetics.</p>
          <ul>
            <li><strong>Not a measured level.</strong> The tooltip is a population-model estimate, not a laboratory result.</li>
            <li><strong>Body-size adjusted, not individualized PK.</strong> Weight, height, and sex adjust the published typical parameters; unexplained interindividual and residual variability remain.</li>
            <li><strong>Weight history is assumed.</strong> Two-compartment mode assumes exactly 1 lb of loss per week after the first dose and floors modeled weight at 30 kg. Real weight trajectories vary, plateau, or reverse.</li>
            <li><strong>Semaglutide weight change is extrapolated.</strong> Overgaard et al. assessed body weight as a baseline covariate. Reapplying its weight equations along the assumed 1 lb/week path is a transparent site assumption, not a directly validated longitudinal semaglutide model.</li>
            <li><strong>Semaglutide reference choices are fixed.</strong> The optional curve uses the paper’s healthy-reference, 1.34 mg/mL product-strength fixed effects because the form does not ask for glycaemic status or product concentration.</li>
            <li><strong>Semaglutide covariates differ.</strong> The published semaglutide model retained body weight as the important covariate; sex and height are collected because they are required by tirzepatide’s fat-free-mass equation, not because they improve semaglutide parameters.</li>
            <li><strong>No model-accuracy percentage.</strong> The sources do not report one universal personal-accuracy score, so the site does not invent one.</li>
            <li><strong>Not dose equivalence.</strong> Adding semaglutide and tirzepatide concentrations is a mass visualization only and does not imply equal effect or safety.</li>
            <li><strong>Custom intervals are descriptive only.</strong> The compounded control models the schedule entered; it does not establish that the interval is appropriate or safe.</li>
            <li><strong>Not oral semaglutide.</strong> Rybelsus and Wegovy tablets use daily oral dosing with highly condition-dependent bioavailability, so they are outside this injected-dose model.</li>
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
