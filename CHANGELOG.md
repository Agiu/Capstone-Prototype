# Design Changelog — XBOX ARCADE × Discord Prototype

**Period:** August 4 – August 11, 2026

A summary of the pivotal design and product updates over the past week, grouped
by theme rather than by individual commit. Roughly 70 changes landed; the
highlights below are the ones that changed how the product looks, feels, or is
tested.

---

## 1. Rebrand: XBOX PARTY → XBOX ARCADE

The product's core surface was renamed from "XBOX PARTY" to **XBOX ARCADE**, with
a rebuilt homepage to match (from the latest Figma). This is the name advisors
will now see throughout the prototype and in the moderator testing view.

## 2. Homepage rebuilt around social proof

The home screen was reorganized so a player's first impression is *what their
friends are doing*, not a generic store:

- **"Recommended by Your Friends"** is now the lead row.
- **"Trending in Your Communities"** — a compact list showing, per game, how many
  friends played it and for how long (e.g. "3 friends played this for avg. 12 hours").
- Hero sizing, display-font headings, and friend-avatar rows (two faces + a "+")
  were polished for a cleaner, more editorial feel.

## 3. Game cards redesigned (gameplay-first)

Cards moved from static art to **live gameplay footage on hover**, with a
restructured detail panel:

- Vertical / portrait card variants; the cover itself plays a trailer on hover.
- Trailers now start partway in (not from the cold open) so the footage reads
  immediately.
- Overlay and expanded card layouts were reworked several times to keep the
  metadata pills fixed while the trailer stays fully visible.
- Vertical "Shorts"-style footage is cropped to hide channel names / watermarks.

## 4. Decision Wheel became a collaborative "Jam" session

The single-player "spin to decide a game" feature was elevated into a
**Spotify-Jam-style shared session** — the most significant interaction change of
the week:

- Multiple friends join one live wheel session via an **invite step**.
- The result is **reviewed before** launching a party (no more auto-sending).
- The wheel loads from the player's PLAYlist and supports search "on the wheel."
- Generated Mixes now credit the creator in the name.

## 5. Party & social flow made legible

The moment-of-play flow was tightened so intent is always clear:

- Party avatars now show **ready (check), declined (X), and waiting (blank)** states.
- A **Pending badge** appears in "Manage members" for unanswered invites.
- **Player-capacity** is shown clearly instead of an ambiguous streaming toggle.
- **Quick-share / "Forward to"** from a card or from the "Played By" avatars.

## 6. Library page added

A dedicated **Library** page shipped with filtering, **clickable tags**, review
tags, carousel thumbnails, and "N friends played this" tiles — plus profile
rename support.

## 7. Mixes (formerly "Blend")

"Blend" was renamed **Mix** throughout, with varied collage thumbnails
(mix / duo / squad), inline title editing, cover-art changing, and a
leave-only membership model (removed the destructive "Delete Mix").

## 8. Discord chrome polish

The surrounding Discord shell was refined to feel native: window frame, updated
colors, a redesigned spanning **voice panel**, and cleaner top-nav underline /
menu-box corners.

## 9. Moderator wall for remote user testing

A **live participant wall** lets a moderator watch every tester's screen in real
time during sessions (Firebase-synced). Recent updates:

- Offline previews are dimmed; DM status reads "Offline" when a tab is closed.
- **The wall is now scrollable** — participant previews no longer have to fit on
  a single 2×2 screen, so the roster can grow.

## 10. Consistent friend identities & data

- A **single per-game friend source** now drives avatars, counts, and hours, so
  the same game shows the same friends everywhere (home, cards, detail page).
- **Starter-Edition catalog** of Game Pass titles added as consistent demo data.

---

## In progress (not yet committed)

- **Added a fourth friend, Yessenia** (pink avatar), wired through every identity
  map so she appears consistently across DMs, cards, and social-proof counts.
- Because of the new friend, **Yessenia's screen now appears on the moderator
  wall** as a fifth live preview (enabled by the scrollable wall above).
- **Trending list cards no longer autoplay video on hover** — they stay as clean
  static cover art, distinct from the gameplay-hover cards elsewhere.
- **Added an Overview page (`?overview=1`)** for advisor demos: a feature index
  with user-flow steps and deep links, plus a **notification simulator** so one
  person can trigger and click through the multiplayer toasts (wheel spin, jam
  invite, party invite → ready-up, host → launch) without opening a second tab.

---

*Generated from git history, Aug 4–11 2026. For the full commit-level detail,*
*run `git log --since="2026-08-04"`.*
