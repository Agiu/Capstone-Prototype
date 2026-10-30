// ─────────────────────────────────────────────────────────────────────────────
// Motion-graphics scene registry.
//
// Each scene mounts ONE piece of real app UI in isolation, with fixed props, so
// the exporter can screenshot it and every one of its visual layers against the
// same canvas. Nothing here is imported by the app — it's a parallel entry
// (mograph.html) that only `npm run mograph` and the exporter ever load.
// ─────────────────────────────────────────────────────────────────────────────
import { AVATAR } from '../RecCard.jsx'
import { RoomProvider } from '../room.js'
import {
  NavCtx, CATALOG, COLOR_OF, STARTER_MIX_GAMES,
  Avatar, MemberChip, BlendCard, CreateBlendCard, CreateBlendModal,
  PlaylistModal, VoteControl, WishlistModal,
  DecisionWheel, WheelNavButton, WheelInviteStep, WheelJamToast,
  SpinNotification, WheelNotification, LaunchNotification, PartyAvatars,
  FeedRow, TrendingRow, PlayerAvatar, StatusRow, friendInfo, friendHours,
} from '../Landing.jsx'

// ── Fixed sample data ───────────────────────────────────────────────────────
// Deterministic, so re-running the exporter produces byte-identical art.
const WHEEL_KEYS = ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'monsterHunter']
const WHEEL_GAMES = WHEEL_KEYS.map((k) => ({ key: k, title: CATALOG[k].title }))

const MIX = {
  id: 'late-night-crew',
  name: 'The Late Night Crew',
  color: '#5765f2',
  members: [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red],
  invited: [AVATAR.pink],
  games: STARTER_MIX_GAMES,
  wishlist: ['overcooked', 'grounded'],
  addedBy: { overcooked: 'caleb' },
}
const MIX_B = { id: 'sunday-squad', name: 'Sunday Squad', color: '#16a085', members: [AVATAR.green, AVATAR.yellow], games: STARTER_MIX_GAMES.slice(2), wishlist: [] }

// A stand-in room so the components that read room context render without
// touching Firebase. `setBlends` is a no-op: nothing here ever writes.
const ROOM = {
  blends: [MIX, MIX_B],
  ready: true,
  online: ['caleb', 'sauhee'],
  names: {},
  hiddenProfiles: {},
  setBlends: () => {},
  resetRoom: () => {},
  setName: () => {},
  setHiddenProfile: () => {},
}
const Room = ({ children }) => <RoomProvider value={ROOM}>{children}</RoomProvider>

const nav = (extra) => ({ canBack: false, canForward: false, back: () => {}, forward: () => {}, openWheel: () => {}, addToWheel: () => {}, ...extra })
const Nav = ({ value, children }) => <NavCtx.Provider value={nav(value)}>{children}</NavCtx.Provider>

// A launch party in a given shape. `host`/`ready` decide which of the four
// ready-up faces LaunchNotification shows (it reads them against SELF = clarisse).
const party = (o) => ({
  host: 'caleb',
  invitees: ['clarisse', 'sauhee', 'meera'],
  ready: {},
  declined: {},
  game: { key: 'seaOfThieves', title: CATALOG.seaOfThieves.title, image: CATALOG.seaOfThieves.image, players: '1-4' },
  startedAt: Date.now(),
  launched: false,
  ...o,
})

const noop = () => {}

// Layer names worth spelling out; anything unlisted is named from its own text.
const WHEEL_LABELS = [['svg[viewBox="0 0 420 420"]', 'wheel'], ['svg[viewBox="0 0 24 28"]', 'pointer'], ['button[aria-label="Spin the wheel"]', 'hub']]
const TOAST_LABELS = [['img', 'cover-art']]

