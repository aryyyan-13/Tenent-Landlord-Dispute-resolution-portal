---
name: Civic Mediation System
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1a'
  on-surface-variant: '#44474c'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#74777c'
  outline-variant: '#c4c6cc'
  surface-tint: '#516070'
  primary: '#061624'
  on-primary: '#ffffff'
  primary-container: '#1c2b39'
  on-primary-container: '#8392a4'
  inverse-primary: '#b8c8da'
  secondary: '#865311'
  on-secondary: '#ffffff'
  secondary-container: '#fdb96f'
  on-secondary-container: '#784704'
  tertiary: '#091622'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e2b37'
  on-tertiary-container: '#8592a1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e4f7'
  primary-fixed-dim: '#b8c8da'
  on-primary-fixed: '#0d1d2a'
  on-primary-fixed-variant: '#394857'
  secondary-fixed: '#ffdcbc'
  secondary-fixed-dim: '#fdb96f'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#683c00'
  tertiary-fixed: '#d6e4f5'
  tertiary-fixed-dim: '#bac8d8'
  on-tertiary-fixed: '#101d29'
  on-tertiary-fixed-variant: '#3b4855'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e2e0'
typography:
  headline-xl:
    fontFamily: Source Serif 4
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Source Serif 4
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.875rem
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.625rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an authoritative, calm, and balanced civic-legal utility designed to reduce emotional friction during tenant-landlord disputes. The interface serves three distinct personas: tenants experiencing housing instability, landlords seeking procedural clarity, and neutral mediators executing structured legal protocols. 

The aesthetic is grounded in institutional minimalism—combining the dignity and gravitas of traditional legal publishing with the responsive clarity of modern civic infrastructure. The environment avoids playful motifs, heavy drop shadows, or overly expressive rounded corners in favor of a quiet, deliberate structure. It instills absolute impartiality, emotional restraint, and accessible formality.

## Colors

The palette balances deep civic authority with tactile, document-like warmth. High contrast ensures compliance across daylight viewing conditions and stressful usage environments.

- **Primary (`#1C2B39`)**: Deep slate-navy. Anchor for primary typographic hierarchy, key active navigation states, and definitive interactive controls.
- **Secondary / Action (`#A9702E`)**: Muted brass / warm ochre. Applied deliberately to primary action triggers, progress indicators, and critical workflow continuation points. Transitions to `#8F5E24` on hover. Accompanied by `#F6EFE6` for subtle tinting behind highlighted items.
- **Tertiary / Secondary Text (`#556270`)**: Calibrated slate for secondary labels, metadata, and supporting context. Muted supporting text settles at `#8792A0`.
- **Surfaces & Borders**: Canvas foundation relies on warm off-white `#FBFAF7`, primary elevated panels on `#FFFFFF`, and structural canvas zones on `#F4F1EA`. Structural divisions are anchored by hairline borders in `#E5E0D8`.

### Status Architecture
Dispute progress indicators use structured 3-part token sets (border, background, text) strictly bound to left-edge accents and contextual status cards:
- **In-Progress / Pending**: Border `#D97706`, Background `#FEF3C7`, Text `#92400E`.
- **Resolved / Closed**: Border `#15803D`, Background `#DCFCE7`, Text `#14532D`.
- **Escalated / Formal Hearing**: Border `#B91C1C`, Background `#FEE2E2`, Text `#7F1D1D`.
- **Under Review / Mediation Assigned**: Border `#2563EB`, Background `#EFF6FF`, Text `#1E40AF`.

## Typography

The type system brings together institutional authority and utilitarian readability.

- **Headings & Titles**: Styled in `Source Serif 4`. This evokes the gravitas and permanence of formal administrative documents, establishing an objective, serious setting.
- **Body, Forms & UI Elements**: Set in `Inter` to maximize legibility across structured case files, timelines, evidence uploads, and legal text.
- **Casing Protocol**: Strictly sentence case across all headings, buttons, tabs, and status badges. Avoid uppercase letter tracking or all-caps styling; standard capitalization projects an unhurried, measured voice without bureaucratic aggression.

## Layout & Spacing

The platform uses a fixed-fluid hybrid layout anchored by a permanent 260px administrative left sidebar and a compact 56px utilitarian top bar for profile status, case ID tracking, and global notifications.

