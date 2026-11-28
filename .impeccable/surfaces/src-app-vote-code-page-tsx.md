---
version: 1
slug: "src-app-vote-code-page-tsx"
primary_target: "src/app/vote/[code]/page.tsx"
related_targets: []
---

# Phone: join and vote

Mode: Operate. The voter has one job: vote in the category on the big screen, then look up again. Medium volume (big screen loud, phone medium, host quiet).

Audience: people in the room, standing, often a drink in, one thumb, on any phone. They arrive from the QR code or the room code and come back to the same tab for every award.

## Direction contract

THESIS: The phone is the remote. One live category, the nominations as big rounded tiles in a radio group, and one button in thumb reach that names the pick ("Vote for The Worm"). Refuses the form-on-a-card layout (instructions, an empty "Your vote" box, then the options) that pushed the first option below the fold.

OWN-WORLD: Podium, the same tokens as the big screen. Rounded tiles (20px) on the stage colour, the selected tile in the action colour (coral at Night, blue on Paper), never the winner colour. Fredoka, chunky. Soft shadows. No confetti: it means a winner, so it's kept for the reveal on the big screen.

STORY: The voter sees which award is live, taps a nomination, taps "Vote for …", and gets "Your vote is in" with an obvious way to change it. When voting closes, the phone says so and points at the big screen.

FIRST VIEWPORT: Room code top left, a live status top right ("Voting is open" / "Voting has closed"), a theme toggle. The category name as the heading, one short line of help, then the tiles from the first viewport down. The vote button pinned at the bottom, full width, in thumb reach. After voting, a centred check badge, "Your vote is in", "You voted for X. Watch the big screen for the results." and "Change my vote".

FORM: seed: none (pinned) "rounded nomination tiles in a radio group, with the vote button pinned in thumb reach and naming the pick" (BAR-23), built from the approved BAR-21 phone comp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decided

- Theme follows the phone's light or dark setting, with a small override remembered on the device, set before first paint.
- Image categories: photos large enough to judge, two to a row.
- Rankings: tap in order; a tapped tile shows its place; tap again to take it out.
- No confetti on the phone: it's the reveal's, so a vote going in gets the check badge only (decided 2026-11-28; BAR-23 first asked for a small burst).
- No vibration (decided 2026-11-28).
