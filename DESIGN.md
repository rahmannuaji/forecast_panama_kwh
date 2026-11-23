---
name: Atlas Beban Panama
description: A climate atlas of Panama's electricity load, read as printed climate diagrams beside the national load curve.
colors:
  atlas-paper: "#f7f5ee"
  panel-paper: "#fbfaf6"
  wash: "#efebe0"
  hairline: "#d9d4c6"
  chart-grid: "#e4dfd1"
  ink: "#1d1d1b"
  ink-2: "#45443f"
  muted: "#5b5a55"
  temperature-red: "#c8372d"
  precipitation-blue: "#2b6cb0"
  model-plum: "#a3366f"
  model-ochre: "#a8690c"
  model-lowland-green: "#3d8a4a"
  model-indigo: "#5a4aa8"
  city-tocumen-gray: "#5e5b53"
  city-santiago-gray: "#7d796d"
  city-david-gray: "#959184"
typography:
  display:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 46px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  lede:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  chart:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  none: "0px"
spacing:
  grid-gap: "22px"
  panel-y: "20px"
  panel-x: "22px"
  control-row: "18px"
  control-col: "28px"
  block: "56px"
  page-x: "40px"
  page-x-mobile: "18px"
components:
  panel:
    backgroundColor: "{colors.panel-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 22px"
  panel-hover:
    backgroundColor: "#ffffff"
  segmented-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    height: "40px"
  segmented-button-hover:
    backgroundColor: "{colors.wash}"
  segmented-button-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.atlas-paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 14px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.wash}"
  select:
    backgroundColor: "{colors.panel-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 34px 8px 10px"
    height: "40px"
  tab:
    textColor: "{colors.ink-2}"
    padding: "22px 0 20px"
  tab-active:
    textColor: "{colors.ink}"
  tag:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.atlas-paper}"
    rounded: "{rounded.none}"
    padding: "6px 9px"
---

# Design System: Atlas Beban Panama

## Overview

**Creative North Star: "The Climate Atlas"**

The system reads like a printed physical atlas: warm uncoated paper, black ink rules, and a small set of map inks whose meaning never changes from page to page. Weather is drawn the way an atlas draws climate, as Walter-Lieth style climatographs, and the national load curve sits beside it in pure ink. It is dense, quiet, and meant to be projected in a classroom: large heavy figures, plain body text, and every number set in tabular figures so columns line up.

Hierarchy comes from weight and rules, not from shadows or fills. Panels are 1px ink frames with square corners on a barely-lighter paper; sections are separated by whitespace and a 3px ink top rule where a column of findings begins. Colour is semantic first and decorative never: red is temperature, blue is precipitation, four hypsometric inks are the four models, and cities are a family of ink-grays told apart by dash and marker shape.

The world explicitly rejects the default KPI-card admin dashboard: no sidebar, no identical rounded tiles, no soft gray card borders.

**Key Characteristics:**
- Atlas paper ground with 1px ink frames and square corners.
- Semantic colour: one meaning per hue across every tab.
- Every series carries a second encoding (dash pattern or marker shape) besides colour.
- Libre Franklin at heavy display weights (700–800) over a 400 body; tabular figures everywhere.
- Flat: depth by ink rules and paper tone, never shadow.

## Colors

A warm paper-and-ink base carrying a small, strictly semantic set of map inks.

