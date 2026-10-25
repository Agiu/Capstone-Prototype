# Redesign Log — XBOX ARCADE × Discord Prototype

The prototype was built quickly for moderated testing, and some design details
were never fully worked through. This log records each change made in the
redesign pass: what was wrong, what changed, and why. It's written to be reused
in a product design portfolio review.

## How the toggle works

- The **Redesign** switch next to the title on the launcher (the room-select page) turns the
  redesign on or off. The setting is remembered and applies to every view opened
  after it: a single player, the multi view, or the moderator wall.
- **Off** shows the prototype exactly as it was tested. **On** shows the redesigned
  elements. Both versions stay in the code, so you can capture before/after shots
  of the same screen with the same data.
- A link can force either version with `?redesign=1` or `?redesign=0`.
- In code, redesigned elements branch on `REDESIGN` or use `rd(before, after)`
  from `src/redesign.js`.

## Entry template

Copy this for each change and put new entries at the top of **Changes**.

```md
### NN. <Short title>
**Date:** YYYY-MM-DD · **Screen / element:** <where it lives>

**Problem.** What wasn't considered in the original build, and how it shows up
for the player (or the moderator).

**Change.** What the redesign does differently.

**Rationale.** The design principle, heuristic, or test finding behind it.

**Before / after.** `screenshots/NN-before.png` · `screenshots/NN-after.png`

**Code.** `src/<file>.jsx` — <component name>
```

## Changes

### 34. Rank changes animate, with direction arrows
**Date:** 2026-10-24 · **Screen / element:** PlayList page list and grid

**Problem.** With the list ranked live by votes (entry 33), a vote reordered the list
instantly. Games jumped to new positions with nothing to show what had moved or which
way, so it was easy to lose track of the game you just voted on.

**Change.** When the ranking changes, each game that moved glides from its old spot to
its new one (520ms, quick-in ease-out). A small badge flashes on its rank for 1.6s: a
green ▲ if it climbed, a red ▼ if it dropped. Both list and grid views animate.
Switching view or sort, or filtering, snaps into place instead, since those aren't
ranking changes.

**Rationale.** Motion that preserves continuity ("this card went there") is what makes
a live ranking readable. The arrows answer "what just happened?" without needing the
previous order, and they fade before they turn into clutter.

**Before / after.** `screenshots/34-rank-move-mid.png` (list, captured mid-move),
`screenshots/34-rank-move-grid.png` (grid)

**Code.** `src/Landing.jsx` (`useRankFlip`, a FLIP hook using the Web Animations API;
`RankMove`), `src/index.css` (`rankMove` keyframes)

### 33. PlayLists rank by votes, and votes weight the wheel
**Date:** 2026-10-24 · **Screen / element:** PlayList page list, and the Spin the
Wheel modal when opened from a PlayList page

**Problem.** A PlayList opened as a grid in "Custom order" that members rearranged by
dragging. Votes existed, but only changed the order if someone picked the "Top voted"
sort. Even then, votes had no effect on the wheel, which is what actually decides what
the group plays. Voting felt cosmetic.

**Change.**
- **Ranked list first:** the PlayList opens as a list ranked by net votes. "Custom
  order" and drag-to-reorder are removed, so votes are the only thing that changes the
  ranking. Grid view and the other sorts are still available.
- **Wheel odds:** each game shows its wheel odds next to its votes. Every game starts at
  weight 1, each net upvote adds 1, and downvotes can lower it to a floor of 0.25 (still
  possible, just unlikely).
- **Weighted wheel, PlayList page only:** opened from a PlayList page, the Wheel modal
  weights the spin by that PlayList's votes. Slices are sized by chance, each game chip
  shows its percentage, and a note names the PlayList the odds come from. All screens in
  a shared spin see the same slices.
- **Equal odds everywhere else:** opened from home or any other page, the wheel stays
  equal-odds with the same slice sizes as before, even for the same games.

**Follow-up.** The "Show votes" toggle was removed. Votes now drive the ranking and
the wheel, so hiding them until hover no longer made sense. They always show, in every
sort and view.

**Rationale.** Votes need a visible payoff to be worth casting. Ranking makes the
group's preference legible, and weighting the wheel turns that preference into better
odds, so it still matters on the wheel instead of being overridden by it. Limiting the
weighting to the PlayList context means a spin started elsewhere doesn't get skewed by
votes the spinner can't see. Bigger slices make the weighting honest, not hidden.

**Before / after.** `screenshots/33-ranked-list.png`, `screenshots/33-wheel-weighted.png` (opened on the PlayList page: 47/47/6) vs
`screenshots/33-wheel-equal-from-home.png` (same games opened from home: equal slices)

**Code.** `src/Landing.jsx`:
- `wheelWeight`, `usePlaylistOdds`;
- `rollSpin` gains optional weights; `DecisionWheel` gains variable slice sizes;
- `WheelModal` gains a `voteBlend` prop and percentage chips;
- `BlendPage` defaults to list view and vote sort, with no drag.

### 32. Quieter ASCII: more negative space
**Date:** 2026-10-24 · **Screen / element:** ASCII hero (home) and PlayList banner

**Problem.** The ASCII background filled nearly every cell with a character. Even the
darkest parts of the footage became a field of faint dots and dashes, which pulled
attention from the "Jump in" heading and the Start A Party card.

