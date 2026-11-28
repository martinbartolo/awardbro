---
name: AwardBro
description: A homemade awards night: the phone is the remote, the big screen is the show.
colors:
  night-stage: "#16153a"
  night-surface: "#2e2c66"
  night-surface-low: "#1f1e4a"
  night-line: "#33316a"
  night-chip: "#45438a"
  night-hover: "#4a4892"
  night-field: "#5a58a0"
  night-ink: "#ffffff"
  night-muted: "#bab8e6"
  night-coral: "#ff7a5c"
  night-gold: "#ffc93c"
  night-rose: "#ff6b8a"
  night-track: "#23224f"
  paper-stage: "#fff8ee"
  paper-surface: "#ffffff"
  paper-surface-low: "#f6ecdd"
  paper-line: "#ebddc9"
  paper-field: "#d4c0a3"
  paper-ink: "#1c1b33"
  paper-muted: "#6b6052"
  paper-blue: "#3b5bdb"
  paper-coral: "#e8553a"
  paper-red: "#c62f3a"
  paper-track: "#f1e6d6"
  paper-fill: "#d6ddf8"
  shape-mint: "#2ec4a6"
  shape-periwinkle: "#7c8cff"
  night-pink: "#ff8fc6"
  night-lime: "#b4e05a"
  night-cyan: "#5fd0f0"
  night-lilac: "#c9a7ff"
  paper-mint: "#5fd6be"
  paper-sky: "#7fb8f5"
  paper-pink: "#f59cc4"
  paper-lilac: "#b9a4f5"
  paper-lime: "#bfe07a"
  paper-cornflower: "#9db0f2"
typography:
  display:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "5.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Fredoka, ui-rounded, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "12px"
  md: "14px"
  lg: "16px"
  card: "24px"
  tile: "20px"
  column: "40px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  stage: "96px"
components:
  button-primary:
    backgroundColor: "{colors.night-coral}"
    textColor: "{colors.night-stage}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 32px"
  button-primary-light:
    backgroundColor: "{colors.paper-blue}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 32px"
  button-quiet:
    backgroundColor: "{colors.night-stage}"
    textColor: "{colors.night-muted}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.night-stage}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.md}"
    height: "44px"
  nomination-tile:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.tile}"
    padding: "12px 18px"
    height: "64px"
  podium-column:
    backgroundColor: "{colors.night-coral}"
    textColor: "{colors.night-stage}"
    rounded: "{rounded.column}"
  podium-column-winner:
    backgroundColor: "{colors.night-gold}"
    textColor: "{colors.night-stage}"
    rounded: "{rounded.column}"
---

# Design System: AwardBro

## Overview

**Creative North Star: "The Podium Night"**

An awards night run from a laptop, voted on from phones and revealed on whatever screen the room has. The fun lives in how the results arrive, in the timing and the words, and in a light touch everywhere else: rounded, friendly and clear from across the room, polished the way Nintendo, NYT Games or a Kahoot round is. It is built to be fun on the ninth award of the night, not just the first, so nothing is a gimmick that wears thin: no costume theme, no novelty textures, no mascot.

One system at three volumes. The big screen is loudest: display type, the podium race and confetti. The voter's phone is medium: big tap targets and one moment of delight when a vote is in. Host views are quiet: the same colours and type, with nothing playful in the controls. The show screens carry no AwardBro branding; they belong to the people in the room.

There are two themes from one set of roles. **Night** (dark) is the default, because most shows happen in the evening in a dim room. **Paper** (light) is the same system on warm paper for daytime rooms and bright projectors. The big screen's theme is set by the host per show; phones and host views follow the device setting, with an override.

**Key Characteristics:**

- Rounded everything: Fredoka type, pill buttons, rounded-top podium columns.
- Solid, saturated colour that survives a washed-out projector; no glows or gradients.
- Results as a podium race: columns rise, each nomination in its own colour, the leader stalls, the winner turns gold and lands.
- A small shape set (circle, triangle, squiggle) as markers and confetti, nothing more.
- Soft coloured shadows; never hard offset shadows.

## Colors

Deep navy night with warm sparks, or warm paper with a confident blue: either way one action colour, one winner colour and a small set of shape colours.

### Primary

- **Ember Coral** (night) / **Paper Blue** (paper): the action colour. Every main button, the vote button, focus rings and text selection. Exposed as `primary` in the Tailwind theme.

### Secondary

- **Trophy Gold** (night) / **Podium Coral** (paper): the winner colour. Only the winner's column, the winner's card and the reveal's peak use it. Exposed as `winner`.

### Tertiary

- **Mint**, **Periwinkle**, **Gold** and **Coral** (`shape-1` to `shape-4`): the shape set. Running-order markers, the live dot and confetti. They never carry text.
- **The column palette** (`column-1` to `column-7`): each nomination's column at the reveal. Night: coral, mint, periwinkle, pink, lime, cyan and lilac. Paper: gold, mint, sky, pink, lilac, lime and cornflower, softer so dark text reads on them. All take dark text (`column-foreground`) and none is the winner colour.

### Neutral

- **Night Stage** / **Paper Stage**: the page background.
- **Night Surface** / **Paper Surface**: cards and nomination tiles.
- **Night Surface Low** / **Paper Surface Low**: muted panels, a disabled button, the run view's side panel.
- **Night Chip** and **Night Hover**: chips and quiet buttons that sit on a card, and the hover on rows and choices, a step lighter than Night Surface so they show on it. Paper uses Paper Surface Low and the track colour.
- **Night Line** / **Paper Line**: borders and dividers. **Night Field** / **Paper Field**: input borders, stronger so fields read on a card.
- **Night Muted** / **Paper Muted**: secondary text, hints, stage labels.
- **Track** and **Fill**: an unfilled result track, and quiet fills where results need no colour (such as a column before the reveal).
- **Rose** (night) / **Red** (paper): destructive actions only.