- **Desktop (1200px+)**: Fixed sidebar navigation (260px) alongside a responsive 12-column grid. Main workspace caps at a maximum readable width of 1280px with 24px (`1.5rem`) gutters and 32px (`2rem`) canvas margins.
- **Tablet (768px - 1199px)**: Sidebar condenses to an 80px icon-and-label strip. Layout adjusts to an 8-column grid with 24px margins. Two-column dispute dossiers collapse to stacked modules.
- **Mobile (<768px)**: The left sidebar collapses into an off-canvas drawer accessed via the top utility bar. A single-column vertical flow takes over with 16px (`1rem`) horizontal margins and gutters.

Spacing intervals strictly prioritize visual structure over decorative whitespace. Component padding uses multiples of 8px, using 4px (`space-xs`) strictly for fine-grained form element alignment and status indicators.

## Elevation & Depth

Visual hierarchy is communicated via surface differentiation and perimeter line-work rather than diffused shadows or spatial elevation.

- **Tonal Layering**: Depth is achieved by placing pure white (`#FFFFFF`) case containers, intake forms, and evidence sheets directly onto the warm off-white canvas (`#FBFAF7`), flanked by neutral toolbar partitions in `#F4F1EA`.
- **Structural Outlines**: All interactive and content-bearing containers share a crisp 1px hairline border (`#E5E0D8`). Drop shadows are suppressed entirely under default conditions.
- **Active Elevation**: Contextual overlays, modal arbitrations, and date-pickers utilize a single minimal elevation style: `0 4px 12px rgba(28, 43, 57, 0.08)` surrounded by a `#E5E0D8` hairline perimeter border.

## Shapes

The design system uses soft, precise corner radiuses to reinforce its formal, architectural tone. 

- Base interface elements—such as buttons, text fields, notification alerts, and structural cards—use a uniform 4px (`0.25rem`, Level 1) radius.
- Pill buttons, heavily rounded containers (8px+), and organic asymmetrical shapes are explicitly avoided. Corners should communicate legal precision and institutional stability.

## Components

### Buttons
- **Primary**: Deep slate-navy (`#1C2B39`) background, white (`#FFFFFF`) text, 4px border radius, 0.5rem 1rem padding. Hover: `#2A3F53`. Active: `#141F29`. Focus-visible: 2px offset ring in `#A9702E`.
- **Secondary (Action)**: Muted brass (`#A9702E`) background, white (`#FFFFFF`) text. Hover: `#8F5E24`.
- **Neutral / Outline**: Background `#FFFFFF`, border 1px solid `#E5E0D8`, text `#1C2B39`. Hover: background `#F4F1EA`, border `#D5CFC5`.
- **Destructive**: Background `#FFFFFF`, border 1px solid `#B91C1C`, text `#B91C1C`. Hover: background `#FEE2E2`.

### Status Badges & Chips
- **Structural Rules**: Rounded-sm (4px), padding 2px 8px, font size 0.75rem (`label-sm`), medium weight, strictly sentence case.
- **Variant Tokens**:
  - In-progress: Background `#FEF3C7`, border 1px solid `#D97706`, text `#92400E`.
  - Resolved: Background `#DCFCE7`, border 1px solid `#15803D`, text `#14532D`.
  - Escalated: Background `#FEE2E2`, border 1px solid `#B91C1C`, text `#7F1D1D`.
  - Under review: Background `#EFF6FF`, border 1px solid `#2563EB`, text `#1E40AF`.

### Case Dossier Cards
- **Base Card**: Surface `#FFFFFF`, border 1px solid `#E5E0D8`, border-radius 4px, padding 1.5rem.
- **Active Case Stripe**: Cards representing ongoing cases employ a prominent 4px solid left-edge stripe (`border-l-4`) mapped directly to the active dispute status color (e.g., `#2563EB` for Under review, `#D97706` for In-progress).

### Inputs & Form Controls
- **Text Inputs & Selects**: Height 40px, surface `#FFFFFF`, 1px solid border `#E5E0D8`, 4px radius, font size 0.875rem (`body-sm`), text `#1C2B39`. Focus: border `#1C2B39` with a 1px matching ring, no fuzzy glow. Error: border `#B91C1C`.
- **Checkboxes & Radios**: 16px square/circle, 1px solid `#E5E0D8` border, checked background `#1C2B39` with white iconography.

### Evidence & Timeline Lists
- **Audit Timeline**: Continuous vertical 1px hairline spine (`#E5E0D8`) with 8px solid nodes. Neutral nodes use `#556270`; critical action nodes use `#A9702E`.
- **Document Row**: Striped alternating list or plain `#FFFFFF` row with hairline division (`border-b border-[#E5E0D8]`), file extension indicated in muted uppercase monospaced subtext, action links in `#A9702E`.