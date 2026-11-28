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

There are two themes from one set of roles. **Night** (dark) is the default, because most shows happen in the evening in a dim room. **Paper** (light) is the same system on warm paper for daytime rooms and bright projectors. The big screen's theme is set by the host per show (Night by default, Paper on the manage page's Night/Paper switch), and the screen follows it live; phones and host views follow the device setting, with an override. A page puts its theme on `<html>` (`data-theme="light"` for Paper, nothing for Night), so dialogs, tooltips and toasts, which render outside the page, follow it too.

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

### Big-screen scale

The big screen sets its type in stage units (`u`, see Layout), so the same stage fills a laptop, a TV or a 4:3 projector. The pixel sizes above are these at the 1440 × 810 reference frame (u = 8.1px).

- **Beat** (11.4u, 700): "And the winner is…".
- **Display** (10.4u, 700, line-height 1): a single winner's name, "It's a tie!", "Voting has closed", "Nobody voted in this one."
- **Headline** (8u, 700): a longer winner's name (17 to 28 characters), a short tied winner's name.
- **Code** (18u, 700, tracking 0.06em): the room code beside the QR code.
- **Count** (17u, 700, tabular): the live count.
- **Title** (6.4u, 700, line-height 1.05): the category name, and the longest winners' names.
- **Score** (5.9u, 700, tabular): a runner-up's count on its column. The single winner's count is 9.9u.
- **Lead** (4.2u, 500): the join copy, "votes in", "The winner is next.", a tied winner's count.
- **Body** (3.6u): the category's description, the site's address, pills.
- **Small** (2.9u): runners-up's names, score labels ("votes", "points"), "Award 4 of 9", "And the rest".

A winner's name is as big as fits in two lines: display up to 16 characters (headline with pictures), headline up to 28, then title. Tied winners' names sit inside their columns and step down sooner (headline up to 10 characters, title up to 22, then lead), never cut short.

### Named Rules

**The Stage Unit Rule.** Everything on the big screen is sized in stage units: type from the `text-stage-*` scale, spacing from Tailwind's scale (which counts in half-units there), anything else as a multiple of `u`. Never a fixed pixel or rem size on the big screen, or it breaks on the next screen size.

**The No Kicker Rule.** No small uppercase label above a heading. Context such as "Award 4 of 9" sits beside the progress dots; "And the winner is…" is a timed beat of its own, not a label.

## Layout

The big screen is laid out on a 16:9 stage that scales with the screen. Its unit `u` is a hundredth of the largest 16:9 frame that fits (`min(1dvh, 0.5625dvw)`, the `big-screen` utility), so a 4:3 projector shows the same stage with room above and below. Inside it, Tailwind's spacing counts in half-units (`--spacing: u/2`), so the usual classes scale with it: the side margins are 12u (96px at 1440 × 810) and the top 8u.

The category name sits top left (up to 150u wide), with its description under it and the progress dots with "Award 4 of 9" under that. While waiting and during voting, the QR code and join copy fill the left and the live count circle the right. Once voting closes, at a reveal, and while an aggregate is on, joining shrinks to the room code chip top right, and the closed screen puts the count beside "Voting has closed". Each scene (a category and its stage) arrives with a quick fade (0.35s), no movement.

At the reveal the columns stand along the bottom in podium order (3rd, 2nd, 1st, 4th, 5th: the winner in the middle, 2nd and 3rd stepping down to its left, the rest to its right) and run off the bottom edge. The winner's is wider (1.7 times, up to 56u; each runner-up up to 34u) and taller, its name centred above it.

### Named Rules

**The Overscan Rule.** Some TVs crop the outer 5% of the picture, so nothing that has to be read sits there: the margins clear it, and a column can run off the bottom edge only because its count and name sit at its top, above the floor (24u).

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

## Icons

Phosphor (`@phosphor-icons/react`), imported one by one. Its Bold weight matches Fredoka's heavy strokes, and it's the default for every icon (`IconProvider` in the root layout).

- **Size:** `Button` sizes its icons (16px), so an icon inside one has no size of its own. Elsewhere set it with `size-*`: 16px next to body text, 14px in badges, 20px next to a confirmation line; larger only as illustration.
- **Colour:** `currentColor`, so an icon follows its text. Tint it only with a text colour class (`text-primary`, `text-muted-foreground`), as you would text; never a fill or a colour of its own.
- **Names:** an icon is never the only label, and screen readers skip it (`aria-hidden`, set by `IconProvider`). An icon-only button has an `aria-label` and a tooltip; elsewhere the text next to it says what it means.

### Named Rules