// ── Scenes ──────────────────────────────────────────────────────────────────
// `group`  → output folder. `w` → stage width hint for the exporter.
// `frame`  → 'fixed' for components that position themselves against the
//            viewport (toasts, modals); the exporter clips to their own box.
export const SCENES = [
  // ── 01 · Creating a new PlayList ──────────────────────────────────────────
  {
    id: 'create-card', group: '01-create-playlist', w: 260,
    note: 'The "Create a new PlayList" tile that leads the Mixes row.',
    render: () => <CreateBlendCard onClick={noop} />,
  },
  {
    id: 'create-modal-empty', group: '01-create-playlist', frame: 'fixed',
    note: 'Step 1 — pick who the PlayList is with. Nobody selected yet, so the footer shows the invite link.',
    render: () => <Room><CreateBlendModal onClose={noop} onCreated={noop} /></Room>,
  },
  {
    id: 'create-modal-selected', group: '01-create-playlist', frame: 'fixed',
    note: 'Step 2 — two friends checked, so the footer swaps to the name field + "Create a new PlayList".',
    // The checked state lives inside the component, so drive it the way a user would.
    steps: [{ click: '[role="dialog"] button:has-text("Caleb")' }, { click: '[role="dialog"] button:has-text("Sauhee")' }],
    render: () => <Room><CreateBlendModal onClose={noop} onCreated={noop} /></Room>,
  },
  {
    id: 'playlist-card', group: '01-create-playlist', w: 500, h: 320,
    note: 'The finished PlayList card — collage cover, name, member faces.',
    render: () => <BlendCard {...MIX} onOpen={noop} onContext={noop} onMenu={noop} onOpenGame={noop} />,
  },
  {
    id: 'playlist-card-row', group: '01-create-playlist', w: 720, h: 320,
    note: 'Create-tile beside a finished card — the before/after pair for a "new PlayList appears" transition.',
    render: () => (
      <div className="flex items-start gap-[24px]">
        <CreateBlendCard onClick={noop} />
        <BlendCard {...MIX} onOpen={noop} onContext={noop} onMenu={noop} onOpenGame={noop} />
      </div>
    ),
  },

  // ── 02 · Adding & ranking games in the Mix ────────────────────────────────
  {
    id: 'add-to-playlist-popover', group: '02-mix-add-and-rank', frame: 'fixed',
    note: 'The "Add to PlayList" context popover — one row per Mix, check = already in, + = add.',
    render: () => <Room><WishlistModal game={CATALOG.overcooked.title} onClose={noop} onAddToWheel={noop} /></Room>,
  },
  {
    id: 'rank-modal', group: '02-mix-add-and-rank', frame: 'fixed',
    note: 'Your PlayList — the drag-to-rank grid. Rank badges are their own layers, so they can count up on reorder.',
    render: () => <PlaylistModal blend={MIX} keys={WHEEL_KEYS} onClose={noop} onReorder={noop} onToggle={noop} />,
  },
  {
    id: 'rank-modal-search', group: '02-mix-add-and-rank', frame: 'fixed',
    note: 'Same modal with a search query open — the add/remove checkbox rows.',
    steps: [{ fill: ['[role="dialog"] input', 'sea'] }],
    render: () => <PlaylistModal blend={MIX} keys={WHEEL_KEYS} onClose={noop} onReorder={noop} onToggle={noop} />,
  },
  {
    id: 'vote-control-neutral', group: '02-mix-add-and-rank', w: 200, h: 60,
    note: 'Thumbs up / down, nothing cast.',
    render: () => <VoteControl mine={0} onUp={noop} onDown={noop} upVoters={['Caleb', 'Sauhee']} downVoters={['Meera']} />,
  },
  {
    id: 'vote-control-up', group: '02-mix-add-and-rank', w: 200, h: 60,
    note: 'Upvote cast — the lime fill state.',
    render: () => <VoteControl mine={1} onUp={noop} onDown={noop} upVoters={['You', 'Caleb', 'Sauhee']} downVoters={['Meera']} />,
  },
  {
    id: 'vote-control-down', group: '02-mix-add-and-rank', w: 200, h: 60,
    note: 'Downvote cast — the red fill state.',
    render: () => <VoteControl mine={-1} onUp={noop} onDown={noop} upVoters={['Caleb']} downVoters={['You', 'Meera']} />,
  },

  // ── 03 · Friend activity / social proof ───────────────────────────────────
  {
    id: 'trending-row', group: '03-friend-activity', w: 900,
    note: '"Trending amongst Your Friends" — stacked faces + "N friends played this for avg. N hours".',
    render: () => <Room><TrendingRow items={['gp_hades', 'gp_doom64', 'gp_vampiresurvivors']} onOpen={noop} onShare={noop} /></Room>,
  },
  {
    id: 'social-proof-line', group: '03-friend-activity', w: 520, h: 80,
    note: 'The social-proof line on its own — face stack + count, the atom the rows are built from.',
    render: () => {
      const k = 'gp_hades'
      const fi = friendInfo(k)
      return (
        <div className="flex items-center gap-[9px]">
          <span className="flex items-center">
            {fi.avatars.slice(0, 2).map((c, i) => (
              <PlayerAvatar key={i} color={c} size={22} marginRight={i < 1 ? -8 : 0} gameTitle="Hades" onShare={noop} hrs={friendHours(k, c)} />
            ))}
            {fi.avatars.length > 2 && <span className="ml-[3px] text-[13px] font-semibold leading-none text-white">+</span>}
          </span>
          <p className="text-[13px] font-semibold text-white">{fi.count} friends played this for avg. {fi.hours} hours</p>
        </div>
      )
    },
  },
  {
    id: 'activity-feed', group: '03-friend-activity', w: 520,
    note: 'The friend-activity feed rows — who did what, to which game, how long ago.',
    render: () => (
      <Room>
        <div className="flex w-full flex-col gap-[14px]">
          <FeedRow who={AVATAR.blue} pre="is playing" game={CATALOG.seaOfThieves.title} post="" when="live" onOpen={noop} />
          <FeedRow who={AVATAR.yellow} pre="added" game={CATALOG.overcooked.title} post=" to a PlayList" when="2m" onOpen={noop} />
          <FeedRow who={AVATAR.red} pre="recommends" game={CATALOG.grounded.title} post="" when="1h" onOpen={noop} />
          <FeedRow who={AVATAR.pink} text="joined The Late Night Crew" when="3h" onOpen={noop} />
        </div>
      </Room>
    ),
  },
  {
    id: 'member-stack', group: '03-friend-activity', w: 340, h: 80,
    note: 'The member face stack used on PlayList cards, with the +N overflow chip.',
    render: () => (
      <div className="flex items-center gap-[4px]">
        {[AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red, AVATAR.pink].map((c, i) => <MemberChip key={i} color={c} size={28} />)}
        <span className="flex h-[28px] items-center justify-center rounded-full bg-white/12 px-[8px] text-[12px] font-semibold leading-none text-white" style={{ boxShadow: '0 0 0 2px #0c0c0e' }}>+2</span>
      </div>
    ),
  },
  {
    id: 'member-stack-pending', group: '03-friend-activity', w: 340, h: 80,
    note: 'Same stack with an invited-but-not-joined member dimmed — the "invite lands" state.',
    render: () => (
      <div className="flex items-center gap-[4px]">
        {[AVATAR.green, AVATAR.blue, AVATAR.yellow].map((c, i) => <MemberChip key={i} color={c} size={28} />)}
        <MemberChip color={AVATAR.pink} size={28} pending />
      </div>
    ),
  },
  {
    id: 'whos-in-list', group: '03-friend-activity', w: 320,
    note: 'In / out status rows — green check, red cross, undecided.',
    render: () => (
      <div className="flex flex-col gap-[16px]">
        <StatusRow name="caleb" vote="yes" />
        <StatusRow name="sauhee" vote="yes" />
        <StatusRow name="meera" vote="no" />
        <StatusRow name="yessenia" vote={undefined} />
      </div>
    ),
  },
  {
    id: 'avatar-set', group: '03-friend-activity', w: 420, h: 100,
    note: 'The five identity avatars as loose pieces, for building custom stacks.',
    render: () => (
      <div className="flex items-center gap-[14px]">
        {Object.values(COLOR_OF).map((c) => <Avatar key={c} color={c} size={48} />)}
      </div>
    ),
  },

  // ── 04 · Spinning the wheel ───────────────────────────────────────────────
  {
    id: 'wheel-idle', group: '04-spin-the-wheel', w: 480, h: 480, labels: WHEEL_LABELS,
    note: 'The wheel at rest. The wheel body is one <svg> — rotate that node and leave the pointer + hub still.',
    render: () => <DecisionWheel games={WHEEL_GAMES} spin={null} remaining={0} onSpin={noop} disabled={false} spinning={false} />,
  },
  {
    id: 'wheel-landed', group: '04-spin-the-wheel', w: 480, h: 480, labels: WHEEL_LABELS,
    note: 'Landed on slice 3 — the pointer sits on the winning wedge.',
    render: () => <DecisionWheel games={WHEEL_GAMES} spin={{ id: 'x', target: 3, jitter: 0, turns: 0 }} remaining={0} onSpin={noop} disabled={false} spinning={false} />,
  },
  {
    id: 'wheel-twelve', group: '04-spin-the-wheel', w: 480, h: 480, labels: WHEEL_LABELS,
    note: 'A twelve-slice wheel — the art has faded out, so the wedges are flat colour.',
    render: () => {
      const keys = [...WHEEL_KEYS, 'gangBeasts', 'wildHearts', 'minecraftDungeons', 'lol', 'ac', 'forHonor']
      return <DecisionWheel games={keys.map((k) => ({ key: k, title: CATALOG[k].title }))} spin={null} remaining={0} onSpin={noop} disabled={false} spinning={false} />
    },
  },
  {
    id: 'wheel-nav-button', group: '04-spin-the-wheel', w: 240, h: 80,
    note: 'The Wheel button in the top nav — resting state.',
    render: () => <Nav value={{ wheelLive: false, wheelCount: 0 }}><WheelNavButton /></Nav>,
  },
  {
    id: 'wheel-nav-button-count', group: '04-spin-the-wheel', w: 240, h: 80,
    note: 'Wheel button with the games-added count badge.',
    render: () => <Nav value={{ wheelLive: false, wheelCount: 6 }}><WheelNavButton /></Nav>,
  },
  {
    id: 'wheel-nav-button-live', group: '04-spin-the-wheel', w: 300, h: 80,
    note: 'Wheel button while a sync is live — green glow + pulsing LIVE pill.',
    render: () => <Nav value={{ wheelLive: true, wheelCount: 6 }}><WheelNavButton /></Nav>,
  },
  {
    id: 'wheel-invite-popover', group: '04-spin-the-wheel', w: 460, h: 620,
    note: 'The wheel-sync invitation, in its compact popover form (top-right anchored).',
    render: () => (
      <Room>
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-[#1c1d21] bg-[#111214] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
          <WheelInviteStep online={['caleb', 'sauhee']} onCancel={noop} onStart={noop} popover />
        </div>
      </Room>
    ),
  },
  {
    id: 'wheel-invite-modal', group: '04-spin-the-wheel', w: 620, h: 720,
    note: 'The same invitation at full modal size.',
    render: () => (
      <Room>
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[16px] bg-[#111214] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
          <WheelInviteStep online={['caleb', 'sauhee']} onCancel={noop} onStart={noop} />
        </div>
      </Room>
    ),
  },
  {
    id: 'wheel-jam-toast', group: '04-spin-the-wheel', frame: 'fixed',
    note: 'THE top-right wheel invitation — "Caleb started a wheel on the call · Join".',
    render: () => <Room><WheelJamToast host="caleb" count={3} onJoin={noop} onDismiss={noop} /></Room>,
  },
  {
    id: 'spin-notification', group: '04-spin-the-wheel', frame: 'fixed',
    note: 'Top-right heads-up while the wheel is turning (the avatar has a ping ring).',
    render: () => (
      <Room>
        <SpinNotification state={{ spin: { id: 's1', spinner: 'caleb', blendName: MIX.name }, phase: 'spinning' }} />
      </Room>
    ),
  },
  {
    id: 'wheel-result-toast', group: '04-spin-the-wheel', frame: 'fixed', labels: TOAST_LABELS,
    note: 'The result toast — cover art, "The wheel picked", and the three actions.',
    render: () => (
      <Room>
        <WheelNotification
          spin={{ id: 's1', by: 'caleb', startedAt: Date.now() - 60000, target: 3, games: WHEEL_GAMES }}
          onOpenWheel={noop} onStartParty={noop} onRestart={noop} onDismiss={noop}
        />
      </Room>
    ),
  },
  {
    id: 'wheel-spinning-toast', group: '04-spin-the-wheel', frame: 'fixed', labels: TOAST_LABELS,
    note: 'The same toast mid-spin — "Landing on a game…" with the lime spinner.',
    render: () => (
      <Room>
        <WheelNotification
          spin={{ id: 's2', by: 'caleb', startedAt: Date.now() + 60000, target: 3, games: WHEEL_GAMES }}
          onOpenWheel={noop} onStartParty={noop} onRestart={noop} onDismiss={noop}
        />
      </Room>
    ),
  },

  // ── 05 · Ready-up notification ────────────────────────────────────────────
  {
    id: 'ready-up-invite', group: '05-ready-up', frame: 'fixed', labels: TOAST_LABELS,
    note: 'Screen 2 — the incoming invite you get when a game is selected. "Ready Up" / "Not Now".',
    render: () => <Room><LaunchNotification launch={party({})} readyUp={noop} undoReady={noop} decline={noop} launchNow={noop} clear={noop} onLaunch={noop} /></Room>,
  },
  {
    id: 'ready-up-confirmed', group: '05-ready-up', frame: 'fixed', labels: TOAST_LABELS,
    note: 'Screen 4 — you readied up. Check badge + the party face stack.',
    render: () => <Room><LaunchNotification launch={party({ ready: { clarisse: true } })} readyUp={noop} undoReady={noop} decline={noop} launchNow={noop} clear={noop} onLaunch={noop} /></Room>,
  },
  {
    id: 'ready-up-host-waiting', group: '05-ready-up', frame: 'fixed', labels: TOAST_LABELS,
    note: 'Screen 3 — you are the host, still waiting on people.',
    render: () => <Room><LaunchNotification launch={party({ host: 'clarisse', invitees: ['caleb', 'sauhee', 'meera'], ready: { caleb: true } })} readyUp={noop} undoReady={noop} decline={noop} launchNow={noop} clear={noop} onLaunch={noop} /></Room>,
  },
  {
    id: 'ready-up-party-ready', group: '05-ready-up', frame: 'fixed', labels: TOAST_LABELS,
    note: 'Screen 5 — everyone is in. "Launch Game" is live.',
    render: () => <Room><LaunchNotification launch={party({ host: 'clarisse', invitees: ['caleb', 'sauhee', 'meera'], ready: { caleb: true, sauhee: true, meera: true } })} readyUp={noop} undoReady={noop} decline={noop} launchNow={noop} clear={noop} onLaunch={noop} /></Room>,
  },
  {
    id: 'party-avatars', group: '05-ready-up', w: 300, h: 90,
    note: 'The party face stack on its own — ready (green check), declined (red cross), undecided (dim).',
    render: () => <PartyAvatars launch={party({ host: 'clarisse', invitees: ['caleb', 'sauhee', 'meera'], ready: { caleb: true }, declined: { meera: true } })} />,
  },
]

export const GROUPS = [...new Set(SCENES.map((s) => s.group))].sort()