**Change.**
- **Gain:** lowered from 3.2 to 2.4, so less of the footage gets brightened.
- **Cutoff:** new. Any cell below 22% of the brightened luminance stays blank.
  Everything above it is rescaled to the full character ramp, so the bright
  wireframe lines keep their full range from `.` to `@`.

**Rationale.** A background texture should support the content, not compete with
it. Empty space around the lines lets the motion read as a deliberate pattern, and
the heading and call to action sit on calmer ground. A cutoff, rather than just a
lower gain, removes the noise without dimming the lines worth keeping.

**Before / after.** `screenshots/32-ascii-before.png` → `screenshots/32-ascii-after.png`

**Code.** `src/AsciiVideo.jsx` (`GAIN`, `CUTOFF`, and the `uCutoff` shader uniform)

### 31. Nav animates on the way back home too
**Date:** 2026-10-24 · **Screen / element:** Xbox top nav, returning to home from an
inner page (Library, PlayLists, a PlayList, a game)

**Problem.** Going into an inner page animated the nav: the green back arrow
emerged and the logo and tabs slid right to make room. Coming back home had no
animation, so everything jumped 44px left in one frame. The transition only worked
in one direction.

**Change.** Arriving home from an inner page now plays the same animation in
reverse. The back arrow fades out and the logo and tabs slide back left, with the
same 0.4s quick-in, ease-out curve. Loading home directly, or refreshing it, doesn't
animate.

**Rationale.** Navigation transitions should be symmetrical. If going forward has
motion, going back needs the matching motion, or the return feels like a glitch
rather than a step back. The arrow fading out where it was also confirms that the
"back" state has ended.

**Verification.** Library tab position sampled every 60ms after clicking the logo:
453px (inner page), 428, 415, 409 (home).

**Code.** `src/Landing.jsx` (`Content` home header, `navFromInner`), `src/index.css`
(`navBackOut`, `navGroupSlideBack`)

### 30. Live party card re-laid out; secondary buttons become outlines
**Date:** 2026-10-24 · **Screen / element:** Home hero live-party card, and every
grey secondary button on Xbox surfaces

**Problem.** In the live-party card, the roster and the actions shared one row
under the title. The eye jumped from status to title, down to avatars, then across
to the buttons. The filled grey Cancel was nearly as heavy as the green Launch
button, so the hierarchy between the two actions was weak. Elsewhere, secondary
buttons used three different filled greys.

**Change.**
- **Party card:** the roster ("1/3 ready" plus avatars) sits in the info area's
  top-right corner, level with the "Live party" label. Actions sit directly under
  the title, so it reads status, then game, then what to do.
- **Secondary buttons:** on all Xbox surfaces, they are transparent with a 1.5px
  grey outline, which lightens on hover. That covers Cancel, Not Now, Undo Ready Up,
  Done, Restart, Copy link and Go to wheel. Primary actions stay solid green, so each
  group has one filled button. Discord-side modals are untouched.

**Design note.** A first pass put the avatars over the bottom-left corner of the
cover art. It was moved to the info area, which keeps who's in the party with the
party's status instead of the game art.

**Rationale.** One filled button per group makes the primary action obvious at a
glance. Outlining the alternatives keeps them available without competing. Doing it
with one shared rule keeps every secondary button on the site consistent.

**Before / after.** `screenshots/30-party-card.png` (after; the "before" is the
image in entry 14)

**Code.** `src/Landing.jsx` (`HomePartyCard`, `PartyAvatars` `size` and `ring` props),
`src/index.css` (outlined secondary button rule)

### 29. Carousel scroll: quick in, ease out
**Date:** 2026-10-24 · **Screen / element:** Every horizontal shelf (home rows, the
PlayLists glimpse, PlayList page recommendations), both arrow presses and the
auto-scroll that keeps a hovered card on screen

**Problem.** Rows scrolled with an ease-in-out curve, so a press on the arrow
started slowly. For the first ~150 ms almost nothing moved, which made the
control feel laggy.

**Change.** Under the redesign the scroll uses an ease-out quint curve over the
same 600 ms. It moves at full speed the moment you press and spends the rest of
the time gently settling.

**Rationale.** Motion that responds to a user action should begin immediately.
Ease-out matches how physical things behave when pushed (fast start, friction
slows them), while ease-in-out suits motion the system starts on its own. This
makes the arrows feel snappier without shortening the animation.

**Code.** `src/RecCard.jsx` (`smoothScrollLeft`)

### 28. Home section titles in Title Case
**Date:** 2026-10-24 · **Screen / element:** Home page section headings

**Problem.** Home headings mixed capitalization styles: "Friends Are Playing Now"
and "Because You Played Deathloop" were in Title Case, while "Recommended by Your
Friends", "Trending amongst Your Friends", "Worth a Closer Look" and "Something
Different for You" weren't. Next to each other, the inconsistency looked unpolished.

**Change.** Every home section heading is now in Title Case, matching "Start A
Party": Recommended By Your Friends, Trending Amongst Your Friends, Worth A Closer
Look, Something Different For You. Game names keep their official capitalization,
e.g. "Ori and the Will of the Wisps".

**Rationale.** A single capitalization rule for headings makes the page read as one
system and fits the bold, arcade-poster voice of the redesign.

**Code.** `src/Landing.jsx` (`HighlyRatedRow`, `TrendingRow`, `WorthACloserLook`,
`Content` shelf titles)