**The Duotone Moment Rule.** Bold for controls; Duotone (`weight="duotone"`) only for the category-type badges. A voter's vote confirmation is a Bold check on an action-colour badge, and the quiet screens (waiting, voting closed, an aggregate) carry the shape set as their mark, not an icon. Its second layer is the text colour at 20%, so it works in both themes without a token of its own. Never Duotone on a button.

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

A rounded-top column (5u corners) whose height follows the score, with the count and name at its top. Its height is a floor plus its share of the room above it: the floor is 24u (34u in picture categories) so the label clears overscan, and the share is its score over the best, at least 14%. When the show hides the counts, heights step down by place (17% a place) instead. A runner-up's count sits above its name; names clamp to two lines (one with pictures).

Each column takes a colour from the column palette, seeded by the award (The Seeded Colour Rule), so a nomination keeps its colour whatever its score, and no two columns share one. The winner's column rises in its own colour like the rest; at the crown a winner-colour layer fades in over it (0.5s) and the column grows to 1.7 times the others' width.

- **A single winner:** its name stands above the column at display size, shrinking with its length (see Typography); its count, 9.9u, inside.
- **Tied winners:** every winner is crowned together, each column growing to 1.3. "It's a tie!" fills the space above at display size, and each name sits inside its column, larger than its count.
- **Picture categories:** every nomination's photo sits inside its column, at the top (2.5u corners, square): up to 13u on a runner-up, 20u on a single winner, 16u on tied winners. The winner's photo arrives with the crown.
- **More than seven nominations:** the top five (or every tied winner, up to seven) get columns, and the rest share an "And the rest" block on the right, a track-coloured column listing their names and counts.
- **Nobody voted:** no columns. "Nobody voted in this one." centred at display size, with the nominations as flat pills under it.
- **Winner only:** only the winners stand.

### The reveal

The reveal plays only on a screen that saw the award before it was revealed; a reload, or a screen opened mid-reveal, shows the result at once. Its beats:

1. A half-second pause, then the runners-up rise one at a time from the shortest, every 0.9s (each rise takes 1.2s, soft ease-out), its label fading in after it.
2. The leader rises to just under the tallest runner-up (97% of it) and shakes for 1.6s (`podium-tense`, a 0.3u side-to-side shiver).
3. "And the winner is…" fills the screen at beat size for 1.6s, on the stage colour.
4. The beat clears completely (0.4s) before the crown, so the name never lands on top of it.
5. The crown: the winner's column turns the winner colour and widens, its name (or "It's a tie!") rises in, and confetti bursts from the top of the winner's column.

When the host changes what the results show while they're up, the columns move without replaying the reveal. With reduced motion the final frame shows at once, without confetti.

### Confetti

The shape set (circles, triangles and squiggles in the four shape colours, read from the theme) on a full-screen canvas: 220 pieces fanned upwards from the winner's column, falling under gravity with a flutter, sized and paced to the stage so every screen sees the same burst. Every piece flies on any capable machine; only if the first 500ms of frames run slow (under about 40 fps) are half of them dropped.

### Live count

A circle in the action colour (never gold: The Gold Is Earned Rule), the same size as the QR tile (41u), with the count at count size and "votes in" under it, lifted with the Lift shadow. It hops (`count-bump`, 1.06 times, spring ease, 0.5s) with each new vote.

### Join panel and room code chip

- **QR tile:** always white, in both themes, with the code in Night Stage navy, since phones read a QR code best dark on white. 41u square, 3.4u corners, Lift shadow. Beside it the join copy in lead type: "Scan to vote, or go to", the site's address, "and enter", and the room code at code size.
- **Room code chip:** once the screen is busy with an award, the address (muted) and the room code (bold, tracking 0.08em) in a card-coloured chip top right, 2u corners, Soft shadow.

### Progress dots

One dot per award (up to twelve) beside "Award 4 of 9": past awards in the muted text colour, those to come in the line colour, and the current one a pill in the action colour, three times as wide. Past twelve, only the words show. A category that counts towards an aggregate adds "Counts towards …" after them.

### Big-screen controls

None in view. The fullscreen button (F) shows bottom right only while the pointer moves or it has focus, and the cursor hides with it after 2.5s. The screen asks to stay awake while the page is open.

## Do's and Don'ts

### Do:

- **Do** keep the action colour for actions and the winner colour for the winner alone.
- **Do** write copy that says what happens next ("Watch the big screen for the results.").
- **Do** respect `prefers-reduced-motion`: show the end state at once.
- **Do** check every text pair against both themes; body text stays at 4.5:1 or more.
- **Do** size everything on the big screen in stage units, and keep what must be read clear of the outer 5%.

### Don't:

- **Don't** put AwardBro branding on the big screen or the vote page.
- **Don't** use hard offset shadows, gradients or glows.
- **Don't** add themed decoration (envelopes, stamps, tickets, textures): it gets old by the third award.
- **Don't** put a small uppercase label above a heading.
