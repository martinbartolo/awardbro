# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Hosts** put on an award show for a group they belong to: friends at a party or on a trip, a team or an office at a work party, a club, a school year or a wedding. They set the show up beforehand on a laptop or phone (categories, nominations, running order), then run it live in front of everyone, often while also being part of the party.
- **Voters** are the people in the room. They join on their own phone in a few seconds, by scanning the QR code on the big screen or typing the room code, and vote in whichever category is on the screen. Many are a drink or two in, standing, and using one thumb.
- **The room** watches the big screen: a TV or a projector, often in a dim or bright room, read from several metres away. It shows the category, the live count and the reveal.

The audience is mixed: close friends, colleagues and mixed ages. What's on the big screen has to be fun without being something a host would regret showing at work or in front of family.

## Product Purpose

AwardBro turns a group's inside jokes into a real awards night: the host builds the show, everyone votes from their phone, and the winners are revealed on the big screen one category at a time. Success is a room that cheers at each reveal, and a host who never has to explain how it works.

## Positioning

- **Free, with no accounts.** Hosts and voters never sign up, and there is no paid tier. A show is protected by its password.
- **No app to install.** Voters join in the phone's browser from a QR code or a 4-character room code.
- **Live and instant.** Votes, live counts and reveals show on every screen straight away, and each person's own action shows before the server answers.
- **Your own categories.** The content is the group's own: text nominations, pictures, rankings of a top N, and aggregate awards that add up other categories. It's an awards ceremony, not a quiz: nobody is right or wrong.
- **Built for a whole room.** A show holds hundreds of voters on one screen (load tested at 300).
- **Nothing to hand over.** AwardBro stores no personal data and no pictures: voters are anonymous devices, and images are links to pictures hosted elsewhere.

## Operating Context

- Three surfaces at once during a show: the big screen (present page), the host's run view (laptop or phone), and each voter's phone.
- The show runs one category at a time in the running order: open voting, close voting, reveal the winner, next. Hosts choose at the reveal whether vote counts show, and whether only the winner shows.
- Setup happens earlier and calmly on the manage page; the run view is used live, under pressure, often on a phone.
- Rooms vary: TVs and washed-out projectors, dim party lighting, cheap and old phones, patchy Wi-Fi.
- Detailed flows, data model and rules: `docs/architecture.md`.

## Capabilities and Constraints

- Category types: normal (pick one), image (pick one picture), ranking (rank a top N of 2–10), aggregate (sum of other categories by nomination name, no voting).
- Stages per category: not started, open, closed, revealed, off.
- Shows are found by room code (`/vote/K7QF`); `/manage/<code>` and `/manage/<code>/run` for hosts, `/present/<code>` for the big screen.
- Each screen explains itself; there is no help page.
- English only, no translations planned.
- Stack: Next.js App Router, Tailwind CSS 4, Radix primitives, `motion`, `lucide-react`, on Vercel.
- End-to-end tests find elements by role, label and visible text, so copy changes go with test updates.

## Brand Commitments

- The name is **AwardBro**, written as one word with a capital A and B. The current 🎉 emoji mark can change.
- The header keeps the **Support** link to `https://ko-fi.com/1martin`.
- Voice: playful and in on the joke, like a host at a friends' awards night, never mean or crude. One clear way to do each thing, and no clutter around it.

## Evidence on Hand

- Load test of a 300-voter show (BAR-20 in Linear).
- No testimonials, user counts, press or logos exist. Don't invent any.

## Product Principles

1. **The reveal is the product.** Everything builds towards the moment a winner shows on the big screen.
2. **One way to do each thing.** Design the intended flow, then remove the alternatives and noise around it.
3. **Explain by doing.** Each screen tells people the next step in its own words; no manuals, no help page.
4. **Fun for the room, calm for the host.** The big screen is loud, phones are quick, and host controls stay clear under pressure.
5. **Free and frictionless.** No accounts, no installs, no data to hand over.

## Accessibility & Inclusion

- WCAG 2.2 AA, including contrast on the big screen, which must stay legible on a washed-out projector.
- Respect `prefers-reduced-motion`: the reveal still works and still feels like a moment without movement.
- Phone screens work with one thumb, and touch targets are at least 44 px.
