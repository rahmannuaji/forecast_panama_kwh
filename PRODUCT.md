# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS served from GitHub Pages (user chose "github io"; Streamlit version follows it later). No build step; data is precomputed by the notebook into `dashboard/data.js`.

## Users

Lecturer and classmates of an S2 Statistics course (Analisis Data Lanjut). They open the site during a presentation or while grading, want to check the methodology quickly, and want to play with inputs (model, city, weather scenario) to see how the forecasts respond.

## Product Purpose

An interactive companion to a forecasting study of Panama's hourly national electricity load (2015 to June 2020). It summarises the data, the weather relationship in three cities, the accuracy of four models, how each model works, and their 24-hour forecasts. Success: a visitor understands what is forecast, which model wins and why, within a few minutes, and can test the effect of weather on the forecast themselves.

## Positioning

Every number comes from a reproducible notebook in the same repository (rolling-origin backtest, 178 daily origins, Normal vs COVID-19 regimes). Interactions are precomputed scenarios from the real models, not illustrative mock-ups.

## Operating Context

Projected in a classroom or opened on a laptop; Indonesian language throughout. Companion artefacts: `Analisis_Forecasting_Beban_Listrik_Panama.ipynb` (step-by-step analysis) and `LAPORAN_ANALISIS.md` (detailed written explanation).

## Capabilities and Constraints

- Four models: Chronos-2 (with a covariate on/off toggle), Chronos-Bolt, TimesFM 2.0, XGBoost.
- Foundation model weights (190 MB to 2 GB) cannot run on GitHub Pages; the site only shows precomputed results.
- Weather scenarios: temperature shifts per city computed in the notebook for XGBoost and Chronos-2 with covariates.
- Weather covariates in the backtest are observed values (oracle), and future weather beyond 27 June 2020 is not in the dataset; any assumption must be labelled.

## Evidence on Hand

Dataset `Panama_beban_listrik_per_jam_2015-2020_.xlsx` (Aguilar Madrid & Antonio, 2021), backtest outputs in `outputs/`, saved models in `models/`. No external benchmarks or claims beyond what the notebook computes.

## Product Principles

1. Every figure traceable to the notebook.
2. Explain before impressing: plain Indonesian, terms defined where they first appear.
3. Let the visitor test claims through inputs rather than read them.
4. State assumptions and limits next to the numbers they affect.