### 27. PlayList banner takes the PlayList's colour
**Date:** 2026-10-24 · **Screen / element:** PlayList page, ASCII header banner

**Problem.** Every PlayList page had the same lime ASCII banner, whatever its cover
looked like. The page's most visible element said nothing about which PlayList you
were on.

**Change.** The ASCII glyphs are now tinted with the PlayList's own colour, keeping
their light and dark shading:
- **Custom cover** (uploaded or picked): the image's dominant vivid colour. Pixels
  are weighted by saturation × brightness, so dark or grey areas don't wash it out.
- **Generated default cover:** the exact hue its icon pattern uses.

Changing the cover shifts the banner's colour over about half a second instead of
snapping. The home hero is not tinted and keeps the footage's own green.

**Rationale.** Like a music app's album-colour header, it gives each PlayList an
identity and ties the banner to the cover art next to it. It needs no new assets,
and members' choices show up across the page.

**Before / after.** `screenshots/22-ascii-hero-after.png` (lime, before) → `screenshots/27-playlist-banner-tint.png` (teal cover → teal banner)

**Code.** `src/AsciiVideo.jsx` (`tint` prop; `uTint` and `uTintOn` shader uniforms,
eased each frame), `src/Landing.jsx` (`useCoverTint`, `hslRgb`, `BlendPage`)

### 26. Xbox logo is the home tab; PlayLists glimpse on home
**Date:** 2026-10-24 · **Screen / element:** Xbox top nav (home and inner pages);
bottom of the home page

**Problem.** The nav had two controls going to the same place: the Xbox logo and
the "Recommended" tab both opened home. "Recommended" also undersold the page,
which holds the party hero, friend activity and more, not just recommendations.
PlayLists, a core social feature, only appeared once you left home for its own tab.

**Change.**
- The Xbox logo is now the home tab. When it's the selected tab, its underline is
  Xbox green rather than the white used by the text tabs, so the brand mark keeps
  its own color. The "Recommended" text tab is removed, on home and on the inner
  pages' nav.
- A "Your PlayLists" row closes the home page, using the same row style as the
  shelves above it. It shows the Create card plus up to six PlayLists, pinned ones
  first, with a green "See all" link into the PlayLists tab. The link sits right
  beside the title, not pushed to the far right edge where it was easy to miss. Cards keep their
  hover peek and right-click menu. With no PlayLists yet, a one-line hint explains
  what they're for.

**Rationale.** One destination should have one control. Making the brand mark the
home tab is a familiar pattern and frees up nav space. Previewing PlayLists on home
raises a key feature without adding another section to the nav, and "See all" gives
a clear path to the full list.

**Follow-up.** The Create card's green ring is drawn just outside the card, and the
row's scroll container clipped it on the left edge. The row now extends 4px into
the left margin, with the content still aligned, so outlines aren't cut off
(`ShelfRow` `bleed` prop).

**Follow-up 2.** The row's scroll arrows sat at the middle of the whole row,
captions included, because they look for game art to center on and PlayList cards
had none marked. PlayList art boxes are now tagged `data-shelf-art`, so the arrows
center on the 200px squares. Measured in Chrome, the arrow's center and the art's
center are both at 628px.

**Follow-up 3.** The first left-edge fix only widened the scroll area, not the
edge fade, so a 4px strip of a scrolled card peeked out past the fade. The bleed now
sits on the row's container, so the fades and arrows span the same width
(`screenshots/26-playlists-fade-fixed.png`). The hover "⋯" button was also removed
from cards in this row, since a preview shouldn't carry editing controls.
Right-click still opens the PlayList menu, and the PlayLists page keeps its "⋯".

**Before / after.** `screenshots/26-nav-home.png`, `screenshots/26-nav-playlists.png`,
`screenshots/26-playlists-glimpse.png`

**Code.** `src/Landing.jsx` (home header in `Content`, `PageNav`, PlayLists glimpse),
`src/RecCard.jsx` (`ShelfRow` gains an optional `action` slot)

### 25. Modals centered on the screen again; Gift Nitro joins the Xbox style
**Date:** 2026-10-24 · **Screen / element:** All redesigned modals; Gift Nitro modal

**Problem.** Centering modals on the Xbox area (entries 20 and 24) made them sit
noticeably right of the screen's center. That read as off-balance rather than
intentional. Gift Nitro, opened from the Xbox nav bar, was still in Discord's style,
so it stood out next to the other Xbox modals.

**Change.** Pane centering was removed. Modals are centered on the whole screen
again, still pinned 12vh from the top. Gift Nitro now uses the shared Xbox shell:
the green header band, Xbox-green checkboxes and button, and the same top
alignment.

**Design note.** This reverses the alignment part of entries 20 and 24. Centering
on the content area seemed logical on paper, but looked lopsided in practice next
to Discord's sidebar.

**Rationale.** The modal style should follow where the action starts. Gift Nitro is
an Xbox Arcade action, so it uses the Xbox style. Screen-centered modals are also
the convention people expect.

**Before / after.** `screenshots/25-gift-nitro-modal.png` (after)

**Code.** `src/Landing.jsx` (`useModalOverlay`, which no longer offsets; `useXboxPaneLeft`
removed; `StartPartyModal`, `GiftArcadeModal`)

