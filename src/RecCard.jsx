import { useEffect, useRef, useState } from 'react'
import { thumbsUp, appleLogo, userGroup, discordLogo } from './assets/figma/index.js'

// Expanded (hover) card width — used to compute how far the row must scroll to
// keep the whole card on-screen.
const CARD_EXPANDED_W = 718

// Gentle eased horizontal scroll — smoother and less abrupt than the browser's
// native `behavior:'smooth'`, so the row glides rather than snaps.
function smoothScrollLeft(el, to, duration = 600) {
  const start = el.scrollLeft
  const dist = to - start
  if (Math.abs(dist) < 1) return
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  let startT = null
  function step(ts) {
    if (startT === null) startT = ts
    const p = Math.min((ts - startT) / duration, 1)
    el.scrollLeft = start + dist * easeInOutCubic(p)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// Shared rec-card component used by the landing screen's "game card
// recommendation rows". A simplified variant of the store card: no green glow,
// no ownership-dots row, no Play/price footer — just avatars + label, cover
// (trailer on hover), metadata pills, and a hover details column.

// Friend avatar colors (solid Discord-style circles). Green is the user (sauhee).
export const AVATAR = { blue: '#5165F6', purple: '#9A45F7', red: '#FF3737', green: '#00A853' }

/** A Discord-style avatar: colored circle with the white Discord logo. */
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

/** A rounded outline pill used for the game metadata tags. */
function Pill({ children }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[2px] whitespace-nowrap rounded-[16px] border border-[#7e7f87] px-[6px] py-[2px]">
      {children}
    </div>
  )
}

function AvatarStack({ colors }) {
  return (
    <div className="flex items-center">
      {(colors || []).map((c, i) => (
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

/** Trailer/gameplay that plays on hover. Pass `mp4` (preferred) or `youTubeId`.
 *  `bare` scales the iframe up so YouTube's title bar and end-screen cards fall
 *  outside the crop — a clean, chrome-free background loop. */
export function VideoTrailer({ mp4, youTubeId, poster, bare, vertical }) {
  const frameRef = useRef(null)

  // `cc_load_policy=0` only sets the *default* — YouTube still turns captions
  // back on for anyone whose account or device has them switched on, which is
  // why they keep showing up. The only way to actually kill them is to tell the
  // player to drop its captions module over the JS API. The player ignores
  // commands until it reports ready and gives us no cross-origin way to observe
  // that, so we just re-send for a few seconds and stop. ('captions' and 'cc'
  // are the module names for the two player generations — send both.)
  useEffect(() => {
    if (!youTubeId) return
    const send = () => {
      const w = frameRef.current?.contentWindow
      if (!w) return
      for (const mod of ['captions', 'cc']) {
        w.postMessage(JSON.stringify({ event: 'command', func: 'unloadModule', args: [mod] }), '*')
      }
      // Keep it playing + muted so YouTube never parks the paused/"tap to play"
      // overlay (the ‖ button) over the footage.
      w.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*')
      w.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*')
    }
    send()
    const tick = setInterval(send, 400)
    const stop = setTimeout(() => clearInterval(tick), 6000)
    return () => { clearInterval(tick); clearTimeout(stop) }
  }, [youTubeId])

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
      controls: '0', // no chrome, and no centre play button once autoplay takes
      loop: '1',
      playlist: youTubeId,
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      disablekb: '1',
      iv_load_policy: '3', // no annotations
      cc_load_policy: '0', // captions off by default; the effect above enforces it
      fs: '0',
      enablejsapi: '1', // opens the postMessage channel used to drop captions
    })
    return (
      <>
        {/* Cover the container regardless of its aspect: force 16:9 and let both
            min-dimensions push it to fill (like object-fit: cover for the iframe). */}
        <iframe
          ref={frameRef}
          title="Game footage"
          className={'pointer-events-none absolute left-1/2 top-1/2 h-auto w-auto min-h-full min-w-full max-w-none border-0 [translate:-50%_-50%] ' + (vertical ? 'aspect-[9/16]' : 'aspect-video') + (bare ? (vertical ? ' [scale:1.5]' : ' [scale:1.45]') : '')}
          src={`https://www.youtube-nocookie.com/embed/${youTubeId}?${params}`}
          allow="autoplay; encrypted-media"
        />
        {/* Transparent shield so the player never sees the pointer — kills the
            hover play/pause button that YouTube shows despite controls=0. Clicks
            still bubble to the card, and the card's hover state is unaffected. */}
        <div className="absolute inset-0 z-[1]" />
      </>
    )
  }
  return null
}

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

// Add-to-Mix (plus) and Share (upload) — the exact icons from Figma 976:3604 /
// 976:3600. They use currentColor so the card can tint + glow them on hover.
function PlusGlyph({ className, style }) {
  return (
    <svg viewBox="0 0 17 18" fill="none" className={className} style={style}>
      <path d="M8.67 1V17M1 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function ShareUploadGlyph({ className, style }) {
  return (
    <svg viewBox="0 0 16 20" fill="currentColor" className={className} style={style}>
      <path d="M7.293 0.292786C7.48053 0.105315 7.73484 0 8 0C8.26516 0 8.51947 0.105315 8.707 0.292786L11.707 3.29279C11.8892 3.48139 11.99 3.73399 11.9877 3.99619C11.9854 4.25838 11.8802 4.5092 11.6948 4.6946C11.5094 4.88001 11.2586 4.98518 10.9964 4.98746C10.7342 4.98974 10.4816 4.88894 10.293 4.70679L9 3.41379V12.9998C9 13.265 8.89464 13.5194 8.70711 13.7069C8.51957 13.8944 8.26522 13.9998 8 13.9998C7.73478 13.9998 7.48043 13.8944 7.29289 13.7069C7.10536 13.5194 7 13.265 7 12.9998V3.41379L5.707 4.70679C5.5184 4.88894 5.2658 4.98974 5.0036 4.98746C4.7414 4.98518 4.49059 4.88001 4.30518 4.6946C4.11977 4.5092 4.0146 4.25838 4.01233 3.99619C4.01005 3.73399 4.11084 3.48139 4.293 3.29279L7.293 0.292786ZM0 8.99979C0 8.46935 0.210714 7.96065 0.585786 7.58557C0.960859 7.2105 1.46957 6.99979 2 6.99979H4C4.26522 6.99979 4.51957 7.10514 4.70711 7.29268C4.89464 7.48022 5 7.73457 5 7.99979C5 8.265 4.89464 8.51936 4.70711 8.70689C4.51957 8.89443 4.26522 8.99979 4 8.99979H2V17.9998H14V8.99979H12C11.7348 8.99979 11.4804 8.89443 11.2929 8.70689C11.1054 8.51936 11 8.265 11 7.99979C11 7.73457 11.1054 7.48022 11.2929 7.29268C11.4804 7.10514 11.7348 6.99979 12 6.99979H14C14.5304 6.99979 15.0391 7.2105 15.4142 7.58557C15.7893 7.96065 16 8.46935 16 8.99979V17.9998C16 18.5302 15.7893 19.0389 15.4142 19.414C15.0391 19.7891 14.5304 19.9998 14 19.9998H2C1.46957 19.9998 0.960859 19.7891 0.585786 19.414C0.210714 19.0389 0 18.5302 0 17.9998V8.99979Z" />
    </svg>
  )
}

// Inline copy of the `userGroup` asset's paths. It's needed as a real SVG
// (rather than the plain <img> used elsewhere) wherever the icon has to be
// recolored — `userGroup` is stroke-only with no fill, and a stroke-only
// image is an unreliable CSS mask source (renders as a solid block instead
// of the icon shape in some browsers). An inline `<path stroke={color}>` has
// no such issue.
const USER_GROUP_PATHS = [
  'M13.8493 12C14.3489 12 14.7462 11.6857 15.103 11.2461C15.8333 10.3463 14.6342 9.6272 14.1769 9.27507C13.712 8.91707 13.1929 8.71427 12.6667 8.66667M12 7.33333C12.9205 7.33333 13.6667 6.58714 13.6667 5.66667C13.6667 4.74619 12.9205 4 12 4',
  'M2.15038 12C1.65084 12 1.25352 11.6857 0.896771 11.2461C0.166464 10.3463 1.36552 9.6272 1.82284 9.27507C2.28772 8.91707 2.80679 8.71427 3.33307 8.66667M3.6664 7.33333C2.74593 7.33333 1.99974 6.58714 1.99974 5.66667C1.99974 4.74619 2.74593 4 3.6664 4',
  'M5.38894 10.0744C4.70776 10.4956 2.92173 11.3557 4.00954 12.4319C4.54092 12.9576 5.13275 13.3336 5.87682 13.3336H10.1227C10.8667 13.3336 11.4585 12.9576 11.9899 12.4319C13.0777 11.3557 11.2917 10.4956 10.6105 10.0744C9.01314 9.08666 6.98634 9.08666 5.38894 10.0744Z',
  'M10.3331 4.99974C10.3331 6.28841 9.28841 7.33307 7.99974 7.33307C6.71107 7.33307 5.66641 6.28841 5.66641 4.99974C5.66641 3.71107 6.71107 2.66641 7.99974 2.66641C9.28841 2.66641 10.3331 3.71107 10.3331 4.99974Z',
]
function UserGroupGlyph({ color = '#7e7f87', className = 'size-[16px]' }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      {USER_GROUP_PATHS.map((d, i) => (
        <path key={i} d={d} stroke={color} strokeWidth="1.15254" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

function CardIconButton({ glyph: Glyph, initialMine = false, othersActive = false, label }) {
  const [mine, setMine] = useState(initialMine)
  const active = mine || othersActive
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
 * A rec card that expands horizontally on hover to reveal a details column.
 * Collapsed → thumbnail column (420px); on hover → 718px and the 250px
 * hover_content fades in.
 */
export function RecCard({ avatars, label, image, players, details, video, shared, overlay, steam, expanded, onWishlist, onShare, onOpen, reveal }) {
  const wishlistedByMe = label === 'PLAYlisted this game' && (avatars || []).includes(AVATAR.green)
  const cardRef = useRef(null)
  const [fly, setFly] = useState(null)
  // Clicking anywhere on the card (except the wishlist/share buttons, which
  // stopPropagation) opens the game's content detail page.
  const open = () => onOpen?.(details.title)

  // Steam variant — the original game card in a horizontal row, with a detail
  // flyout (same content as the expanded card). The flyout is fixed-positioned
  // so the row can scroll horizontally without clipping it.
  if (steam) {
    const showFly = () => {
      const r = cardRef.current?.getBoundingClientRect()
      if (!r) return
      const W = 300, H = 380, gap = 12
      const flipLeft = window.innerWidth - r.right < W + gap + 16
      let top = r.top
      if (top + H > window.innerHeight - 8) top = window.innerHeight - H - 8
      setFly({ top: Math.max(8, top), left: flipLeft ? r.left - W - gap : r.right + gap, w: W })
    }
    const hideFly = () => setFly(null)
    return (
      <div ref={cardRef} data-game={details.title} onClick={open} onMouseEnter={showFly} onMouseLeave={hideFly} className="relative flex h-[380px] w-[452px] shrink-0 cursor-pointer flex-col gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
        <div className="flex h-[30px] w-full items-center gap-[8px]">
          <AvatarStack colors={avatars} />
          <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
        </div>
        <div className="relative h-[236px] w-[420px] overflow-hidden rounded-[16px] bg-black">
          <img
            alt=""
            src={image}
            loading="lazy"
            decoding="async"
            className={'absolute inset-0 size-full object-cover transition-opacity duration-300' + (video ? ' group-hover:opacity-0 group-hover:delay-[300ms]' : '')}
          />
          {video && (
            <div
              className="absolute inset-0 bg-black bg-cover bg-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:delay-[300ms]"
              style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
            >
              <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
            </div>
          )}
        </div>
        <div className="flex h-[50px] w-full items-center gap-[8px]">
          <div className="flex items-center gap-[4px]">
            <Pill>
              <span className="flex -scale-y-100 rotate-180 items-center justify-center">
                <img alt="" src={userGroup} className="size-[16px]" />
              </span>
              <span className="text-[12px] text-[#7e7f87]">{players}</span>
            </Pill>
            <Pill><span className="text-[12px] text-[#7e7f87]">{details.playtime}</span></Pill>
            <Pill><span className="text-[12px] text-[#7e7f87]">{details.genre}</span></Pill>
          </div>
        </div>

        {/* Detail flyout — fixed so the horizontal row doesn't clip it */}
        {fly && (
        <div className="pointer-events-none fixed z-[60]" style={{ top: fly.top, left: fly.left, width: fly.w }}>
          <div className="h-[380px] rounded-[16px] bg-[#121214] p-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
            <div className="flex h-full flex-col gap-[16px]">
              <div className="flex items-center justify-end gap-[8px]">
                <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to Mix" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onShare?.(details.title) }} title="Share to chat" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><ChatAddGlyph filled={shared} color="white" /></button>
              </div>
              <div className="flex flex-1 flex-col justify-between pb-[5px]">
                <div className="flex flex-col gap-[24px]">
                  <div className="flex flex-col gap-[8px] text-[#e7e7e7]">
                    <p className="text-[20px] font-semibold leading-tight">{details.title}</p>
                    <p className="whitespace-nowrap text-[12px]">by <span className="font-semibold">{details.developer}</span></p>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    {details.ratings.map((r, i) => <RatingRow key={i} {...r} />)}
                  </div>
                  {details.age && (
                    <div className="flex items-start gap-[6px] text-[12px] text-[#7e7f87]">
                      <span className="whitespace-nowrap font-semibold">{details.age}</span>
                      <span className="flex-1">{details.descriptors}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-[10px]">
                    <div className="grid size-[16px] grid-cols-2 grid-rows-2 gap-px">
                      <span className="bg-white" /><span className="bg-white" /><span className="bg-white" /><span className="bg-white" />
                    </div>
                    <img alt="" src={appleLogo} className="h-[16px] w-[13px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    )
  }

  // Always-expanded variant — the card is shown in its expanded form (cover +
  // details side by side) by default, with no hover expansion.
  if (expanded) {
    return (
      <div data-game={details.title} onClick={open} className="group flex h-[380px] w-[718px] shrink-0 cursor-pointer gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
        <div className="flex w-[420px] shrink-0 flex-col gap-[16px]">
          <div className="flex h-[30px] w-full items-center gap-[8px]">
            <AvatarStack colors={avatars} />
            <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
          </div>
          <div className="relative w-[420px] flex-1 overflow-hidden rounded-[16px] bg-black">
            <img
              alt=""
              src={image}
              loading="lazy"
              decoding="async"
              className={'absolute inset-0 size-full object-cover transition-opacity duration-300' + (video ? ' group-hover:opacity-0 group-hover:delay-[300ms]' : '')}
            />
            {video && (
              <div
                className="absolute inset-0 bg-black bg-cover bg-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:delay-[300ms]"
                style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
              >
                <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
              </div>
            )}
          </div>
        </div>
        <div className="flex h-[348px] w-[250px] shrink-0 flex-col gap-[16px]">
          <div className="flex items-center justify-end gap-[8px]">
            <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to Mix" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onShare?.(details.title) }} title="Share to chat" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><ChatAddGlyph filled={shared} color="white" /></button>
          </div>
          <div className="flex flex-1 flex-col justify-between pb-[5px]">
            <div className="flex flex-col gap-[20px]">
              <div className="flex flex-col gap-[8px] text-[#e7e7e7]">
                <p className="text-[20px] font-semibold leading-tight">{details.title}</p>
                <p className="whitespace-nowrap text-[12px]">by <span className="font-semibold">{details.developer}</span></p>
              </div>
              {/* tags sit between the developer and the reviews */}
              <div className="flex flex-wrap items-center gap-[4px]">
                <Pill>
                  <span className="flex -scale-y-100 rotate-180 items-center justify-center">
                    <img alt="" src={userGroup} className="size-[16px]" />
                  </span>
                  <span className="text-[12px] text-[#7e7f87]">{players}</span>
                </Pill>
                <Pill><span className="text-[12px] text-[#7e7f87]">{details.playtime}</span></Pill>
                <Pill><span className="text-[12px] text-[#7e7f87]">{details.genre}</span></Pill>
              </div>
              <div className="flex flex-col gap-[8px]">
                {details.ratings.map((r, i) => <RatingRow key={i} {...r} />)}
              </div>
              {details.age && (
                <div className="flex items-start gap-[6px] text-[12px] text-[#7e7f87]">
                  <span className="whitespace-nowrap font-semibold">{details.age}</span>
                  <span className="flex-1">{details.descriptors}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-[10px]">
                <div className="grid size-[16px] grid-cols-2 grid-rows-2 gap-px">
                  <span className="bg-white" /><span className="bg-white" /><span className="bg-white" /><span className="bg-white" />
                </div>
                <img alt="" src={appleLogo} className="h-[16px] w-[13px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Overlay variant — the card keeps its size and the details fade in as a
  // pop-up over the cover on hover (instead of the card expanding sideways).
  if (overlay) {
    return (
      <div data-game={details.title} onClick={open} className="group relative flex h-[314px] w-[452px] shrink-0 cursor-pointer flex-col gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
        <div className="flex h-[30px] w-full items-center gap-[8px]">
          <AvatarStack colors={avatars} />
          <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
        </div>

        {/* 16:9 cover → trailer on hover (does not fill the whole card) */}
        <div className="relative h-[236px] w-[420px] overflow-hidden rounded-[16px] bg-black">
          <img
            alt=""
            src={image}
            loading="lazy"
            decoding="async"
            className={'absolute inset-0 size-full object-cover transition-opacity duration-300' + (video ? ' group-hover:opacity-0 group-hover:delay-[300ms]' : '')}
          />
          {video && (
            <div
              className="absolute inset-0 bg-black bg-cover bg-center opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:delay-[300ms]"
              style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
            >
              <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
            </div>
          )}
        </div>

        {/* Hover pop-up — action buttons + the detail (title, review + tags),
            over the bottom of the 16:9 cover. Fades in on hover. */}
        <div className={'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100' + (reveal ? ' !opacity-100' : '')}>
          <div className="absolute right-[16px] top-[16px] flex gap-[8px]">
            <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to Mix" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onShare?.(details.title) }} title="Share to chat" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><ChatAddGlyph filled={shared} color="white" /></button>
          </div>
          <div className="absolute inset-x-[16px] bottom-[16px] flex flex-col gap-[8px] rounded-b-[16px] bg-gradient-to-t from-black via-black/80 to-transparent px-[16px] pb-[14px] pt-[52px]">
            <div className="flex flex-col text-[#e7e7e7]">
              <p className="text-[19px] font-semibold leading-tight text-white">{details.title}</p>
              <p className="text-[12px]">by <span className="font-semibold">{details.developer}</span></p>
            </div>
            <div className="flex items-center gap-[16px]">
              {/* review info (left) */}
              {details.ratings.slice(0, 1).map((r, i) => (
                <div key={i} className="flex shrink-0 items-center gap-[7px]">
                  <img alt="" src={thumbsUp} className="size-[22px] shrink-0" />
                  <span className="text-[18px] font-semibold text-white">{r.pct}</span>
                </div>
              ))}
              {/* tags (right of the review) */}
              <div className="flex flex-wrap items-center gap-[4px]">
                <Pill>
                  <span className="flex -scale-y-100 rotate-180 items-center justify-center">
                    <img alt="" src={userGroup} className="size-[16px]" />
                  </span>
                  <span className="text-[12px] text-[#e7e7e7]">{players}</span>
                </Pill>
                <Pill><span className="text-[12px] text-[#e7e7e7]">{details.playtime}</span></Pill>
                <Pill><span className="text-[12px] text-[#e7e7e7]">{details.genre}</span></Pill>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Once the card finishes expanding on hover, if its right edge runs off the
  // row, slide the row left so the whole card shows — never cropping the cover
  // on the left, and leaving a gap at the row edge. Runs on transition end so
  // the row's scrollWidth has already grown (needed for the last card, which
  // has no trailing cards to scroll into).
  function handleExpandEnd(e) {
    if (e.propertyName !== 'width') return
    const el = cardRef.current
    const row = el && el.closest('.rec-row')
    if (!el || !row || !el.matches(':hover')) return
    const pad = 56
    const cardLeft = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
    const overflowRight = cardLeft + CARD_EXPANDED_W + pad - (row.scrollLeft + row.clientWidth)
    if (overflowRight <= 0) return
    const target = Math.max(0, Math.min(row.scrollLeft + overflowRight, cardLeft - pad))
    if (target > row.scrollLeft + 1) smoothScrollLeft(row, target)
  }

  return (
    <div
      ref={cardRef}
      data-game={details.title}
      onClick={open}
      onTransitionEnd={handleExpandEnd}
      className="group flex h-[380px] w-[452px] shrink-0 cursor-pointer gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px] transition-[width] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[718px] hover:delay-[450ms]"
    >
      {/* Left column — thumbnail_content */}
      <div className="flex w-[420px] shrink-0 flex-col gap-[16px]">
        {/* Header — avatars + label */}
        <div className="flex h-[30px] w-full items-center gap-[8px]">
          <AvatarStack colors={avatars} />
          <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
        </div>

        {/* Cover art → streaming trailer on hover */}
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

        {/* Metadata pills */}
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
        </div>
      </div>

      {/* Right column — hover_content; fades in as the card expands */}
      <div className="flex h-[348px] w-[250px] shrink-0 flex-col gap-[16px] opacity-0 transition-opacity delay-[0ms] duration-[400ms] ease-out group-hover:opacity-100 group-hover:delay-[550ms]">
        <div className="flex items-center justify-end gap-[8px]">
          <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to Mix" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onShare?.(details.title) }} title="Share to chat" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><ChatAddGlyph filled={shared} color="white" /></button>
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

          {/* Platform row — Microsoft (windows) + Apple only */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-[10px]">
              <div className="grid size-[16px] grid-cols-2 grid-rows-2 gap-px">
                <span className="bg-white" />
                <span className="bg-white" />
                <span className="bg-white" />
                <span className="bg-white" />
              </div>
              <img alt="" src={appleLogo} className="h-[16px] w-[13px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Cinematic hover card (Figma 622:2733 default / 622:2755 hover). The card is a
 * FIXED size. Collapsed it shows only the cover. On hover the trailer is cropped
 * open across the WHOLE card and the copy converges into place on top of it.
 *
 * Legibility comes from two black gradients rather than a panel or a full-card
 * scrim, so the footage stays bright everywhere it isn't competing with text.
 * Title, the avatars/label row, and the description are stacked together in
 * ONE pool, top-left — its gradient is the block's own background, so it grows
 * with however many lines land in it. Tags are deliberately kept OUTSIDE that
 * block: their own pool, at the bottom, unchanged in vertical position from
 * before, but revealed with a much longer rise than the rest of the copy so
 * they read as sliding up from beneath the card rather than settling in place.
 *
 * Motion is matched to the reference prototype:
 *  · one expo-out curve for everything, ~450ms in and a quicker ~300ms unwind
 *  · the trailer is revealed by an inset clip wiping leftward from the card's
 *    right edge — it never translates — and cross-fades up out of Xbox green
 */
export function CinematicCard({ image, video, avatars, label, players, playtime, genre, title, recommendPct, avatarsPlus, onWishlist, onShare, onViewDetails, onOpen, forceReveal }) {
  const open = () => (onViewDetails || onOpen)?.(title)
  const ACCENT = '#9BF00B' // Xbox bright green — pills, the + and its glow
  // Spectate mirroring: force the hover reveal on (a moderator can't hover).
  const F = forceReveal ? ' !opacity-100 !translate-x-0 !translate-y-0' : ''
  const LightPill = ({ children }) => (
    <span
      className="flex shrink-0 items-center gap-[3px] whitespace-nowrap rounded-[16px] border px-[7px] py-[2px] text-[12px] font-semibold"
      style={{ borderColor: ACCENT, color: ACCENT }}
    >
      {children}
    </span>
  )
  const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]'
  // Everything cross-fades in and out together — no slide, no stagger. One
  // shared duration and no delays so the whole overlay appears at once.
  const reveal =
    `opacity-0 transition-opacity duration-[300ms] ${EASE}` +
    ' group-hover:opacity-100 group-hover:duration-[400ms]' + F
  const rise =
    `opacity-0 transition-opacity duration-[300ms] ${EASE}` +
    ' group-hover:opacity-100 group-hover:duration-[400ms]' + F
  const riseUp =
    `opacity-0 transition-opacity duration-[300ms] ${EASE}` +
    ' group-hover:opacity-100 group-hover:duration-[400ms]' + F
  const pool =
    `pointer-events-none absolute opacity-0 transition-opacity duration-[300ms] ${EASE}` +
    ' group-hover:opacity-100 group-hover:duration-[400ms]' + (forceReveal ? ' !opacity-100' : '')
  // The tags' own pool runs the full width as a flat horizontal band, which is
  // what lets it cover the + as well — no separate pool needed in that corner.
  // Recipe matched to the overlay card's hover scrim ("Because you love to
  // build" etc — RecCard's `overlay` branch below): `from-black via-black/80
  // to-transparent`, i.e. black at the bottom, 80% black at the midpoint, clear
  // at the top.
  const bottomBg =
    'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)'
  return (
    <div className="group/rec flex w-[520px] shrink-0 flex-col gap-[12px]">
    {/* Friend recommend info — above the card, fades out on hover */}
    <div className="flex items-center gap-[8px] pl-[2px] transition-opacity duration-300 group-hover/rec:opacity-0">
      <AvatarStack colors={avatars} />
      {avatarsPlus && <span className="-ml-[2px] text-[16px] font-semibold leading-none text-white">+</span>}
      <p className="whitespace-nowrap text-[15px] text-[#c7c9cb]">{label}</p>
    </div>
    <div data-game={title} onClick={open} className="group relative h-[292px] w-full cursor-pointer overflow-hidden rounded-[16px] bg-[#121214]">
      {/* Cover — fills the whole card by default */}
      <img
        alt=""
        src={image}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />

      {/* Trailer — now full-bleed. The layer never moves: an inset clip wipes
          leftward from the card's right edge, so the frame is cropped in rather
          than slid in. It's Xbox green underneath, and the trailer cross-fades
          up out of it as the crop widens. */}
      {video && (
        <div
          className={`absolute inset-0 overflow-hidden bg-[#107C10] opacity-0 transition-opacity duration-[300ms] ${EASE} group-hover:opacity-100 group-hover:duration-[400ms]` + (forceReveal ? ' !opacity-100' : '')}
        >
          <div
            className={`absolute inset-0 opacity-0 transition-opacity duration-[300ms] ${EASE} group-hover:opacity-100 group-hover:duration-[400ms]` + (forceReveal ? ' !opacity-100' : '')}
          >
            <VideoTrailer poster={video.poster} mp4={video.mp4} youTubeId={video.youTubeId} />
          </div>
        </div>
      )}

      {/* Title — no scrim. Legibility comes from a plain drop shadow instead,
          which keeps the letters true white on any footage. */}
      <p
        className={`pointer-events-none absolute left-0 top-0 w-[320px] pb-[28px] pl-[24px] pr-[32px] pt-[20px] text-[28px] font-bold leading-[1.1] text-white opacity-0 transition-opacity duration-[300ms] ${EASE} group-hover:opacity-100 group-hover:duration-[400ms]` + F}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}
      >
        {title}
      </p>

      {/* Bottom pool — avatars/label sit directly above the tags, both in the
          same band. Full width so it still covers the + and eye icons in the
          far corner without needing a separate pool there. */}
      <div
        className={`${pool} bottom-0 left-0 flex w-full flex-col items-start gap-[16px] pb-[18px] pl-[24px] pt-[30px]`}
        style={{ background: bottomBg }}
      >
        <div className={`${rise} flex items-center gap-[8px]`}>
          <AvatarStack colors={avatars} />
          {avatarsPlus && <span className="-ml-[2px] text-[16px] font-semibold leading-none text-white">+</span>}
          <p className="whitespace-nowrap text-[16px] text-white">{label}</p>
        </div>
        <div className={`${riseUp} flex items-center gap-[4px]`}>
          <LightPill>
            <UserGroupGlyph color={ACCENT} className="size-[16px] -scale-x-100" />
            {players}
          </LightPill>
          <LightPill>{playtime}</LightPill>
          <LightPill>{genre}</LightPill>
        </div>
      </div>

      {/* + add-to-Mix / eye view-details — bottom-right of the trailer half.
          Both enter from the card's right edge with the crop (they start far
          enough out that the card's own overflow clips them), just a short
          slide rather than a long throw. Each button's own hover reveals its
          label, so `group/add` and `group/view` are scoped to the button and
          don't disturb the card-level `group` the rest of the reveal hangs off. */}
      <div className="absolute bottom-[14px] right-[18px] flex items-center gap-[16px]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onWishlist?.(title) }}
          aria-label="Add to Mix"
          className={`${reveal} group/add relative flex size-[28px] items-center justify-center`}
        >
          <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/add:opacity-100">
            Add to Mix
          </span>
          <PlusGlyph className={`size-[24px] transition-[scale,filter] duration-200 ${EASE} group-hover/add:scale-110 group-hover/add:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]`} style={{ color: ACCENT }} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onShare?.(title) }}
          aria-label="Share"
          className={`${reveal} group/share relative flex size-[28px] items-center justify-center`}
        >
          <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/share:opacity-100">
            Share
          </span>
          <ShareUploadGlyph className={`size-[22px] transition-[scale,filter] duration-200 ${EASE} group-hover/share:scale-110 group-hover/share:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]`} style={{ color: ACCENT }} />
        </button>
      </div>
    </div>
    </div>
  )
}

/**
 * Portrait tile that expands sideways on hover (Figma 620:2347 default /
 * 620:2350 hover). Collapsed it's box art; on hover it widens and a dark panel
 * slides in with title, publisher, release date, blurb, a recommendation line
 * and user-tag pills.
 */
export function PortraitCard({ image, video, title, publisher, released, recommend, avatars, multiplayer, tags = [], belowAvatars, onWishlist, onShare, onOpen, forceReveal }) {
  const shortRec = recommend ? recommend.replace(/ (have|has) played recently$/, '') : ''
  // Match the number of profile pics to the friend count: 1 friend → 1 pic,
  // 2+ → 2 pics, with a "+" once there are 3+ (the pair can't show everyone).
  const friendCount = parseInt(recommend || '', 10)
  const shownCount = Number.isFinite(friendCount) ? Math.min(Math.max(friendCount, 1), 2) : 2
  const pair = (avatars && avatars.length ? avatars : [AVATAR.blue, AVATAR.purple]).slice(0, shownCount)
  const showPlus = Number.isFinite(friendCount) && friendCount >= 3
  // The cover swaps to the trailer while hovered (Figma 979:1206).
  const [hover, setHover] = useState(false)
  const showVid = (hover || forceReveal) && video?.youTubeId
  const Tag = ({ children, full }) => (
    <span className={'flex items-center justify-center whitespace-nowrap rounded-[20px] bg-[#4c5053] px-[8px] py-[2px] text-[11px] text-white ' + (full ? 'w-full' : 'w-fit')}>
      {children}
    </span>
  )
  // Info copy just fades in and out — no slide.
  const fade = 'opacity-0 transition-opacity duration-[450ms] ease-out group-hover:opacity-100'
  // Spectate mirroring: force the expand + reveal on (a moderator can't hover).
  const F = forceReveal ? ' !opacity-100' : ''
  return (
    <div className="group/rec flex shrink-0 flex-col">
    {/* Profile pics above the cover — "who has played"; fades out on hover. */}
    {belowAvatars && (
      <div className="mb-[10px] flex w-[200px] items-center gap-[7px] transition-opacity duration-300 group-hover/rec:opacity-0">
        {recommend ? (
          <>
            <div className="flex items-center">
              {pair.map((c, i) => (
                <ProfileIcon key={i} color={c} className="size-[18px] ring-[2px] ring-[#0c0c0e]" style={{ marginRight: i < 1 ? -6 : 0, zIndex: 2 - i }} />
              ))}
              {showPlus && <span className="ml-[3px] text-[12px] font-semibold leading-none text-white">+</span>}
            </div>
            <span className="truncate text-[12px] text-[#9a9ba3]">{shortRec}</span>
          </>
        ) : (
          <span className="text-[12px] text-[#7e7f87]">No one has played yet</span>
        )}
      </div>
    )}
    <div
      data-game={title}
      onClick={() => onOpen?.(title)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={'group relative flex h-[300px] w-[200px] shrink-0 cursor-pointer overflow-hidden rounded-[12px] bg-[#191919] transition-[width] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-[452px]' + (forceReveal ? ' !w-[452px]' : '')}
    >
      {/* Portrait cover (left) — becomes the trailer on hover. overflow-hidden
          keeps the 16:9 trailer cropped to the cover's width instead of
          spilling into the info panel. */}
      <div className="relative h-full w-[200px] shrink-0 overflow-hidden">
        <img alt="" src={image} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
        {showVid && <VideoTrailer youTubeId={video.youTubeId} poster={image} bare vertical={video.vertical} />}
        <div className={'pointer-events-none absolute inset-0 bg-gradient-to-l from-[#191919] to-transparent opacity-0 transition-opacity duration-[450ms] ease-out group-hover:opacity-100' + F} />
      </div>

      {/* Info panel (right) — packs the copy at the top with even gaps; only the
          action buttons are pushed to the bottom (Figma 979:1209). */}
      <div className={`${fade}${F} flex h-full w-[252px] shrink-0 flex-col gap-[12px] overflow-hidden bg-[#191919] p-[16px] group-hover:delay-[100ms]`}>
        <p className="text-[20px] font-bold leading-tight text-white">{title}</p>
        <div className="flex flex-col gap-[13px]">
          {recommend ? (
            <div className="flex items-center gap-[6px]">
              <div className="flex items-center">
                {pair.map((c, i) => (
                  <ProfileIcon key={i} color={c} className="size-[18px] ring-[2px] ring-[#191919]" style={{ marginRight: i < 1 ? -6 : 0, zIndex: 2 - i }} />
                ))}
                {showPlus && <span className="ml-[3px] text-[12px] font-semibold leading-none text-white">+</span>}
              </div>
              <p className="text-[12px] leading-[1.2] text-white">{recommend}</p>
            </div>
          ) : (
            <div className="flex items-center gap-[7px]">
              <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-[#9BF00B]" fill="currentColor"><path d="M12 2l2.4 5.4L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5L8 11.9 4 8l5.6-.6L12 2z" /></svg>
              <p className="text-[12px] font-medium leading-[1.2] text-[#9BF00B]">Be the first to suggest this!</p>
            </div>
          )}
          <div className="flex flex-col text-[12px] leading-[1.3]">
            {publisher && <span className="text-[#c5c6ca]">{publisher}</span>}
            {released && <span className="text-[#e7e7e7]">{released}</span>}
          </div>
          <div className="flex flex-col gap-[4px]">
            <p className="text-[10px] text-white">User Tags</p>
            <div className="flex flex-col gap-[4px]">
              {multiplayer && <Tag>{multiplayer}</Tag>}
              <div className="flex flex-wrap gap-[4px]">
                {tags.map((t, i) => <Tag key={i}>{t}</Tag>)}
              </div>
            </div>
          </div>
        </div>
        {/* Add-to-Mix + Share — right-aligned, with a hover label + glow (Figma 979:1209) */}
        <div className="mt-auto flex items-center justify-end gap-[18px] text-[#9BF00B]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onWishlist?.(title) }}
            aria-label="Add to Mix"
            className="group/add relative flex size-[26px] items-center justify-center"
          >
            <span className="pointer-events-none absolute bottom-[34px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/add:opacity-100">
              Add to Mix
            </span>
            <PlusGlyph className="size-[22px] transition-[scale,filter] duration-200 ease-out group-hover/add:scale-110 group-hover/add:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShare?.(title) }}
            aria-label="Share"
            className="group/share relative flex size-[26px] items-center justify-center"
          >
            <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/share:opacity-100">
              Share
            </span>
            <ShareUploadGlyph className="size-[20px] transition-[scale,filter] duration-200 ease-out group-hover/share:scale-110 group-hover/share:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]" />
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}

function ChevronGlyph({ direction }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[20px]" fill="none">
      <path
        d={direction === 'left' ? 'M15 6L9 12L15 18' : 'M9 6L15 12L9 18'}
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A titled shelf wrapper (heading + horizontally-scrollable row) for bespoke
 *  card styles that don't go through RecCard. A left/right arrow appears over
 *  the row's edge whenever there are more cards scrolled out of view on that
 *  side, and disappears once scrolling reaches that end. */
export function ShelfRow({ title, subtitle, gap = 24, children }) {
  const rowRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [])

  function scrollByPage(dir) {
    const el = rowRef.current
    if (!el) return
    const target = el.scrollLeft + dir * el.clientWidth * 0.85
    smoothScrollLeft(el, Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth)))
  }

  return (
    <div className="mt-[56px] flex w-full shrink-0 flex-col">
      <p className="text-[24px] font-semibold text-white">{title}</p>
      {subtitle && <p className="mt-[4px] text-[15px] text-[#9a9ba3]">{subtitle}</p>}
      <div className="relative">
        <div ref={rowRef} className="rec-row no-scrollbar flex w-full items-start overflow-x-auto pb-[4px] pt-[20px]" style={{ gap }}>
          {children}
          <div aria-hidden className="w-[40px] shrink-0" />
        </div>
        {canLeft && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByPage(-1)}
            className="absolute left-[8px] top-1/2 z-10 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-black/70 transition hover:bg-black/90"
          >
            <ChevronGlyph direction="left" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByPage(1)}
            className="absolute right-[8px] top-1/2 z-10 flex size-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-black/70 transition hover:bg-black/90"
          >
            <ChevronGlyph direction="right" />
          </button>
        )}
      </div>
    </div>
  )
}

/** A titled shelf: a heading over a horizontally-scrollable row of rec cards. */
export function CardRow({ title, subtitle, cards, overlay, expanded, onWishlist, onShare, onOpen, revealTitle }) {
  return (
    <ShelfRow title={title} subtitle={subtitle} gap={40}>
      {cards.map((c, i) => (
        <RecCard key={i} {...c} overlay={overlay} expanded={expanded} onWishlist={onWishlist} onShare={onShare} onOpen={onOpen} reveal={!!revealTitle && c.details?.title === revealTitle} />
      ))}
    </ShelfRow>
  )
}
