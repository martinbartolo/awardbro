---
version: 1
slug: "src-app-present-code-page-tsx"
primary_target: "src/app/present/[code]/page.tsx"
related_targets:
  ["src/app/vote/[code]/page.tsx", "src/app/manage/[code]/run/page.tsx"]
---

# Big screen: present view and winner reveal

Mode: Experience. The room watches; nobody touches it. Loudest of the three volumes (big screen loud, phone medium, host quiet).

Audience: a room at an office party or a night in with friends, reading from across the room off a washed-out projector or a TV. Job: join (QR code, room code), watch the live count, then feel the reveal. No AwardBro branding on the show screens: the page belongs to the participants. The site address stays beside the room code only because people need it to join.

## Direction contract

THESIS: Results arrive as a podium race. Nominations rise as rounded columns in podium order, the leader stalls and shakes, the room hears "And the winner is…", then the winner's column grows and the name lands on top with confetti. Refuses the poll-at-a-meeting bar chart and the gimmick-of-the-week theme: it must still be fun on the ninth award of the night.

OWN-WORLD: Podium. Deep navy stage (#16153A) with gold winner and coral pop by default; warm paper (#FFF8EE) with coral winner and blue pop in light. Fredoka, chunky and rounded. Rounded-top columns, rounded tiles, soft coloured shadows, never hard offsets. A small shape set (circle, triangle, squiggle) in coral, mint, gold and periwinkle, used only as markers and confetti.

STORY: The room knows where to vote, watches the count climb, and gets a real moment at each reveal; the winner's name is the biggest thing on screen.

FIRST VIEWPORT: Category name top left, progress dots with "Award 4 of 9" under it, room code chip top right. Voting: QR code and join copy left, live count circle right. Reveal: five columns along the bottom (3rd, 2nd, 1st, 4th, 5th), the winner's column wider, the name at display size above it.

FORM: grounded "Podium", position 3 of the round-3 hand (safer register), seed:27a6d4cc32720d1b

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decided

- Both themes ship. The big screen is dark by default and the host picks per show; phones and host views follow the device setting with an override. The toggles are built in BAR-22, BAR-23 and BAR-24.
- Each nomination's column takes its own colour from the column palette, shuffled with the award as the seed (the same on every screen and reload). The winner's column rises in its own colour and turns the winner colour as it's crowned.
- Reduced motion shows the final result at once, no confetti.
- Confetti is full on any capable machine and thins only on a device that is visibly struggling.
- No sound (decided 2026-11-28).
- Approved comps: the Podium screenshots on BAR-21 in Linear and its PR (both themes: big-screen voting and reveal, phone vote, run view). The interactive comp they came from is local only (.impeccable/mocks is not in git).

## Open

- Ties: every tied winner's column is crowned together (place 1 is shared).
- Small and large categories: one or two nominations, and more than seven (columns stay readable, for example the top five plus "and the rest").

- Ranking categories: points rather than votes on the columns.
- Image categories: how the host's photo sits on the winner's column.
- Hide vote counts and winner only: the column heights without numbers, and a winner-only reveal.
- The current reveal (winner-animation.tsx) still has gradient medals with coloured glows, which DESIGN.md rules out; BAR-22 replaces it.
- Before any screen offers the light theme, replace its white overlays (bg-white/10, text-white) and text-background on fixed colours with theme tokens: they vanish on paper.
