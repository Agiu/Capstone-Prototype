# Capstone Prototype: XBOX ARCADE × Discord

This is our capstone prototype: a clickable, multi-user mock-up of what Xbox gaming could look like if it lived inside Discord. The big idea is that deciding *what to play with your friends* should be social from the start. Instead of a generic store, you see what your friends are playing and recommending, you can build shared PlayLists, vote on games, spin a wheel to settle arguments, and start a party without leaving the conversation.

It was built to be put in front of real people for moderated usability tests, so several people can join the same room and see each other's actions live.

## What this branch is (`caleb-redesign`)

The prototype was built fast for testing, and a lot of the design details were never properly worked through. This branch is a **redesign pass** on top of the tested version. The two versions live side by side in the same code, behind a **Redesign** toggle on the launcher screen:

- **Off:** the prototype exactly as it was tested.
- **On:** the redesigned screens, such as the rebuilt game page, ASCII key-art headers, and a proper design system.

That way I can capture before/after shots of the same screen with the same data. Every change, with the problem, the fix and the reasoning, is written up in [`REDESIGN_LOG.md`](REDESIGN_LOG.md). The earlier week of design changes is summarized in [`CHANGELOG.md`](CHANGELOG.md).

The branch also adds:
- A **design system** (colour, type and component tokens) in `src/design/`, viewable at `/design.html`.
- A **motion-graphics scene** setup in `src/mograph/` (`mograph.html`) and an export script in `tools/`.

## Running it locally

You need [Node.js](https://nodejs.org/) (a recent LTS is fine) and npm.

```bash
git checkout caleb-redesign
npm install
npm run dev
```

Then open http://localhost:5173. To use a different port, set `PORT` first (for example `PORT=3000 npm run dev`).

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run tokens` | Regenerate the redesign colour remap from `src/design/colors.json` (Vite also does this on start and on save) |

The multi-user sync runs on a hosted Firebase Realtime Database, so you need an internet connection. No `.env` file or setup is needed. The Firebase web config is public by design and already in `src/room.js`.

## Using it

Opening the root URL gives you the **launcher**. From there you pick a player, open the multi view, and flip the Redesign switch. You can also go straight to a view with URL params:

| URL | What you get |
| --- | --- |
| `/` | Launcher home screen (pick a player or the multi view) |
| `/?u=1` … `/?u=5` | Enter as a single player: 1 Clarisse, 2 Caleb, 3 Sauhee, 4 Meera, 5 Yessenia |
| `/?multi=1` | Multi view: several live panes at once, so one person can play both sides of a flow |
| `/?moderator=1` | Moderator wall: live mirrors of every participant |
| `/?overview=1` | Solo feature tour and notification simulator (no room needed) |
| `/?room=my-room` | Join a specific shared room (defaults to `session1`) |
| `&redesign=1` / `&redesign=0` | Force the redesign on or off for that link |

Everyone who opens the same `room` shares the same state, so open two tabs as different players to see things sync. Use a fresh room name if you don't want to step on a previous session's data.

## Project layout

```
src/Landing.jsx     main app: launcher, player views, moderator wall
src/room.js         Firebase room sync
src/redesign.js     redesign toggle (REDESIGN flag, rd(before, after))
src/design/         design tokens + design system page
src/mograph/        motion-graphics scenes
tools/              export scripts
REDESIGN_LOG.md     every redesign change, with rationale
```

## Deploying

It's a static single-page app, deployed on Netlify (`netlify.toml` runs `npm run build` and publishes `dist/`).
