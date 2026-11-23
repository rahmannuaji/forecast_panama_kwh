---
version: 1
slug: "dashboard-index-html"
primary_target: "dashboard/index.html"
related_targets: ["streamlit_app.py"]
---

# Surface: dashboard/index.html (GitHub Pages)

Mode: Operate. Audience: lecturer and classmates of an S2 statistics course, projected in class or on a laptop. Task: understand what is forecast, which of four models wins and why, how weather in three cities relates to load, and test weather scenarios themselves. Content: precomputed notebook outputs in dashboard/data.js only. Constraints: static HTML, Indonesian copy, assumptions labelled beside affected numbers. Streamlit version follows this surface later.

## Direction contract

THESIS: The dashboard is a climate atlas of Panama's electricity: three cities' weather read as atlas climate diagrams beside the national load curve. It refuses the default KPI-card admin dashboard with a sidebar and identical tiles.

OWN-WORLD: Atlas paper ground #f7f5ee, ink #1d1d1b hairline frames (1px ink rules, no soft gray borders, square corners), temperature red #c8372d and precipitation blue #2b6cb0 used with Walter-Lieth meaning, hypsometric model inks (plum #a3366f, ochre #a8690c, lowland green #3d8a4a, indigo #5a4aa8; olive and slate failed the CVD validator against ochre, so green and indigo replace them, with dash patterns as secondary encoding). Cities use an ink-gray family (#5e5b53, #7d796d, #959184; national load stays pure ink) with dash and marker shapes, so no hue means a model on one tab and a city on another; blue is reserved for precipitation and red for temperature. Libre Franklin in heavy display weights over light body, tabular figures everywhere.

STORY: The visitor learns the load's rhythm, sees weather matters less than calendar, sees Chronos-2 with covariates win, understands each model's path, then drags a temperature slider and watches forecasts respond.

FIRST VIEWPORT: Top bar with product name and five tabs (Beranda active, red underline). H1 question across the width. Row of three city climatographs (Tocumen, Santiago, David) in ink-framed panels, KPI column at right (best MAPE, holiday effect, COVID drop). National daily load 2015-2020 below spanning three columns, test period shaded.

FORM: Atlas Iklim Tiga Kota, position 1 on my ordered list (taken as the pick). seed:e31e5bcb3b1c37be. Signature move: each city is a Walter-Lieth style climatograph (monthly temperature line over precipitation fill); selecting a city panel makes it the active city for the whole weather tab.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

None.
