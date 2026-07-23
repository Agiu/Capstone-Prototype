import { useLayoutEffect, useRef, useState } from 'react'
import {
  bgDiscord,
  bgCall,
  activityGridIcon,
  activityBtnHover,
  activityTile,
  seeAllChevron,
  voiceMembers,
  jumpFortnite,
  jumpTwo,
  heroAc,
  heroMinecraft,
  heroGangBeasts,
  heroSeaOfThieves,
  heroMinecraftDungeons,
  heroWildHearts,
  heroHumanFallFlat,
  heroOvercooked,
  heroMonsterHunter,
  heroGrounded,
  heroForHonor,
  heroLol,
  xboxSprite,
  discordLogo,
  xboxBadge,
  xboxPriceIcon,
  searchIcon,
  bookmarkIcon,
  playGreen,
  userGroup,
  dividerV,
  playGreen2,
  playOwned,
  thumbsUp,
  appleLogo,
  iosShare,
  bookmarkSmall,
  bookmark01,
  chatAdd,
} from './assets/figma/index.js'

// Native size of the Figma frame (node 312:2544). Everything is positioned in
// this coordinate space, then the whole stage is scaled to fit the viewport.
const FRAME_W = 2189
const FRAME_H = 1347
// Region of the frame shown in "Focus" mode — the whole window width below the
// top bar (so the bottom-right controls stay visible). Fills the viewport width.
const FOCUS = { x: 0, y: 150, w: FRAME_W, h: FRAME_H - 150 }

// Friend avatar colors (solid Discord-style circles).
const AVATAR = { blue: '#5165F6', purple: '#9A45F7', red: '#FF3737', green: '#00A853' }

// Active voice-call participants shown above the control bar.
const CALL = [
  { color: '#00A753', name: 'sauhee' },
  { color: '#4D60E8', name: 'clarisse' },
  { color: '#9A45F7', name: 'caleb' },
  { color: '#FF3737', name: 'meera' },
]

/** A Discord-style avatar: a colored circle with the white Discord logo. */
function ProfileIcon({ color, className, style }) {
  return (
    <div
      className={'relative shrink-0 overflow-hidden rounded-full ' + (className || '')}
      style={{ backgroundColor: color, ...style }}
    >
      <img
        alt=""
        src={discordLogo}
        className="absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    </div>
  )
}

/** Xbox logo cropped out of a wider sprite sheet, matching the Figma render. */
function XboxLogo({ size }) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <img
        alt="Xbox"
        src={xboxSprite}
        className="absolute left-0 max-w-none"
        style={{ width: '331.43%', height: '100.24%', top: '-0.12%' }}
      />
    </div>
  )
}

/** A rounded outline pill used for the game metadata tags. */
function Pill({ children }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[2px] whitespace-nowrap rounded-[16px] border border-[#7e7f87] px-[6px] py-[2px]">
      {children}
    </div>
  )
}

/** A green-glowing square (Game Pass "owned" indicator) with centered content.
    Sized larger than the avatar so the avatar keeps its full size. */
function LitSquare({ children }) {
  return (
    <div className="relative flex size-[26px] shrink-0 items-center justify-center rounded-[6px] border border-[#107c10] bg-black drop-shadow-[0px_0px_2px_#95ff00]">
      {children}
    </div>
  )
}

/**
 * The small status squares on the top-right of a rec card — the "profile
 * ownership indicator". A `boxed` dot is a friend who owns the game via Game
 * Pass (green glow box); otherwise the friend's plain avatar is shown.
 */
function StatusDots({ dots }) {
  return (
    <div className="flex items-center gap-[4px]">
      {dots.map((d, i) =>
        d.state === 'gamepass' ? (
          // Owns via Game Pass → green glow box.
          <LitSquare key={i}>
            <ProfileIcon color={d.color} className="size-[20px]" />
          </LitSquare>
        ) : d.state === 'owned' ? (
          // Owns the game (not via Game Pass) → plain avatar.
          <ProfileIcon key={i} color={d.color} className="size-[20px]" />
        ) : (
          // Doesn't own the game → dimmed to 20%.
          <ProfileIcon key={i} color={d.color} className="size-[20px] opacity-20" />
        ),
      )}
    </div>
  )
}

// The friend group shown in every card's ownership indicator, in display order.
// Green is the user (sauhee).
const FRIENDS = [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red]
// Per-friend ownership state for a card:
//   'gamepass' → green glow box (owns it through Game Pass)
//   'owned'    → plain avatar (owns/bought it, not via Game Pass)
//   'none'     → dimmed (doesn't own it)
// The user's Game Pass tier price (the tier they subscribe to in Game Pass view).
// A game is covered by their subscription if its tier price is ≤ this.
const USER_TIER = 19.99
// Purple always has Game Pass (top tier). Green (the user) owns a game if they
// bought it (in `owners`) or, in Game Pass view, if the game's tier price is
// within their tier. Blue and red only own games they've bought.
function ownerState(color, owners, gamePass, gpTier) {
  if (color === AVATAR.purple) return 'gamepass'
  if (color === AVATAR.green) {
    if (owners.includes(color)) return 'owned'
    if (gamePass && gpTier <= USER_TIER) return 'gamepass'
    return 'none'
  }
  return owners.includes(color) ? 'owned' : 'none'
}
function ownerDots(owners = [], gamePass, gpTier) {
  return FRIENDS.map((color) => ({ color, state: ownerState(color, owners, gamePass, gpTier) }))
}