### Primary
- **Temperature Red** (temperature-red): the temperature line in climatographs and every temperature-driven control (the scenario slider's accent). It doubles as the one UI accent: the active-tab underline, the focus ring, and text selection.

### Secondary
- **Precipitation Blue** (precipitation-blue): precipitation only, drawn as bars at 55% opacity beneath the temperature panel. It never marks a model, a city, or UI state.

### Tertiary (model inks)
- **Plum** (model-plum): Chronos-2, solid line.
- **Ochre** (model-ochre): Chronos-Bolt, dash 7/4.
- **Lowland Green** (model-lowland-green): TimesFM 2.0, dash 2/3.
- **Indigo** (model-indigo): XGBoost, dash 10/3/2/3.
Prediction intervals use the model's own ink at 16% opacity.

### Neutral
- **Atlas Paper** (atlas-paper): page ground, top bar, inverse text on ink.
- **Panel Paper** (panel-paper): panel and input fill, one step lighter than the ground; hover lifts to white.
- **Wash** (wash): hover fill on buttons and segmented controls; Streamlit secondary background.
- **Hairline** (hairline): row dividers inside tables, findings, and control bars.
- **Chart Grid** (chart-grid): chart gridlines only.
- **Ink** (ink): text, 1px frames, axis domain lines, pressed state, tooltips, and the national load series.
- **Ink-2** (ink-2): secondary text, ledes, axis ticks and titles.
- **Muted** (muted): subtitles, small captions, ramp-legend labels.
- **City grays**: Tocumen (city-tocumen-gray, solid, circle), Santiago (city-santiago-gray, dash 7/4, triangle), David (city-david-gray, dash 2/3, square).

### Named Rules
**The One Meaning Rule.** A hue means one thing on every tab. Red is temperature (and the single UI accent), blue is precipitation, the four inks are the four models. No hue may mean a model on one tab and a city on another.

**The Pure Ink Load Rule.** National load is always drawn in pure ink (#1d1d1b); its smoothing companions are paper-to-ink tints, never a colour.

**The Second Encoding Rule.** Every coloured series also carries a dash pattern or marker shape, because the model inks sit in the CVD floor band and are only legal with it.

**The Paper-to-Ink Scale Rule.** Sequential scales (heatmaps, year-over-year lines) ramp from paper (#efe9dc / #c9c3b3) to ink. Correlation is ink-only magnitude with a printed minus sign (−), never a red–blue diverging scale, since red and blue are already taken.

## Typography

**Display Font:** Libre Franklin (with system-ui, sans-serif)
**Body Font:** Libre Franklin (with system-ui, sans-serif)

**Character:** One grotesque in two registers: heavy, tightly tracked display for questions and figures, plain 400 for explanation, like an atlas plate's title block over its legend text.

### Hierarchy
- **Display** (800, clamp(30px, 3.4vw, 46px), 1.1): the page-level question at the top of each tab, max 34ch, balanced wrapping.
- **Figure** (800, 44px, 1): headline findings in the facts column; delta readouts use the same voice at 30px.
- **Headline** (800, 28px, 1.1): section heads within a tab.
- **Title** (700, 18px, 1.1): panel titles; sub-captions beneath at 14px in Muted.
- **Body** (400, 16px, 1.5): explanation, max 72ch. Ledes at 17px in Ink-2.
- **Label** (600, 13px): control labels above selects and segmented controls.
- **Chart** (400, 12.5px): ticks and legends; in-plot annotations and end labels at 600 12px; bar values at 700 13px.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on the body; every number, in tables, charts, and readouts, aligns by column. Numbers use Indonesian locale formatting (decimal comma) and a true minus sign (−).

**The Weight Not Size Rule.** Hierarchy steps by weight (400 → 600 → 700 → 800) before size; there are no uppercase tracked labels above headings.

## Layout

A centred 1440px column with 40px side padding (18px below 820px) under a sticky top bar. Content flows in CSS grids with a 22px gap: the home grid is three equal city columns plus a 300px findings column; other tabs use 2-, 3-, 2:1 and 1:2 grids. Sections are separated by 56px. Controls sit in a wrapping bar (18px row / 28px column gaps) closed by a hairline.

Responsive: at 1100px the findings column drops below the cities as a two-column strip; at 820px every grid collapses to one column, tabs scroll horizontally with a fade mask, and table padding tightens; below 640px charts drop their right-hand end labels. Charts have fixed heights (300px default, 380 tall, 220 short, 200 mini).

## Elevation & Depth

Flat. There are no box-shadows on surfaces. Depth comes from paper tone (ground #f7f5ee, panel #fbfaf6, hover white) and ink rules: 1px ink frames around panels and controls, a 3px ink top rule opening the findings and "what is forecast" columns, and hairline dividers between rows. The only shadow in the code is an inset 3px bottom rule used as the active-tab underline, which is a rule, not elevation.

### Named Rules
**The Ink Rule Rule.** Separation is drawn with ink lines (1px frame, 3px section rule) or hairlines; never with soft gray card borders or drop shadows.

## Shapes

Square corners on every frame, control, input, tag, and tooltip (0px; selects reset `border-radius:0`). Lines in charts are slightly eased (tension 0.25) at 2px. The only round form is the station dot in the model-flow diagram (22px circle with a 4px ink ring on a 6px track line), the atlas's own route-map vocabulary.

## Components

### Buttons
- **Shape:** square (0px), 1px ink frame, 40px minimum height, 8px 14px padding, 600 14px.
- **Default:** transparent on paper, ink text.
- **Hover / Active:** fill to Wash; press nudges down 1px.
- **Focus:** 2px Temperature Red outline, 2px offset (global).

### Segmented Controls
- **Style:** a row of buttons inside one 1px ink frame, divided by 1px ink rules.
- **State:** hover Wash; pressed (`aria-pressed="true"`) inverts to ink fill with paper text.

### Cards / Containers (Panels)
- **Corner Style:** square (0px).
- **Background:** Panel Paper; city panels lift to white on hover and are clickable.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px ink.
- **Internal Padding:** 20px 22px.
- **Callout:** same frame on white at 16px 20px, for the model verdict.

### Inputs / Fields
- **Style:** select and date inputs on Panel Paper, 1px ink frame, 0px radius, 40px height; selects carry an inline ink chevron. Range sliders and checkboxes use native controls with accent-color (red for the temperature slider, ink for checkboxes).
- **Hover:** fill to white.
- **Focus:** global red focus ring.

### Navigation
- **Style:** sticky top bar on Atlas Paper with a 1px ink bottom rule; brand at 800 19px with a 500 14px Muted descriptor.
- **Tabs:** 15px Ink-2 text; hover to Ink; active becomes Ink 700 with a 3px Temperature Red underline that animates in.
- **Mobile:** tabs wrap below the brand and scroll horizontally with a fade mask.

### Tables
- **Style:** full width, 14px, numeric columns right-aligned, hairline row rules, header bottom rule in ink at 700. Highlighted rows go bold rather than tinted. Colour swatches are 12px squares.

### Tooltip
- Ink fill, paper text, square, 13px. Chart tooltips match (0 corner radius, 10px padding, point-style keys).

### Climatograph (Signature Component)
Each city is a Walter-Lieth style climatograph: two stacked plot panels sharing one month axis, monthly temperature as a red line with 2.5px dots on top (weight 2), precipitation as blue bars below (weight 1.2). All three cities share one temperature scale and one precipitation scale, so panels compare at a glance. Units sit as small axis titles (°C, l/m²). Clicking a city panel makes it the active city for the whole weather tab.

### Event Marks
Periods are shaded bands (ink at 7%) with a 600 12px Ink-2 label inside; events are 1.5px dashed ink vertical rules (dash 4/3) with an ink label. Series end labels carry a 10×3px swatch of the series ink plus ink text at the right edge.

## Do's and Don'ts

### Do:
- **Do** frame panels and controls with a 1px ink (#1d1d1b) rule and square corners.
- **Do** keep red for temperature and blue for precipitation on every surface, including Streamlit.
- **Do** give every model and city series its dash pattern (and, for cities, marker shape) alongside its ink.
- **Do** draw national load in pure ink and sequential scales from paper to ink.
- **Do** stack temperature over precipitation on a shared month axis, with one scale shared across all three cities.
- **Do** set every number in tabular figures with Indonesian formatting and a true minus sign.

### Don't:
- **Don't** overlay two y-scales on the same plot area; stack panels instead.
- **Don't** use a red–blue diverging scale for correlation or any other quantity.
- **Don't** reuse a model ink for a city or a city gray for a model.
- **Don't** build the default KPI-card admin dashboard: no sidebar, no identical rounded tiles, no soft gray card borders.
- **Don't** add drop shadows to panels, buttons, or tooltips.
