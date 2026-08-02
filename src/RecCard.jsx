import { useRef, useState } from 'react'
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

/** Trailer that plays on hover. Pass `mp4` (preferred) or `youTubeId`. */
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
export function RecCard({ avatars, label, image, players, details, video, shared, overlay, steam, expanded, onWishlist, onShare }) {
  const wishlistedByMe = label === 'wishlisted this game' && (avatars || []).includes(AVATAR.green)
  const cardRef = useRef(null)
  const [fly, setFly] = useState(null)

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
      <div ref={cardRef} onMouseEnter={showFly} onMouseLeave={hideFly} className="relative flex h-[380px] w-[452px] shrink-0 flex-col gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
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
                <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to a Blend" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
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
      <div className="group flex h-[380px] w-[718px] shrink-0 gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
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
            <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to a Blend" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
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
      <div className="group relative flex h-[380px] w-[452px] shrink-0 flex-col gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px]">
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

        {/* Hover pop-up — the detail sits over the cover, ABOVE the pills. The
            pills never move; the panel stops right above them. The trailer
            still shows through the gradient at the top. */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="absolute right-[16px] top-[16px] flex gap-[8px]">
            <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to a Blend" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onShare?.(details.title) }} title="Share to chat" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><ChatAddGlyph filled={shared} color="white" /></button>
          </div>
          <div className="absolute inset-x-[16px] bottom-[82px] flex flex-col gap-[8px] rounded-b-[16px] bg-gradient-to-t from-black via-black/80 to-transparent px-[16px] pb-[14px] pt-[52px]">
            <div className="flex flex-col text-[#e7e7e7]">
              <p className="text-[19px] font-semibold leading-tight text-white">{details.title}</p>
              <p className="text-[12px]">by <span className="font-semibold">{details.developer}</span></p>
            </div>
            <div className="flex items-center gap-[18px]">
              {details.ratings.map((r, i) => (
                <div key={i} className="flex items-center gap-[7px]">
                  <img alt="" src={thumbsUp} className="size-[22px] shrink-0" />
                  <span className="text-[18px] font-semibold text-white">{r.pct}</span>
                  <span className="text-[10px] leading-tight text-[#e7e7e7]">
                    {r.line1}
                    <br />
                    <span className={r.line2Bold ? 'font-bold' : undefined}>{r.line2}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-[10px] text-[12px] text-[#e7e7e7]">
              {details.age && (
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{details.age}</span> {details.descriptors}
                </span>
              )}
              <span className="flex shrink-0 items-center gap-[8px]">
                <span className="grid size-[14px] grid-cols-2 grid-rows-2 gap-px">
                  <span className="bg-white" /><span className="bg-white" /><span className="bg-white" /><span className="bg-white" />
                </span>
                <img alt="" src={appleLogo} className="h-[14px] w-[11px]" />
              </span>
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
      onTransitionEnd={handleExpandEnd}
      className="group flex h-[380px] w-[452px] shrink-0 gap-[16px] overflow-hidden rounded-[16px] bg-[#121214] p-[16px] transition-[width] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[718px] hover:delay-[450ms]"
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
          <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(details.title) }} title="Add to a Blend" className="flex size-[24px] shrink-0 items-center justify-center transition hover:scale-110 hover:opacity-80"><BookmarkGlyph filled={wishlistedByMe} color="white" /></button>
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

/** A titled shelf: a heading over a horizontally-scrollable row of rec cards. */
export function CardRow({ title, subtitle, cards, overlay, expanded, onWishlist, onShare }) {
  return (
    <div className="mt-[56px] flex w-full shrink-0 flex-col">
      <p className="text-[24px] font-bold text-white">{title}</p>
      {subtitle && <p className="mt-[4px] text-[15px] text-[#9a9ba3]">{subtitle}</p>}
      <div className="rec-row no-scrollbar flex w-full items-start gap-[40px] overflow-x-auto py-[20px]">
        {cards.map((c, i) => (
          <RecCard key={i} {...c} overlay={overlay} expanded={expanded} onWishlist={onWishlist} onShare={onShare} />
        ))}
        {/* Trailing room so the last card can scroll fully into view on hover. */}
        <div aria-hidden className="w-[40px] shrink-0" />
      </div>
    </div>
  )
}