function AvatarStack({ colors }) {
  return (
    <div className="flex items-center">
      {colors.map((c, i) => (
        <ProfileIcon
          key={i}
          color={c}
          className="size-[30px]"
          style={{ marginRight: i < colors.length - 1 ? -14 : 0, zIndex: i + 1 }}
        />
      ))}
    </div>
  )
}

function RatingRow({ pct, line1, line2, line2Bold }) {
  return (
    <div className="flex w-[210px] items-center gap-[8px]">
      <img alt="" src={thumbsUp} className="size-[36px] shrink-0" />
      <span className="whitespace-nowrap text-[28px] font-semibold text-white">{pct}</span>
      <span className="whitespace-nowrap text-[12px] leading-tight text-[#e7e7e7]">
        {line1}
        <br />
        <span className={line2Bold ? 'font-bold' : undefined}>{line2}</span>
      </span>
    </div>
  )
}

/**
 * Trailer that plays on hover. Pass `mp4` (preferred — clean, seamless, no
 * branding) or `youTubeId` (stopgap).
 */
function VideoTrailer({ mp4, youTubeId, poster }) {
  if (mp4) {
    return (
      <video
        className="pointer-events-none absolute inset-0 size-full object-cover"
        src={mp4}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }
  if (youTubeId) {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      loop: '1',
      playlist: youTubeId,
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      disablekb: '1',
      iv_load_policy: '3',
    })
    return (
      <iframe
        title="Game trailer"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 border-0"
        src={`https://www.youtube-nocookie.com/embed/${youTubeId}?${params}`}
        allow="autoplay; encrypted-media"
      />
    )
  }
  return null
}

// Bookmark glyph (Figma bookmark-01) — solid white when saved, outline otherwise.
const BOOKMARK_D =
  'M3.99987 17.9809V9.70766C3.99987 6.07429 3.99987 4.25761 5.17144 3.12887C6.34302 2.00013 8.22863 2.00013 11.9999 2.00013C15.7711 2.00013 17.6568 2.00013 18.8283 3.12887C19.9999 4.25761 19.9999 6.07429 19.9999 9.70766V17.9809C19.9999 20.2868 19.9999 21.4397 19.2271 21.8524C17.7304 22.6515 14.9231 19.9853 13.5899 19.1825C12.8167 18.7169 12.4301 18.4841 11.9999 18.4841C11.5697 18.4841 11.1831 18.7169 10.4099 19.1825C9.07667 19.9853 6.26934 22.6515 4.77272 21.8524C3.99987 21.4397 3.99987 20.2868 3.99987 17.9809Z'
function BookmarkGlyph({ filled, color = 'white' }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[24px] shrink-0" fill="none">
      <path
        d={BOOKMARK_D}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.66"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!filled && <path d="M4 7H20" stroke={color} strokeWidth="1.66" />}
    </svg>
  )
}

// Add-to-chat glyph (Figma chat_circle_add) — filled white bubble when shared.
const CHAT_BUBBLE_D =
  'M10.0001 19C8.36502 19 6.83174 18.5639 5.51025 17.8018C5.3797 17.7265 5.31434 17.6888 5.25293 17.6719C5.19578 17.6561 5.14475 17.6507 5.08559 17.6548C5.02253 17.6591 4.9573 17.6808 4.82759 17.7241L2.51807 18.4939L2.51625 18.4947C2.02892 18.6572 1.7848 18.7386 1.62256 18.6807C1.4812 18.6303 1.36979 18.5187 1.31938 18.3774C1.26157 18.2152 1.34268 17.9719 1.50489 17.4853L1.50586 17.4823L2.27468 15.1758L2.27651 15.171C2.31936 15.0424 2.34106 14.9773 2.34535 14.9146C2.3494 14.8554 2.34401 14.804 2.32821 14.7469C2.31146 14.6863 2.27448 14.6221 2.20114 14.495L2.19819 14.4899C1.43604 13.1684 1 11.6351 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9707 19 10.0001 19Z'
