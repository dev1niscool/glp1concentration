# Half Life — GLP-1 Concentration Plotter

An educational, browser-based pharmacokinetic visualization for once-weekly injected semaglutide and tirzepatide. Configure a start date, graph duration, official requested dose steps, and active weeks; then accumulate or compare modeled plasma concentration curves.

The separate Methodology page documents the equation, exact parameters used by the code, external validation checks, primary sources, and limitations.

## Model

The calculator uses a one-compartment model with first-order subcutaneous absorption and elimination. Each weekly dose contribution is superposed across the selected timeline. The output is an estimated plasma concentration in ng/mL, not a measured blood level or a personal dosing recommendation.

- Semaglutide: approximately 7-day half-life, kₐ 0.0286 h⁻¹, apparent V/F 12.2 L.
- Tirzepatide: approximately 5-day half-life, kₐ 0.0373 h⁻¹, apparent V/F 10.3 L.

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
