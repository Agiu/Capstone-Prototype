import { useLayoutEffect, useRef, useState } from 'react'
import {
  bgDiscord,
  voiceMembers,
  jumpFortnite,
  jumpTwo,
  card1Img,
  card1Video,
  card2Img,
  card3Img,
  card4Img,
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
        d.boxed ? (
          <LitSquare key={i}>
            <ProfileIcon color={d.color} className="size-[20px]" />
          </LitSquare>
        ) : (
          <ProfileIcon key={i} color={d.color} className="size-[20px]" />
        ),
      )}
    </div>
  )
}

// The friend group shown in every card's ownership indicator. Purple always
// owns the game; green owns it only when the user has Game Pass.
const FRIENDS = [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red]
function friendDots(gamePass) {
  return FRIENDS.map((color) => ({
    color,
    boxed: color === AVATAR.purple || (color === AVATAR.green && gamePass),
  }))
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

/**
 * A rec card that expands horizontally on hover. Dots (top-right) and the
 * action/price (bottom-right) are anchored to the card's right edge, so they
 * glide right as the card widens; the detail column slides out from behind the
 * hero image, and the tags slide in.
 *
 * Footer states: `featured` → Play button; `owned` → Game Pass icon + Play;
 * otherwise → purchasable price.
 */
function RecCard({ avatars, label, image, players, details, video, featured, owned, gamePass }) {
  const dots = friendDots(gamePass)

  return (
    <div
      className={
        'group relative flex h-[380px] w-[452px] shrink-0 rounded-[16px] bg-[#121214] p-[16px] transition-[width] duration-300 ease-out hover:w-[718px]' +
        (featured ? ' drop-shadow-[0px_0px_15.2px_rgba(149,255,0,0.8)]' : '')
      }
    >
      {/* Left column — fixed; the card grows to its right, above the detail column */}
      <div className="relative z-20 flex w-[420px] shrink-0 flex-col gap-[16px]">
        <div className="flex h-[30px] items-center">
          <div className="flex items-center gap-[8px]">
            <AvatarStack colors={avatars} />
            <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
          </div>
        </div>

        {/* Cover art → streaming trailer on hover */}
        <div className="relative h-[236px] w-[420px] overflow-hidden rounded-[16px] bg-black">
          <img
            alt=""
            src={image}
            className={
              'absolute inset-0 size-full object-cover transition-opacity duration-300' +
              (video ? ' group-hover:opacity-0' : '')
            }
          />
          {video && (
            <div
              className="absolute inset-0 bg-black bg-cover bg-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
            >
              <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
            </div>
          )}
        </div>

        {/* Metadata pills — extra tags slide in on hover */}
        <div className="flex h-[50px] items-center gap-[4px]">
          <Pill>
            <span className="flex -scale-y-100 rotate-180 items-center justify-center">
              <img alt="" src={userGroup} className="size-[16px]" />
            </span>
            <span className="text-[12px] text-[#7e7f87]">{players}</span>
          </Pill>
          <Pill>
            <span className="text-[12px] text-[#7e7f87]">~2hrs/session</span>
          </Pill>
          <Pill>
            <span className="text-[12px] text-[#7e7f87]">action</span>
          </Pill>
          <div className="flex max-w-0 items-center gap-[4px] overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover:max-w-[180px] group-hover:opacity-100">
            <Pill>
              <span className="text-[12px] text-[#7e7f87]">adventure</span>
            </Pill>
            <Pill>
              <span className="text-[12px] text-[#7e7f87]">17+</span>
            </Pill>
          </div>
        </div>
      </div>

      {/* Status dots — anchored top-right, glide right as the card grows */}
      <div className="absolute right-[16px] top-[16px] z-30 flex h-[30px] items-center">
        <StatusDots dots={dots} />
      </div>

      {/* Detail column — sits BEHIND the hero (z-10), slides out from behind it */}
      <div className="pointer-events-none absolute right-[16px] top-[62px] z-10 flex h-[236px] w-[250px] flex-col justify-between group-hover:pointer-events-auto">
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
        </div>

        <div className="relative flex w-full items-center">
          <div className="mx-auto flex items-center gap-[4px] whitespace-nowrap text-[12px] text-[#e7e7e7]">
            <div className="grid size-[16px] grid-cols-2 grid-rows-2 gap-px">
              <span className="bg-white" />
              <span className="bg-white" />
              <span className="bg-white" />
              <span className="bg-white" />
            </div>
            <span>·</span>
            <img alt="" src={appleLogo} className="h-[16px] w-[13px]" />
            <span>·</span>
            <span className="text-[16px]">XBOX</span>
            <span>·</span>
            <span className="text-[16px]">PS4</span>
          </div>
          <div className="absolute right-0 flex items-center gap-[8px]">
            <img alt="Share" src={iosShare} className="size-[16px]" />
            <img alt="Bookmark" src={bookmarkSmall} className="size-[16px]" />
          </div>
        </div>
      </div>

      {/* Action / price — anchored bottom-right, glides right as the card grows */}
      <div className="absolute bottom-[16px] right-[16px] z-30 flex h-[50px] items-center">
        {featured ? (
          <div className="flex items-center gap-[8px]">
            {gamePass && (
              <img
                alt="On Game Pass"
                src={xboxPriceIcon}
                className="size-[40px] rounded-[6px] object-cover shadow-[0px_0px_8px_0px_rgba(149,255,0,0.25)]"
              />
            )}
            <img alt="Play" src={playGreen2} className="size-[50px]" />
          </div>
        ) : owned ? (
          <div className="flex items-center gap-[8px]">
            <img
              alt="On Game Pass"
              src={xboxPriceIcon}
              className="size-[40px] rounded-[6px] object-cover shadow-[0px_0px_8px_0px_rgba(149,255,0,0.25)]"
            />
            <img alt="Play" src={playOwned} className="size-[50px]" />
          </div>
        ) : (
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[40px] items-center overflow-hidden rounded-[6px] bg-[#107c10] pr-0 transition-all duration-300 ease-out group-hover:pr-[8px]">
              <img alt="" src={xboxPriceIcon} className="size-[40px] shrink-0 rounded-[6px] object-cover" />
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[16px] font-semibold text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-[4px] group-hover:max-w-[80px] group-hover:opacity-100">
                {details.pass}
              </span>
            </div>
            <img alt="" src={dividerV} className="h-[32.5px] w-px shrink-0" />
            <div className="flex h-[40px] items-center gap-[8px] rounded-[4px] bg-[#242429] px-[8px] py-[2px] whitespace-nowrap">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[16px] font-bold text-[#95ff00]">-20%</span>
                <span className="text-[12px] text-[#e7e7e7] line-through">$32.60</span>
              </div>
              <span className="text-[16px] text-white">$26.08</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function JumpCard({ image }) {
  return (
    <div className="relative h-[118px] w-[210px] shrink-0">
      <img alt="" src={image} className="h-[118px] w-[210px] rounded-[16px] object-cover" />
      <div className="absolute bottom-0 left-0 flex w-full items-center justify-end p-[8px]">
        <img alt="Play" src={playGreen} className="size-[50px]" />
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
      className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-[#1e1f22]/90 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-[#2b2d31]"
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
  pass: '$9.99+',
  ratings: [
    { pct: '80%', line1: 'of all', line2: '1.5K votes' },
    { pct: '72%', line1: 'of who played', line2: 'Minecraft', line2Bold: true },
  ],
}

const minecraftDetails = {
  title: 'Minecraft',
  developer: 'Mojang Studios',
  pass: 'Included',
  ratings: [
    { pct: '96%', line1: 'of all', line2: '4.2M votes' },
    { pct: '88%', line1: 'of who played', line2: 'Roblox', line2Bold: true },
  ],
}

export default function RecServer() {
  const wrapRef = useRef(null)
  const [layout, setLayout] = useState({ scale: 1, tx: 0, ty: 0 })
  const [gamePass, setGamePass] = useState(false)
  const [focus, setFocus] = useState(false)

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
      <GamePassToggle on={gamePass} onToggle={() => setGamePass((v) => !v)} />
      <button
        onClick={() => setFocus((v) => !v)}
        className="fixed right-4 top-16 z-50 flex items-center gap-2 rounded-full bg-[#1e1f22]/90 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-[#2b2d31]"
      >
        <span className="text-[#b5bac1]">View</span>
        <span>{focus ? 'Store' : 'Full frame'}</span>
      </button>
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
        {/* Discord environment (used as the frame background per design) */}
        <img
          alt="Discord"
          src={bgDiscord}
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />

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
        <div className="absolute left-[135px] top-[1009px] h-[42px] w-[215px] bg-[#242429]" />
        <p className="absolute left-[139px] top-[1012px] text-[16px] font-semibold text-white">XBOX Store</p>

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

        {/* Search / bookmark — vertically centered with the "Events" row */}
        <div className="absolute left-[1765px] top-[166px] flex w-[245px] items-center justify-end gap-[20px]">
          <img alt="Search" src={searchIcon} className="size-[28px]" />
          <img alt="Bookmark" src={bookmarkIcon} className="size-[28px]" />
        </div>

        {/* Xbox Store content panel */}
        <div className="absolute left-[478px] top-[128px] flex w-[1532px] flex-col overflow-hidden py-[16px]">
          {/* Header spacer (keeps Jump Back in place; icons are positioned above) */}
          <div className="h-[28px] w-full" />

          {/* Jump Back in */}
          <div className="mt-[28px] flex w-full flex-col gap-[20px]">
            <p className="text-[24px] font-bold text-white">Jump Back in</p>
            <div className="flex w-full gap-[20px]">
              <JumpCard image={jumpFortnite} />
              <JumpCard image={jumpTwo} />
            </div>
          </div>

          {/* Love Exploring the World Together? — gap-0 here because the cards
              row's py-[20px] (glow room) already supplies the title→content gap. */}
          <div className="mt-[56px] flex w-full flex-col">
            <p className="text-[24px] font-bold text-white">Love Exploring the World Together?</p>
            <div className="no-scrollbar flex w-full items-start gap-[40px] overflow-x-auto py-[20px]">
              {/* Card 1 — on Game Pass */}
              <RecCard
                avatars={[AVATAR.blue, AVATAR.purple]}
                label="played this together"
                players="1-6"
                image={card1Img}
                video={{ youTubeId: 'hEsmUiNJ4yw', poster: card1Video }}
                details={acDetails}
                owned={gamePass}
                gamePass={gamePass}
              />
              {/* Card 2 — featured / green: everyone owns it, everyone can play */}
              <RecCard
                featured
                avatars={[AVATAR.purple]}
                label="recommends this game"
                players="1+"
                image={card2Img}
                video={{ youTubeId: '-1Sy6iz43vg', poster: card2Img }}
                details={minecraftDetails}
                gamePass={gamePass}
              />
              {/* Card 3 — on Game Pass */}
              <RecCard
                avatars={[AVATAR.green, AVATAR.red]}
                label="wishlisted this game"
                players="1-6"
                image={card3Img}
                details={acDetails}
                owned={gamePass}
                gamePass={gamePass}
              />
              {/* Card 4 — NOT on Game Pass: always shows a price */}
              <RecCard
                avatars={[AVATAR.green, AVATAR.red]}
                label="wishlisted this game"
                players="1-6"
                image={card4Img}
                details={acDetails}
                gamePass={gamePass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