function ChatAddGlyph({ filled, color = 'white' }) {
  return (
    <svg viewBox="0 0 20 20" className="size-[24px] shrink-0" fill="none">
      <path
        d={CHAT_BUBBLE_D}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 13V7M7 10H13"
        stroke={filled ? '#131416' : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * An interactive bookmark/add-to-chat toggle in a card. Click toggles the user's
 * own state (filled white). If another person already did it (`othersActive`),
 * it shows filled gray until the user also toggles it on.
 */
function CardIconButton({ glyph: Glyph, initialMine = false, othersActive = false, label }) {
  const [mine, setMine] = useState(initialMine)
  const active = mine || othersActive
  // If someone else already did it, it stays gray-filled even when I click.
  const color = othersActive ? '#7e7f87' : 'white'
  return (
    <button
      type="button"
      onClick={() => setMine((v) => !v)}
      title={label}
      className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"
    >
      <Glyph filled={active} color={color} />
    </button>
  )
}

/**
 * The bottom-right action, from the user's (green/sauhee) perspective:
 *  - free              → "Free to play" + green Play
 *  - whole group owns  → green Play (featured)
 *  - I own via GP      → "$19.99 Game Pass" badge + gray Play
 *  - I bought it       → gray Play only (no badges)
 *  - I don't own it    → Game Pass price + purchase price (e.g. above my tier)
 */
function CardFooter({ details, isFeatured, free, greenState }) {
  if (free) {
    return (
      <div className="flex items-center gap-[8px]">
        <div className="flex h-[40px] items-center rounded-[6px] bg-[#242429] px-[12px]">
          <span className="whitespace-nowrap text-[16px] font-semibold text-white">Free to play</span>
        </div>
        <img alt="Play" src={playGreen2} className="size-[50px]" />
      </div>
    )
  }
  if (isFeatured) {
    return <img alt="Play" src={playGreen2} className="size-[50px]" />
  }
  if (greenState !== 'none') {
    // I own it (bought, or covered by my Game Pass tier) — just play, no badge.
    return <img alt="Play" src={playOwned} className="size-[50px]" />
  }
  // I don't own it (above my Game Pass tier / not on GP) → the tier price that
  // includes it (Game Pass badge) + the purchase price.
  return (
    <div className="flex items-center gap-[8px]">
      <div className="flex h-[40px] items-center rounded-[6px] bg-[#107c10] pr-[8px]">
        <img alt="" src={xboxPriceIcon} className="size-[40px] shrink-0 rounded-[6px] object-cover" />
        <span className="ml-[4px] whitespace-nowrap text-[16px] font-semibold text-white">
          {details.gpPrice}
        </span>
      </div>
      <img alt="" src={dividerV} className="h-[32.5px] w-px shrink-0" />
      <div className="flex h-[40px] items-center gap-[8px] whitespace-nowrap rounded-[4px] bg-[#242429] px-[8px] py-[2px]">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[16px] font-bold text-[#95ff00]">-20%</span>
          <span className="text-[12px] text-[#e7e7e7] line-through">$32.60</span>
        </div>
        <span className="text-[16px] text-white">$26.08</span>
      </div>
    </div>
  )
}

/**
 * A rec card that expands horizontally on hover to reveal a details column
 * (matching Figma 329:5387). Collapsed it shows just the thumbnail column
 * (420px); on hover it grows to 718px and the 250px hover_content fades in.
 *
 * Footer states: `featured` → Play button; `owned` → Game Pass icon + Play;
 * otherwise → purchasable price.
 */
function RecCard({ avatars, label, image, players, details, video, featured, free, owners, bookmarked, shared, gamePass }) {
  const own = owners || []
  // The Game Pass tier price that includes this game (Infinity if not on GP).
  const gpTier = details.gpPrice ? parseFloat(details.gpPrice.replace(/[^0-9.]/g, '')) : Infinity
  const dots = ownerDots(own, gamePass, gpTier)
  const greenState = ownerState(AVATAR.green, own, gamePass, gpTier) // the user's own state
  // When the whole group owns the game (via Game Pass or purchase), it's playable
  // together right now: treat it like a featured card (green glow + Play button).
  const allOwn = FRIENDS.every((c) => ownerState(c, own, gamePass, gpTier) !== 'none')
  const isFeatured = featured || allOwn
  // The bookmark is a wishlist marker: filled when the user (green) wishlisted it.
  const wishlistedByMe = label === 'wishlisted this game' && (avatars || []).includes(AVATAR.green)

  return (
    <div
      className={
        // Expand only after hovering ~0.5s; collapse immediately on leave.
        'group flex h-[380px] w-[452px] shrink-0 gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px] transition-[width] delay-[0ms] duration-300 ease-out hover:w-[718px] hover:delay-[500ms]' +
        // Featured, all-owned, and free-to-play games are playable right now → green glow.
        (isFeatured || free ? ' drop-shadow-[0px_0px_15.2px_rgba(149,255,0,0.8)]' : '')
      }
    >
      {/* Left column — thumbnail_content */}
      <div className="flex w-[420px] shrink-0 flex-col gap-[16px]">
        {/* Header — avatars + label, ownership dots on the right */}
        <div className="flex h-[30px] w-full items-center justify-between">
          <div className="flex items-center gap-[8px]">
            <AvatarStack colors={avatars} />
            <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
          </div>
          <StatusDots dots={dots} />
        </div>

        {/* Cover art → streaming trailer on hover, with a scrubber */}
        <div className="relative h-[236px] w-[420px] overflow-hidden rounded-[16px] bg-black">
          <img
            alt=""
            src={image}
            loading="lazy"
            decoding="async"
            className={
              'absolute inset-0 size-full object-cover transition-opacity delay-[0ms] duration-300' +
              (video ? ' group-hover:opacity-0 group-hover:delay-[500ms]' : '')
            }
          />
          {video && (
            <div
              className="absolute inset-0 bg-black bg-cover bg-center opacity-0 transition-opacity delay-[0ms] duration-500 group-hover:opacity-100 group-hover:delay-[500ms]"
              style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
            >
              <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
            </div>
          )}
        </div>

        {/* Metadata pills + footer action/price */}
        <div className="flex h-[50px] w-full items-center gap-[8px]">
          <div className="flex items-center gap-[4px]">
            <Pill>
              <span className="flex -scale-y-100 rotate-180 items-center justify-center">
                <img alt="" src={userGroup} className="size-[16px]" />
              </span>
              <span className="text-[12px] text-[#7e7f87]">{players}</span>
            </Pill>
            <Pill>
              <span className="text-[12px] text-[#7e7f87]">{details.playtime}</span>
            </Pill>
            <Pill>
              <span className="text-[12px] text-[#7e7f87]">{details.genre}</span>
            </Pill>
          </div>
          <div className="flex flex-1 items-center justify-end">
            <CardFooter details={details} isFeatured={isFeatured} free={free} greenState={greenState} />
          </div>
        </div>
      </div>

      {/* Right column — hover_content; fades in as the card expands */}
      <div className="flex h-[348px] w-[250px] shrink-0 flex-col gap-[16px] opacity-0 transition-opacity delay-[0ms] duration-300 ease-out group-hover:opacity-100 group-hover:delay-[500ms]">
        {/* Bookmark + add-to-chat — click to toggle; gray-filled if someone else did it */}
        <div className="flex items-center justify-end gap-[8px]">
          <CardIconButton glyph={BookmarkGlyph} initialMine={wishlistedByMe} label="Bookmark" />
          <CardIconButton glyph={ChatAddGlyph} othersActive={shared} label="Add to chat" />
        </div>

        <div className="flex flex-1 flex-col justify-between pb-[5px]">
          <div className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[8px] text-[#e7e7e7]">
              <p className="text-[20px] font-semibold leading-tight">{details.title}</p>
              <p className="whitespace-nowrap text-[12px]">
                by <span className="font-semibold">{details.developer}</span>
              </p>
            </div>

            <div className="flex flex-col gap-[8px]">
              {details.ratings.map((r, i) => (
                <RatingRow key={i} {...r} />
              ))}
            </div>

            {details.age && (
              <div className="flex items-start gap-[6px] text-[12px] text-[#7e7f87]">
                <span className="whitespace-nowrap font-semibold">{details.age}</span>
                <span className="flex-1">{details.descriptors}</span>
              </div>
            )}
          </div>

          {/* Platform row */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-[10px] whitespace-nowrap text-[12px] text-[#e7e7e7]">
              <div className="grid size-[16px] grid-cols-2 grid-rows-2 gap-px">
                <span className="bg-white" />
                <span className="bg-white" />
                <span className="bg-white" />
                <span className="bg-white" />
              </div>
              <img alt="" src={appleLogo} className="h-[16px] w-[13px]" />
              <span className="text-[16px]">XBOX</span>
              <span className="text-[16px]">PS4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function JumpCard({ image }) {
  return (
    <div className="relative h-[118px] w-[210px] shrink-0">
      <img alt="" src={image} loading="lazy" decoding="async" className="h-[118px] w-[210px] rounded-[16px] object-cover" />
      <div className="absolute bottom-0 left-0 flex w-full items-center justify-end p-[8px]">
        <img alt="Play" src={playGreen} className="size-[50px]" />
      </div>
    </div>
  )
}

/** A titled shelf: a heading over a horizontally-scrollable row of rec cards. */
function CardRow({ title, cards, gamePass }) {
  return (
    <div className="mt-[56px] flex w-full shrink-0 flex-col">
      <p className="text-[24px] font-bold text-white">{title}</p>
      <div className="no-scrollbar flex w-full items-start gap-[40px] overflow-x-auto py-[20px]">
        {cards.map((c, i) => (
          <RecCard key={i} {...c} gamePass={gamePass} />
        ))}
      </div>
    </div>
  )
}

/** A voice-call participant tile: colored card + Discord avatar + name. */
function CallTile({ color, name }) {
  return (
    <div className="relative h-[134px] w-[232px] shrink-0 overflow-hidden rounded-[10px]">
      {/* 50%-transparent colored fill */}
      <div className="absolute inset-0 opacity-50" style={{ backgroundColor: color }} />
      <img
        alt=""
        src={discordLogo}
        className="absolute left-1/2 top-1/2 size-[60px] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
      <div className="absolute bottom-[6px] left-[6px] flex items-center rounded-[10px] bg-black/50 px-[10px] py-[8px] opacity-50">
        <span className="whitespace-nowrap text-[16px] font-normal text-white">{name}</span>
      </div>
    </div>
  )
}

// ── Call screen (starting point) ────────────────────────────────────────────

// Big voice-call tiles shown in the 2×2 grid on the call screen. Colors taken
// straight from the Figma frame (366:7220).
const CALL_TILES = [
  { color: '#00a753', name: 'sauhee' },
  { color: '#4d60e8', name: 'clarisse' },
  { color: '#9a45f7', name: 'caleb' },
  { color: '#ff3737', name: 'meera' },
]

/** A large voice-call participant tile: colored card + Discord avatar + name. */
function BigCallTile({ color, name }) {
  return (
    <div
      className="relative h-[300px] w-[520px] shrink-0 overflow-hidden rounded-[14px]"
      style={{ backgroundColor: color }}
    >
      <img
        alt=""
        src={discordLogo}
        className="absolute left-1/2 top-1/2 size-[84px] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
      <div className="absolute bottom-[24px] left-[24px] flex items-center rounded-[12px] bg-black/50 px-[14px] py-[10px]">
        <span className="whitespace-nowrap text-[22px] text-white">{name}</span>
      </div>
    </div>
  )
}

/**
 * Bottom-center "Suggested Activities" fly-out. It opens when the control-bar
 * activities icon (baked into the background) is hovered, and stays open while
 * the cursor is anywhere in the menu region. The first tile launches the store.
 *
 * The outer region is click-through (pointer-events none) while closed, except
 * for the hotspot over the control-bar icon, so it never blocks the call tiles.
 */
function SuggestedActivities({ open, setOpen, onLaunch }) {
  return (
    <div
      className="absolute left-[883px] top-[973px] h-[267px] w-[736px]"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Hover hotspot over the baked-in control-bar activities icon */}
      <div
        className="absolute left-[318px] top-[205px] h-[56px] w-[110px]"
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={() => setOpen(true)}
      />

      {/* Hover state of the control-bar activities button (395:7649), overlaid
          on the baked-in icon while the menu is open. Frame pos (1226, 1185). */}
      {open && (
        <img
          alt=""
          src={activityBtnHover}
          className="pointer-events-none absolute left-[343px] top-[212px] size-[46px]"
        />
      )}

      {/* Fly-out menu */}
      <div
        className={
          'absolute left-0 top-0 w-[736px] rounded-[20px] border border-[#1a1a1b] bg-[#131416] p-[16px] transition-all duration-200 ease-out ' +
          (open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[8px] opacity-0')
        }
      >
        <div className="flex flex-col gap-[20px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <img alt="" src={activityGridIcon} className="size-[28px] object-contain" />
              <span className="text-[16px] font-bold tracking-[-0.64px] text-[#e7e7e7]">
                SUGGESTED ACTIVITIES
              </span>
            </div>
            <div className="flex items-center gap-[10px]">
              <span className="text-[16px] font-bold tracking-[-0.64px] text-[#e7e7e7]">SEE ALL</span>
              <img alt="" src={seeAllChevron} className="h-[8px] w-[4px]" />
            </div>
          </div>

          {/* Activity tiles — first launches the Xbox Store, the rest are empty */}
          <div className="flex items-center gap-[20px]">
            <button
              onClick={onLaunch}
              className="relative h-[106px] w-[125px] shrink-0 overflow-hidden rounded-[12px] ring-2 ring-transparent transition hover:ring-[#5865f2]"
            >
              <img alt="Xbox × Discord activity" src={activityTile} className="size-full object-cover" />
            </button>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[106px] w-[125px] shrink-0 rounded-[12px] bg-[#202024]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Simple speaker glyph for the redrawn voice-channel row. */
function SpeakerIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z" />
    </svg>
  )
}

/** A voice-channel member row in the sidebar: avatar + name. */
function SidebarMember({ color, name, top }) {
  return (
    <div className="absolute left-[206px] flex items-center gap-[10px]" style={{ top }}>
      <ProfileIcon color={color} className="size-[24px]" />
      <span className="text-[15px] font-normal text-[#b5bac1]">{name}</span>
    </div>
  )
}

/** Debug switch: pretend the user owns Game Pass (so all GP games are playable). */
function GamePassToggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 rounded-full bg-[#1e1f22]/90 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-[#2b2d31]"
    >
      <span className="text-[#b5bac1]">Debug · Game Pass</span>
      <span className={'relative h-[18px] w-[32px] rounded-full transition-colors ' + (on ? 'bg-[#107c10]' : 'bg-[#4e5058]')}>
        <span
          className={
            'absolute top-[2px] size-[14px] rounded-full bg-white transition-all ' +
            (on ? 'left-[16px]' : 'left-[2px]')
          }
        />
      </span>
    </button>
  )
}

const acDetails = {
  title: "Assassin's Creed Black Flag Resynced",
  developer: 'Ubisoft',
  genre: 'action',
  gpPrice: '$14.99',
  playtime: '~2hrs',
  age: '17+',
  descriptors: 'Blood, Violence, Strong Language, Sexual Themes, Use of Alcohol',
  ratings: [
    { pct: '80%', line1: 'of all', line2: '1.5K votes' },
    { pct: '72%', line1: 'of who played', line2: 'Minecraft', line2Bold: true },
  ],
}

const minecraftDetails = {
  title: 'Minecraft',
  developer: 'Mojang Studios',
  genre: 'sandbox',
  gpPrice: '$9.99',
  playtime: '~3hrs',
  age: '10+',
  descriptors: 'Fantasy Violence',
  ratings: [
    { pct: '96%', line1: 'of all', line2: '4.2M votes' },
    { pct: '88%', line1: 'of who played', line2: 'Roblox', line2Bold: true },
  ],
}

const lolDetails = {
  title: 'League of Legends',
  developer: 'Riot Games',
  genre: 'MOBA',
  gpPrice: '$9.99',
  playtime: '~1hr',
  age: '13+',
  descriptors: 'Fantasy Violence, Mild Blood, Mild Suggestive Themes',
  ratings: [
    { pct: '82%', line1: 'of all', line2: '3.1M votes' },
    { pct: '75%', line1: 'of who played', line2: 'Valorant', line2Bold: true },
  ],
}

const gangBeastsDetails = {
  title: 'Gang Beasts',
  developer: 'Boneloaf',
  genre: 'party brawler',
  gpPrice: '$9.99',
  playtime: '~1hr',
  age: '7+',
  descriptors: 'Cartoon Violence, Comic Mischief',
  ratings: [
    { pct: '88%', line1: 'of all', line2: '420K votes' },
    { pct: '80%', line1: 'of who played', line2: 'Fall Guys', line2Bold: true },
  ],
}

// YouTube trailers for the newer cards. Keep the default cover art as poster so
// only the on-hover trailer differs (no YouTube thumbnail as the static cover).
const lolTrailer = { youTubeId: 'p4QG59y6FGE', poster: heroLol }
const gangBeastsTrailer = { youTubeId: 'Lm3HDdLufmA', poster: heroGangBeasts }

// ── Extra group-recommendation shelves ──────────────────────────────────────
// More Xbox titles (Game Pass + purchasable). Cover art reuses the existing
// key-art images so posters always look right; details drive the rest.
const seaOfThievesDetails = {
  title: 'Sea of Thieves', developer: 'Rare', genre: 'adventure', gpPrice: '$14.99',
  playtime: '~2hrs', age: '13+', descriptors: 'Violence, Crude Humor, Use of Alcohol',
  ratings: [
    { pct: '85%', line1: 'of all', line2: '2.2M votes' },
    { pct: '79%', line1: 'of who played', line2: 'Minecraft', line2Bold: true },
  ],
}
const minecraftDungeonsDetails = {
  title: 'Minecraft Dungeons', developer: 'Mojang Studios', genre: 'dungeon crawler', gpPrice: '$9.99',
  playtime: '~2hrs', age: '10+', descriptors: 'Fantasy Violence',
  ratings: [
    { pct: '81%', line1: 'of all', line2: '640K votes' },
    { pct: '90%', line1: 'of who played', line2: 'Minecraft', line2Bold: true },
  ],
}
const wildHeartsDetails = {
  title: 'Wild Hearts', developer: 'Omega Force', genre: 'action RPG', gpPrice: '$24.99',
  playtime: '~3hrs', age: '13+', descriptors: 'Violence, Blood',
  ratings: [
    { pct: '77%', line1: 'of all', line2: '210K votes' },
    { pct: '72%', line1: 'of who played', line2: 'Monster Hunter', line2Bold: true },
  ],
}
const humanFallFlatDetails = {
  title: 'Human: Fall Flat', developer: 'No Brakes Games', genre: 'puzzle platformer', gpPrice: '$9.99',
  playtime: '~1hr', age: '7+', descriptors: 'Comic Mischief',
  ratings: [
    { pct: '89%', line1: 'of all', line2: '520K votes' },
    { pct: '84%', line1: 'of who played', line2: 'Fall Guys', line2Bold: true },
  ],
}
const overcookedDetails = {
  title: 'Overcooked! 2', developer: 'Team17', genre: 'co-op', gpPrice: '$14.99',
  playtime: '~1hr', age: '7+', descriptors: 'Comic Mischief',
  ratings: [
    { pct: '92%', line1: 'of all', line2: '880K votes' },
    { pct: '86%', line1: 'of who played', line2: 'Gang Beasts', line2Bold: true },
  ],
}
const monsterHunterDetails = {
  title: 'Monster Hunter Rise', developer: 'Capcom', genre: 'action RPG', gpPrice: '$24.99',
  playtime: '~3hrs', age: '13+', descriptors: 'Blood, Violence',
  ratings: [
    { pct: '90%', line1: 'of all', line2: '1.1M votes' },
    { pct: '83%', line1: 'of who played', line2: 'Wild Hearts', line2Bold: true },
  ],
}
const groundedDetails = {
  title: 'Grounded', developer: 'Obsidian', genre: 'survival', gpPrice: '$14.99',
  playtime: '~2hrs', age: '10+', descriptors: 'Fantasy Violence, Mild Language',
  ratings: [
    { pct: '87%', line1: 'of all', line2: '430K votes' },
    { pct: '80%', line1: 'of who played', line2: 'Minecraft', line2Bold: true },
  ],
}
const forHonorDetails = {
  title: 'For Honor', developer: 'Ubisoft', genre: 'fighting', gpPrice: '$24.99',
  playtime: '~2hrs', age: '17+', descriptors: 'Blood and Gore, Intense Violence',
  ratings: [
    { pct: '78%', line1: 'of all', line2: '760K votes' },
    { pct: '71%', line1: 'of who played', line2: "Assassin's Creed", line2Bold: true },
  ],
}

export default function RecServer() {
  const wrapRef = useRef(null)
  const [layout, setLayout] = useState({ scale: 1, tx: 0, ty: 0 })
  const [gamePass, setGamePass] = useState(false)
  const [focus, setFocus] = useState(false)
  // Starting point is the call screen; launching an activity opens the store.
  const [screen, setScreen] = useState('call')
  const [menuOpen, setMenuOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)

  // Navigation preserves the View toggle (focus) so the framing stays consistent
  // across the call ↔ store transition.
  const goStore = () => {
    setMenuOpen(false)
    setScreen('store')
  }
  const goCall = () => {
    setMenuOpen(false)
    setScreen('call')
  }

  // Extra recommendation shelves. GP games use owned={gamePass}; paid games fall
  // through to the price footer. Built here so they can read the gamePass toggle.
  const newOnGamePass = [
    { avatars: [AVATAR.blue, AVATAR.green], label: 'played this together', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: seaOfThievesDetails, owners: [AVATAR.blue, AVATAR.green, AVATAR.purple], bookmarked: true },
    { avatars: [AVATAR.red], label: 'recommends this game', players: '1-4', image: heroMinecraftDungeons, video: { youTubeId: 'TxNH6bapa3A', poster: heroMinecraftDungeons }, details: minecraftDungeonsDetails, owners: [AVATAR.red, AVATAR.purple], shared: true },
    { avatars: [AVATAR.purple], label: 'wishlisted this game', players: '1-4', image: heroWildHearts, video: { youTubeId: '8vw9PlFrrOk', poster: heroWildHearts }, details: wildHeartsDetails, owners: [AVATAR.blue] },
    { avatars: [AVATAR.red, AVATAR.purple], label: 'played this together', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: humanFallFlatDetails, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red], bookmarked: true, shared: true },
  ]
  const greatWithGroup = [
    { avatars: [AVATAR.green], label: 'wants to play this', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: overcookedDetails, owners: [AVATAR.green, AVATAR.red], bookmarked: true },
    { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: monsterHunterDetails, owners: [AVATAR.blue, AVATAR.red], shared: true },
    { avatars: [AVATAR.purple, AVATAR.green], label: 'played this together', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: groundedDetails, owners: [AVATAR.green, AVATAR.purple] },
    { avatars: [AVATAR.red], label: 'wishlisted this game', players: '1-4', image: heroForHonor, video: { youTubeId: 'cBzhMK22XRs', poster: heroForHonor }, details: forHonorDetails, owners: [AVATAR.red], bookmarked: true },
  ]

  useLayoutEffect(() => {
    function fit() {
      const el = wrapRef.current
      if (!el) return
      const vw = el.clientWidth
      const vh = el.clientHeight
      if (focus) {
        // Fill the viewport width with the Xbox Store content region.
        // Scale up to cover the whole viewport (no black gaps), sidebar anchored
        // to the top-left; overflow on the right/bottom is cropped.
        const s = Math.max(vw / FOCUS.w, vh / FOCUS.h)
        const tx = -FOCUS.x * s
        const ty = -FOCUS.y * s
        setLayout({ scale: s, tx, ty })
      } else {
        // Fit the whole Discord frame, centered.
        const s = Math.min(vw / FRAME_W, vh / FRAME_H)
        setLayout({ scale: s, tx: (vw - FRAME_W * s) / 2, ty: (vh - FRAME_H * s) / 2 })
      }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [focus])

  return (
    <div ref={wrapRef} className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Collapsible debug controls — collapsed by default so they don't overlap
          the frame's top-right icons. Click the gear to reveal the toggles. */}
      <div className="fixed right-3 top-3 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => setDebugOpen((v) => !v)}
          title="Debug controls"
          className={
            'flex size-8 items-center justify-center rounded-full bg-[#1e1f22]/80 ring-1 ring-white/10 backdrop-blur transition hover:bg-[#2b2d31] ' +
            (debugOpen ? 'text-white' : 'text-[#b5bac1] hover:text-white')
          }
        >
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {debugOpen && (
          <>
            <GamePassToggle on={gamePass} onToggle={() => setGamePass((v) => !v)} />
            <button
              onClick={() => setFocus((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-[#1e1f22]/90 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-[#2b2d31]"
            >
              <span className="text-[#b5bac1]">View</span>
              <span>{focus ? 'Store' : 'Full frame'}</span>
            </button>
          </>
        )}
      </div>
      <div
        className="absolute left-0 top-0 shrink-0 text-white"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          transformOrigin: 'top left',
          transform: `translate(${layout.tx}px, ${layout.ty}px) scale(${layout.scale})`,
        }}
        data-node-id="312:2544"
      >
        {/* Discord environment. The call screen uses the variant with the baked
            single call tile removed. */}
        <img
          alt="Discord"
          src={screen === 'call' ? bgCall : bgDiscord}
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />

        {/* ── Call screen (starting point) ── */}
        {screen === 'call' && (
          <>
            {/* Hide the "Putt Party" activity references baked into the background */}
            {/* Breadcrumb "• Putt Party" (keep "Lobby") */}
            <div className="absolute left-[490px] top-[98px] h-[38px] w-[210px] bg-black" />
            {/* Sidebar "Putt Party" subtitle under the Lobby row */}
            <div className="absolute left-[200px] top-[461px] h-[22px] w-[110px] bg-[#2d2d30]" />
            {/* Bottom-left "Putt Party" activity card */}
            <div className="absolute left-[70px] top-[991px] h-[68px] w-[308px] bg-[#121214]" />

            {/* Sidebar voice members — same clean list as the store view */}
            <div className="absolute left-[125px] top-[490px] h-[190px] w-[210px] bg-[#121214]" />
            <div className="absolute left-[152px] top-[490px] h-[190px] w-[2px] bg-[#1e1e21]" />
            <SidebarMember color={AVATAR.green} name="sauhee" top={500} />
            <SidebarMember color={AVATAR.blue} name="clarisse" top={540} />
            <SidebarMember color={AVATAR.purple} name="caleb" top={580} />
            <SidebarMember color={AVATAR.red} name="meera" top={620} />

            {/* 2×2 grid of large call tiles (391:7572) */}
            <div
              className="absolute left-[725px] top-[300px]"
              style={{ display: 'grid', gridTemplateColumns: '520px 520px', columnGap: 44, rowGap: 40 }}
            >
              {CALL_TILES.map((t) => (
                <BigCallTile key={t.name} color={t.color} name={t.name} />
              ))}
            </div>

            {/* Suggested Activities fly-out (hover the control-bar icon) */}
            <SuggestedActivities open={menuOpen} setOpen={setMenuOpen} onLaunch={goStore} />
          </>
        )}

        {/* ── Xbox Store page ── */}
        {screen === 'store' && (
          <>
        {/* Sidebar Lobby subtitle → "XBOX Store" (position from Figma) */}
        <div className="absolute left-[200px] top-[461px] h-[22px] w-[92px] bg-[#2d2d30]" />
        <p className="absolute left-[204px] top-[463px] text-[13px] text-[#b5bac1]">XBOX Store</p>

        {/* Sidebar voice channel: clean member list, masking the baked-in one.
            Redraw the voice-member connector line the mask would otherwise cut. */}
        <div className="absolute left-[125px] top-[490px] h-[190px] w-[210px] bg-[#121214]" />
        <div className="absolute left-[152px] top-[490px] h-[190px] w-[2px] bg-[#1e1e21]" />
        <SidebarMember color={AVATAR.green} name="sauhee" top={500} />
        <SidebarMember color={AVATAR.blue} name="clarisse" top={540} />
        <SidebarMember color={AVATAR.purple} name="caleb" top={580} />
        <SidebarMember color={AVATAR.red} name="meera" top={620} />

        {/* Bottom activity card: Xbox logo + "XBOX Store" (positions from Figma) */}
        <div className="absolute left-[85px] top-[1002px] size-[50px] rounded-[12px] bg-[#242429]" />
        <div className="absolute left-[90px] top-[1007px]">
          <XboxLogo size={40} />
        </div>
        {/* Relabel only the "Putt Party" title line; keep "00:17 elapsed" and the
            pop-out icon from the background visible. */}
        <div className="absolute left-[135px] top-[1007px] h-[26px] w-[150px] bg-[#242429]" />
        <p className="absolute left-[139px] top-[1009px] text-[16px] font-semibold text-white">XBOX Store</p>

        {/* The pop-out icon baked into the card → return to the call screen.
            Transparent hit-area over the existing glyph so it stays visible. */}
        <button
          onClick={goCall}
          title="Back to call"
          className="absolute left-[315px] top-[1007px] h-[40px] w-[44px] cursor-pointer rounded-[8px] transition hover:bg-white/10"
        />

        {/* Top breadcrumb: XBOX Store */}
        <div className="absolute left-[516px] top-[98px] flex items-start gap-[20px] bg-black">
          <XboxLogo size={30} />
          <p className="whitespace-nowrap text-[20px] text-white">XBOX Store</p>
        </div>

        {/* Active call participants — a 2×2 tile grid above the control bar.
            The dark backing masks the single tile baked into the background. */}
        <div className="absolute left-[1244px] top-[1079px] z-[9] h-[170px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-black" />
        <div className="absolute left-[1244px] top-[1079px] z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-[8px]">
            {CALL.map((p) => (
              <CallTile key={p.name} color={p.color} name={p.name} />
            ))}
          </div>
        </div>

        {/* Search / bookmark — sticky header, aligned with the breadcrumb row */}
        <div className="absolute left-[1765px] top-[100px] z-20 flex w-[245px] items-center justify-end gap-[20px]">
          <img alt="Search" src={searchIcon} className="size-[28px]" />
          <img alt="Bookmark" src={bookmarkIcon} className="size-[28px]" />
        </div>

        {/* Xbox Store content panel — vertically scrollable as shelves overflow.
            The gap below the breadcrumb matches the padding above its text. */}
        <div className="no-scrollbar absolute left-[478px] top-[128px] flex h-[860px] w-[1532px] flex-col overflow-y-auto py-[16px]">

          {/* Jump Back in */}
          <div className="mt-[28px] flex w-full shrink-0 flex-col gap-[20px]">
            <p className="text-[24px] font-bold text-white">Jump Back in</p>
            <div className="flex w-full gap-[20px]">
              <JumpCard image={jumpFortnite} />
              <JumpCard image={jumpTwo} />
            </div>
          </div>

          {/* Love Exploring the World Together? — gap-0 here because the cards
              row's py-[20px] (glow room) already supplies the title→content gap. */}
          <div className="mt-[56px] flex w-full shrink-0 flex-col">
            <p className="text-[24px] font-bold text-white">Love Exploring the World Together?</p>
            <div className="no-scrollbar flex w-full items-start gap-[40px] overflow-x-auto py-[20px]">
              {/* Card 1 — Assassin's Creed: owned by blue + purple */}
              <RecCard
                avatars={[AVATAR.blue, AVATAR.purple]}
                label="played this together"
                players="1-6"
                image={heroAc}
                video={{ youTubeId: 'hEsmUiNJ4yw', poster: heroAc }}
                details={acDetails}
                owners={[AVATAR.blue, AVATAR.purple]}
                onGamePass
                owned={gamePass}
                gamePass={gamePass}
              />
              {/* Card 2 — Minecraft, featured: everyone owns it */}
              <RecCard
                featured
                avatars={[AVATAR.purple]}
                label="recommends this game"
                players="1+"
                image={heroMinecraft}
                video={{ youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }}
                details={minecraftDetails}
                owners={[AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red]}
                onGamePass
                gamePass={gamePass}
              />
              {/* Card 3 — League of Legends, free-to-play for everyone */}
              <RecCard
                avatars={[AVATAR.green]}
                label="wishlisted this game"
                players="1-5"
                image={heroLol}
                video={lolTrailer}
                details={lolDetails}
                free
                owners={[AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red]}
                gamePass={gamePass}
              />
              {/* Card 4 — Gang Beasts, NOT on Game Pass: always shows a price */}
              <RecCard
                avatars={[AVATAR.red]}
                label="wants to play this"
                players="1-8"
                image={heroGangBeasts}
                video={gangBeastsTrailer}
                details={gangBeastsDetails}
                owners={[AVATAR.purple, AVATAR.red]}
                gamePass={gamePass}
              />
            </div>
          </div>

          {/* More group recommendations — Game Pass + purchasable Xbox games */}
          <CardRow title="For Within 3 Hours Game Play" cards={newOnGamePass} gamePass={gamePass} />
          <CardRow title="Something Competitive for Friday Night" cards={greatWithGroup} gamePass={gamePass} />

          {/* Bottom breathing room so the last shelf clears the call controls */}
          <div className="h-[40px] w-full shrink-0" />
        </div>
          </>
        )}
      </div>
    </div>
  )
}