### Named Rules

**The Gold Is Earned Rule.** The winner colour belongs to the winner alone: never a button, never a runner-up's column. Nothing else on the reveal is gold (or Podium Coral on Paper), so the moment it appears, the room knows.

**The Seeded Colour Rule.** Column colours look random but aren't: they are shuffled with the award as the seed, so the big screen, the host's laptop and every reload show the same colours. Up to seven nominations never repeat a colour; beyond seven, colours repeat but never side by side.

**The Projector Rule.** Colour is solid and saturated. No tints below 20% contrast, no gradients and no glow: a cheap projector washes out the subtle and keeps the bold.

## Typography

**Display Font:** Fredoka (with ui-rounded, system-ui)
**Body Font:** Fredoka

**Character:** One chunky rounded family at different weights. It reads as friendly and game-like without being childish, and its heavy weights stay legible from the back of the room.

### Hierarchy

- **Display** (700, 84px on the big screen, line-height 1): the winner's name at the reveal and the "And the winner is…" beat (92px).
- **Headline** (700, 52px on the big screen): the category name.
- **Title** (700, 40px): the category name in the run view; 28px on a phone.
- **Body** (400, 18px, line-height 1.45, up to 52ch): hints and explanations.
- **Label** (600, 16px): stage labels, nomination names on tiles (20px on a phone), button text.

Counts and scores are numbers people compare: set them large and bold (48px on a column, 80px on the winner's, 72px for the run view's live count).

### Named Rules

**The No Kicker Rule.** No small uppercase label above a heading. Context such as "Award 4 of 9" sits beside the progress dots; "And the winner is…" is a timed beat of its own, not a label.

## Layout

The big screen is laid out at 16:9 with 96px margins: the category name top left, the progress dots under it, the room code top right. During voting the QR code and join copy sit left with the live count circle right. At the reveal five columns stand along the bottom in podium order (3rd, 2nd, 1st, 4th, 5th), the winner's wider (1.7 times) and taller, its name centred above it.

Phones are a single column with the vote button pinned at the bottom, within thumb reach. The run view is a main column (the current award, its stage, the live count, one next-step button) beside a running-order panel.

## Elevation & Depth

Depth is soft and coloured: a shadow tinted by the theme (black at 40% on Night, warm brown at 14% on Paper) lifts tiles, cards and the main button off the stage. Surfaces otherwise sit flat in tonal layers (stage, surface low, surface).

### Shadow Vocabulary

- **Soft** (`box-shadow: 0 6px 20px var(--shadow-color)`): tiles, cards, the room code chip.
- **Lift** (`box-shadow: 0 18px 44px var(--shadow-color)`): the QR code, the live count circle, the main button.

### Named Rules

**The No Hard Offset Rule.** Never a solid offset shadow (the sticker or Memphis look). Shadows blur.

## Shapes

Generous, friendly rounding: inputs 14px, tiles 20px, cards 24px, podium column tops 40px, buttons fully pill-shaped. The shape set is a circle, a triangle and a squiggle, used as list markers (one per award in the running order), a live dot and confetti. Confetti falls only at a win, on the big screen and on a phone after a vote.

## Components

### Buttons

- **Shape:** pill (9999px).
- **Primary:** the action colour with dark text (Night) or white text (Paper), 56px tall, 32px side padding; 66px on the run view's next-step button.
- **Quiet:** muted text with a 2px line-coloured border, for secondary steps such as "Take off the big screen".
- **Disabled:** surface-low background, muted text, no shadow. It says what's missing ("Pick a nomination").
- **Focus:** a 3px ring in the action colour, offset 3px.

### Cards / Containers

- **Corner Style:** 24px.
- **Background:** surface on the stage.
- **Shadow Strategy:** Soft.
- **Internal Padding:** 24px.

### Inputs / Fields

- **Style:** the stage colour inside a card, a field-coloured border, 14px corners.
- **Focus:** the action-colour ring.

### Nomination tile

A 64px-tall rounded tile (20px) with the name and a round check mark. Selected tiles take the action colour. The group is a radio group; the button below names the pick ("Vote for The Worm").

### Podium column

A rounded-top column whose height follows the score (at least 130px tall so its name fits), with the count and name inside. Each column takes a colour from the column palette, shuffled per award. The winner's column rises in its own colour like the rest, then turns the winner colour as it's crowned: it grows wider and carries the name above it.

### The reveal

Columns rise from the smallest, one at a time (1.2s each, a soft ease-out). The leader shakes for a moment, the screen cuts to "And the winner is…", then the winner's column turns gold and grows, and the name and confetti land. With reduced motion the final result shows at once, without confetti.

## Do's and Don'ts

### Do:

- **Do** keep the action colour for actions and the winner colour for the winner alone.
- **Do** write copy that says what happens next ("Watch the big screen for the results.").
- **Do** respect `prefers-reduced-motion`: show the end state at once.
- **Do** check every text pair against both themes; body text stays at 4.5:1 or more.

### Don't:

- **Don't** put AwardBro branding on the big screen or the vote page.
- **Don't** use hard offset shadows, gradients or glows.
- **Don't** add themed decoration (envelopes, stamps, tickets, textures): it gets old by the third award.
- **Don't** put a small uppercase label above a heading.