### 24. One modal style across the Xbox side
**Date:** 2026-10-24 · **Screen / element:** Xbox modals: Create a PlayList, Add Your
Preferences, Your PlayList, Rename PlayList, Change cover image, Leave PlayList
confirm, Write a review (plus placement for Search and Spin the Wheel)

**Problem.** Every Xbox modal had its own header style and background: some
`#2b2d31`, some `#17181b` or `#1c1c1f`, title sizes from 20 to 22px, close buttons
of different weights. They all centered on the whole window, so they sat partly over
Discord's sidebar. After Start A Party was redesigned, the rest felt like a
different product.

**Change.** The Start A Party shell is now shared, as `ModalHeader` and
`useModalOverlay`:
- a solid Xbox-green header band with black title, optional subtitle and a heavy
  26px close X;
- the same dark surface on every modal;
- pinned at 12vh from the top, so the header doesn't jump as content changes;
- centered on the Xbox pane, not the window.

The Search palette keeps its search field as the header, since it has no title. Spin
the Wheel keeps its own full-stage layout. Both now center on the Xbox pane. Discord-side
modals (invite, share, gift, who's on) are left in Discord's style.

**Rationale.** Consistency builds recognition. One header pattern tells users "this
is an Xbox task" no matter where it opened from. Shared components also stop the
styles drifting apart again.

**Before / after.** `screenshots/24-create-playlist-modal.png` (after)

**Code.** `src/Landing.jsx` (`ModalHeader`, `useModalOverlay`; `ConfirmModal`,
`CoverPickerModal`, `RenameMixModal`, `PlaylistModal`, `SearchModal`,
`CreateBlendModal`, `PreferenceModal`, `WheelModal`, `WriteReviewModal`)

### 23. Start A Party card: corner-to-corner slice on hover
**Date:** 2026-10-24 · **Screen / element:** Home hero, "Start A Party" card

**Problem.** The main call to action on the home screen barely reacted on hover. The
border shifted to a slightly different lime and the background tinted faintly, so
it didn't feel like the primary action. The two greens also didn't quite match.

**Change.** On hover, a fill in the card's border green (`#9BF00B`) slices in
diagonally, from the bottom-right corner to the top-left (420 ms, ease-out). The
icon, title and subtitle flip to near-black so they stay legible on the green. The
border stays the same green on hover instead of brightening, so the fill and border
read as one surface. With reduced motion turned on, it switches instantly.

**Rationale.** The primary action should have the strongest hover response on the
page. A directional wipe adds motion without moving the layout, and filling with
the same green as the solid primary buttons elsewhere ties the card to them.

**Before / after.** `screenshots/23-party-card-hover.png` (hovered state)

**Code.** `src/Landing.jsx` (home hero Start A Party button), `src/index.css`
(`.party-slice`, which animates `clip-path` from a point at the bottom-right corner
to a triangle covering the card)

### 22. ASCII wireframe hero
**Date:** 2026-10-24 · **Screen / element:** Home hero background and the PlayList
page banner (both use `PartyHome.mp4`)

**Problem.** The wireframe background video was a generic stock-like loop. It
didn't carry the arcade, terminal-flavoured identity the rest of the redesign leans
into.

**Change.** The video is redrawn live as ASCII characters (` .:-=+*#%@`), with
brighter areas using denser characters. Each character takes the footage's own
colour, so the green-on-black look is kept. Parallax and the loop cross-fade still
work, because the new component accepts the same ref and `onTimeUpdate` as the
`<video>` it replaces.

**Performance approach.** Built to be lightweight for an always-on background:
- Each frame, the video is shrunk to 2×2 pixels per character on a tiny canvas.
  Only that is uploaded to the GPU.
- One WebGL shader picks the glyph per cell from a pre-rendered glyph atlas, so
  per-frame JavaScript work is close to zero.
- Each cell keeps the brightest of its 4 samples, not the average, so thin
  wireframe lines survive.
- It's capped at 30 fps and 1.5× device pixel ratio, and it pauses while scrolled
  off-screen or when the tab is hidden.
- Without WebGL it falls back to the plain video.

**Rationale.** Gives the hero a distinctive texture tied to the gaming/terminal
theme without adding new assets. The shader approach keeps it cheap enough to run
all the time.

**Before / after.** `screenshots/22-ascii-hero-before.png` → `screenshots/22-ascii-hero-after.png`

**Code.** `src/AsciiVideo.jsx` (new), `src/Landing.jsx` (home hero and BlendPage
banner)

### 21. Start a party: single-player games explain the stream
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Invite section, when
the chosen game is single-player

**Problem.** Picking a single-player game such as Celeste still offered "Invite", with
nothing saying what inviting would mean. It implied friends would play along, when
they'd actually be watching. Player counts also read "1 players".

**Change.** When the chosen game is single-player, a note appears at the top of the
invite list: "[Game] is single-player. Friends you invite will watch it streamed from
your game." It has a broadcast icon on a soft green tint. Inviting stays fully
available. The note animates in and out with the list and stays in place while the
list closes after "Change". Player counts now read "1 player" in the modal's
recents, search results and chosen-game row.

**Design note.** The first idea was to disable inviting for single-player games
entirely. It was reversed in favor of keeping the party social and simply setting
the expectation that friends watch rather than play.

**Rationale.** Set expectations before the action, not after. The same "Invite"
control means something different for a single-player game, and saying so up front
prevents a mismatch between what the host thinks happens and what friends get.

**Before / after.** `screenshots/21-solo-stream-note.png` (taken before the "1
player" wording fix)

**Code.** `src/Landing.jsx` (`StartPartyModal`, `soloGame`, `playersLabel`)

### 20. Start a party: centered on the Xbox area, not the window
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, horizontal position

**Problem.** The modal centered on the whole window, including Discord's server rail
and sidebar on the left. Over the Xbox page it sat noticeably off-center, pulled
about 157px toward Discord. That weakened the sense that it belongs to the Xbox
experience it was opened from.

**Change.** The modal now centers on the Xbox page area, measured live and updated
when the window resizes. The dimmed backdrop still covers the whole window. The
height cap was also loosened so the modal can use all the space below its pinned
top, and the full flow, with the invite list open, fits on a 1280×720 laptop screen
without scrolling.

**Rationale.** Spatial grouping. A modal belongs visually to the surface that opened
it, and centering on that surface keeps the Xbox flow inside the Xbox frame,
consistent with the product separation in 01 and 12.

**Before / after.** `screenshots/19-20-after.png` (modal centered on the Xbox page)

**Code.** `src/Landing.jsx` (`useXboxPaneLeft`, `StartPartyModal`)

### 19. Start a party: inset, smaller friend rows
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, friend list

**Problem.** Friend rows ran edge to edge, with avatars against the search field's
left edge and checkboxes against its right. With 40px avatars and 24px checkboxes,
the list felt cramped and heavy and pushed the modal past the screen on smaller
laptops.

**Change.** Rows are now inset 12px on each side, with a subtle hover highlight
behind them. Avatars shrink to 32px, checkboxes to 20px, and names and statuses step
down one size, with 6px of space under the search field.

**Rationale.** White space and alignment. Insetting the rows separates the list from
the field above it, so the field reads as a filter and the rows as its results.
Smaller controls fit a quick multi-select, and the hover row makes the whole row
feel clickable, not just the checkbox.

**Before / after.** `screenshots/19-before.png` · `screenshots/19-20-after.png`

**Code.** `src/Landing.jsx` (`StartPartyModal` → `Row`)

### 18. Start a party: compact recent games
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Recent searches

**Problem.** Recent games were large cover tiles, about 200px tall. Once the invite
list opened, the modal hit its height limit and scrolled, and the footer covered the
cover art.

**Change.** Each recent game is now a compact row: an 80px thumbnail with the title
and player count beside it, still two side by side. The section dropped from about
200px to 57px. The thumbnails show the whole image (contain, not crop), so even
covers that aren't exactly 16:9 aren't cut off.

**Rationale.** Recents are a shortcut, so they shouldn't take more space than the main
path. Compact rows keep cover art for quick recognition while leaving room for the
steps that follow.

**Before / after.** `screenshots/10-recent-grid.png` · `screenshots/18-recents-compact.png`

**Code.** `src/Landing.jsx` (`StartPartyModal`)

### 17. "Start A Party" in title case
**Date:** 2026-10-24 · **Screen / element:** the party action's label everywhere it
appears: the Home call-to-action, the modal title, hover tooltips on cards and
Library tiles, right-click menus, and the wheel and decide pages

**Problem.** "Start a party" was written in sentence case, so it read like a passing
description rather than the product's main named action. It also sat alongside
title-case labels like "Add to PlayList".

**Change.** The label is now "Start A Party". It's defined once and shared by every
button, tooltip, menu item and the modal's accessible name, so it can't drift out of
sync again.

**Rationale.** Naming a core action consistently makes it recognizable wherever the
user meets it. Keeping the label in one place stops it drifting apart across
screens.

**Code.** `src/RecCard.jsx` (`START_PARTY`), used throughout `src/Landing.jsx`

### 16. Start a party: smooth game pick and Change
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, picking a game and
pressing "Change"

**Problem.** Picking a game felt janky, for two reasons. The modal was centered
vertically, so when its height changed (the search field and recents swapped for a
single row, and the invite list opened) the whole modal jumped up or down. Second,
the game section swapped instantly while the invite list animated, so half the
modal snapped and half glided.

**Change.** The modal's top edge is now pinned 12vh down the screen, so it only grows
and shrinks at the bottom. The game picker and the picked-game row now cross-fade
and resize on the same 400ms curve as the invite list, so the whole modal moves as
one. The picked game stays visible while its row closes after "Change". After
"Change", the cursor goes straight back into the search field, without opening the
dropdown. Measured: the modal's top edge stays fixed throughout, and its height
eases smoothly instead of jumping.

**Rationale.** Motion should keep the user oriented. When the thing you clicked moves
away from the cursor, it reads as a glitch. A fixed anchor and one shared timing
curve make cause and effect easy to follow, and returning focus to search keeps the
"pick a different game" path keyboard-friendly.

**Code.** `src/Landing.jsx` (`Collapse`, `StartPartyModal`)

### 15. One Xbox green: logo, play buttons and accents
**Date:** 2026-10-24 · **Screen / element:** the Xbox logo (nav, sidebar, title bar),
play and launch buttons, back arrows, links, vote and check states, and the spin
wheel's accent lines

**Problem.** The Xbox side used five different greens. They were the lime `#9BF00B`
(primary buttons, headers), classic Xbox green `#107C10` (the logo, play buttons and
some primary actions), `#3fbf3f` and `#3dbf1e` (links, checks and wheel accents), and
`#0e8f0e` (hover). Side by side, the darker logo and play buttons looked like they
came from a different product than the lime around them.

**Change.** Everything now uses the one lime, `#9BF00B`. The logo is recolored by using
the original artwork as a mask over a lime fill, so its shape is untouched. Filled
greens get near-black text and icons for contrast, tints keep their transparency,
and the wheel's accent lines and notch glow in lime too.

**Rationale.** Color consistency is part of brand recognition. Once lime became the
Xbox accent (07, 12), a second, older green read as an inconsistency rather than a
deliberate choice. One green, used everywhere, makes "green means Xbox" a reliable
signal.

**Before / after.** `screenshots/15-nav-before.png` · `screenshots/15-nav-after.png`,
`screenshots/15-detail-before.png` · `screenshots/15-detail-after.png`

**Code.** `src/index.css` (redesign green unification), `src/Landing.jsx`
(`XboxLogo`, `SPIN_*` constants)

### 14. Live Party card: game title no longer cut off
**Date:** 2026-10-24 · **Screen / element:** Home, Live Party card

**Problem.** The card put the cover, the status and title, the roster, and two wide
buttons in one row. The title only got the space left over between the cover and
the buttons, so a normal-length name was cut off ("Minecraft Du…"). That's the one
piece of information that says what the party is.

**Change.** The layout is now two tiers beside the cover. On top are the "Live party"
status and the title, which get the column's full width. Below them, the roster
("1/2 ready") sits on the left and the actions on the right. If the card is narrow,
the buttons wrap under the roster instead of squeezing the title. A very long
title wraps to a second line before it's cut off, and the full name is always in a
tooltip.

**Rationale.** Content should take priority over controls. The title is the most
important information on the card, so it gets dedicated space, while the actions
are fixed-width and can move. Grouping who's ready with the buttons that act on it
also puts related things together.

**Before / after.** `screenshots/14-before.png` · `screenshots/14-after.png`

**Code.** `src/Landing.jsx` (`HomePartyCard`)

### 13. Party host on Home: no duplicate toast
**Date:** 2026-10-24 · **Screen / element:** the "Getting the party ready" toast, for
the party's host

**Problem.** After starting a party, the host on Home saw the same status and the same
Cancel and Launch buttons twice: once in the Live Party card on the page, and again
in a toast in the corner. The two competed for attention and made it unclear which
one to use.

**Change.** While the host is on Home, the toast is hidden, and the Live Party card is
the single place to manage the party. On any other page the toast comes back, since
it's then the host's only view of who's ready and the only way to launch. Invitees
are unaffected. Launch handling still runs in the background, so the party still
starts and clears normally.

**Rationale.** Each piece of information and each action should appear in one place. A
toast is for something happening somewhere you aren't looking. When the card is
already on screen, the toast is noise.

**Before / after.** `screenshots/13-before-toast.png` (the duplicate toast, shown
on Home alongside the card) · `screenshots/14-after.png` (Home, card only)

**Code.** `src/Landing.jsx` (`LaunchNotification`, `hideForHost`)

### 12. Xbox green replaces Discord blue on Xbox surfaces
**Date:** 2026-10-24 · **Screen / element:** every accent on Xbox surfaces: primary
buttons, checked checkboxes, selected borders, focus and hover rings, and text
links. This covers the launcher toggle too.

**Problem.** Inside the Xbox experience, selected and primary states used Discord's
blurple (`#5765f2`), and links used its lighter tint (`#8aa0ff`). The prototype
ended up with two competing accent colors, and the Xbox flows signalled "Discord"
at exactly the moments that matter most, like confirming a choice.

**Change.** On Xbox surfaces, the blurple accent and its link tints are now Xbox green
(`#9BF00B`). Text and icons on a filled green turn near-black, because white on
lime is hard to read. Discord surfaces keep their blurple. That includes the
friend/chat pickers, where blurple and green deliberately mean different things.
Blurple used as a data color, such as wheel segments, PlayList colors and player
avatars, is left alone.

**Rationale.** One accent color per product. Green now consistently means "Xbox
action or selection", which reinforces the boundary set by the corner treatment
(01, 05) and removes the two-accents problem noted in the original color audit.

**Before / after.** `screenshots/12-before.png` · `screenshots/12-after.png`

**Code.** `src/index.css` (redesign accent remap)

### 11. Start a party: games picked in the modal count as recent
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Recent searches

**Problem.** Only opening a game's detail page added it to "Recent searches". A game
found and picked through the modal's own search never showed up there, so the
section didn't reflect what the user had actually searched.

**Change.** Picking a game in the modal, from search or from the recents grid, now
records it as recent. It moves to the front, so the next party's grid leads with it.

**Rationale.** A label has to match its behavior. "Recent searches" should include
searches. It also makes the recents grid (10) useful for its main case: starting
another party with the same game.

**Code.** `src/Landing.jsx` (`StartPartyModal`, `onRecord`)

### 10. Start a party: recent games as a two-up grid (iteration on 09)
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Recent searches

**Problem.** Moving recent games into the dropdown (09) hid the fastest path. The
most likely pick, a game you just looked at, now took a click into search to even
see.

**Change.** Recent games are back in the modal, under the search field, as a
two-column grid that shows at most two games side by side. Each tile has the cover
art, title, and genre and player count. Hovering a tile adds an Xbox-green outline,
and clicking it picks the game. The dropdown now only lists typed matches, so
recent games never appear twice. If there are no recent games, the section doesn't
appear.

**Rationale.** Searching and recognizing are two different jobs. Typing suits a game
you have in mind, and seeing cover art suits one you just browsed. Capping the grid
at two keeps it a quick pick rather than a second list, and keeps the modal short
and a fixed size. Cover art makes the likeliest choices recognizable at a glance.

**Before / after.** `screenshots/09-dropdown.png` · `screenshots/10-recent-grid.png`

**Code.** `src/Landing.jsx` (`StartPartyModal`)

### 09. Start a party: game search as a floating dropdown
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Game picker

**Problem.** Search results and "Recent searches" were drawn into the modal itself,
as rows with thumbnails. Typing a query made the modal grow and shrink as results
changed, pushing everything below it around. The thumbnails also made a simple
choice look heavier than it is.

**Change.** The game picker is now just a search field. Clicking or typing in it
opens a dropdown that floats over the modal, so the modal stays the same size
throughout. Each option is plain text: the game title, with its genre and player
count in grey on the same line. An empty field shows recent picks, and typing shows
matches. The dropdown doesn't open on its own when the modal opens, only when the
user engages with the field. Arrow keys and Enter pick a game. Escape closes the
dropdown without closing the modal, and clicking away also closes it.

**Rationale.** A combobox is the standard pattern for picking one item from a large
set. Keeping the modal a fixed size gives the layout stability, since content no
longer jumps while typing. Text-only rows with genre and player count show exactly
what matters for a party decision (what kind of game it is and whether everyone
can join) and make the list quicker to scan. Opening only on intent keeps the
first view of the modal calm.

**Before / after.** `screenshots/08-collapsed.png` (results drawn into the modal) ·
`screenshots/09-dropdown.png`

**Code.** `src/Landing.jsx` (`GameSearchField`, used by `StartPartyModal`)

### 08. Start a party: invite unlocks after picking a game
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, Invite section

**Problem.** The game picker and the friend list were both open and interactive at
once, so you could invite people before you'd chosen what to play. That doesn't
match how a party actually comes together, where the game gives the invite its
context. It also made a long form where everything competed for attention at the
same time.

**Change.** The Invite section starts collapsed. Only its label shows, dimmed, with a
"Pick a game first" hint, so the next step is visible but not yet available.
Choosing a game expands the friend list with a 400ms height-and-fade animation.
Pressing "Change" on the game collapses it again, and friends already ticked stay
ticked. While collapsed, the list is removed from keyboard tab order too, not just
hidden. A party that opens with a game already chosen, for example from a card's
"Start a party" button, opens fully expanded.

**Rationale.** This is progressive disclosure. The modal now shows one decision at a
time in the order the task needs (game, then people), which cuts the visible
choices in half and makes the order clear without separate wizard steps. Keeping
the dimmed label visible shows the user what comes next. The animation connects
the cause (picking a game) to the effect (the list opening).

**Before / after.** `screenshots/08-collapsed.png` · `screenshots/08-expanded.png`

**Code.** `src/Landing.jsx` (`StartPartyModal`)

### 07. Start a party: Xbox-green header
**Date:** 2026-10-24 · **Screen / element:** Start a party modal, header

**Problem.** The header was white text on the same grey as the rest of the modal.
Nothing set it apart from the many other grey Discord-style dialogs, even though
starting a party is the product's main call to action.

**Change.** The title, subtitle and close button now sit on a full-width Xbox-green
(`#9BF00B`) band with black type and a heavier, larger X. The title and
subtitle sit tight together as one block, about 2px apart with snug line heights, and
the X is centered vertically on that block.

**Rationale.** A solid brand-color header makes the modal's purpose clear at a
glance and marks it as an Xbox flow, in line with the corner treatment (01 and 05).
Black on lime is very high contrast. This is the first step of a larger
information-architecture and flow pass on this modal.

**Before / after.** `screenshots/06-07-before.png` · `screenshots/06-07-after.png`

**Code.** `src/Landing.jsx` (`StartPartyModal`)

### 06. Darker surface greys, project-wide
**Date:** 2026-10-24 · **Screen / element:** every modal, panel and popover using
the shared surface grey, plus the inset grey used for inputs

**Problem.** The surface grey (`#2b2d31`) was bright enough that buttons on it,
especially the grey Cancel button and the green primary button, didn't stand out.
Everything sat at a similar brightness.

**Change.** The surface grey is now `#1a1b1e` (from `#2b2d31`) and the input grey is
now `#111214` (from `#1e1f22`). Inputs stay darker than the surface they sit on.
Avatar cut-out borders and rings in the surface grey were changed to match. Every
use in the project follows, Discord and Xbox alike.

**Rationale.** A darker base increases contrast with interactive elements, so
buttons read as actionable without getting louder themselves. It also brings the
modals closer to the near-black page (`#0c0c0e`) for a calmer, more consistent
dark theme.

**Before / after.** `screenshots/06-07-before.png` · `screenshots/06-07-after.png`

**Code.** `src/index.css` (redesign surface greys)

### 05. Corner radius refined: square to 2px (iteration on 01)
**Date:** 2026-10-24 · **Screen / element:** everything entry 01 covers

**Problem.** Fully square corners (01) separated Xbox from Discord, but they read
as harsh and a little unfinished. Image edges looked clipped rather than framed.

**Change.** Every Xbox element that was rounded now uses a tight 2px radius
instead of 0, including cards, buttons, tag pills, inputs, modals and toasts.
Elements that were square in the original stay square, so full-width sections
don't pick up small corner notches. Circles still stay round. This pass also fixed
a side effect of 01: review-author avatars, which are rounded squares by design,
had been turned into circles. A follow-up fix extended the
2px to cards that float on their own, such as the party, launch and wheel toasts,
the right-click game menu and the Add to PlayList popover. Their outer corner had
been missed, because the rule only reached elements inside a tagged surface.

**Rationale.** The reference was Xbox's own editorial cards on xbox.com ("Keep
reading"), which use a barely-there radius of about 2px. It softens the edge
without slipping back into Discord's rounded language, so the contrast between
the two products still holds. It also replaces the prototype's roughly 17
different radii with a single value.

**Before / after.** `screenshots/01-after.png` (0px) · `screenshots/05-home.png`
and `screenshots/05-launcher.png` (2px)

**Code.** `src/index.css` (redesign corner rule)

### 04. Edge fades on carousels
**Date:** 2026-10-24 · **Screen / element:** every horizontal card row (Recommended
by Your Friends, Friends Are Playing Now, and the rest)

**Problem.** Rows ended at a hard edge. A card cut off at the edge looked like a
layout mistake rather than a hint to scroll, and nothing showed which way there was
more to see.

**Change.** A fade into the page background, from transparent to solid, now covers
each edge of a row, but only on a side that has more cards. At the start of a row
only the right edge fades. In the middle both edges fade. At the end only the left
edge fades. The fades cross-fade as you scroll.

**Rationale.** This is a familiar overflow cue from streaming and store layouts. It
tells the user the row keeps going and in which direction, and it backs up the
arrow buttons without adding more controls.

**Before / after.** `screenshots/04-start.png` · `screenshots/04-middle.png` ·
`screenshots/04-end.png`

**Code.** `src/RecCard.jsx` (`ShelfRow`)

### 03. Carousel arrows centered on the cards
**Date:** 2026-10-24 · **Screen / element:** the left and right arrows on every card
row

**Problem.** The arrows were centered on the whole row, which includes the row's top
padding and the friend line above each card. As a result they sat about 30px below
the middle of the card art.

**Change.** The arrows now line up with the vertical center of the card art itself,
measured from the first card in the row.

**Rationale.** A control should line up with the thing it moves. When it's off
center, it reads as a mistake and weakens the polish of the whole surface.

**Before / after.** `screenshots/02-03-before.png` · `screenshots/02-03-after.png`

**Code.** `src/RecCard.jsx` (`ShelfRow`)

### 02. Readable titles on game previews
**Date:** 2026-10-24 · **Screen / element:** the hover preview on cinematic game
cards (Recommended by Your Friends and the other home rows)

**Problem.** On hover, the game title and studio line sit over the playing trailer
with only a drop shadow behind them. On bright or busy footage the title was hard
to read.

**Change.** A dark gradient now sits behind the title. It runs from 80% black at the
top of the card to clear about 60% of the way down, and it fades in and out with
the rest of the hover overlay.

**Rationale.** Text needs reliable contrast against an image or video it doesn't
control. The gradient keeps the title legible on any footage while leaving most of
the trailer visible. It also mirrors the dark band that already sits behind the
tags at the bottom of the card.

**Before / after.** `screenshots/02-03-before.png` · `screenshots/02-03-after.png`

**Code.** `src/RecCard.jsx` (`CinematicCard`)

### 01. Square corners on Xbox surfaces
**Date:** 2026-10-24 · **Screen / element:** the launcher (room select), every Xbox page (Recommended, Library,
PlayLists, Mix, game detail, decide) and the game-centric overlays (Wheel, Start a
party, Create a Mix, Add to PlayList, preferences, game right-click menu, party and
wheel toasts)

**Problem.** The prototype rounded nearly everything with about 17 different
radii, from 3px to 24px. The Xbox content therefore picked up Discord's soft,
rounded look, and the two products blurred together. Nothing marked where Discord
ended and Xbox began.

**Change.** Every Xbox surface now has square corners: cards, buttons, pills, tags,
inputs, modals and toasts. Discord chrome keeps its rounding: the server rail,
sidebar, DMs, voice panel and the friend and chat pickers (share, invite, gift,
who's on, who's playing). True circles stay round, including avatars, status dots
and round icon buttons.

**Rationale.** Sharp, rectilinear geometry is part of Xbox's visual language,
from its tile-based dashboard heritage onward. Discord's language is rounded and
soft. Giving each product its own corner treatment makes the boundary between
them easy to read at a glance: square means Xbox and rounded means Discord. It
also takes out the many near-identical radius values the prototype had built up.

**Before / after.** `screenshots/01-before.png` · `screenshots/01-after.png` (home), `screenshots/01-launcher-before.png` · `screenshots/01-launcher-after.png`

**Code.** `src/index.css` (redesign corner rule). Pages and overlays are tagged
`data-xbox`, and Discord pickers nested inside them are tagged `data-discord`, in
`src/Landing.jsx`.
