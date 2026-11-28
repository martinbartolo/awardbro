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

<!-- impeccable:design-map -->

Name: AwardBro
Colors: primary: night-coral #ff7a5c; secondary: night-gold #ffc93c; tertiary: shape-mint #2ec4a6; neutral: night-stage #16153a; primary: paper-blue #3b5bdb; secondary: paper-coral #e8553a (+29 more in the sidecar)
Fonts: Fredoka (display, headline, title, body, label)
Spacing: xs 8px, sm 12px, md 16px, lg 24px, xl 40px, stage 96px
Radius: sm 12px, md 14px, lg 16px, card 24px, tile 20px, column 40px, pill 9999px
North Star: "The Podium Night"
Rules:

- The Gold Is Earned Rule. The winner colour belongs to the winner alone: never a button, never a runner-up's column.
- The Seeded Colour Rule. Column colours look random but aren't: they are shuffled with the award as the seed, so the big screen, the host's laptop and every reload show the same colours.
- The Projector Rule. Colour is solid and saturated.
- The No Kicker Rule. No small uppercase label above a heading.
- The No Hard Offset Rule. Never a solid offset shadow (the sticker or Memphis look).

Elevation:

- Soft: 0 6px 20px var(--shadow-color)
- Lift: 0 18px 44px var(--shadow-color)

Don't:

- Don't put AwardBro branding on the big screen or the vote page.
- Don't use hard offset shadows, gradients or glows.
- Don't add themed decoration (envelopes, stamps, tickets, textures): it gets old by the third award.
- Don't put a small uppercase label above a heading.

Do:

- Do keep the action colour for actions and the winner colour for the winner alone.
- Do write copy that says what happens next ("Watch the big screen for the results.").
- Do respect `prefers-reduced-motion`: show the end state at once.
- Do check every text pair against both themes; body text stays at 4.5:1 or more.

Full: .impeccable/design-full.md (read a section when you need its detail)
