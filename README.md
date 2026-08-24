# GLP-1 Concentration Plotter

[Open the live site](https://dev1niscool.github.io/glp1concentration/)

An educational, browser-based pharmacokinetic visualization for once-weekly injected semaglutide and tirzepatide. Configure a start date, any whole-number graph duration, official dose steps, Morning/Afternoon/Night dose timing, and active weeks; then accumulate or compare modeled plasma concentration curves.

The separate Compounded tab accepts custom doses for semaglutide and tirzepatide and includes a clearly labeled educational retatrutide simulation. Compounded semaglutide and tirzepatide reuse the branded population-PK parameters as an estimate. Retatrutide uses a one-compartment surrogate fitted to published phase 1 human PK. Retatrutide is investigational, and FDA states it cannot be used in compounding under federal law.

The Methodology page documents the equation, exact parameters used by the code, dose-time offsets, validation checks, primary sources, and limitations.

## Model

The calculator defaults to one-compartment estimates for semaglutide and tirzepatide. An optional body-size-adjusted two-compartment mode uses the published rich-sampling models for both compounds and assumes 1 lb of weight loss per week after the first dose. Retatrutide remains one-compartment only. Each weekly dose contribution is superposed across the selected timeline, and every tab reports estimated plasma concentration in ng/mL rather than a measured blood level or personal dosing recommendation.

- Semaglutide: default one-compartment model with approximately 7-day half-life, kₐ 0.0286 h⁻¹, and apparent V/F 12.2 L; optional two-compartment model with F 0.847, kₐ 0.0253 h⁻¹, CL 0.0348 L/h, Q 0.304 L/h, Vc 3.59 L, and Vp 4.10 L at 85 kg.
- Tirzepatide: default one-compartment reduction with a 5.4-day half-life and V/F 10.3 L; optional two-compartment model with F 0.80, kₐ 0.0373 h⁻¹, CL 0.0329 L/h, Q 0.126 L/h, Vc 2.47 L, and Vp 3.98 L at 70 kg.
- Retatrutide: approximately 6-day half-life, fitted kₐ 0.08 h⁻¹, and cohort-mean apparent Vz/F 7.36 L from phase 1 PK.

Sources are linked on the site and include FDA prescribing information plus population pharmacokinetic analyses for both compounds. Rybelsus is not included because daily oral semaglutide has different doses and absorption.

## Development

```bash
npm install
npm run dev
npm run test:pk
```

`npm run build` validates the hosted Sites build. `GITHUB_PAGES=true npm run build:pages` creates the static `out` directory deployed by the included GitHub Pages workflow.

## Disclaimer

Educational use only. Not medical advice. Do not use the chart to start, stop, combine, or change medication.
