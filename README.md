# GLP-1 Concentration Plotter

[Open the live site](https://dev1niscool.github.io/glp1concentration/)

An educational, browser-based pharmacokinetic visualization for injected semaglutide and tirzepatide. Configure a start date, any whole-number graph duration, official dose steps, Morning/Afternoon/Night dose timing, and active weeks; then accumulate or compare modeled plasma concentration curves.

The separate Compounded tab accepts custom doses and optional whole-day injection intervals for semaglutide and tirzepatide and includes a clearly labeled educational retatrutide simulation. Compounded semaglutide and tirzepatide reuse the branded population-PK parameters as an estimate. Retatrutide uses a one-compartment surrogate fitted to published phase 1 human PK. Retatrutide is investigational, and FDA states it cannot be used in compounding under federal law.

The Methodology page documents the equation, exact parameters used by the code, dose-time offsets, validation checks, primary sources, and limitations.

## Model

The calculator defaults to one-compartment estimates for semaglutide and tirzepatide. An optional body-size-adjusted two-compartment mode uses the published rich-sampling models for both compounds and assumes 1 lb of weight loss per week after the first dose. Retatrutide remains one-compartment only. Each scheduled dose contribution is superposed across the selected timeline, and every tab reports estimated plasma concentration in ng/mL rather than a measured blood level or personal dosing recommendation.

- Semaglutide: default one-compartment model with approximately 7-day half-life, kₐ 0.0286 h⁻¹, and apparent V/F 12.2 L; optional two-compartment model with F 0.847, kₐ 0.0253 h⁻¹, CL 0.0348 L/h, Q 0.304 L/h, Vc 3.59 L, and Vp 4.10 L at 85 kg.
- Tirzepatide: default one-compartment reduction with a 5.4-day half-life and V/F 10.3 L; optional two-compartment model with F 0.80, kₐ 0.0373 h⁻¹, CL 0.0329 L/h, Q 0.126 L/h, Vc 2.47 L, and Vp 3.98 L at 70 kg.
- Retatrutide: approximately 6-day half-life, fitted kₐ 0.08 h⁻¹, and cohort-mean apparent Vz/F 7.36 L from phase 1 PK.

Sources are linked on the site and include FDA prescribing information plus population pharmacokinetic analyses for both compounds. Rybelsus is not included because daily oral semaglutide has different doses and absorption.

## Equations used by the plotter

All time values in the calculations are hours. Dose is entered in mg, amount states use µg, volumes use L, and concentration is reported in ng/mL.

### One-compartment model

For dose \(D_i\) given at \(t_i\), the default Bateman function is:

$$
C_i(t)=
\frac{D_i\cdot1000}{V/F}
\frac{k_a}{k_a-k_e}
\left(e^{-k_e\Delta t}-e^{-k_a\Delta t}\right),
\qquad
\Delta t=t-t_i\ge 0
$$

The adjacent factors are multiplied; \(C_i(t)=0\) before the dose. Elimination is derived from half-life:

$$
k_e=\frac{\ln(2)}{24t_{1/2,\mathrm{days}}}
$$

The parameter sets are:

$$
\begin{aligned}
\text{Semaglutide:}\quad&
t_{1/2}=7.37\,\mathrm d,&
k_a&=0.0286\,\mathrm h^{-1},&
V/F&=12.2\,\mathrm L,&
CL/F&=0.0478\,\mathrm{L\,h^{-1}}\\
\text{Tirzepatide:}\quad&
t_{1/2}=5.4\,\mathrm d,&
k_a&=0.0373\,\mathrm h^{-1},&
V/F&=10.3\,\mathrm L\\
\text{Retatrutide surrogate:}\quad&
t_{1/2}\approx6\,\mathrm d,&
k_a&=0.08\,\mathrm h^{-1},&
V_z/F&=7.36\,\mathrm L
\end{aligned}
$$

### Two-compartment reference solution

For semaglutide and tirzepatide, the micro- and macro-rate constants are:

$$
k_{10}=\frac{CL}{V_c},
\qquad
k_{12}=\frac{Q}{V_c},
\qquad
k_{21}=\frac{Q}{V_p},
\qquad
S=k_{10}+k_{12}+k_{21}
$$

$$
\alpha,\beta=
\frac{S\pm\sqrt{S^2-4k_{10}k_{21}}}{2}
$$

Defining

$$
g(r,\Delta t)=
\frac{k_a}{k_a-r}
\left(e^{-r\Delta t}-e^{-k_a\Delta t}\right),
\qquad
w_\alpha=\frac{\alpha-k_{21}}{\alpha-\beta},
\qquad
w_\beta=\frac{k_{21}-\beta}{\alpha-\beta},
$$

the central-plasma concentration from one injection is:

$$
C_i(t)=
\frac{F D_i\cdot1000}{V_c}
\left[
w_\alpha g(\alpha,\Delta t)+
w_\beta g(\beta,\Delta t)
\right]
$$

### Published body-size covariates

The semaglutide two-compartment model uses an 85 kg reference:

$$
\begin{aligned}
CL&=0.0348\left(\frac{BW}{85}\right)^{1.01},&
Q&=0.304\left(\frac{BW}{85}\right)^{1.01},\\
V_c&=3.59\left(\frac{BW}{85}\right)^{0.923},&
V_p&=4.10\left(\frac{BW}{85}\right)^{0.923},\\
F&=0.847,&
k_a&=0.0253\,\mathrm h^{-1}.
\end{aligned}
$$

For tirzepatide, height \(H\) is entered in cm and sex selects the published fat-free-mass equation:

$$
BMI=\frac{BW}{(H/100)^2},
\qquad
FFM=
\begin{cases}
\dfrac{9270BW}{6680+216BMI},&\text{male}\\[6pt]
\dfrac{9270BW}{8780+244BMI},&\text{female}
\end{cases}
$$

$$
s_{CL}=\left(\frac{BW}{70}\right)^{0.8},
\qquad
s_V=\frac{FFM+0.482(BW-FFM)}{70}
$$

$$
\begin{aligned}
CL&=0.0329s_{CL},&
Q&=0.126s_{CL},&
V_c&=2.47s_V,&
V_p&=3.98s_V,\\
F&=0.80,&
k_a&=0.0373\,\mathrm h^{-1}.
\end{aligned}
$$

### Time-varying two-compartment integration

When body size changes, the plotter recalculates the covariates above and integrates these amount equations:

$$
\frac{dA_d}{dt}=-k_aA_d
$$

$$
\frac{dA_c}{dt}
=Fk_aA_d-CL\,C_c-Q(C_c-C_p),
\qquad
\frac{dA_p}{dt}=Q(C_c-C_p)
$$

$$
C_c=\frac{A_c}{V_c},
\qquad
C_p=\frac{A_p}{V_p},
\qquad
A_d(t_i^+)=A_d(t_i^-)+1000D_i
$$

These equations are advanced in one-hour fourth-order Runge–Kutta steps. The assumed longitudinal weight is:

$$
BW(t)=
\max\left(
30,\,
BW_0-0.45359237
\frac{\max(0,t-t_0)}{168}
\right)\ \mathrm{kg}
$$

This is exactly 1 lb of modeled loss per week after the first dose, with a 30 kg floor.

### Scheduling, accumulation, and AUC

For the active week range, scheduled dose times are:

$$
t_n=(w_{\mathrm{from}}-1)168+\delta+n(24I),
\qquad
t_n<168w_{\mathrm{to}}
$$

Here \(\delta\in\{6,12,18\}\) is the internal Morning/Afternoon/Night offset. \(I=7\) for standard weekly regimens; on the Compounded tab, \(I\) can instead be the selected whole-day interval.

Repeated injections and active regimens are superposed:

$$
C_{\mathrm{total}}(t)=\sum_i C_i(t)
$$

The chart samples every six hours and reports the trapezoidal area under the displayed curve:

$$
AUC\approx
\sum_{j=1}^{N}
\frac{C_{j-1}+C_j}{2}\Delta t,
\qquad
\Delta t=6\,\mathrm h
$$

The numerical unit identity used by the concentration equations is:

$$
1\,\mathrm{mg/L}=1000\,\mathrm{ng/mL}
$$

## Development

```bash
npm install
npm run dev
npm run test:pk
```

`npm run build` validates the hosted Sites build. `GITHUB_PAGES=true npm run build:pages` creates the static `out` directory deployed by the included GitHub Pages workflow.

## Analytics

Cloudflare Web Analytics is supported through its privacy-first JavaScript beacon. Create a Web Analytics site for `dev1niscool.github.io`, then add its site token to the GitHub repository variable `CLOUDFLARE_WEB_ANALYTICS_TOKEN`; the Pages workflow includes it in every route on the next deployment. For local builds, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. Leaving the value blank disables analytics.

## Disclaimer

Educational use only. Not medical advice. Do not use the chart to start, stop, combine, or change medication.
