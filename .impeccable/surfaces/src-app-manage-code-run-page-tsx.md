---
version: 1
slug: "src-app-manage-code-run-page-tsx"
primary_target: "src/app/manage/[code]/run/page.tsx"
related_targets: ["src/app/manage/[code]/page.tsx"]
---

# Host: run the show and set it up

Mode: Operate. The host sets the show up beforehand (manage page, usually a laptop) and runs it live (run view, a laptop or a phone beside the big screen), often while also being part of the party. Quietest of the three volumes (big screen loud, phone medium, host quiet).

## Direction contract

THESIS: The host always knows the one next step. The run view is a stage manager's card: where this award is, how many have voted, what the next button does, and the running order beside it. The manage page is one working column in running order. Refuses the admin-dashboard look (tables, loud icon rows, every action in the brand colour).

OWN-WORLD: Podium at its quietest: the same tokens and Fredoka, cards at 24px radius with soft shadows, one action-colour pill per screen, everything else muted until hovered. The shape set only as small markers in the running order and on empty states. Gold never appears: it's the winner's.

STORY: The host opens the run view, sees the award on the big screen and its stage, watches the count, and taps the one main button (Open voting, Close voting, Reveal the winner, Next). On the manage page they add and edit awards and nominations, set the big screen's theme, and keep the dangerous actions apart.

FIRST VIEWPORT: Run view on a laptop: the show name and room code top left, Setup / Big screen / theme toggle top right; the current award as a large card (Award N of M, the name, a four-step stage stepper with the current step in the action colour, the live count, a one-line hint, the main pill and the quiet secondary) with the running order in a muted column on the right. On a phone the same, stacked, the running order below. Manage page: the show name and theme toggle, the room-code card with the big screen's theme and Open big screen / Run the show, then the categories.

FORM: seed: none (pinned) "The design is Podium at its quietest volume: the same colours and type, with nothing playful in the controls" (BAR-24), with the run view from the approved BAR-21 comp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decided

- Host views follow the device's light or dark setting, with the same toggle and pre-paint script as the vote page.
- The big screen's theme stays a per-show setting on the manage page.
- The run view's steps and their order come from Milestone 2's guided flow (stepsFor); only their presentation changes.
- Ghost buttons are quiet everywhere (muted, the foreground on hover); delete actions turn red only on hover.
