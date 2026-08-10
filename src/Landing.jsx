import { createContext, Fragment, useContext, useEffect, useId, useRef, useState } from 'react'
import { RecCard, CardRow, CinematicCard, PortraitCard, ShelfRow, VideoTrailer, AVATAR } from './RecCard.jsx'
import { useRoom, RoomProvider, useRoomCtx, useRoomNode, writeRoomPath, ROOM_ID } from './room.js'
import {
  discordLogo,
  xboxSprite,
  heroSeaOfThieves,
  heroMinecraft,
  heroLol,
  heroHumanFallFlat,
  heroGrounded,
  heroOvercooked,
  heroMonsterHunter,
  heroGangBeasts,
  heroWildHearts,
  heroMinecraftDungeons,
  heroAc,
  heroForHonor,
  searchIcon,
  userGroup,
  discoveredHalo,
  mixThumbSquad,
  mixThumbMix,
  mixThumbDuo1,
  mixThumbDuo2,
} from './assets/figma/index.js'
import mixesHaloBg from './assets/figma/mixes-halo-matched.png'

// ── Active tester profile, from the URL (?u=1|2|3|4) ────────────────────────
// No login: each tester opens their own link and `SELF` is their identity.
// The URL uses simple numbers; internally the four identities keep stable keys.
const COLOR_OF = { abby: AVATAR.green, blake: AVATAR.blue, chloe: AVATAR.purple, daniel: AVATAR.red }
const U_TO_NAME = { 1: 'abby', 2: 'blake', 3: 'chloe', 4: 'daniel' }
const NAME_TO_U = { abby: 1, blake: 2, chloe: 3, daniel: 4 }
const _u = new URLSearchParams(window.location.search).get('u')
// Accept ?u=1..4 (preferred) or a legacy ?u=abby..daniel.
const SELF_NAME = U_TO_NAME[_u] || (COLOR_OF[_u] ? _u : 'abby')
const SELF = COLOR_OF[SELF_NAME]

// ── Observation modes (for the moderator's live participant wall) ────────────
// ?moderator=1 → the wall itself. ?spectate=1 → a read-only mirror of one
// participant (embedded per-tile in the wall). Neither flag → a live tester.
const _params = new URLSearchParams(window.location.search)
const IS_MODERATOR = _params.get('moderator') === '1'
const IS_SPECTATE = _params.get('spectate') === '1'
const IS_LIVE = !IS_MODERATOR && !IS_SPECTATE
const SPECTATE_PATH = `spectate/${SELF_NAME}` // where this identity's mirror lives

/* ── Discord dark palette (from the reference screenshot) ──────────────────
 * A darker-than-default Discord: near-black rail, very dark panel, raised
 * rows for active/hover, muted gray text, one online green accent. Kept in the
 * sidebar only — the Xbox content area keeps its own hi-fi styling. */
const D = {
  rail: '#121214',
  panel: '#121214',
  raised: '#1c1d21',
  hover: '#161719',
  inset: '#101114',
  text: '#dbdee1',
  dim: '#b5bac1',
  mute: '#80848e',
  green: '#23a55a',
}

/** A Discord-style avatar: colored circle with the white Discord logo. */
function Avatar({ color, size = 32, className, style }) {
  return (
    <div
      className={'relative shrink-0 overflow-hidden rounded-full ' + (className || '')}
      style={{ width: size, height: size, backgroundColor: color, ...style }}
    >
      <img
        alt=""
        src={discordLogo}
        className="absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    </div>
  )
}

/** Xbox logo cropped from the sprite sheet, matching the store view. */
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

// ── Discord server rail ─────────────────────────────────────────────────────
const SERVERS = [
  { kind: 'home', active: true },
  { kind: 'letter', label: 'G', color: '#3ba55d' },
  { kind: 'letter', label: 'M', color: '#c0392b' },
  { kind: 'letter', label: 'A', color: '#8e44ad' },
  { kind: 'letter', label: 'W', color: '#2f80b5' },
]

function RailIcon({ children, active, tint }) {
  return (
    <div className="relative flex w-full justify-center">
      {/* selection / hover pill */}
      <span
        className={
          'absolute left-0 top-1/2 -translate-y-1/2 w-[4px] rounded-r-[4px] bg-white transition-all ' +
          (active ? 'h-[36px] opacity-100' : 'h-[8px] opacity-0 group-hover/rail:opacity-40')
        }
      />
      <button
        className={
          'group/icon flex size-[48px] items-center justify-center overflow-hidden transition-all duration-150 ' +
          (active ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]')
        }
        style={{ backgroundColor: tint }}
      >
        {children}
      </button>
    </div>
  )
}

// Global back/forward navigation, Discord-style. The root App drives a small
// history stack and exposes it here so any page's arrows share one history.
const NavCtx = createContext({ canBack: false, canForward: false, back: () => {}, forward: () => {}, openWheel: () => {}, addToWheel: () => {} })

// Discord-style back/forward arrows for the top-left of a page. Replaces the
// old per-page "← Back" text button.
function NavArrows({ className = '' }) {
  const { canBack, canForward, back, forward } = useContext(NavCtx)
  const btn = 'flex size-[30px] items-center justify-center rounded-[8px] transition '
  return (
    <div className={'flex items-center gap-[2px] ' + className}>
      <button
        onClick={back}
        disabled={!canBack}
        aria-label="Back"
        className={btn + (canBack ? 'text-[#dbdee1] hover:bg-white/10 hover:text-white' : 'cursor-default text-[#4a4d55]')}
      >
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <button
        onClick={forward}
        disabled={!canForward}
        aria-label="Forward"
        className={btn + (canForward ? 'text-[#dbdee1] hover:bg-white/10 hover:text-white' : 'cursor-default text-[#4a4d55]')}
      >
        <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </div>
  )
}

// Global window title bar (Discord-style) — back/forward arrows at the left,
// the app name centered. Sits above the rail + sidebar + content.
function TopBar() {
  return (
    <div className="relative flex h-[34px] shrink-0 items-center" style={{ backgroundColor: '#121214' }}>
      {/* macOS-style window traffic lights */}
      <div className="flex items-center gap-[8px] pl-[13px]">
        <span className="size-[12px] rounded-full" style={{ backgroundColor: '#EC6765' }} />
        <span className="size-[12px] rounded-full" style={{ backgroundColor: '#F2CA44' }} />
        <span className="size-[12px] rounded-full" style={{ backgroundColor: '#65C466' }} />
      </div>
      {/* Arrows sit above the sidebar (past the 72px server rail), Discord-style */}
      <div className="pl-[24px]">
        <NavArrows />
      </div>
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-[7px]">
        <span style={{ filter: 'brightness(0) invert(1)' }}><XboxLogo size={15} /></span>
        <span className="text-[13px] font-medium tracking-tight text-[#c7c9cb]">XBOX ARCADE</span>
      </div>
    </div>
  )
}

function ServerRail() {
  return (
    <nav
      className="flex h-full w-[72px] shrink-0 flex-col items-center gap-[8px] overflow-y-auto pb-[176px] pt-[12px] no-scrollbar"
      style={{ backgroundColor: D.rail }}
    >
      {SERVERS.map((s, i) => {
        if (s.kind === 'home') {
          return (
            <RailIcon key={i} active={s.active} tint="#5865f2">
              <img alt="Home" src={discordLogo} className="size-[28px] object-contain" />
            </RailIcon>
          )
        }
        if (s.kind === 'xbox') {
          return (
            <RailIcon key={i} tint="#000">
              <XboxLogo size={30} />
            </RailIcon>
          )
        }
        return (
          <RailIcon key={i} tint={s.color}>
            <span className="text-[17px] font-semibold text-white">{s.label}</span>
          </RailIcon>
        )
      })}
      {/* add + explore */}
      <RailIcon tint={D.raised}>
        <span className="text-[24px] font-light text-[#23a55a]">+</span>
      </RailIcon>
      <RailIcon tint={D.raised}>
        <svg viewBox="0 0 24 24" className="size-[22px] text-[#23a55a]" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.7 6.3-1.9 5.4-5.4 1.9 1.9-5.4 5.4-1.9Z" />
        </svg>
      </RailIcon>
    </nav>
  )
}

// ── Discord DM sidebar ──────────────────────────────────────────────────────
const NAV = [
  { label: 'Friends', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4 0 8 2 8 5v1H4v-1c0-3 4-5 8-5Z" /></svg>
  ) },
  { label: 'Nitro', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h9a5 5 0 0 1 0 10H9v3H4V6Zm5 4v2h4a1 1 0 0 0 0-2H9Z" /></svg>
  ) },
  { label: 'Shop', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 7h14l-1 4H6L5 7Zm1 6h12v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6Z" /><circle cx="8" cy="4.5" r="1.5" /><circle cx="16" cy="4.5" r="1.5" /></svg>
  ) },
  { label: 'Quests', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 5.3 5.5.6-4 3.9 1 5.5-5-2.9-5 2.9 1-5.5-4-3.9 5.5-.6L12 2Z" /></svg>
  ) },
]

// The four test profiles (a/b/c/d), one per tester. `self` is set from the URL.
// Blake / Chloe / Daniel are on Arcade.
const DMS = [
  { name: 'abby', color: AVATAR.green },
  { name: 'blake', color: AVATAR.blue, status: 'Playing Sea of Thieves' },
  { name: 'chloe', color: AVATAR.purple, status: 'Listening to Spotify' },
  { name: 'daniel', color: AVATAR.red, status: 'Streaming Minecraft' },
]

// Friends who don't have Arcade yet — surfaced in the "Not on ARCADE" lists so
// you can gift them access.
const OFF_ARCADE_FRIENDS = [
  { name: 'nelly', color: '#e35d9c' },
  { name: 'peppe', color: '#f2a23c' },
  { name: 'phibi', color: '#3cb2f2' },
  { name: 'cap', color: '#8b5cf6' },
  { name: 'wumpus', color: '#43b581' },
  { name: 'locke', color: '#5165F6' },
  { name: 'clyde', color: '#f04747' },
]

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[42px] w-full items-center gap-[14px] rounded-[6px] px-[10px] text-[16px] transition-colors"
      style={{ color: active ? '#fff' : D.dim, backgroundColor: active ? D.raised : 'transparent' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = D.hover }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span className="flex size-[22px] items-center justify-center">{icon}</span>
      {label}
    </button>
  )
}

function DmRow({ name, color, status, online, active, unread = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[44px] w-full items-center gap-[12px] rounded-[6px] px-[8px] transition-colors"
      style={{ backgroundColor: active ? D.raised : 'transparent' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = D.hover }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <div className="relative shrink-0">
        <Avatar color={color} size={32} />
        <span
          className="absolute -bottom-[2px] -right-[2px] size-[12px] rounded-full"
          style={{ backgroundColor: online ? D.green : '#43454b', border: `3px solid ${D.panel}` }}
        />
      </div>
      <div className="flex min-w-0 flex-col items-start leading-tight">
        <span className="truncate text-[15px] font-semibold" style={{ color: active || unread ? '#fff' : online ? '#fff' : D.text }}>{name}</span>
        {online ? (
          <span className="text-[12px]" style={{ color: D.mute }}>Online</span>
        ) : status ? (
          <span className="truncate text-[12px]" style={{ color: D.mute }}>{status}</span>
        ) : null}
      </div>
      {unread > 0 && (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f23f42] px-[5px] text-[11px] font-bold text-white">{unread}</span>
      )}
    </button>
  )
}

// The Discord voice + user bar. Lives at the bottom-left spanning the server
// rail + sidebar (the whole left column), in #202024.
function VoiceUserPanel() {
  const room = useRoomCtx()
  const names = (room && room.names) || {}
  const ActionBtn = ({ children, active }) => (
    <button className={'flex h-[42px] items-center justify-center rounded-[8px] transition ' + (active ? 'bg-[#248046] text-white hover:brightness-110' : 'bg-[#3a3d41] text-[#c5c6ca] hover:bg-[#43474d]')}>
      {children}
    </button>
  )
  return (
    <div className="rounded-[14px] p-[10px] shadow-[0_8px_28px_rgba(0,0,0,0.45)]" style={{ backgroundColor: '#202024' }}>
      {/* Voice / video connected */}
      <div className="rounded-[10px] p-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-[8px]">
          <div className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-[#3a3d41]">
            <svg viewBox="0 0 24 24" className="size-[18px]" style={{ color: D.green }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8 15.5a6 6 0 0 1 8 0" /><circle cx="12" cy="18.6" r="1.1" fill="currentColor" stroke="none" /></svg>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-bold" style={{ color: D.green }}>Voice Connected</div>
            <div className="truncate text-[12px]" style={{ color: D.dim }}>General · XBOX ARCADE</div>
          </div>
          <button aria-label="Signal" className="flex size-[30px] items-center justify-center rounded-[6px] text-[#c5c6ca] transition hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><rect x="3.5" y="9" width="2.4" height="6" rx="1.2" /><rect x="8" y="5" width="2.4" height="14" rx="1.2" /><rect x="12.6" y="7" width="2.4" height="10" rx="1.2" /><rect x="17.2" y="10" width="2.4" height="4" rx="1.2" /></svg>
          </button>
          <button aria-label="Disconnect" className="flex size-[30px] items-center justify-center rounded-[6px] text-[#c5c6ca] transition hover:bg-[#da373c] hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><path d="M12 7c-5.5 0-10 2-10 4.6 0 .9.4 1.5 1.3 1.7l2.8.6c.7.1 1.3-.3 1.5-1l.3-1.3c1.3-.3 2.7-.5 4.1-.5s2.8.2 4.1.5l.3 1.3c.2.7.8 1.1 1.5 1l2.8-.6c.9-.2 1.3-.8 1.3-1.7C22 9 17.5 7 12 7Z" /></svg>
          </button>
        </div>
        {/* Call action buttons */}
        <div className="mt-[8px] grid grid-cols-4 gap-[6px]">
          <ActionBtn active>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><path d="M4 6h11a2 2 0 0 1 2 2v1.8l4-2.4v9.2l-4-2.4V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /></svg>
          </ActionBtn>
          <ActionBtn>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="11" rx="2" /><path d="M9 20h6M12 16v4M12 8l3 3-3 0v-3Z" fill="currentColor" /></svg>
          </ActionBtn>
          <ActionBtn>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><circle cx="12" cy="5.5" r="2.3" /><circle cx="5.5" cy="12" r="2.3" /><circle cx="18.5" cy="12" r="2.3" /><circle cx="12" cy="18.5" r="2.3" /></svg>
          </ActionBtn>
          <ActionBtn>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><path d="M9 3l1.4 3.4L14 8l-3.6 1.6L9 13l-1.4-3.4L4 8l3.6-1.6L9 3Zm8 7l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1 1-2.2Z" /></svg>
          </ActionBtn>
        </div>
      </div>

      {/* User bar */}
      <div className="mt-[4px] flex h-[52px] items-center gap-[6px] px-[4px]">
        <div className="relative shrink-0">
          <Avatar color={SELF} size={32} />
          <span className="absolute -bottom-[1px] -right-[1px] size-[11px] rounded-full" style={{ backgroundColor: D.green, border: '3px solid #202024' }} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold text-white">{dispName(SELF_NAME, names)}</div>
          <div className="truncate text-[12px]" style={{ color: D.mute }}>Online</div>
        </div>
        <div className="flex items-center gap-[1px]" style={{ color: D.dim }}>
          {/* Mute (with split dropdown) */}
          <button className="flex h-[32px] items-center gap-[1px] rounded-[4px] px-[3px] transition hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="size-[20px]" fill="currentColor"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            <svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {/* Deafen (with split dropdown) */}
          <button className="flex h-[32px] items-center gap-[1px] rounded-[4px] px-[3px] transition hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" stroke="none" /><rect x="17.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" stroke="none" /></svg>
            <svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {/* Settings */}
          <button className="flex size-[32px] items-center justify-center rounded-[4px] transition hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ online = [], onReset, activeDm, onOpenDm, onOpenBlend, onHome, reads = {} }) {
  const inbox = useInbox()
  const room = useRoomCtx()
  const names = (room && room.names) || {}
  const hiddenP = (room && room.hiddenProfiles) || {}
  const pinnedMixes = ((room && room.blends) || []).filter((b) => b.pinned && (b.members || []).includes(SELF))
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1'
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col" style={{ backgroundColor: D.panel }}>
      {/* Search — a 56px row with a bottom border, so its divider lines up
          exactly with the home nav bar's bottom line across the whole top. */}
      <div className="flex h-[56px] shrink-0 items-center border-b px-[8px]" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex h-[36px] w-full items-center rounded-[4px] px-[8px] text-[13px]" style={{ backgroundColor: '#222225', color: D.mute }}>
          Find or start a conversation
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-[8px]">
        <div className="flex flex-col gap-[2px] pt-[2px]">
          {NAV.map((n) => <NavItem key={n.label} icon={n.icon} label={n.label} />)}
          <NavItem
            active={!activeDm}
            onClick={onHome}
            label="XBOX ARCADE"
            icon={<XboxLogo size={20} />}
          />
        </div>

        <div className="my-[10px] h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

        {pinnedMixes.length > 0 && (
          <>
            <div className="px-[8px] pb-[4px]">
              <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>Mixes</span>
            </div>
            <div className="flex flex-col gap-[2px] pb-[6px]">
              {pinnedMixes.map((b) => {
                const thumb = b.cover || mixCoverImages(b)[0]
                return (
                  <button
                    key={b.id}
                    onClick={() => onOpenBlend?.(b.id)}
                    className="group flex items-center gap-[10px] rounded-[6px] px-[8px] py-[6px] text-left transition hover:bg-white/5"
                  >
                    <span className="size-[32px] shrink-0 overflow-hidden rounded-[8px]" style={{ backgroundColor: b.color || '#5765f2' }}>
                      {thumb && <img alt="" src={thumb} className="size-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: D.dim }}>{b.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="my-[10px] h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </>
        )}

        <div className="flex items-center justify-between px-[8px] pb-[4px]">
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>
            Direct Messages
          </span>
          <span className="text-[18px] leading-none" style={{ color: D.mute }}>+</span>
        </div>
        <div className="flex flex-col gap-[2px]">
          {DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name]).map((d) => {
            const { unread } = inbox(d.name, reads[dmConvId(SELF_NAME, d.name)])
            return (
              <DmRow
                key={d.name}
                {...d}
                name={dispName(d.name, names)}
                online
                active={activeDm === d.name}
                unread={activeDm === d.name ? 0 : unread}
                onClick={() => onOpenDm?.(d.name)}
              />
            )
          })}
        </div>
        {isAdmin && (
          <button
            onClick={() => { if (window.confirm('Reset the room to a fresh state for everyone?')) onReset?.() }}
            className="mt-[10px] w-full rounded-[6px] border border-[#4e5058] px-[8px] py-[6px] text-[12px] font-semibold text-[#f0a0a0] transition hover:bg-[#4e5058]/30"
          >
            Reset room (moderator)
          </button>
        )}
      </div>

      {/* Spacer so the DM list clears the floating voice/user panel. */}
      <div className="h-[168px] shrink-0" />
    </aside>
  )
}

// ── Xbox content: card data ─────────────────────────────────────────────────
const details = {
  seaOfThieves: { title: 'Sea of Thieves', developer: 'Rare', genre: 'adventure', gpPrice: '$14.99', playtime: '~2hrs', age: '13+', descriptors: 'Violence, Crude Humor, Use of Alcohol', ratings: [ { pct: '85%', line1: 'of all', line2: '2.2M votes' }, { pct: '79%', line1: 'of who played', line2: 'Minecraft', line2Bold: true } ] },
  minecraft: { title: 'Minecraft', developer: 'Mojang Studios', genre: 'sandbox', gpPrice: '$9.99', playtime: '~3hrs', age: '10+', descriptors: 'Fantasy Violence', ratings: [ { pct: '96%', line1: 'of all', line2: '4.2M votes' }, { pct: '88%', line1: 'of who played', line2: 'Roblox', line2Bold: true } ] },
  lol: { title: 'League of Legends', developer: 'Riot Games', genre: 'MOBA', gpPrice: '$9.99', playtime: '~1hr', age: '13+', descriptors: 'Fantasy Violence, Mild Blood', ratings: [ { pct: '82%', line1: 'of all', line2: '3.1M votes' }, { pct: '75%', line1: 'of who played', line2: 'Valorant', line2Bold: true } ] },
  humanFallFlat: { title: 'Human: Fall Flat', developer: 'No Brakes Games', genre: 'puzzle platformer', gpPrice: '$9.99', playtime: '~1hr', age: '7+', descriptors: 'Comic Mischief', ratings: [ { pct: '89%', line1: 'of all', line2: '520K votes' }, { pct: '84%', line1: 'of who played', line2: 'Fall Guys', line2Bold: true } ] },
  grounded: { title: 'Grounded', developer: 'Obsidian', genre: 'survival', gpPrice: '$14.99', playtime: '~2hrs', age: '10+', descriptors: 'Fantasy Violence, Mild Language', ratings: [ { pct: '87%', line1: 'of all', line2: '430K votes' }, { pct: '80%', line1: 'of who played', line2: 'Minecraft', line2Bold: true } ] },
  overcooked: { title: 'Overcooked! 2', developer: 'Team17', genre: 'co-op', gpPrice: '$14.99', playtime: '~1hr', age: '7+', descriptors: 'Comic Mischief', ratings: [ { pct: '92%', line1: 'of all', line2: '880K votes' }, { pct: '86%', line1: 'of who played', line2: 'Gang Beasts', line2Bold: true } ] },
  monsterHunter: { title: 'Monster Hunter Rise', developer: 'Capcom', genre: 'action RPG', gpPrice: '$24.99', playtime: '~3hrs', age: '13+', descriptors: 'Blood, Violence', ratings: [ { pct: '90%', line1: 'of all', line2: '1.1M votes' }, { pct: '83%', line1: 'of who played', line2: 'Wild Hearts', line2Bold: true } ] },
  gangBeasts: { title: 'Gang Beasts', developer: 'Boneloaf', genre: 'party brawler', gpPrice: '$9.99', playtime: '~1hr', age: '7+', descriptors: 'Cartoon Violence, Comic Mischief', ratings: [ { pct: '88%', line1: 'of all', line2: '420K votes' }, { pct: '80%', line1: 'of who played', line2: 'Fall Guys', line2Bold: true } ] },
  wildHearts: { title: 'Wild Hearts', developer: 'Omega Force', genre: 'action RPG', gpPrice: '$24.99', playtime: '~3hrs', age: '13+', descriptors: 'Violence, Blood', ratings: [ { pct: '77%', line1: 'of all', line2: '210K votes' }, { pct: '72%', line1: 'of who played', line2: 'Monster Hunter', line2Bold: true } ] },
  minecraftDungeons: { title: 'Minecraft Dungeons', developer: 'Mojang Studios', genre: 'dungeon crawler', gpPrice: '$9.99', playtime: '~2hrs', age: '10+', descriptors: 'Fantasy Violence', ratings: [ { pct: '81%', line1: 'of all', line2: '640K votes' }, { pct: '90%', line1: 'of who played', line2: 'Minecraft', line2Bold: true } ] },
}

const shelfToday = [
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves, owners: [AVATAR.blue, AVATAR.green, AVATAR.purple] },
  { featured: true, avatars: [AVATAR.purple], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red] },
  { avatars: [AVATAR.green], label: 'PLAYlisted this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol, free: true, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red] },
  { avatars: [AVATAR.red, AVATAR.purple], label: 'played this for 4 hours', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red], shared: true },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, owners: [AVATAR.green, AVATAR.purple] },
]

const shelfFriends = [
  { avatars: [AVATAR.green], label: 'PLAYlisted this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, owners: [AVATAR.green, AVATAR.red] },
  { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: details.monsterHunter, owners: [AVATAR.blue, AVATAR.red], shared: true },
  { avatars: [AVATAR.red], label: 'PLAYlisted this game', players: '1-8', image: heroGangBeasts, video: { youTubeId: 'Lm3HDdLufmA', poster: heroGangBeasts }, details: details.gangBeasts, owners: [AVATAR.purple, AVATAR.red] },
  { avatars: [AVATAR.purple], label: 'PLAYlisted this game', players: '1-4', image: heroWildHearts, video: { youTubeId: '8vw9PlFrrOk', poster: heroWildHearts }, details: details.wildHearts, owners: [AVATAR.blue] },
  { avatars: [AVATAR.red], label: 'recommends this game', players: '1-4', image: heroMinecraftDungeons, video: { youTubeId: 'TxNH6bapa3A', poster: heroMinecraftDungeons }, details: details.minecraftDungeons, owners: [AVATAR.red, AVATAR.purple] },
]

const shelfMore = [
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves },
  { avatars: [AVATAR.purple], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft },
  { avatars: [AVATAR.green], label: 'PLAYlisted this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol },
  { avatars: [AVATAR.red], label: 'PLAYlisted this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded },
]

// Friend colors → display names (green is always the user).
const NAME = { [AVATAR.green]: 'abby', [AVATAR.blue]: 'blake', [AVATAR.purple]: 'chloe', [AVATAR.red]: 'daniel' }

// Game catalog for the blend pages — cover art + a short caption. Reuses the
// card `details` above for title/developer/genre/playtime.
const CATALOG = {
  seaOfThieves: { image: heroSeaOfThieves, ...details.seaOfThieves, players: '1-4', caption: 'Sailing takes three pairs of hands — and the best water in games.' },
  minecraft: { image: heroMinecraft, ...details.minecraft, players: '1+', caption: 'The one everybody already owns. Endless shared builds.' },
  overcooked: { image: heroOvercooked, ...details.overcooked, players: '1-4', caption: 'Short, loud, no homework — the right call when someone shows up late.' },
  humanFallFlat: { image: heroHumanFallFlat, ...details.humanFallFlat, players: '1-8', caption: 'Floppy physics puzzles with no skill floor at all.' },
  grounded: { image: heroGrounded, ...details.grounded, players: '1-4', caption: 'Backyard survival with a gentle threat level and a lot of building.' },
  monsterHunter: { image: heroMonsterHunter, ...details.monsterHunter, players: '1-4', caption: 'Big hunts, clear roles — the competent night out.' },
  gangBeasts: { image: heroGangBeasts, ...details.gangBeasts, players: '1-8', caption: 'Party-brawler chaos. Good when a night needs to end laughing.' },
  wildHearts: { image: heroWildHearts, ...details.wildHearts, players: '1-3', caption: 'Monster hunting with a building twist.' },
  minecraftDungeons: { image: heroMinecraftDungeons, ...details.minecraftDungeons, players: '1-4', caption: 'A breezy dungeon crawl for the whole group.' },
  lol: { image: heroLol, ...details.lol, players: '1-5', caption: 'Free to play, and the Overwatch muscle memory carries straight over.' },
  ac: { image: heroAc, title: "Assassin's Creed Black Flag", developer: 'Ubisoft', genre: 'action', playtime: '~2hrs', players: '1-6', caption: 'Open seas and stealth for the long solo hours.' },
  forHonor: { image: heroForHonor, title: 'For Honor', developer: 'Ubisoft', genre: 'fighting', playtime: '~2hrs', players: '1-4', caption: 'Melee dueling with a real skill ceiling.' },
}

// Game title → catalog key (the wishlist stores keys; cards pass titles).
const KEY_OF_TITLE = Object.fromEntries(Object.entries(CATALOG).map(([k, v]) => [v.title, k]))
// Colors cycled for newly created blends.
const BLEND_COLORS = ['#5765f2', '#e67e22', '#16a085', '#c0392b', '#8e44ad', '#2980b9', '#d64b7e', '#27ae60']

// Hover trailers per game.
const VIDEOS = {
  seaOfThieves: 'QntMfX3FkZQ', minecraft: '-1Sy6iz43vg', overcooked: 'uKLb8D36YKk',
  humanFallFlat: 'maiYKaZNG7Y', grounded: 'zBD-GS61Gto', monsterHunter: 'O0tc1ODHma8',
  gangBeasts: 'Lm3HDdLufmA', wildHearts: '8vw9PlFrrOk', minecraftDungeons: 'TxNH6bapa3A', lol: 'p4QG59y6FGE',
}
const ALL_COLORS = [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red]
const capName = (s) => s.charAt(0).toUpperCase() + s.slice(1)
// Display name for an identity key, honoring the moderator's name overrides.
const dispName = (key, names) => (key && names && names[key]) || (key ? capName(key) : '')
// Hook: the shared name-override map from the room context.
function useNames() {
  const room = useRoomCtx()
  return (room && room.names) || {}
}
// Hook: the shared hidden-profiles map from the room context.
function useHidden() {
  const room = useRoomCtx()
  return (room && room.hiddenProfiles) || {}
}

// ── Direct-message sync ─────────────────────────────────────────────────────
// A conversation is keyed by the sorted pair of tester names, so both people
// compute the same Firebase path and see the same thread. Each message is a
// separate leaf keyed by a generated id, so two people appending at once never
// clobber each other — and accept/decline just rewrites the same invite leaf.
const dmConvId = (a, b) => [a, b].sort().join('__')
const newMsgId = () => `${Date.now().toString(36)}-${SELF_NAME}-${Math.random().toString(36).slice(2, 7)}`

// Write (or overwrite) a single message leaf in the DM between me and `other`.
// Returns the id so callers can update the same message later.
function putDM(other, msg) {
  const id = msg.id || newMsgId()
  writeRoomPath(`dms/${dmConvId(SELF_NAME, other)}/${id}`, { ...msg, id })
  return id
}

// Subscribe to the thread with `other`; returns messages oldest→newest.
function useDM(other) {
  const [obj] = useRoomNode(other ? `dms/${dmConvId(SELF_NAME, other)}` : 'dms/__none', {})
  const msgs = obj && typeof obj === 'object' ? Object.values(obj) : []
  return msgs.filter(Boolean).sort((a, b) => (a.ts || 0) - (b.ts || 0))
}

// Everyone's threads, so the sidebar can show unread dots + last-message peeks
// for each friend I have a conversation with.
function useInbox() {
  const [all] = useRoomNode('dms', {})
  const convs = all && typeof all === 'object' ? all : {}
  // name → { last, unreadFromOther } computed against my read marks in state.
  return (friendName, lastReadTs) => {
    const conv = convs[dmConvId(SELF_NAME, friendName)]
    const list = conv && typeof conv === 'object' ? Object.values(conv).filter(Boolean) : []
    if (!list.length) return { last: null, unread: 0 }
    list.sort((a, b) => (a.ts || 0) - (b.ts || 0))
    const unread = list.filter((m) => m.from !== SELF_NAME && (m.ts || 0) > (lastReadTs || 0)).length
    return { last: list[list.length - 1], unread }
  }
}
// Social proof from the OTHER testers (never the viewer), varied per card.
function socialProof(i) {
  const others = ALL_COLORS.filter((c) => c !== SELF)
  const who = others[i % others.length]
  const name = capName(NAME[who])
  const hours = [5, 3, 8, 4, 6][i % 5]
  const variants = [
    { avatars: [who], label: `${name} recommends this` },
    { avatars: [who], label: `${name} played this for ${hours} hours` },
    { avatars: [who], label: `${name} PLAYlisted this game` },
  ]
  return variants[i % variants.length]
}
// Build a rec-card prop object from a catalog key (uses full `details` for the
// expanded read). `i` varies the social proof; `extra` adds e.g. steam.
function mkCard(key, i = 0, extra) {
  const sp = socialProof(i)
  return {
    avatars: sp.avatars,
    label: sp.label,
    players: CATALOG[key].players,
    image: CATALOG[key].image,
    video: VIDEOS[key] ? { youTubeId: VIDEOS[key], poster: CATALOG[key].image } : undefined,
    details: details[key],
    ...extra,
  }
}

// Per-profile taste → different recommendation lists for each tester. Rows keep
// the four hover styles (expand / overlay / steam flyout / always-expanded).
const RECS = {
  abby: {
    rows: [
      { mode: 'overlay', title: 'You’d rather build than sleep', subtitle: 'Cozy craft-and-survive worlds, sized to your sessions.', games: ['grounded', 'gp_astroneer', 'gp_stardewvalley', 'gp_medievaldynasty', 'gp_snowrunner'] },
    ],
  },
  blake: {
    rows: [
      { mode: 'overlay', title: 'One more night, one more base', subtitle: 'Craft-and-survive loops your hours say you can’t quit.', games: ['grounded', 'gp_stateofdecay2', 'gp_dayz', 'gp_medievaldynasty', 'gp_powerwashsimulator'] },
    ],
  },
  chloe: {
    rows: [
      { mode: 'overlay', title: 'Certified sweat, respectfully', subtitle: 'Combat-heavy picks to keep your reflexes honest.', games: ['gp_doometernal', 'gp_hades', 'gp_deeprockgalactic', 'gp_warhammer40000darktide', 'gp_chivalry2'] },
    ],
  },
  daniel: {
    rows: [
      { mode: 'overlay', title: 'Here for the beautiful chaos', subtitle: 'Loud, silly nights that end with everyone yelling.', games: ['humanFallFlat', 'gangBeasts', 'overcooked', 'gp_amongus', 'gp_golfwithyourfriends'] },
    ],
  },
}

// ── Two extra "For you" rows in bespoke styles (Figma 622:2733/2755 + 620:2460).
// Both reuse the game CATALOG for covers/metadata and VIDEOS for trailers, so
// this stays a self-contained layout/animation mock.
const CINEMATIC_ROW = [
  { key: 'seaOfThieves', avatars: [AVATAR.blue, AVATAR.green], label: 'PLAYlisted this game' },
  { key: 'monsterHunter', avatars: [AVATAR.blue], label: 'recommends this game' },
  { key: 'grounded', avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours' },
  { key: 'humanFallFlat', avatars: [AVATAR.red, AVATAR.purple], label: 'played this for 4 hours' },
  { key: 'minecraft', avatars: [AVATAR.green], label: 'recommends this game' },
  { key: 'gangBeasts', avatars: [AVATAR.red], label: 'PLAYlisted this game' },
].map(({ key, avatars, label }) => {
  const g = CATALOG[key]
  return {
    id: key, avatars, label,
    image: g.image,
    video: VIDEOS[key] ? { youTubeId: VIDEOS[key], poster: g.image } : undefined,
    players: g.players, playtime: g.playtime, genre: g.genre,
    title: g.title,
  }
})

const PORTRAIT_ROW = [
  { key: 'minecraft', released: 'Released on Nov 18, 2011', recommend: 'Highly recommended game', multiplayer: 'Online multiplayer (1+)', tags: ['Sandbox', 'Survival', 'Everyone 10+'] },
  { key: 'seaOfThieves', released: 'Released on Jun 3, 2020', recommend: 'A hit with your crew', multiplayer: 'Online co-op (1-4)', tags: ['Adventure', 'Pirates', 'Teen 13+'] },
  { key: 'monsterHunter', released: 'Released on Jan 12, 2022', recommend: 'Highly recommended game', multiplayer: 'Online co-op (1-4)', tags: ['Action RPG', 'Hunting', 'Teen 13+'] },
  { key: 'grounded', released: 'Released on Sep 27, 2022', recommend: 'Popular in your Mixes', multiplayer: 'Online co-op (1-4)', tags: ['Survival', 'Crafting', 'Everyone 10+'] },
  { key: 'overcooked', released: 'Released on Aug 7, 2018', recommend: 'Great for a full lobby', multiplayer: 'Local + online (1-4)', tags: ['Co-op', 'Party', 'Everyone 7+'] },
  { key: 'forHonor', released: 'Released on Feb 14, 2017', recommend: 'Highly recommended game', multiplayer: 'Online multiplayer (1-4)', tags: ['Fighting', 'Melee', 'Mature 17+'] },
].map(({ key, released, recommend, multiplayer, tags }) => {
  const g = CATALOG[key]
  return {
    id: key, released, recommend, multiplayer, tags,
    image: g.image, title: g.title, publisher: g.developer, description: g.caption,
  }
})

// "Your Blends" — colored playlist cards (palette from the Figma landing frame).
// Green (the user, sauhee) is a member of every blend.
// abby=green, blake=blue, chloe=purple, daniel=red. Each person is in exactly
// two of these, so everyone sees two groups: the all-four group + their pair.
const BLENDS = [
  { name: 'The Squad', color: '#5765f2', when: 'Fri 8pm', members: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red],
    games: ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'monsterHunter'] },
  { name: 'Abby & Blake', color: '#34a172', when: 'weeknights', members: [AVATAR.green, AVATAR.blue],
    games: ['seaOfThieves', 'grounded', 'monsterHunter', 'wildHearts', 'forHonor', 'minecraft'] },
  { name: 'Chloe & Daniel', color: '#d64b7e', when: 'weekends', members: [AVATAR.purple, AVATAR.red],
    games: ['overcooked', 'humanFallFlat', 'gangBeasts', 'minecraftDungeons', 'lol', 'ac'] },
]

// The seed the shared room is initialized with — each blend gets a stable id and
// an initial wishlist order (the shared, drag-rankable list).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
// Start with no premade Mixes — everyone builds their own.
const SEED_BLENDS = []

// A Mix's "party" is its set of people (members + invited), order-independent.
// Two Mixes with the same party are duplicates — we block creating those.
const partyKey = (colors) => [...new Set((colors || []).filter(Boolean))].sort().join(',')
const findDuplicateMix = (blends, colors) => {
  const key = partyKey(colors)
  return (blends || []).find((b) => partyKey([...(b.members || []), ...(b.invited || [])]) === key) || null
}

// Preference tags per game — the decision page matches the group's stated
// preferences against these to rank and filter the blend's games.
const GAME_TAGS = {
  seaOfThieves: ['co-op', 'chill', 'adventure'],
  minecraft: ['cartoonish', 'chill', 'co-op', 'building'],
  overcooked: ['co-op', 'cartoonish', 'short', 'party', 'small-group'],
  humanFallFlat: ['co-op', 'cartoonish', 'party', 'short'],
  grounded: ['co-op', 'survival', 'chill', 'building', 'small-group'],
  monsterHunter: ['co-op', 'competitive', 'small-group'],
  gangBeasts: ['cartoonish', 'party', 'short'],
  wildHearts: ['co-op', 'competitive', 'survival', 'small-group'],
  minecraftDungeons: ['cartoonish', 'co-op', 'chill', 'short', 'small-group'],
  lol: ['competitive', 'free'],
  ac: ['chill', 'adventure'],
  forHonor: ['competitive', 'small-group'],
}

// Tappable preference suggestions shown in the modal. `tag` is what a pick
// matches against GAME_TAGS; `label` is the human phrasing.
const PREF_SUGGESTIONS = [
  { label: 'only 1-3 players', tag: 'small-group' },
  { label: 'friendslop game', tag: 'co-op' },
  { label: 'cartoonish', tag: 'cartoonish' },
  { label: 'party game', tag: 'party' },
  { label: 'short session', tag: 'short' },
  { label: 'chill vibes', tag: 'chill' },
  { label: 'competitive', tag: 'competitive' },
  { label: 'survival', tag: 'survival' },
  { label: 'free to play', tag: 'free' },
]

// Best-effort map a free-typed preference to a matchable tag.
function guessTag(label) {
  const s = label.toLowerCase()
  const hit = PREF_SUGGESTIONS.find((p) => s.includes(p.tag) || s.includes(p.label.toLowerCase()))
  if (hit) return hit.tag
  if (/\b1-3|three|small|solo|duo\b/.test(s)) return 'small-group'
  if (/co.?op|friend|together/.test(s)) return 'co-op'
  if (/cartoon|cute|silly/.test(s)) return 'cartoonish'
  if (/quick|fast|short/.test(s)) return 'short'
  if (/chill|cozy|relax/.test(s)) return 'chill'
  if (/free/.test(s)) return 'free'
  return null
}

// Deterministic shuffle so a given seed always yields the same order — used to
// give each Mix a distinct-looking cover collage that stays stable per Mix.
const COLLAGE_POOL = Object.keys(CATALOG).filter((k) => CATALOG[k]?.image)
function seededShuffle(arr, seedStr) {
  const a = [...arr]
  let seed = 2166136261
  const s = String(seedStr || '')
  for (let i = 0; i < s.length; i++) { seed ^= s.charCodeAt(i); seed = Math.imul(seed, 16777619) >>> 0 }
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

// The 4 collage images for a Mix — a distinct set seeded by the Mix's id so the
// thumbnail is consistent everywhere the Mix is shown (home, Mixes page, detail).
function mixCoverImages({ id, name, games = [] }) {
  const own = (games || []).filter((k) => CATALOG[k]?.image)
  return seededShuffle(own.length >= 4 ? own : COLLAGE_POOL, id || name).slice(0, 4).map((k) => CATALOG[k].image)
}

function BlendCard({ id, name, color, members, games = [], cover, onOpen, onContext, onMenu }) {
  // Cover art: a custom thumbnail if one's been set, otherwise a 2×2 collage.
  const covers = mixCoverImages({ id, name, games })
  // The hover ellipsis opens the same menu as right-click, anchored to itself.
  const openMenu = (e) => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); onMenu?.(r.left, r.bottom + 4) }
  return (
    <div className="group flex w-[160px] shrink-0 flex-col text-left">
      <button onClick={onOpen} onContextMenu={onContext} className="block w-full text-left">
        <div
          className="size-[160px] overflow-hidden rounded-[20px] transition-[translate] duration-200 group-hover:-translate-y-[3px]"
          style={{ backgroundColor: color }}
        >
          {cover ? (
            <img alt="" src={cover} className="size-full object-cover" />
          ) : covers.length ? (
            <div className="grid size-full grid-cols-2 grid-rows-2 gap-[2px]">
              {covers.map((src, i) => <img key={i} alt="" src={src} className="size-full object-cover" />)}
            </div>
          ) : null}
        </div>
      </button>
      <div className="mt-[10px] flex items-center gap-[6px]">
        <button onClick={onOpen} onContextMenu={onContext} className="min-w-0 flex-1 truncate text-left text-[16px] font-semibold text-white">{name}</button>
        {onMenu && (
          <button
            onClick={openMenu}
            aria-label={`${name} options`}
            className="flex size-[24px] shrink-0 items-center justify-center rounded-[6px] text-[#b5bac1] opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        )}
      </div>
      {/* Member profile images — up to 5, then a "+N" for the rest. */}
      <div className="mt-[8px] flex items-center">
        {members.slice(0, 5).map((c, i) => (
          <Avatar key={i} color={c} size={20} style={{ marginLeft: i ? -6 : 0, boxShadow: '0 0 0 2px #0c0c0e', zIndex: members.length - i }} />
        ))}
        {members.length > 5 && (
          <span
            className="ml-[4px] flex h-[20px] items-center justify-center rounded-full bg-white/12 px-[6px] text-[11px] font-semibold leading-none text-white"
            style={{ boxShadow: '0 0 0 2px #0c0c0e' }}
          >
            +{members.length - 5}
          </span>
        )}
      </div>
    </div>
  )
}

// The blurple "create" card that leads the Blends row (Figma 550:979).
function CreateBlendCard({ onClick }) {
  return (
    <button onClick={onClick} className="group flex w-[160px] shrink-0 flex-col text-left">
      <div className="flex size-[160px] items-center justify-center rounded-[20px] bg-[#5765f2] transition-[translate] duration-200 group-hover:-translate-y-[3px]">
        <svg viewBox="0 0 24 24" className="size-[40px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <p className="mt-[10px] text-[16px] font-semibold text-white">Create a new Mix</p>
    </button>
  )
}

function SectionHeading({ children, size = 34 }) {
  return <p className="font-semibold tracking-tight text-white" style={{ fontSize: size }}>{children}</p>
}

// "Discovered for You" cinematic banner (Figma 863:3729). Full-width rounded
// panel: a blurred, stretched copy of the art fills the width, the sharp art is
// anchored to the right and masked so it melts into the blur, and the heading
// sits on the left over a left-to-right darkening scrim.
function DiscoveredBanner() {
  const CARD_H = 152 // the rounded card
  const STICK = 84 // how far the art rises above the card's top edge
  return (
    <section className="mt-[52px]">
      {/* Wrapper is taller than the card and NOT clipped, so the art can poke
          out above the card's top edge (Figma 882:4613). */}
      <div className="relative w-full" style={{ height: CARD_H + STICK }}>
        {/* The card: a blurred copy of the scene + a left-to-right scrim, clipped
            to the rounded rectangle. */}
        <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-[16px] bg-[#0a0f16]" style={{ height: CARD_H }}>
          <img alt="" src={discoveredHalo} className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-[16px]" style={{ objectPosition: 'center 45%' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6,10,14,0.9) 0%, rgba(6,10,14,0.5) 26%, rgba(6,10,14,0.05) 56%)' }} />
        </div>
        {/* Sharp scene on the right — bottom flush with the card, top rising past
            it so the helmet sticks out. Faded on the left into the scrim. */}
        <img
          alt=""
          src={discoveredHalo}
          className="pointer-events-none absolute bottom-0 left-[16%] w-[74%] object-cover object-top"
          style={{ height: CARD_H + STICK, maskImage: 'linear-gradient(to right, transparent, black 30%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }}
        />
        {/* Heading, aligned to the card (not the taller wrapper). */}
        <div className="absolute inset-x-0 bottom-0 flex items-center pl-[36px]" style={{ height: CARD_H }}>
          <h2
            className="text-[clamp(32px,3.6vw,56px)] uppercase tracking-[0.02em] text-white [text-shadow:0_4px_4px_rgba(0,0,0,0.85)]"
            style={{ fontFamily: '"Base Neue Cond Bold"' }}
          >
            Discovered for You
          </h2>
        </div>
      </div>
    </section>
  )
}

// ── Xbox content area ───────────────────────────────────────────────────────
// Steam-style row — the original game cards with a Steam detail flyout on hover.
const STEAM_ROW = [
  { avatars: [AVATAR.green], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft, steam: { released: 'Nov 18, 2011', desc: 'Build, explore and survive in an infinite world of blocks — solo or with friends. Mine deep, craft anything, and make the world your own.', review: 'Overwhelmingly Positive', reviews: '2.4M', tags: ['Sandbox', 'Survival', 'Building', 'Multiplayer'] } },
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves, steam: { released: 'Jun 3, 2020', desc: 'A shared-world pirate adventure — sail, fight and hunt treasure with your crew across an open ocean full of other real players.', review: 'Very Positive', reviews: '312K', tags: ['Adventure', 'Open World', 'Pirates', 'Co-op'] } },
  { avatars: [AVATAR.red], label: 'PLAYlisted this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, steam: { released: 'Aug 7, 2018', desc: 'Chaotic co-op cooking across wobbling, falling-apart kitchens. Chop, cook and serve before the timer runs out.', review: 'Very Positive', reviews: '58K', tags: ['Co-op', 'Party', 'Casual', 'Local Multiplayer'] } },
  { avatars: [AVATAR.purple], label: 'recommends this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, steam: { released: 'Jul 22, 2016', desc: 'Floppy physics puzzles in surreal dreamscapes. No skill floor at all, endless slapstick, and better with friends.', review: 'Overwhelmingly Positive', reviews: '180K', tags: ['Puzzle', 'Physics', 'Co-op', 'Funny'] } },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, steam: { released: 'Sep 27, 2022', desc: 'Shrunk to the size of an ant, survive the backyard: build bases, brew gear and fight off giant bugs with friends.', review: 'Very Positive', reviews: '96K', tags: ['Survival', 'Co-op', 'Crafting', 'Adventure'] } },
  { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: details.monsterHunter, steam: { released: 'Jan 12, 2022', desc: 'Hunt colossal monsters, craft mighty gear, and chain fluid aerial combat with the new Wirebug.', review: 'Very Positive', reviews: '110K', tags: ['Action RPG', 'Co-op', 'Hunting', 'Multiplayer'] } },
]

// Row display order (by hover style): overlay → expanded → steam → expand.
const ROW_ORDER = { overlay: 0, expanded: 1, steam: 2, expand: 3 }

// Nav "Gift Xbox Arcade" pill — modeled on Discord's "Gift Nitro" button.
// Self-contained: clicking it opens the "Gift ARCADE" picker (friends not on
// Arcade), so it works the same in every page header.
function GiftArcadeButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[9px] rounded-[8px] bg-black/35 px-[14px] py-[8px] text-[14px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0">
          <path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" />
        </svg>
        <span className="leading-none">Gift ARCADE</span>
      </button>
      {open && <GiftArcadeModal onClose={() => setOpen(false)} />}
    </>
  )
}

// Top-bar entry to the spin wheel — its own module now, not tied to a Mix.
// Sits just left of the Gift ARCADE button on every page's nav. A green dot
// shows when a wheel jam is live on the call.
function WheelNavButton() {
  const { openWheel, wheelLive } = useContext(NavCtx)
  return (
    <button
      onClick={openWheel}
      title={wheelLive ? 'A wheel jam is live on the call' : 'Spin the wheel'}
      className="relative flex items-center gap-[9px] rounded-[8px] bg-black/35 px-[14px] py-[8px] text-[14px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/50"
    >
      {wheelLive && (
        <span className="absolute -right-[3px] -top-[3px] flex size-[10px]">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3dbf1e] opacity-75" />
          <span className="relative inline-flex size-[10px] rounded-full bg-[#3dbf1e] ring-2 ring-[#0c0c0e]" />
        </span>
      )}
      <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-[#3fbf3f]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" />
        <path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" />
        <path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" />
      </svg>
      <span className="leading-none">Wheel</span>
    </button>
  )
}

function Content({ onOpenBlend, onCreateBlend, onWishlist, onShare, onOpen, onWhosOn, onMixes, onLibrary }) {
  const { blends, setBlends } = useRoomCtx()
  const recs = RECS[SELF_NAME] || RECS.abby

  // Right-click menu for the Mix cards (same editor as the Mix page).
  const [mixMenu, setMixMenu] = useState(null) // { x, y, blend }
  const [coverFor, setCoverFor] = useState(null)
  const [renameFor, setRenameFor] = useState(null)
  const [inviteFor, setInviteFor] = useState(null)
  const patchMix = (b, patch) => setBlends(blends.map((x) => (x.id === b.id ? { ...x, ...patch } : x)))
  const openMixMenu = (e, b) => { e.preventDefault(); e.stopPropagation(); setMixMenu({ x: e.clientX, y: e.clientY, blend: b }) }
  const leaveMixCard = (b) => { if (window.confirm(`Leave ${b.name}?`)) patchMix(b, { members: b.members.filter((c) => c !== SELF) }) }
  const deleteMix = (b) => { if (window.confirm(`Delete ${b.name}? This removes it for everyone.`)) setBlends(blends.filter((x) => x.id !== b.id)) }
  const togglePin = (b) => patchMix(b, { pinned: !b.pinned })
  const [searchOpen, setSearchOpen] = useState(false)
  const orderedRows = [...recs.rows].sort((a, b) => (ROW_ORDER[a.mode] ?? 9) - (ROW_ORDER[b.mode] ?? 9))

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // The home menus/modals + the hovered card live only in this component's
  // local state, so a moderator watching the mirror can't see them. Publish
  // them to this participant's spectate path; a spectate instance reads them
  // back and renders the same overlays.
  const [hover, setHover] = useState(null) // game title of the card under the pointer
  const [cUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/contentUI` : 'spectate/__nocui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/contentUI`, {
      mixMenu: mixMenu ? { x: mixMenu.x, y: mixMenu.y, blendId: mixMenu.blend.id } : null,
      coverForId: coverFor?.id || null,
      renameForId: renameFor?.id || null,
      inviteForId: inviteFor?.id || null,
      searchOpen: !!searchOpen,
      hover: hover || null,
    })
  }, [mixMenu, coverFor, renameFor, inviteFor, searchOpen, hover])
  const bybid = (id) => blends.find((b) => b.id === id) || null
  const eMixMenu = IS_SPECTATE ? (cUI?.mixMenu ? { x: cUI.mixMenu.x, y: cUI.mixMenu.y, blend: bybid(cUI.mixMenu.blendId) } : null) : mixMenu
  const eCoverFor = IS_SPECTATE ? bybid(cUI?.coverForId) : coverFor
  const eRenameFor = IS_SPECTATE ? bybid(cUI?.renameForId) : renameFor
  const eInviteFor = IS_SPECTATE ? bybid(cUI?.inviteForId) : inviteFor
  const eSearchOpen = IS_SPECTATE ? !!cUI?.searchOpen : searchOpen
  const eHover = IS_SPECTATE ? (cUI?.hover ?? null) : hover

  // Hero background video: parallax (scrolls slower than the title/info that sit
  // on the page) + a 1.5s ease-in/out fade at each loop's start and end so the
  // loop seam is invisible.
  const scrollRef = useRef(null)
  const videoRef = useRef(null)
  useEffect(() => {
    const sc = scrollRef.current
    const v = videoRef.current
    if (v) v.style.opacity = '0' // fade in on first play
    if (!sc) return
    const onScroll = () => {
      if (videoRef.current) videoRef.current.style.transform = `translate3d(0, ${sc.scrollTop * 0.35}px, 0)`
    }
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => sc.removeEventListener('scroll', onScroll)
  }, [])
  // The CSS transition supplies the 1.5s ease; we just flip opacity at the edges.
  const onVideoTime = (e) => {
    const v = e.currentTarget
    if (!v.duration) return
    v.style.opacity = v.currentTime >= v.duration - 1.5 ? '0' : '1'
  }

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      {/* Top nav — layered blur over the hero video (Figma 882:4898). The blur
          lives on its own masked layer so it fades out toward the bottom while
          the nav content stays crisp. */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-[56px] shrink-0 items-center gap-[32px] px-[40px]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-black/25 backdrop-blur-md" />
        {/* Discord-style thin divider under the nav */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
        <XboxLogo size={24} />
        <button className="flex h-[56px] items-center border-b-2 border-white text-[16px] font-medium text-white">Home</button>
        <button onClick={onLibrary} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Library</button>
        <button onClick={onMixes} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Mixes</button>
        <div className="flex flex-1 items-center justify-end gap-[20px]">
          <WheelNavButton />
          <GiftArcadeButton onClick={() => setSearchOpen(true)} />
        </div>
      </header>

      {/* Scrollable landing */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-y-auto pb-[80px]"
        onMouseOver={IS_LIVE ? (e) => { const el = e.target.closest?.('[data-game]'); setHover(el ? el.getAttribute('data-game') : null) } : undefined}
        onMouseLeave={IS_LIVE ? () => setHover(null) : undefined}
      >
        {/* Hero + Mixes over the full-bleed background video (Figma 863:3726) */}
        <section className="relative overflow-hidden">
          <video
            ref={videoRef}
            onTimeUpdate={onVideoTime}
            className="pointer-events-none absolute left-0 top-0 h-[135%] w-full object-cover will-change-transform"
            style={{ transition: 'opacity 1.5s ease-in-out' }}
            src="/PartyHome.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Darken the footage and fade it into the page background at the bottom */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.35) 0%, rgba(12,12,14,0.55) 55%, #0c0c0e 100%)' }}
          />
          <div className="relative mx-auto w-full max-w-[1400px] px-[40px] pb-[8px] pt-[24px]">
            {/* Hero title — upper-center of the first screen, with the Mixes list
                peeking out below it (Figma 863:3749) */}
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <h1 className="flex flex-col items-center gap-[8px] italic leading-[1.085] text-white [text-shadow:0_4px_18px_rgba(0,0,0,0.55)]">
                <span className="text-[clamp(30px,3.4vw,48px)] leading-[1.085] tracking-[0.24px]" style={{ fontFamily: '"Base Neue Cond ExtBd"' }}>Welcome to</span>
                <span className="text-[clamp(58px,6.8vw,96px)] uppercase leading-[1.085] tracking-[0.48px]" style={{ fontFamily: '"Base Neue Black"' }}>XBOX ARCADE</span>
              </h1>
              <p className="mt-[16px] max-w-[560px] text-[18px] leading-snug text-[#e7e7e7]">
                Discover and play a curated collection of Xbox Game Pass titles through the cloud, right inside Discord.
              </p>
              {/* "See who's on PARTY" — opens the friends popup */}
              <button
                onClick={onWhosOn}
                className="mt-[22px] flex items-center gap-[12px] rounded-full border border-white/10 bg-black/30 px-[18px] py-[8px] backdrop-blur-sm transition hover:border-white/25 hover:bg-black/45"
              >
                <div className="flex items-center">
                  {[AVATAR.blue, AVATAR.purple, AVATAR.green].map((c, i) => (
                    <Avatar key={i} color={c} size={26} style={{ marginRight: i < 2 ? -10 : 0, boxShadow: '0 0 0 2px rgba(0,0,0,0.55)' }} />
                  ))}
                </div>
                <span className="text-[15px] font-medium text-white">See who’s on</span>
                <span className="flex items-center gap-[6px]">
                  <XboxLogo size={16} />
                  <span className="text-[13px] font-bold uppercase tracking-wide text-[#95ff00]">Arcade</span>
                </span>
              </button>
            </div>

            {/* Your Mixes — centered, colored cards */}
            <div className="relative mt-[72px] flex flex-col items-center">
              {/* Halo Master Chief backdrop behind the Mixes (Figma 946:794) — full
                  image, no crop; its own alpha fades out toward the bottom via a
                  mask so it blends into whatever is behind it. */}
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-150px] w-[min(1180px,100%)] -translate-x-1/2">
                <img
                  src={mixesHaloBg}
                  alt=""
                  className="w-full select-none [-webkit-mask-image:radial-gradient(78%_80%_at_58%_36%,black_30%,transparent_72%)] [mask-image:radial-gradient(78%_80%_at_58%_36%,black_30%,transparent_72%)]"
                />
              </div>
              <h2
                className="relative text-[clamp(26px,2.6vw,40px)] uppercase tracking-[0.02em] text-white [text-shadow:0_3px_10px_rgba(0,0,0,0.6)]"
                style={{ fontFamily: '"Base Neue Cond Bold"' }}
              >
                Your Mixes
              </h2>
              <div className="relative mt-[24px] flex max-w-full flex-wrap justify-center gap-x-[16px] gap-y-[24px]">
                <CreateBlendCard onClick={onCreateBlend} />
                {blends.filter((b) => (b.members || []).includes(SELF)).map((b) => <BlendCard key={b.id} {...b} onOpen={() => onOpenBlend(b)} onContext={(e) => openMixMenu(e, b)} onMenu={(x, y) => setMixMenu({ x, y, blend: b })} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Curated homepage shelves over the Starter catalog (Figma 937:8591) */}
        <div className="mx-auto w-full max-w-[1400px] px-[40px]">
          {/* Friends Are Playing Now — vertical cards that expand on hover */}
          <ShelfRow title="Friends Are Playing Now">
            {HOME_FRIENDS_PLAYING.map((k) => (
              <PortraitCard key={k} {...pcard(k)} belowAvatars onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={IS_SPECTATE && eHover === (CATALOG[k]?.title)} />
            ))}
          </ShelfRow>

          {/* Highly Rated by Your Friends — two wide cards */}
          <HighlyRatedRow items={HOME_HIGHLY_RATED} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />

          {/* Trending in Your Communities — compact list */}
          <TrendingRow items={HOME_TRENDING} onOpen={onOpen} />

          {/* Because You Played… — vertical cards */}
          <ShelfRow title="Because You Played Deathloop">
            {HOME_BECAUSE_PLAYED.map((k) => (
              <PortraitCard key={k} {...pcard(k)} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={IS_SPECTATE && eHover === (CATALOG[k]?.title)} />
            ))}
          </ShelfRow>

          {/* Worth a Closer Look — featured game + detail panel */}
          <WorthACloserLook gameKey={HOME_CLOSER_LOOK} onOpen={onOpen} />

          {/* Something Different for You — vertical cards */}
          <ShelfRow title="Something Different for You">
            {HOME_DIFFERENT.map((k) => (
              <PortraitCard key={k} {...pcard(k)} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={IS_SPECTATE && eHover === (CATALOG[k]?.title)} />
            ))}
          </ShelfRow>
        </div>
      </div>

      {/* Right-click Mix card menu (same editor as the Mix page) */}
      {eMixMenu && eMixMenu.blend && (
        <ContextMenu
          x={eMixMenu.x}
          y={eMixMenu.y}
          onClose={() => setMixMenu(null)}
          items={mixMenuItems(eMixMenu.blend, {
            onOpen: () => { onOpenBlend(eMixMenu.blend); setMixMenu(null) },
            onRename: () => { setRenameFor(eMixMenu.blend); setMixMenu(null) },
            onCover: () => { setCoverFor(eMixMenu.blend); setMixMenu(null) },
            onPin: () => { togglePin(eMixMenu.blend); setMixMenu(null) },
            onManage: () => { setInviteFor(eMixMenu.blend); setMixMenu(null) },
            onSetNotif: (lvl) => { patchMix(eMixMenu.blend, { notif: lvl }); setMixMenu(null) },
            onLeave: () => { const b = eMixMenu.blend; setMixMenu(null); leaveMixCard(b) },
            onDelete: () => { const b = eMixMenu.blend; setMixMenu(null); deleteMix(b) },
          })}
        />
      )}
      {eCoverFor && <CoverPickerModal blend={eCoverFor} games={eCoverFor.games.map((k) => CATALOG[k]).filter(Boolean)} onClose={() => setCoverFor(null)} onSave={(patch) => patchMix(eCoverFor, patch)} />}
      {eRenameFor && <RenameMixModal blend={eRenameFor} onClose={() => setRenameFor(null)} onSave={(patch) => patchMix(eRenameFor, patch)} />}
      {eInviteFor && <InviteMembersModal blend={eInviteFor} onClose={() => setInviteFor(null)} onSave={(patch) => patchMix(eInviteFor, patch)} />}
      {eSearchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}
    </main>
  )
}

// ── Mixes tab (Figma 926:4875) — the "Your Mixes" grid on its own top-nav tab.
function MixesPage({ onHome, onLibrary, onOpenBlend, onCreate, onOpen }) {
  const { blends, setBlends } = useRoomCtx()
  const [mixMenu, setMixMenu] = useState(null)
  const [coverFor, setCoverFor] = useState(null)
  const [renameFor, setRenameFor] = useState(null)
  const [inviteFor, setInviteFor] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const patchMix = (b, patch) => setBlends(blends.map((x) => (x.id === b.id ? { ...x, ...patch } : x)))
  const leaveMixCard = (b) => { if (window.confirm(`Leave ${b.name}?`)) patchMix(b, { members: b.members.filter((c) => c !== SELF) }) }
  const deleteMix = (b) => { if (window.confirm(`Delete ${b.name}? This removes it for everyone.`)) setBlends(blends.filter((x) => x.id !== b.id)) }
  const togglePin = (b) => patchMix(b, { pinned: !b.pinned })
  const mine = blends.filter((b) => (b.members || []).includes(SELF))
  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <header className="flex h-[56px] shrink-0 items-center gap-[32px] border-b border-white/5 px-[40px]">
        <XboxLogo size={24} />
        <button onClick={onHome} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Home</button>
        <button onClick={onLibrary} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Library</button>
        <button className="flex h-[56px] items-center border-b-2 border-white text-[16px] font-medium text-white">Mixes</button>
        <div className="flex flex-1 items-center justify-end gap-[20px]">
          <WheelNavButton />
          <GiftArcadeButton onClick={() => setSearchOpen(true)} />
        </div>
      </header>
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[36px]">
        <div className="mx-auto w-full max-w-[1400px]">
          <h1 className="text-[clamp(30px,3vw,44px)] uppercase tracking-[0.02em] text-white" style={{ fontFamily: '"Base Neue Cond Bold"' }}>Your Mixes</h1>
          <div className="mt-[28px] flex flex-wrap gap-x-[16px] gap-y-[28px]">
            <CreateBlendCard onClick={onCreate} />
            {mine.map((b) => (
              <BlendCard
                key={b.id}
                {...b}
                onOpen={() => onOpenBlend(b)}
                onContext={(e) => { e.preventDefault(); e.stopPropagation(); setMixMenu({ x: e.clientX, y: e.clientY, blend: b }) }}
                onMenu={(x, y) => setMixMenu({ x, y, blend: b })}
              />
            ))}
          </div>
        </div>
      </div>
      {mixMenu && mixMenu.blend && (
        <ContextMenu
          x={mixMenu.x}
          y={mixMenu.y}
          onClose={() => setMixMenu(null)}
          items={mixMenuItems(mixMenu.blend, {
            onOpen: () => { onOpenBlend(mixMenu.blend); setMixMenu(null) },
            onRename: () => { setRenameFor(mixMenu.blend); setMixMenu(null) },
            onCover: () => { setCoverFor(mixMenu.blend); setMixMenu(null) },
            onPin: () => { togglePin(mixMenu.blend); setMixMenu(null) },
            onManage: () => { setInviteFor(mixMenu.blend); setMixMenu(null) },
            onSetNotif: (lvl) => { patchMix(mixMenu.blend, { notif: lvl }); setMixMenu(null) },
            onLeave: () => { const b = mixMenu.blend; setMixMenu(null); leaveMixCard(b) },
            onDelete: () => { const b = mixMenu.blend; setMixMenu(null); deleteMix(b) },
          })}
        />
      )}
      {coverFor && <CoverPickerModal blend={coverFor} games={(coverFor.games || []).map((k) => CATALOG[k]).filter(Boolean)} onClose={() => setCoverFor(null)} onSave={(patch) => patchMix(coverFor, patch)} />}
      {renameFor && <RenameMixModal blend={renameFor} onClose={() => setRenameFor(null)} onSave={(patch) => patchMix(renameFor, patch)} />}
      {inviteFor && <InviteMembersModal blend={inviteFor} onClose={() => setInviteFor(null)} onSave={(patch) => patchMix(inviteFor, patch)} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}
    </main>
  )
}

// The Xbox Game Pass Starter Edition catalog (the full leaked list). Games that
// also exist in CATALOG reuse their real cover art; the rest get a styled
// gradient "cover" so the whole grid reads as one curated shelf.
const LIB_COLORS = [
  ['#1f6feb', '#0d3b8f'], ['#2ea043', '#12511f'], ['#8957e5', '#4b2a8f'],
  ['#db61a2', '#7d2857'], ['#e3611c', '#8a3410'], ['#d29922', '#6f5410'],
  ['#3fb0ac', '#14544f'], ['#cf5b5b', '#7a2626'], ['#5765f2', '#2b348f'],
  ['#57606a', '#2d333b'],
]
// Steam App IDs (for CDN cover art) + YouTube trailer IDs per game. Matched to
// STARTER_LIBRARY by normalized title. null = not on Steam / no trailer found.
const libNorm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const LIB_IDS = [
  { title: 'Among Us', steamAppId: 945360, youTubeId: 'NSJ4cESNQfE' },
  { title: 'Astroneer', steamAppId: 361420, youTubeId: 'UMLwzt5t9bs' },
  { title: 'Batman: Arkham Knight', steamAppId: 208650, youTubeId: 'gu_Cw_mzhRQ' },
  { title: 'Celeste', steamAppId: 504230, youTubeId: 'FqBj2IGg6Uw' },
  { title: 'Chivalry 2', steamAppId: 1824220, youTubeId: 'HKlYVpCuab0' },
  { title: 'Cities: Skylines Remastered', steamAppId: 255710, youTubeId: 'yNKpOdq56nU' },
  { title: 'Control Ultimate Edition', steamAppId: 870780, youTubeId: 'hpzX0ItLF4Y' },
  { title: 'Crash Team Racing Nitro-Fueled', steamAppId: null, youTubeId: '-vR70ZDbOEw' },
  { title: 'DayZ', steamAppId: 221100, youTubeId: 'Z8YxinOKNss' },
  { title: 'Dead Cells', steamAppId: 588650, youTubeId: '02G3GUt6Nzo' },
  { title: 'Deep Rock Galactic', steamAppId: 548430, youTubeId: 'QcVUD-3LRsM' },
  { title: 'Descenders', steamAppId: 681280, youTubeId: 'zG-dBYtbPNA' },
  { title: 'Dishonored 2', steamAppId: 403640, youTubeId: 'WFe0TgXhIrs' },
  { title: 'Disney Dreamlight Valley', steamAppId: 1401590, youTubeId: 'eLirE4E-nJI' },
  { title: 'Doom 64', steamAppId: 1148590, youTubeId: 'oXe6aTCp59Q' },
  { title: 'Doom Eternal', steamAppId: 782330, youTubeId: 'qgvV4GE8vVA' },
  { title: 'Fable Anniversary', steamAppId: 288470, youTubeId: 'Awaa0OhDNj4' },
  { title: 'Fallout 4', steamAppId: 377160, youTubeId: '8VloZp3KlMM' },
  { title: 'Fallout 76', steamAppId: 1151340, youTubeId: 'kYATmwTY6IU' },
  { title: 'Firewatch', steamAppId: 383870, youTubeId: 'd02lhvvVSy8' },
  { title: 'Gang Beasts', steamAppId: 285900, youTubeId: 'oW3XEObgZlY' },
  { title: 'Gears 5', steamAppId: 1097840, youTubeId: 'a8PB-O8aGeI' },
  { title: 'Golf With Your Friends', steamAppId: 431240, youTubeId: 'no_IUGXGFEI' },
  { title: 'Grounded', steamAppId: 962130, youTubeId: 'DKYG-Lj0lpQ' },
  { title: 'Hades', steamAppId: 1145360, youTubeId: 'Bz8l935Bv0Y' },
  { title: 'Halo 5 Guardians', steamAppId: null, youTubeId: 'Rh_NXwqFvHc' },
  { title: 'Halo Wars 2', steamAppId: null, youTubeId: 'lnYuNXolf4Y' },
  { title: "Hellblade Senua's Sacrifice", steamAppId: 414340, youTubeId: 'F3aqyATJo7I' },
  { title: 'Human Fall Flat', steamAppId: 477160, youTubeId: 'maiYKaZNG7Y' },
  { title: 'Inside', steamAppId: 304430, youTubeId: '5ABy76KTMe8' },
  { title: 'Limbo', steamAppId: 48000, youTubeId: 'R1pwLq2-RV8' },
  { title: 'Medieval Dynasty', steamAppId: 1129580, youTubeId: 'H5gQOL9dS4w' },
  { title: 'Monster Sanctuary', steamAppId: 814370, youTubeId: 'iVvpXtrjl5c' },
  { title: 'Ori and the Will of the Wisps', steamAppId: 1057090, youTubeId: 'vDPpRdYOCeY' },
  { title: 'Overcooked 2', steamAppId: 728880, youTubeId: 'qpzmirQllT0' },
  { title: 'Payday 2', steamAppId: 218620, youTubeId: 'Gb-_DKC6wc4' },
  { title: 'PowerWash Simulator', steamAppId: 1290000, youTubeId: 'nIdOILxKsBA' },
  { title: 'Psychonauts', steamAppId: 3830, youTubeId: 'NvkiZK5TzHE' },
  { title: 'Psychonauts 2', steamAppId: 607080, youTubeId: 'YmAUMT403os' },
  { title: 'Retro Classics', steamAppId: null, youTubeId: null },
  { title: 'Slay the Spire', steamAppId: 646570, youTubeId: '9SZUtyYSOjQ' },
  { title: 'SnowRunner', steamAppId: 1465360, youTubeId: '6lgz6ou7iLA' },
  { title: 'Spiritfarer', steamAppId: 972660, youTubeId: 'Xu4JHmcfrtw' },
  { title: 'Stardew Valley', steamAppId: 413150, youTubeId: 'ot7uXNQskhs' },
  { title: 'State of Decay 2', steamAppId: 495420, youTubeId: 'qjLOFZjGClY' },
  { title: 'Stellaris', steamAppId: 281990, youTubeId: 'KanCiSGxSKM' },
  { title: 'Superhot Mind Control Delete', steamAppId: 690040, youTubeId: 'I8TW6mt5VcA' },
  { title: 'Superliminal', steamAppId: 1049410, youTubeId: '_SX8XMwMw6Y' },
  { title: "TMNT Shredder's Revenge", steamAppId: 1361510, youTubeId: '86JYR7bK6RU' },
  { title: 'The Elder Scrolls Online', steamAppId: 306130, youTubeId: '-UkK4PTsNFE' },
  { title: 'Totally Reliable Delivery Service', steamAppId: 1011670, youTubeId: '60pJXqYXm1E' },
  { title: 'Tunic', steamAppId: 553420, youTubeId: 'QVDwvfH9nfE' },
  { title: 'Unpacking', steamAppId: 1135690, youTubeId: 'pfCbkH10jmg' },
  { title: 'Vampire Survivors', steamAppId: 1794680, youTubeId: 'aS7JqyHdQQA' },
  { title: 'Warhammer 40000 Darktide', steamAppId: 1361210, youTubeId: 'oMUfKLLynWI' },
  { title: 'Warhammer Vermintide 2', steamAppId: 552500, youTubeId: '9nDRryKVt_g' },
  { title: 'World War Z', steamAppId: 699130, youTubeId: 'NL-jBYtJmdI' },
  { title: 'Wreckfest', steamAppId: 228380, youTubeId: 'cbsDiIuI7KQ' },
]
const LIB_ID_BY = Object.fromEntries(LIB_IDS.map((x) => [libNorm(x.title), x]))
const STARTER_LIBRARY = [
  { title: 'Among Us', genre: 'Party', players: '1-15' },
  { title: 'Astroneer', genre: 'Sandbox', players: '1-4' },
  { title: 'Batman: Arkham Knight', genre: 'Action', players: '1' },
  { title: 'Celeste', genre: 'Platformer', players: '1' },
  { title: 'Chivalry 2', genre: 'Action', players: '1-64' },
  { title: 'Cities: Skylines — Remastered', genre: 'Simulation', players: '1' },
  { title: 'Control: Ultimate Edition', genre: 'Action', players: '1' },
  { title: 'Crash Team Racing Nitro-Fueled', genre: 'Racing', players: '1-8' },
  { title: 'DayZ', genre: 'Survival', players: '1-60' },
  { title: 'Dead Cells', genre: 'Roguelike', players: '1' },
  { title: 'Deep Rock Galactic', genre: 'Co-op FPS', players: '1-4' },
  { title: 'Descenders', genre: 'Sports', players: '1' },
  { title: 'Dishonored 2', genre: 'Stealth', players: '1' },
  { title: 'Disney Dreamlight Valley', genre: 'Life Sim', players: '1' },
  { title: 'Doom 64', genre: 'FPS', players: '1' },
  { title: 'Doom Eternal', genre: 'FPS', players: '1-3' },
  { title: 'Fable Anniversary', genre: 'RPG', players: '1' },
  { title: 'Fallout 4', genre: 'RPG', players: '1' },
  { title: 'Fallout 76', genre: 'RPG', players: '1-24' },
  { title: 'Firewatch', genre: 'Adventure', players: '1' },
  { title: 'Gang Beasts', genre: 'Party', players: '1-8', key: 'gangBeasts' },
  { title: 'Gears 5', genre: 'Shooter', players: '1-3' },
  { title: 'Golf With Your Friends', genre: 'Sports', players: '1-12' },
  { title: 'Grounded', genre: 'Survival', players: '1-4', key: 'grounded' },
  { title: 'Hades', genre: 'Roguelike', players: '1' },
  { title: 'Halo 5: Guardians', genre: 'Shooter', players: '1-24' },
  { title: 'Halo Wars 2', genre: 'Strategy', players: '1-6' },
  { title: "Hellblade: Senua's Sacrifice", genre: 'Action', players: '1' },
  { title: 'Human: Fall Flat', genre: 'Puzzle', players: '1-8', key: 'humanFallFlat' },
  { title: 'Inside', genre: 'Platformer', players: '1' },
  { title: 'Limbo', genre: 'Platformer', players: '1' },
  { title: 'Medieval Dynasty', genre: 'Survival', players: '1-4' },
  { title: 'Monster Sanctuary', genre: 'RPG', players: '1-2' },
  { title: 'Ori and the Will of the Wisps', genre: 'Platformer', players: '1' },
  { title: 'Overcooked! 2', genre: 'Co-op', players: '1-4', key: 'overcooked' },
  { title: 'Payday 2', genre: 'Co-op FPS', players: '1-4' },
  { title: 'PowerWash Simulator', genre: 'Simulation', players: '1-6' },
  { title: 'Psychonauts', genre: 'Platformer', players: '1' },
  { title: 'Psychonauts 2', genre: 'Platformer', players: '1' },
  { title: 'Retro Classics', genre: 'Arcade', players: '1-2' },
  { title: 'Slay the Spire', genre: 'Roguelike', players: '1' },
  { title: 'SnowRunner', genre: 'Simulation', players: '1-4' },
  { title: 'Spiritfarer', genre: 'Adventure', players: '1-2' },
  { title: 'Stardew Valley', genre: 'Farming Sim', players: '1-4' },
  { title: 'State of Decay 2', genre: 'Survival', players: '1-4' },
  { title: 'Stellaris', genre: 'Strategy', players: '1-32' },
  { title: 'Superhot: Mind Control Delete', genre: 'FPS', players: '1' },
  { title: 'Superliminal', genre: 'Puzzle', players: '1' },
  { title: "TMNT: Shredder's Revenge", genre: "Beat 'em up", players: '1-6' },
  { title: 'The Elder Scrolls Online', genre: 'MMORPG', players: 'MMO' },
  { title: 'Totally Reliable Delivery Service', genre: 'Party', players: '1-4' },
  { title: 'Tunic', genre: 'Adventure', players: '1' },
  { title: 'Unpacking', genre: 'Puzzle', players: '1' },
  { title: 'Vampire Survivors', genre: 'Roguelike', players: '1-4' },
  { title: 'Warhammer 40,000: Darktide', genre: 'Co-op FPS', players: '1-4' },
  { title: 'Warhammer: Vermintide 2', genre: 'Co-op', players: '1-4' },
  { title: 'World War Z', genre: 'Co-op Shooter', players: '1-4' },
  { title: 'Wreckfest', genre: 'Racing', players: '1-24' },
].map((g, i) => {
  const m = LIB_ID_BY[libNorm(g.title)] || {}
  return { ...g, colors: LIB_COLORS[i % LIB_COLORS.length], steamAppId: m.steamAppId ?? null, youTubeId: m.youTubeId ?? null, catKey: g.key || ('gp_' + libNorm(g.title)) }
})

// Landscape header art (for card rows), vs the portrait cover used by tiles.
const STEAM_HEADER = (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`
// Fold the Starter catalog into the app's game universe so recommendations,
// Mixes and the wheel all pull from it. Games already in CATALOG (with real
// local art) keep their entry; the rest get a Steam-art entry under a gp_ key.
STARTER_LIBRARY.forEach((g) => {
  const k = g.catKey
  // Games that aren't on Steam have no art, so they stay out of CATALOG — and
  // so out of Mixes, the wheel and recommendations, which all assume a cover.
  // They still get everything below, so the Library can open their detail page.
  if (!CATALOG[k] && g.steamAppId) {
    CATALOG[k] = {
      title: g.title,
      image: STEAM_HEADER(g.steamAppId),
      players: g.players === 'MMO' ? '1+' : g.players,
      genre: g.genre,
      developer: 'Game Pass',
      playtime: '~2hrs',
      caption: `${g.genre} — playable free with Game Pass Starter.`,
    }
  }
  // Title → key must include Starter games too, or "already in PLAYlist" checks
  // (and right-click "Add to PLAYlist") silently miss them.
  KEY_OF_TITLE[g.title] = k
  if (g.youTubeId && !VIDEOS[k]) VIDEOS[k] = g.youTubeId
  if (!details[k]) details[k] = {
    title: g.title, developer: 'Game Pass', genre: g.genre, playtime: '~2hrs',
    age: '', descriptors: '', ratings: [{ pct: '85%', line1: 'of', line2: 'Game Pass players' }],
  }
})
// Starter keys that make good group picks (co-op / party first) — the default
// game pool for a brand-new Mix.
const STARTER_MIX_GAMES = ['overcooked', 'grounded', 'gp_amongus', 'humanFallFlat', 'gp_deeprockgalactic', 'gp_golfwithyourfriends']

// Portrait cover art straight from Steam's CDN (600×900 library capsule).
const STEAM_COVER = (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`

// ── Homepage (Figma 937:8591) — curated shelves over the Starter catalog ─────
const STARTER_BY_KEY = Object.fromEntries(STARTER_LIBRARY.map((g) => [g.catKey, g]))
const starterCover = (k) => { const g = STARTER_BY_KEY[k]; return g?.steamAppId ? STEAM_COVER(g.steamAppId) : CATALOG[k]?.image }
const starterHeader = (k) => { const g = STARTER_BY_KEY[k]; return g?.steamAppId ? STEAM_HEADER(g.steamAppId) : CATALOG[k]?.image }
// Every key the wheel can hold, searchable by title. Most have art (CATALOG);
// a handful of Starter titles have none and ride as color-only slices.
const ALL_WHEEL_KEYS = [...new Set([...Object.keys(CATALOG), ...STARTER_LIBRARY.map((g) => g.catKey)])].filter((k) => CATALOG[k] || STARTER_BY_KEY[k])
const wheelTitle = (k) => CATALOG[k]?.title || STARTER_BY_KEY[k]?.title || k
const wheelThumb = (k) => CATALOG[k]?.image || starterHeader(k) || null
// Editorial copy for the games we feature on the homepage.
const STARTER_DESC = {
  gp_doometernal: { studio: 'id Software', desc: 'Rip and tear through Hell in the fastest, most brutal DOOM yet.', tags: ['FPS', 'Action', 'Mature 17+'], friends: '4 friends have played recently' },
  gp_deeprockgalactic: { studio: 'Ghost Ship Games', desc: 'Four dwarves, one cave, endless bugs. Mine, fight and drink together.', tags: ['Co-op', 'FPS', 'Mining'], friends: '3 friends have played recently' },
  gp_chivalry2: { studio: 'Torn Banner Studios', desc: 'Massive medieval battlefields — sieges, catapults and a lot of yelling.', tags: ['Action', 'Multiplayer', 'Mature 17+'], friends: '2 friends have played recently' },
  gp_warhammer40000darktide: { studio: 'Fatshark', desc: 'Co-op horde slaughter in the grim dark of the 41st millennium.', tags: ['Co-op FPS', 'Action', 'Mature 17+'], friends: '3 friends have played recently' },
  gp_warhammervermintide2: { studio: 'Fatshark', desc: 'Four heroes hold the line against endless Skaven and Chaos hordes.', tags: ['Co-op', 'Melee', 'Action'], friends: '2 friends have played recently' },
  gp_amongus: { studio: 'Innersloth', desc: 'Crew a spaceship, find the impostor, betray your friends. Repeat.', tags: ['Party', 'Social Deduction', 'Online'], friends: '5 friends have played recently' },
  gp_hades: { studio: 'Supergiant Games', desc: 'A god-like roguelike — fight out of Hell one perfect run at a time.', tags: ['Roguelike', 'Action', 'Story Rich'], friends: 'Trending with 120+ players', rec: 97, recFriends: 4 },
  gp_doom64: { studio: 'id Software', desc: 'The 1997 cult classic, restored — pure retro demon-blasting.', tags: ['FPS', 'Retro', 'Mature 17+'], friends: 'Rising in your communities' },
  gp_vampiresurvivors: { studio: 'poncle', desc: 'One button, a thousand monsters. Absurdly moreish bullet-heaven.', tags: ['Roguelike', 'Bullet Hell', 'Casual'], friends: 'Everyone is playing this' },
  gp_stardewvalley: { studio: 'ConcernedApe', desc: 'Inherit a farm, build a life, lose a hundred hours to it happily.', tags: ['Farming Sim', 'Co-op', 'Cozy'], friends: 'Blake rated this 5 stars', rec: 96, recFriends: 5 },
  gp_oriandthewillofthewisps: { studio: 'Moon Studios', desc: 'A gorgeous, heartbreaking platformer with movement that just sings.', tags: ['Platformer', 'Metroidvania', 'Story Rich'], friends: 'Chloe rated this 5 stars', rec: 94, recFriends: 4 },
  gp_batmanarkhamknight: { studio: 'Rocksteady', desc: 'Be the Batman across a stormy, open Gotham in the Arkham finale.', tags: ['Action', 'Open World', 'Mature 17+'], friends: '3 friends recommend this' },
  gp_controlultimateedition: { studio: 'Remedy', desc: 'A brutalist secret agency, telekinetic combat and a shifting building.', tags: ['Action', 'Supernatural', 'Mature 17+'], friends: '2 friends recommend this' },
  gp_dishonored2: { studio: 'Arkane', desc: 'Stealth, powers and a dozen ways through every level. Ghost it or gut it.', tags: ['Stealth', 'Action', 'Mature 17+'], friends: '2 friends recommend this' },
  gp_fallout4: { studio: 'Bethesda', desc: 'Build, scavenge and shoot your way across the Commonwealth wasteland.', tags: ['RPG', 'Open World', 'Mature 17+'], friends: '4 friends recommend this' },
  gp_hellbladesenuassacrifice: { studio: 'Ninja Theory', desc: 'A harrowing descent into Norse myth and psychosis. Wear headphones.', tags: ['Action', 'Psychological', 'Mature 17+'], friends: 'Daniel recommends this' },
  gp_fallout76: { studio: 'Bethesda', desc: 'Rebuild Appalachia with friends in a wide-open online wasteland.', tags: ['RPG', 'Online', 'Mature 17+'], friends: '' },
  gp_firewatch: { studio: 'Campo Santo', desc: 'Firewatch is a single-player mystery set in the Wyoming wilderness, where your only lifeline is the voice on the other end of a handheld radio.', tags: ['Adventure', 'Story Rich', 'Mystery'], friends: 'Daniel has played 3 hrs recently' },
  gp_unpacking: { studio: 'Witch Beam', desc: 'Unpack boxes, arrange a life. A quiet, lovely game about moving house.', tags: ['Puzzle', 'Cozy', 'Relaxing'], friends: 'Chloe said "oddly therapeutic, lost an hour"' },
  gp_spiritfarer: { studio: 'Thunder Lotus', desc: 'A cozy management game about ferrying spirits to their final rest.', tags: ['Adventure', 'Cozy', 'Story Rich'], friends: 'Daniel said "I cried at the ending"' },
  gp_tunic: { studio: 'Andrew Shouldice', desc: 'A tiny fox, a huge secret-filled world, and a manual you decode as you go.', tags: ['Adventure', 'Puzzle', 'Souls-like'], friends: 'Blake said "the secret manual blew my mind"' },
  gp_inside: { studio: 'Playdead', desc: "A wordless, dread-soaked puzzle-platformer you won't stop thinking about.", tags: ['Platformer', 'Puzzle', 'Atmospheric'], friends: 'Chloe said "still thinking about that ending"' },
  gp_limbo: { studio: 'Playdead', desc: 'Stark, monochrome and menacing — the puzzle-platformer that started it.', tags: ['Platformer', 'Puzzle', 'Atmospheric'], friends: 'Blake said "creepy in the best way"' },
  gp_celeste: { studio: 'Maddy Makes Games', desc: 'A razor-tight precision platformer about climbing a mountain — and yourself.', tags: ['Platformer', 'Precision', 'Story Rich'], friends: 'Daniel said "hardest game I love"', rec: 95, recFriends: 3 },
}
// A stable, per-game pair of friend avatars so different cards show different
// profiles (varied but consistent for a given game).
const AV_POOL = [AVATAR.blue, AVATAR.purple, AVATAR.green, AVATAR.red]
function pickAvatars(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const a = h % AV_POOL.length
  const b = (a + 1 + ((h >>> 3) % (AV_POOL.length - 1))) % AV_POOL.length
  return [AV_POOL[a], AV_POOL[b]]
}
// Native-vertical (9:16) gameplay Shorts for the portrait hover cards. Keyed by
// catKey. These play in the card's vertical cover, unlike the horizontal
// trailers we keep for the game-detail carousel.
const GAMEPLAY_VERTICAL = {
  gp_doometernal: 'MpLV6Q1pvRQ',
  gp_deeprockgalactic: 'PBVeMxYTVCM',
  gp_amongus: 'WPoCeNeST1s',
  gp_chivalry2: '-ARp2fZjiig',
  gp_warhammer40000darktide: 'sb1WTXvakSc',
  gp_warhammervermintide2: 'mS0DSmj9e5Y',
  gp_batmanarkhamknight: 'KrehP_tNEYM',
  gp_controlultimateedition: 'bw-u_ryMH-k',
  gp_dishonored2: 'vis6vpliz30',
  gp_fallout4: 'MOY67DYMhTI',
  gp_hellbladesenuassacrifice: 'uhatZ7CO0FM',
  gp_fallout76: 'QaQsHAc9BCY',
  gp_unpacking: 'NDeuL6CrJhg',
  gp_spiritfarer: 'dZwPgMmsI58',
  gp_tunic: 'MoFyxZnN--U',
  gp_inside: 'NUEn27l2x1w',
  gp_celeste: 'MqD6nATJ71I',
  gp_limbo: 'nQ-PFPBHG7w',
}
// Horizontal (16:9) no-commentary gameplay for the wide landscape cards.
const GAMEPLAY_LANDSCAPE = {
  gp_stardewvalley: '_XfffJIzEtI',
  gp_oriandthewillofthewisps: 'fXUrR6EiEcY',
  gp_firewatch: 'T1bqemD7KPo',
}
// Release dates shown on the hover card.
const STARTER_RELEASED = {
  gp_doometernal: 'March 20, 2020', gp_deeprockgalactic: 'May 13, 2020', gp_amongus: 'November 16, 2018',
  gp_chivalry2: 'June 8, 2021', gp_warhammer40000darktide: 'November 30, 2022', gp_warhammervermintide2: 'March 8, 2018',
  gp_hades: 'September 17, 2020', gp_doom64: 'March 20, 2020', gp_vampiresurvivors: 'October 20, 2022',
  gp_stardewvalley: 'February 26, 2016', gp_oriandthewillofthewisps: 'March 11, 2020',
  gp_batmanarkhamknight: 'June 23, 2015', gp_controlultimateedition: 'August 27, 2019', gp_dishonored2: 'November 11, 2016',
  gp_fallout4: 'November 10, 2015', gp_hellbladesenuassacrifice: 'August 8, 2017', gp_fallout76: 'November 14, 2018',
  gp_firewatch: 'February 9, 2016', gp_unpacking: 'November 2, 2021', gp_spiritfarer: 'August 18, 2020',
  gp_tunic: 'March 16, 2022', gp_inside: 'June 29, 2016', gp_celeste: 'January 25, 2018', gp_limbo: 'July 21, 2010',
}
// PortraitCard props for a Starter game key.
function pcard(k) {
  const g = STARTER_BY_KEY[k]
  const c = CATALOG[k] || {}
  const d = STARTER_DESC[k] || {}
  const p = g?.players
  return {
    image: starterCover(k),
    video: GAMEPLAY_LANDSCAPE[k] ? { youTubeId: GAMEPLAY_LANDSCAPE[k] } : g?.youTubeId ? { youTubeId: g.youTubeId } : undefined,
    title: c.title || g?.title,
    publisher: d.studio || c.developer || 'Game Pass',
    released: STARTER_RELEASED[k] ? `Released on ${STARTER_RELEASED[k]}` : '',
    recommend: d.friends || '',
    avatars: pickAvatars(k),
    multiplayer: p === 'MMO' ? 'MMO' : p && p !== '1' ? `${p} players` : null,
    tags: d.tags || [g?.genre].filter(Boolean),
  }
}
// Which games fill each shelf (all Starter-catalog keys).
const HOME_FRIENDS_PLAYING = ['gp_doometernal', 'gp_deeprockgalactic', 'gp_amongus', 'gp_chivalry2', 'gp_warhammer40000darktide', 'gp_warhammervermintide2']
const HOME_TRENDING = ['gp_hades', 'gp_doom64', 'gp_vampiresurvivors']
const HOME_HIGHLY_RATED = ['gp_stardewvalley', 'gp_oriandthewillofthewisps', 'gp_hades', 'gp_celeste']
const HOME_BECAUSE_PLAYED = ['gp_batmanarkhamknight', 'gp_controlultimateedition', 'gp_dishonored2', 'gp_fallout4', 'gp_hellbladesenuassacrifice', 'gp_fallout76']
const HOME_CLOSER_LOOK = 'gp_firewatch'
const HOME_DIFFERENT = ['gp_unpacking', 'gp_spiritfarer', 'gp_tunic', 'gp_inside', 'gp_celeste', 'gp_limbo']

const ELLIPSIS_GLYPH = <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
// Social proof for the "Trending in Your Communities" rows.
const TRENDING_STATS = {
  gp_hades: { friends: 5, hours: 12 },
  gp_doom64: { friends: 3, hours: 4 },
  gp_vampiresurvivors: { friends: 6, hours: 8 },
}

// "Trending in Your Communities" — a compact list of games (Figma 937:8591).
function TrendingRow({ items, onOpen }) {
  return (
    <section className="mt-[56px]">
      <p className="text-[24px] font-semibold text-white">Trending in Your Communities</p>
      <div className="mt-[16px] flex flex-col gap-[4px]">
        {items.map((k) => {
          const g = STARTER_BY_KEY[k]
          const c = CATALOG[k] || {}
          const d = STARTER_DESC[k] || {}
          const title = c.title || g?.title
          return (
            <button key={k} data-game={title} onClick={() => onOpen?.(title)} className="group flex w-full items-center gap-[20px] rounded-[12px] p-[12px] text-left transition hover:bg-white/[0.03]">
              <img alt="" src={starterHeader(k)} loading="lazy" className="h-[104px] w-[185px] shrink-0 rounded-[10px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-semibold text-white">{title}</p>
                {(() => {
                  const st = TRENDING_STATS[k] || { friends: 4, hours: 6 }
                  const avs = pickAvatars(k)
                  return (
                    <div className="mt-[6px] flex items-center gap-[7px]">
                      <span className="flex items-center">
                        {avs.slice(0, 2).map((cc, i) => (
                          <Avatar key={i} color={cc} size={18} style={{ marginRight: i < 1 ? -6 : 0, boxShadow: '0 0 0 2px #0c0c0e', zIndex: 2 - i }} />
                        ))}
                        <span className="ml-[3px] text-[12px] font-semibold leading-none text-white">+</span>
                      </span>
                      <p className="text-[13px] text-[#9a9ba3]">{st.friends} friends played this for avg. {st.hours} hours</p>
                    </div>
                  )
                })()}
                <p className="mt-[6px] truncate text-[14px] text-[#9a9ba3]">{d.desc || c.caption}</p>
              </div>
              <button
                type="button"
                aria-label="More"
                onClick={(e) => {
                  e.stopPropagation()
                  // Open the same menu as right-click: dispatch a contextmenu
                  // event that bubbles to the global handler, anchored here.
                  const r = e.currentTarget.getBoundingClientRect()
                  e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left, clientY: r.bottom }))
                }}
                className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[#9a9ba3] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
              >{ELLIPSIS_GLYPH}</button>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// A flexible wide landscape card that plays its trailer on hover.
function WideGameCard({ gkey, onOpen }) {
  const [hover, setHover] = useState(false)
  const g = STARTER_BY_KEY[gkey]
  const title = (CATALOG[gkey] || {}).title || g?.title
  return (
    <button
      data-game={title}
      onClick={() => onOpen?.(title)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative aspect-video min-w-0 flex-1 overflow-hidden rounded-[16px] bg-[#121214] text-left"
    >
      <img alt="" src={starterHeader(gkey)} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      {hover && (GAMEPLAY_LANDSCAPE[gkey] || g?.youTubeId) && <VideoTrailer youTubeId={GAMEPLAY_LANDSCAPE[gkey] || g.youTubeId} poster={starterHeader(gkey)} bare />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <p className="pointer-events-none absolute bottom-[14px] left-[16px] right-[16px] text-[22px] font-bold text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.7)]">{title}</p>
    </button>
  )
}

// CinematicCard props for a Starter game — the rich horizontal hover overlay
// (trailer + title + social proof + tag pills, no default title).
function cineCard(k) {
  const g = STARTER_BY_KEY[k]
  const c = CATALOG[k] || {}
  const d = STARTER_DESC[k] || {}
  const vid = GAMEPLAY_LANDSCAPE[k] || g?.youTubeId
  return {
    image: starterHeader(k),
    video: vid ? { youTubeId: vid, poster: starterHeader(k) } : undefined,
    avatars: pickAvatars(k),
    label: d.recFriends ? `${d.recFriends} friends recommend this` : (d.friends || 'highly rated by your friends'),
    avatarsPlus: !!d.recFriends,
    players: g?.players && g.players !== '1' && g.players !== 'MMO' ? g.players : g?.players === 'MMO' ? 'MMO' : '1',
    genre: g?.genre,
    genre2: (d.tags || []).find((t) => t && t !== g?.genre) || null,
    title: c.title || g?.title,
    recommendPct: d.rec,
  }
}

// "Highly Rated by Your Friends" — wide cards with the cinematic hover overlay.
function HighlyRatedRow({ items, onOpen, onWishlist, onShare }) {
  return (
    <ShelfRow title="Highly Rated by Your Friends">
      {items.map((k) => <CinematicCard key={k} {...cineCard(k)} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />)}
    </ShelfRow>
  )
}

// "Worth a Closer Look" — one featured game with a detail panel (Figma 937:8591).
function WorthACloserLook({ gameKey, onOpen }) {
  const [hover, setHover] = useState(false)
  const g = STARTER_BY_KEY[gameKey]
  const c = CATALOG[gameKey] || {}
  const d = STARTER_DESC[gameKey] || {}
  const title = c.title || g?.title
  return (
    <section className="mt-[56px]">
      <p className="text-[24px] font-semibold text-white">Worth a Closer Look</p>
      <div className="mt-[20px] flex flex-col gap-[28px] lg:flex-row">
        <button
          data-game={title}
          onClick={() => onOpen?.(title)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="group relative aspect-video w-full shrink-0 overflow-hidden rounded-[16px] bg-[#121214] lg:w-[56%]"
        >
          <img alt="" src={starterHeader(gameKey)} className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.02]" />
          {hover && (GAMEPLAY_LANDSCAPE[gameKey] || g?.youTubeId) && <VideoTrailer youTubeId={GAMEPLAY_LANDSCAPE[gameKey] || g.youTubeId} poster={starterHeader(gameKey)} bare />}
        </button>
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-center gap-[10px]">
            <div className="flex items-center">
              {[AVATAR.blue, AVATAR.purple, AVATAR.green].map((col, i) => (
                <Avatar key={i} color={col} size={22} style={{ marginRight: i < 2 ? -8 : 0, boxShadow: '0 0 0 2px #0c0c0e' }} />
              ))}
            </div>
            <p className="text-[13px] font-semibold text-white">{d.friends || 'Recommended for you'}</p>
          </div>
          <h3 className="mt-[14px] text-[28px] font-bold leading-tight text-white">{title}</h3>
          <p className="mt-[10px] max-w-[54ch] text-[15px] leading-relaxed text-[#9a9ba3]">{d.desc || c.caption}</p>
          <button onClick={() => onOpen?.(title)} className="mt-[20px] w-fit rounded-[10px] bg-[#5765f2] px-[22px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110">View details</button>
        </div>
      </div>
    </section>
  )
}

// One Library game: cover art (local → Steam → gradient fallback) that swaps to
// the trailer on hover.
function LibraryTile({ g, onClick }) {
  const [hover, setHover] = useState(false)
  const [broken, setBroken] = useState(false)
  const localArt = g.key && CATALOG[g.key]?.image
  const cover = broken ? null : (localArt || (g.steamAppId ? STEAM_COVER(g.steamAppId) : null))
  return (
    <button
      onClick={onClick}
      data-game={g.title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group text-left"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-[#151518] ring-1 ring-white/5 transition group-hover:ring-white/25">
        {cover ? (
          <img alt="" src={cover} onError={() => setBroken(true)} className="size-full object-cover transition duration-300 group-hover:scale-[1.06]" />
        ) : (
          <div className="absolute inset-0 transition duration-300 group-hover:scale-[1.04]" style={{ background: `linear-gradient(150deg, ${g.colors[0]}, ${g.colors[1]})` }}>
            <div className="absolute inset-0 flex items-center justify-center p-[14px]">
              <span className="text-center uppercase leading-[0.92] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]" style={{ fontFamily: '"Base Neue Cond Bold"', fontSize: 'clamp(15px,1.5vw,24px)' }}>{g.title}</span>
            </div>
          </div>
        )}
        {hover && g.youTubeId && <VideoTrailer youTubeId={g.youTubeId} poster={typeof cover === 'string' ? cover : undefined} bare />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
      <p className="mt-[8px] truncate text-[15px] font-semibold text-white">{g.title}</p>
      <p className="truncate text-[13px] text-[#7e7f87]">{g.players === 'MMO' ? 'MMO' : g.players === '1' ? '1 player' : `${g.players} players`} · {g.genre}</p>
    </button>
  )
}

// ── Library tab — the full Game Pass Starter Edition catalog ────────────────
function LibraryPage({ onHome, onMixes, onOpen }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const shown = STARTER_LIBRARY.filter((g) => !query || g.title.toLowerCase().includes(query) || g.genre.toLowerCase().includes(query))
  // Every tile opens the game's detail page — playing is a decision you make
  // there, not by clicking a cover. `catKey` is the key every Starter game has;
  // `key` only exists on the handful with hand-authored art.
  const open = (g) => onOpen(g.catKey)
  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <header className="flex h-[56px] shrink-0 items-center gap-[32px] border-b border-white/5 px-[40px]">
        <XboxLogo size={24} />
        <button onClick={onHome} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Home</button>
        <button className="flex h-[56px] items-center border-b-2 border-white text-[16px] font-medium text-white">Library</button>
        <button onClick={onMixes} className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Mixes</button>
        <div className="flex flex-1 items-center justify-end gap-[20px]">
          <WheelNavButton />
          <GiftArcadeButton onClick={() => setSearchOpen(true)} />
        </div>
      </header>
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[36px]">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex flex-wrap items-end justify-between gap-[16px]">
            <div>
              <h1 className="text-[clamp(30px,3vw,44px)] uppercase tracking-[0.02em] text-white" style={{ fontFamily: '"Base Neue Cond Bold"' }}>Library</h1>
              <div className="mt-[6px] flex items-center gap-[8px] text-[15px] text-[#9a9ba3]">
                <XboxLogo size={16} />
                Game Pass Starter Edition · {STARTER_LIBRARY.length} games, playable in the cloud.
              </div>
            </div>
            {/* Quick in-page filter */}
            <div className="flex h-[38px] w-[260px] max-w-full items-center gap-[8px] rounded-[8px] bg-[#1a1a1d] px-[12px]">
              <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter your library" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
            </div>
          </div>

          <div className="mt-[28px] grid grid-cols-2 gap-x-[18px] gap-y-[24px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((g) => <LibraryTile key={g.title} g={g} onClick={() => open(g)} />)}
          </div>
          {shown.length === 0 && <p className="mt-[40px] text-center text-[15px] text-[#7e7f87]">No games match “{q}”.</p>}
        </div>
      </div>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}
    </main>
  )
}

// ── Blend group page (Figma node 489:2783) ─────────────────────────────────
function FeedRow({ who, text, when }) {
  const names = useNames()
  return (
    <div className="flex items-start gap-[10px]">
      <Avatar color={who} size={28} />
      <p className="flex-1 text-[13px] leading-snug text-[#b5bac1]">
        <span className="font-semibold text-white">{dispName(NAME[who], names)}</span> {text}
      </p>
      <span className="shrink-0 text-[11px]" style={{ color: when === 'live' ? '#95ff00' : '#7e7f87' }}>{when}</span>
    </div>
  )
}

// "Can't Decide?" — opens the wheel band, fronted by a ferris wheel. The funnel
// beside it is the way into matching the group's preferences instead.
function XboxDecideButton({ onClick, open, onPrefs }) {
  return (
    <div className="flex shrink-0 items-center gap-[14px]">
      <button
        onClick={onClick}
        aria-expanded={open}
        className="group/dec flex items-center gap-[9px] text-[#3fbf3f] transition hover:opacity-85"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[20px]"
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="10" r="7.5" />
          <circle cx="12" cy="10" r="1.5" />
          <path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" />
          <path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" />
        </svg>
        <span className="text-[17px] font-bold italic">Can&rsquo;t Decide?</span>
        <svg
          viewBox="0 0 24 24"
          className="size-[14px] transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <button
        onClick={onPrefs}
        title="Match our preferences instead"
        aria-label="Match our preferences instead"
        className="text-white transition hover:text-[#3fbf3f]"
      >
        <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" /></svg>
      </button>
    </div>
  )
}

// Solid green circular play button — launches a game.
function PlayButton({ onClick, size = 48, title = 'Launch game' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#107C10] text-white shadow-[0_2px_10px_rgba(16,124,16,0.45)] transition hover:scale-105 hover:bg-[#0e8f0e]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" className="size-[44%] translate-x-[1px]" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    </button>
  )
}

// A right-click menu anchored at the cursor. Closes on any outside press
// (mousedown fires for both buttons, before contextmenu — so it never races the
// open), scroll, or Escape.
function ContextMenu({ x, y, items, onClose }) {
  useEffect(() => {
    const close = () => onClose()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    // Defer registration one tick so the mousedown that opened us doesn't close us.
    const id = setTimeout(() => {
      window.addEventListener('mousedown', close)
      window.addEventListener('scroll', close, true)
      window.addEventListener('keydown', onKey)
      window.addEventListener('blur', close)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [onClose])
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 220)
  const topY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - (items.length * 40 + 16))
  return (
    <div
      className="fixed z-[70] w-[204px] rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
      style={{ top: Math.max(8, topY), left: Math.max(8, left) }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {items.map((it, i) => {
        if (it.divider) return <div key={i} className="my-[6px] h-px bg-[#1c1d21]" />
        const cls =
          'flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left text-[14px] transition ' +
          (it.primary
            ? 'font-semibold text-[#3fbf3f] hover:bg-[#107C10]/15'
            : it.danger
            ? 'font-medium text-[#f0505b] hover:bg-[#f0505b]/12'
            : 'text-[#dbdee1] hover:bg-white/5')
        const content = (
          <>
            {it.icon && <span className="flex size-[18px] shrink-0 items-center justify-center">{it.icon}</span>}
            <span className="min-w-0 flex-1">
              {it.label}
              {it.sub && <span className="block text-[11px] font-normal text-[#7e7f87]">{it.sub}</span>}
            </span>
            {(it.chevron || it.submenu) && (
              <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-[#7e7f87]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            )}
          </>
        )
        // A submenu opens to the right on hover (Notification Settings, etc.).
        if (it.submenu) {
          return (
            <div key={i} className="group/sub relative">
              <button className={cls}>{content}</button>
              <div className="invisible absolute left-full top-[-6px] z-[71] pl-[6px] opacity-0 transition group-hover/sub:visible group-hover/sub:opacity-100">
                <div className="w-[190px] rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                  {it.submenu.map((opt, j) => (
                    <button
                      key={j}
                      onClick={opt.onClick}
                      className="flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left text-[14px] text-[#dbdee1] transition hover:bg-white/5"
                    >
                      <span className="flex size-[16px] shrink-0 items-center justify-center text-[#3fbf3f]">
                        {opt.active && <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                      </span>
                      <span className={'min-w-0 flex-1 ' + (opt.active ? 'font-semibold text-white' : '')}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        }
        return <button key={i} onClick={it.onClick} className={cls}>{content}</button>
      })}
    </div>
  )
}

// Transient "Launching…" toast; auto-dismisses.
function LaunchToast({ title, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [onDone, title])
  return (
    <div className="fixed top-[24px] right-[24px] z-[80] flex items-center gap-[12px] rounded-[12px] border border-[#1c1d21] bg-[#111214] px-[20px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      <span className="flex size-[24px] items-center justify-center rounded-full bg-[#107C10]">
        <svg viewBox="0 0 24 24" className="size-[12px] text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
      <span className="text-[15px] text-white">Launching <span className="font-semibold">{title}</span>…</span>
    </div>
  )
}

const PLAY_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
const BOOKMARK_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
const REMOVE_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /><path d="M9 9h6" strokeLinecap="round" /></svg>
const IMAGE_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" /><path d="M5 18l5-5 4 4 2-2 3 3" /></svg>
const EDIT_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
const PEOPLE_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9" strokeLinecap="round" /></svg>
const LEAVE_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>
const PIN_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 16v4" /></svg>
const BELL_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
const TRASH_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>

// Notification levels a Mix can cycle through (Figma 930:7969 shows "Nothing").
const MIX_NOTIF_LEVELS = ['All messages', '@mentions only', 'Nothing']

// Shared Mix menu (Figma 930:7969) — used by the hover ellipsis on cards and the
// right-click menu. `h` bundles the handlers; each is optional.
function mixMenuItems(blend, h) {
  const pinned = !!blend.pinned
  const notif = blend.notif || 'Nothing'
  const items = []
  if (h.onOpen) items.push({ label: 'Open Mix', icon: PLAY_GLYPH, primary: true, onClick: h.onOpen }, { divider: true })
  items.push(
    { label: 'Rename', icon: EDIT_MENU_GLYPH, onClick: h.onRename },
    { label: 'Change cover art', icon: IMAGE_MENU_GLYPH, onClick: h.onCover },
    { label: pinned ? 'Unpin from sidebar' : 'Pin to sidebar', icon: PIN_MENU_GLYPH, onClick: h.onPin },
    { label: 'Manage members', icon: PEOPLE_MENU_GLYPH, chevron: true, onClick: h.onManage },
    { label: 'Notification Settings', icon: BELL_MENU_GLYPH, sub: notif, submenu: MIX_NOTIF_LEVELS.map((lvl) => ({ label: lvl, active: notif === lvl, onClick: () => h.onSetNotif(lvl) })) },
    { divider: true },
    { label: 'Leave Mix', icon: LEAVE_MENU_GLYPH, onClick: h.onLeave },
  )
  return items
}

// Mix cover thumbnail options (Figma 882:4956). `null` = the default game collage.
const MIX_COVERS = [
  { label: 'Squad', src: mixThumbSquad },
  { label: 'Papa John’s', src: mixThumbMix },
  { label: 'Batman duo', src: mixThumbDuo1 },
  { label: 'SpongeBob duo', src: mixThumbDuo2 },
]

function useEscClose(onClose) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
}

// Pick a cover for a Mix — one of the thumbnail options, an uploaded image, or
// the default collage. Whatever's chosen is saved to the shared Mix, so it
// updates for every member.
function CoverPickerModal({ blend, games, onClose, onSave }) {
  useEscClose(onClose)
  const fileRef = useRef(null)
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { onSave({ cover: reader.result }); onClose() }
    reader.readAsDataURL(file)
  }
  const Tile = ({ src, label, active, children }) => (
    <button
      onClick={() => { onSave({ cover: src }); onClose() }}
      className={'relative aspect-square overflow-hidden rounded-[12px] ring-2 transition ' + (active ? 'ring-[#5765f2]' : 'ring-transparent hover:ring-white/30')}
    >
      {children}
      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-[3px] text-[11px] font-semibold text-white">{label}</span>
    </button>
  )
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[460px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <h3 className="text-[20px] font-bold text-white">Change cover image</h3>
        <p className="mt-[4px] text-[14px] text-[#b5bac1]">Pick a cover for <span className="font-semibold text-white">{blend.name}</span>.</p>
        <div className="mt-[18px] grid grid-cols-3 gap-[12px]">
          {/* Default = the auto game collage */}
          <Tile src={undefined} label="Default" active={!blend.cover}>
            <div className="grid size-full grid-cols-2 grid-rows-2 gap-[1px] bg-black">
              {games.slice(0, 4).map((g, i) => <img key={i} alt="" src={g.image} className="size-full object-cover" />)}
            </div>
          </Tile>
          {MIX_COVERS.map((c) => (
            <Tile key={c.label} src={c.src} label={c.label} active={blend.cover === c.src}>
              <img alt="" src={c.src} className="size-full object-cover" />
            </Tile>
          ))}
          {/* Upload from device */}
          <button
            onClick={() => fileRef.current?.click()}
            className="relative flex aspect-square flex-col items-center justify-center gap-[8px] rounded-[12px] border-2 border-dashed border-[#4a4d55] text-[#b5bac1] transition hover:border-[#5765f2] hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[26px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            <span className="text-[12px] font-semibold">Upload image</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        <div className="mt-[18px] flex justify-end">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Done</button>
        </div>
      </div>
    </div>
  )
}

function RenameMixModal({ blend, onClose, onSave }) {
  const [name, setName] = useState(blend.name)
  useEscClose(onClose)
  const save = () => { const n = name.trim(); if (n) onSave({ name: n }); onClose() }
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[420px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <h3 className="text-[20px] font-bold text-white">Rename Mix</h3>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          className="mt-[16px] w-full rounded-[8px] bg-[#1e1f22] px-[12px] py-[10px] text-[15px] text-white focus:outline-none"
        />
        <div className="mt-[18px] flex justify-end gap-[10px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button onClick={save} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Save</button>
        </div>
      </div>
    </div>
  )
}

function InviteMembersModal({ blend, onClose, onSave }) {
  const [sel, setSel] = useState(() => new Set(blend.members))
  useEscClose(onClose)
  const toggle = (c) => setSel((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })
  // People who've been sent an invite but haven't accepted/declined yet.
  const invited = new Set(blend.invited || [])
  const isMember = (c) => (blend.members || []).includes(c)
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[420px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <h3 className="text-[20px] font-bold text-white">Manage members</h3>
        <p className="mt-[4px] text-[14px] text-[#b5bac1]">Choose who’s in <span className="font-semibold text-white">{blend.name}</span>.</p>
        <div className="mt-[16px] flex flex-col gap-[2px]">
          {ALL_COLORS.map((c) => {
            const on = sel.has(c)
            const isSelf = c === SELF
            // Pending = invited, not yet a member, and the host hasn't force-added them here.
            const pending = !isSelf && invited.has(c) && !isMember(c) && !on
            return (
              <button key={c} onClick={() => !isSelf && toggle(c)} className={'flex items-center gap-[12px] rounded-[8px] p-[8px] text-left transition ' + (isSelf ? 'opacity-70' : 'hover:bg-white/5')}>
                <Avatar color={c} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{capName(NAME[c] || 'Member')}{isSelf ? ' (you)' : ''}</p>
                </div>
                {pending ? (
                  <span className="flex shrink-0 items-center gap-[6px] rounded-full bg-[#f0b232]/15 px-[10px] py-[4px] text-[12px] font-semibold text-[#f0b232]">
                    <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    Pending
                  </span>
                ) : (
                  <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
                    {on && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-[18px] flex justify-end gap-[10px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button onClick={() => { onSave({ members: [...sel] }); onClose() }} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Save</button>
        </div>
      </div>
    </div>
  )
}
const LINK_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>
const WHEEL_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" /><path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" /><path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" /></svg>
const SHARE_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4M12 2v13" /></svg>

// The full group PLAYlist (Figma 863:3952) — every game in the Mix's shared
// list as a numbered, drag-to-rank grid, plus a search to add or remove games.
function PlaylistModal({ blend, keys, onClose, onReorder, onToggle }) {
  useEscClose(onClose)
  const [q, setQ] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const games = keys.map((k) => (CATALOG[k] ? { key: k, ...CATALOG[k] } : null)).filter(Boolean)
  const reorder = (from, to) => {
    if (from === null || from === to) return
    const next = keys.slice()
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    onReorder(next)
  }
  const query = q.trim().toLowerCase()
  const results = Object.entries(CATALOG)
    .filter(([, v]) => !query || v.title.toLowerCase().includes(query) || (v.genre || '').toLowerCase().includes(query))
    .slice(0, 6)
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[600px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#17181b] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <h3 className="text-[20px] font-bold text-white">Your Mix PLAYlist</h3>
            <p className="mt-[2px] text-[13px] text-[#9a9ba3]">Drag to rank</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] py-[18px]">
          {games.length ? (
            <div className="grid grid-cols-3 gap-[14px]">
              {games.map((g, i) => (
                <div
                  key={g.key}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
                  onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                  onDrop={() => { reorder(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                  className={
                    'group relative cursor-grab select-none overflow-hidden rounded-[10px] bg-[#101012] ring-2 transition ' +
                    (dragIdx === i ? 'opacity-40 ' : '') +
                    (overIdx === i && dragIdx !== i ? 'ring-[#5765f2]' : 'ring-transparent')
                  }
                >
                  <div className="relative aspect-video bg-[#1a1a1d]">
                    <img alt="" src={g.image} draggable={false} className="size-full object-cover" />
                    <span className="absolute left-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-[6px] bg-black/70 text-[13px] font-bold text-white backdrop-blur">{i + 1}</span>
                    <button onClick={() => onToggle(g.key, false)} aria-label="Remove from PLAYlist" className="absolute right-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-[#f0505b] group-hover:opacity-100">
                      <svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                  <p className="truncate px-[8px] py-[6px] text-[12px] font-semibold text-white">{g.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-[28px] text-center text-[14px] text-[#7e7f87]">No games in this PLAYlist yet — search below to add some.</p>
          )}
        </div>

        <div className="border-t border-black/30 px-[24px] py-[16px]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9a9ba3]">Search your PLAYlist</p>
          <div className="mt-[8px] flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>
          {query && (
            <div className="no-scrollbar mt-[8px] max-h-[184px] overflow-y-auto">
              {results.length ? results.map(([k, v]) => {
                const on = keys.includes(k)
                return (
                  <button key={k} onClick={() => onToggle(k, !on)} className="flex w-full items-center gap-[10px] rounded-[8px] p-[6px] text-left transition hover:bg-white/5">
                    <img alt="" src={v.image} className="h-[36px] w-[64px] shrink-0 rounded-[6px] object-cover" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{v.title}</span>
                    <span className={'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
                      {on && <svg viewBox="0 0 24 24" className="size-[13px] text-white" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                    </span>
                  </button>
                )
              }) : <p className="py-[8px] text-[13px] text-[#6f7276]">No games match “{q}”.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BlendPage({ blend, onBack, onDecide, onOpen, onPlay, onShare }) {
  const { addToWheel } = useContext(NavCtx)
  const [menu, setMenu] = useState(null) // { x, y, title }
  const [launching, setLaunching] = useState(null)

  // Header banner — the home page's footage, faded in on first play and back
  // out over the last 1.5s so the loop seam never shows. Opacity is driven on
  // the node rather than through props, so this page's frequent re-renders
  // (votes, spins) don't reset the fade mid-loop.
  const bannerRef = useRef(null)
  useEffect(() => {
    if (bannerRef.current) bannerRef.current.style.opacity = '0'
  }, [])
  const onBannerTime = (e) => {
    const v = e.currentTarget
    if (!v.duration) return
    v.style.opacity = v.currentTime >= v.duration - 1.5 ? '0' : '1'
  }
  function openMenu(e, title) {
    e.preventDefault()
    e.stopPropagation() // this page has its own PLAYlist-aware menu; don't also fire the global one
    setMenu({ x: e.clientX, y: e.clientY, title })
  }
  function launch(title) {
    setMenu(null)
    // Same launch flow as the home/detail page — opens the "Who's playing?" party.
    const key = KEY_OF_TITLE[title] || title
    if (onPlay && CATALOG[key]) onPlay(key)
    else setLaunching(title)
  }
  const { blends, setBlends } = useRoomCtx()
  // Add/remove a game from this Mix's shared PLAYlist (the right-click menu).
  function setPlaylistMembership(title, add) {
    const key = KEY_OF_TITLE[title] || title
    const cur = blend.wishlist || []
    const next = add ? (cur.includes(key) ? cur : [...cur, key]) : cur.filter((k) => k !== key)
    setBlends(blends.map((b) => (b.id === blend.id ? { ...b, wishlist: next } : b)))
    setMenu(null)
  }
  // Mix cover right-click menu + its editor modals.
  const [coverMenu, setCoverMenu] = useState(null) // { x, y }
  const [coverPicker, setCoverPicker] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const patchBlend = (patch) => setBlends(blends.map((b) => (b.id === blend.id ? { ...b, ...patch } : b)))
  function leaveMix() {
    if (!window.confirm(`Leave ${blend.name}?`)) return
    patchBlend({ members: blend.members.filter((c) => c !== SELF) })
    onBack()
  }
  function deleteBlend() {
    if (!window.confirm(`Delete ${blend.name}? This removes it for everyone.`)) return
    setBlends(blends.filter((b) => b.id !== blend.id))
    onBack()
  }

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // The wheel + this page's menus/modals are local state, so publish them to
  // this participant's spectate path and read them back on a spectate instance
  // (a moderator can't open the wheel or a menu on the mirror itself).
  const [bUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/blendUI` : 'spectate/__nobui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/blendUI`, {
      blendId: blend.id,
      menu: menu ? { x: menu.x, y: menu.y, title: menu.title } : null,
      coverMenu: coverMenu ? { x: coverMenu.x, y: coverMenu.y } : null,
      coverPicker: !!coverPicker,
      renameOpen: !!renameOpen,
      inviteOpen: !!inviteOpen,
      playlistOpen: !!playlistOpen,
    })
  }, [blend.id, menu, coverMenu, coverPicker, renameOpen, inviteOpen, playlistOpen])
  // Only trust the mirror when it's for the Mix currently being viewed.
  const bui = IS_SPECTATE && bUI?.blendId === blend.id ? bUI : null
  const eMenu = IS_SPECTATE ? (bui?.menu ?? null) : menu
  const eCoverMenu = IS_SPECTATE ? (bui?.coverMenu ?? null) : coverMenu
  const eCoverPicker = IS_SPECTATE ? !!bui?.coverPicker : coverPicker
  const eRenameOpen = IS_SPECTATE ? !!bui?.renameOpen : renameOpen
  const eInviteOpen = IS_SPECTATE ? !!bui?.inviteOpen : inviteOpen
  const ePlaylistOpen = IS_SPECTATE ? !!bui?.playlistOpen : playlistOpen

  const games = blend.games.map((k) => CATALOG[k]).filter(Boolean)
  const m = blend.members
  // A blend can hold any number of games, so the feed wraps rather than
  // assuming there are four to name.
  const g = (i) => (games.length ? games[i % games.length] : { title: 'a game' })
  // Activity feed — includes you (green/sauhee) alongside the other members.
  const feed = [
    { who: SELF, text: `PLAYlisted ${g(2).title}`, when: '1h' },
    { who: m[1] || SELF, text: `finished ${g(0).title} and left it five stars`, when: '2h' },
    { who: m[2] || m[1] || SELF, text: `is in a ${g(1).title} lobby — one seat open`, when: 'live' },
    { who: SELF, text: `added ${g(3).title} to the group list`, when: 'yest' },
    { who: m[1] || SELF, text: `pinned ${blend.when} as their free window`, when: '2d' },
  ]

  // Rankable group wishlist — shared. Dragging reorders blend.wishlist for
  // everyone in the room (writes the new order to the realtime DB).
  // The PLAYlist is exactly what the group curates — empty until they add games.
  const wishKeys = blend.wishlist || []
  const wish = wishKeys.map((k) => CATALOG[k]).filter(Boolean)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  function dropAt(i) {
    if (dragIdx !== null && dragIdx !== i) {
      const next = wishKeys.slice()
      const [moved] = next.splice(dragIdx, 1)
      next.splice(i, 0, moved)
      setBlends(blends.map((b) => (b.id === blend.id ? { ...b, wishlist: next } : b)))
    }
    setDragIdx(null)
    setOverIdx(null)
  }
  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      {/* The gutters live on the inner wrappers (not the scroll container) so
          the banner and the wheel band can bleed to the pane's edges. */}
      <div className="no-scrollbar flex-1 overflow-y-auto pb-[80px]">
        {/* Header banner — the same wireframe footage the home page runs on */}
        <section className="relative overflow-hidden">
          <video
            ref={bannerRef}
            onTimeUpdate={onBannerTime}
            className="pointer-events-none absolute inset-0 size-full object-cover"
            style={{ transition: 'opacity 1.5s ease-in-out' }}
            src="/PartyHome.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Darken the footage and settle it into the page background */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.5) 0%, rgba(12,12,14,0.62) 60%, #0c0c0e 100%)' }}
          />
          {/* Top gap matches the breathing room between this banner and the
              PLAYlist below it, so the header isn't crowded against the frame. */}
          <div className="relative mx-auto w-full max-w-[1280px] px-[40px] pb-[30px] pt-[74px]">

          {/* Header — cover quad + name + members + refresh note */}
          <div className="flex items-center gap-[28px]">
            <div
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCoverMenu({ x: e.clientX, y: e.clientY }) }}
              title="Click the pencil (or right-click) to edit this Mix"
              className="group/cover relative size-[184px] shrink-0 cursor-pointer overflow-hidden rounded-[16px] bg-[#1a1a1d]"
            >
              {blend.cover ? (
                <img alt="" src={blend.cover} className="size-full object-cover" />
              ) : (
                <div className="grid size-full grid-cols-2 grid-rows-2 gap-[2px]">
                  {mixCoverImages(blend).map((src, i) => (
                    <img key={i} alt="" src={src} className="size-full object-cover" />
                  ))}
                </div>
              )}
              {/* Explicit edit affordance — the right-click menu isn't discoverable. */}
              <button
                onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setCoverMenu({ x: r.left, y: r.bottom + 6 }) }}
                title="Edit this Mix"
                aria-label="Edit this Mix"
                className="absolute bottom-[8px] right-[8px] flex size-[34px] items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur transition hover:bg-black/85 group-hover/cover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            </div>
            <div>
              <div className="flex items-center gap-[14px]">
                <h1 className="text-[52px] font-semibold leading-none tracking-tight text-white">{blend.name}</h1>
                {/* Clear edit affordance right next to the title */}
                <button
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCoverMenu({ x: r.left, y: r.bottom + 6 }) }}
                  title="Edit this Mix"
                  aria-label="Edit this Mix"
                  className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
              </div>
              <div className="mt-[16px] flex items-center gap-[10px] text-[18px] text-[#e7e7e7]">
                A Mix of games for
                <span className="flex items-center">
                  {blend.members.map((c, i) => (
                    <Avatar key={i} color={c} size={30} style={{ marginRight: i < blend.members.length - 1 ? -10 : 0, boxShadow: '0 0 0 2px #0c0c0e' }} />
                  ))}
                </span>
                {/* Bring more people into the Mix */}
                <button
                  onClick={() => setInviteOpen(true)}
                  title="Add players to this Mix"
                  aria-label="Add players to this Mix"
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#23a55a] text-white shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition hover:scale-105 hover:bg-[#1e9150]"
                >
                  <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              <p className="mt-[10px] text-[15px] font-semibold text-white">Refreshes daily.</p>

              {/* Decide-a-game entry point — matches the group's preferences.
                  (The spin wheel now lives in the top bar as its own module.) */}
              <div className="mt-[16px]">
                <button
                  onClick={onDecide}
                  className="group/dec flex shrink-0 items-center gap-[9px] text-[#3fbf3f] transition hover:opacity-85"
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" /></svg>
                  <span className="text-[17px] font-bold italic">Can&rsquo;t Decide? Match our preferences</span>
                </button>
              </div>
            </div>
          </div>

          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-[40px]">
          {/* The band carries its own green edges now, so this stays neutral. */}
          <div className="my-[28px] h-px" style={{ backgroundColor: '#1c1d21' }} />

          {/* Group wishlist — numbered, drag to rank */}
          <section>
            <div className="mb-[18px] flex items-baseline gap-[14px]">
              <h2 className="text-[28px] font-semibold text-white">Your Mix PLAYlist</h2>
              <span className="text-[12px] font-medium text-[#7e7f87]">drag to rank</span>
              <button onClick={() => setPlaylistOpen(true)} className="ml-auto text-[12px] font-semibold uppercase tracking-wide text-[#9a9ba3] transition hover:text-white">View entire PLAYlist</button>
            </div>
            {wish.length === 0 && (
              <button onClick={() => setPlaylistOpen(true)} className="flex w-full items-center gap-[14px] rounded-[14px] border border-dashed border-[#2b2d31] px-[20px] py-[22px] text-left transition hover:border-[#5765f2] hover:bg-white/[0.02]">
                <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#5765f2]/15 text-[#8b95ff]">
                  <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                <span>
                  <span className="block text-[16px] font-semibold text-white">Your PLAYlist is empty</span>
                  <span className="block text-[13px] text-[#9a9ba3]">Right-click a game or open the full PLAYlist to add the ones your group wants to play.</span>
                </span>
              </button>
            )}
            <div className="no-scrollbar flex gap-[20px] overflow-x-auto pb-[8px]">
              {wish.map((g, i) => (
                <div
                  key={g.title}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
                  onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                  onDrop={() => dropAt(i)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                  onClick={() => onOpen?.(g.title)}
                  onContextMenu={(e) => openMenu(e, g.title)}
                  className={
                    'w-[320px] shrink-0 cursor-pointer select-none rounded-[14px] p-[6px] ring-2 transition ' +
                    (dragIdx === i ? 'opacity-40 ' : '') +
                    (overIdx === i && dragIdx !== i ? 'ring-[#5765f2]' : 'ring-transparent')
                  }
                >
                  <div className="relative aspect-video overflow-hidden rounded-[12px] bg-[#1a1a1d]">
                    <img alt="" src={g.image} draggable={false} className="size-full object-cover" />
                    <span className="absolute left-[10px] top-[10px] flex size-[30px] items-center justify-center rounded-[8px] bg-black/70 text-[16px] font-bold text-white backdrop-blur">
                      {i + 1}
                    </span>
                  </div>
                  <p className="mt-[8px] text-[16px] font-semibold text-white">{g.title}</p>
                  <p className="text-[13px] text-[#9a9ba3]">{g.caption}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Daily recommended list + group activity feed */}
          <section className="mt-[44px] flex gap-[32px]">
            <div className="min-w-0 flex-1">
              <h2 className="mb-[20px] text-[28px] font-semibold text-white">Daily Recommended Games</h2>
              <div className="flex flex-col gap-[12px]">
                {games.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => onOpen?.(g.title)}
                    onContextMenu={(e) => openMenu(e, g.title)}
                    className="group flex items-center gap-[20px] rounded-[14px] p-[10px] text-left transition hover:bg-[#151517]"
                  >
                    <div className="h-[120px] w-[214px] shrink-0 overflow-hidden rounded-[12px] bg-[#1a1a1d]">
                      <img alt="" src={g.image} className="size-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[20px] font-semibold text-white">{g.title}</p>
                      <p className="mt-[2px] text-[13px] text-[#7e7f87]">{g.players} players · {g.playtime} · {g.genre}</p>
                      <p className="mt-[8px] max-w-[52ch] text-[14px] leading-snug text-[#9a9ba3]">{g.caption}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Group activity feed */}
            <aside className="hidden w-[320px] shrink-0 lg:block">
              <div className="rounded-[16px] bg-[#121214] p-[18px]">
                <p className="text-[16px] font-semibold text-white">What the group members are doing</p>
                <p className="mt-[2px] text-[12px] text-[#7e7f87]">Activity only shows this group.</p>
                <div className="mt-[18px] flex flex-col gap-[16px]">
                  {feed.map((f, i) => <FeedRow key={i} {...f} />)}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>

      {/* Right-click game menu */}
      {eMenu && (
        <ContextMenu
          x={eMenu.x}
          y={eMenu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Start a party', icon: PLAY_GLYPH, primary: true, onClick: () => launch(eMenu.title) },
            { divider: true },
            (blend.wishlist || []).includes(KEY_OF_TITLE[eMenu.title] || eMenu.title)
              ? { label: 'Remove from PLAYlist', icon: REMOVE_MENU_GLYPH, onClick: () => setPlaylistMembership(eMenu.title, false) }
              : { label: 'Add to PLAYlist', icon: BOOKMARK_MENU_GLYPH, onClick: () => setPlaylistMembership(eMenu.title, true) },
            { label: 'Add to Wheel', icon: WHEEL_MENU_GLYPH, onClick: () => { addToWheel(eMenu.title); setMenu(null) } },
            { label: 'Share', icon: SHARE_MENU_GLYPH, onClick: () => { onShare?.(eMenu.title); setMenu(null) } },
          ]}
        />
      )}

      {/* Right-click Mix cover menu */}
      {eCoverMenu && (
        <ContextMenu
          x={eCoverMenu.x}
          y={eCoverMenu.y}
          onClose={() => setCoverMenu(null)}
          items={mixMenuItems(blend, {
            onRename: () => { setRenameOpen(true); setCoverMenu(null) },
            onCover: () => { setCoverPicker(true); setCoverMenu(null) },
            onPin: () => { patchBlend({ pinned: !blend.pinned }); setCoverMenu(null) },
            onManage: () => { setInviteOpen(true); setCoverMenu(null) },
            onSetNotif: (lvl) => { patchBlend({ notif: lvl }); setCoverMenu(null) },
            onLeave: () => { setCoverMenu(null); leaveMix() },
            onDelete: () => { setCoverMenu(null); deleteBlend() },
          })}
        />
      )}
      {eCoverPicker && <CoverPickerModal blend={blend} games={games} onClose={() => setCoverPicker(false)} onSave={patchBlend} />}
      {eRenameOpen && <RenameMixModal blend={blend} onClose={() => setRenameOpen(false)} onSave={patchBlend} />}
      {eInviteOpen && <InviteMembersModal blend={blend} onClose={() => setInviteOpen(false)} onSave={patchBlend} />}
      {ePlaylistOpen && (
        <PlaylistModal
          blend={blend}
          keys={wishKeys}
          onClose={() => setPlaylistOpen(false)}
          onReorder={(next) => patchBlend({ wishlist: next })}
          onToggle={(key, add) => { const cur = wishKeys; patchBlend({ wishlist: add ? (cur.includes(key) ? cur : [...cur, key]) : cur.filter((k) => k !== key) }) }}
        />
      )}
      {launching && <LaunchToast title={launching} onDone={() => setLaunching(null)} />}
    </main>
  )
}

// ── Create a "Blend" modal (Figma node 531:2105) ───────────────────────────
// Game search — a command-palette-style overlay that filters the catalog and
// opens a game's detail page on select (Enter picks the top result).
function SearchModal({ onClose, onOpen }) {
  const [q, setQ] = useState('')
  useEscClose(onClose)
  const query = q.trim().toLowerCase()
  const results = Object.entries(CATALOG)
    .filter(([, v]) => !query || v.title.toLowerCase().includes(query) || (v.genre || '').toLowerCase().includes(query))
    .slice(0, 8)
  const pick = (title) => { onOpen(title); onClose() }
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 p-4 pt-[12vh]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[560px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-[12px] border-b border-black/20 px-[18px] py-[14px]">
          <svg viewBox="0 0 24 24" className="size-[20px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0][1].title) }}
            placeholder="Search games"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-[#87898c]"
          />
        </div>
        <div className="no-scrollbar max-h-[52vh] overflow-y-auto p-[8px]">
          {results.length ? results.map(([k, v]) => (
            <button key={k} onClick={() => pick(v.title)} className="flex w-full items-center gap-[12px] rounded-[8px] p-[8px] text-left transition hover:bg-white/5">
              <img alt="" src={v.image} className="h-[44px] w-[78px] shrink-0 rounded-[6px] object-cover" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-white">{v.title}</p>
                <p className="truncate text-[13px] text-[#9a9ba3]">{capName(v.genre || 'game')} · {v.players} players</p>
              </div>
            </button>
          )) : <p className="px-[12px] py-[16px] text-[14px] text-[#9a9ba3]">No games match “{q}”.</p>}
        </div>
      </div>
    </div>
  )
}

// "See who's on PARTY" — friends list (online first) with a one-tap Create-a-Mix.
function WhosOnModal({ onClose, onCreated }) {
  const { blends, setBlends, online } = useRoomCtx()
  const hiddenP = useHidden()
  const friends = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const [sel, setSel] = useState({})
  const [gifted, setGifted] = useState({})
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  // Blake / Chloe / Daniel are on Arcade (selectable for a Mix); OFF_ARCADE
  // friends aren't yet and get a Gift button.
  const sorted = friends.filter((d) => !query || capName(d.name).toLowerCase().includes(query))
  const offArcade = OFF_ARCADE_FRIENDS.filter((d) => !query || capName(d.name).toLowerCase().includes(query))
  useEscClose(onClose)
  const [dupMix, setDupMix] = useState(null)
  const toggle = (n) => { setDupMix(null); setSel((s) => ({ ...s, [n]: !s[n] })) }
  const chosen = friends.filter((f) => sel[f.name])
  function createMix() {
    if (!chosen.length) return
    // Block making a second Mix with the exact same people.
    const dup = findDuplicateMix(blends, [SELF, ...chosen.map((f) => f.color)])
    if (dup) { setDupMix(dup); return }
    const name = [capName(SELF_NAME), ...chosen.map((f) => capName(f.name))].join(', ')
    const games = STARTER_MIX_GAMES
    const newBlend = {
      id: slug(name) + '-' + Date.now().toString(36).slice(-4),
      name,
      color: BLEND_COLORS[blends.length % BLEND_COLORS.length],
      when: 'just now',
      members: [SELF],
      invited: chosen.map((f) => f.color),
      games,
      wishlist: [],
    }
    setBlends([...blends, newBlend])
    chosen.forEach((f) => putDM(f.name, {
      from: SELF_NAME, to: f.name, kind: 'invite',
      blendId: newBlend.id, blendName: name, status: 'pending', ts: Date.now(),
    }))
    onCreated?.(newBlend.id)
  }
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[460px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Who’s on ARCADE</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Pick who to start a Mix with.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-[24px] pt-[16px]">
          <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] pb-[16px] pt-[10px]">
          {sorted.length === 0 && offArcade.length === 0 && <p className="py-[6px] text-[13px] text-[#6f7276]">No friends match “{q}”.</p>}
          {/* On ARCADE — selectable for a Mix */}
          {sorted.map((f) => {
            const on = !!sel[f.name]
            return (
              <button key={f.name} onClick={() => toggle(f.name)} className="flex w-full items-center gap-[12px] py-[8px] text-left">
                <span className="relative shrink-0">
                  <Avatar color={f.color} size={40} />
                  <span className="absolute -bottom-[1px] -right-[1px] size-[13px] rounded-full ring-[3px] ring-[#2b2d31]" style={{ backgroundColor: '#23a55a' }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{capName(f.name)}</p>
                  <p className="text-[13px]" style={{ color: '#23a55a' }}>On Arcade</p>
                </div>
                <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
                  {on && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                </span>
              </button>
            )
          })}
          {/* Not on ARCADE — invite them with a gift */}
          {offArcade.length > 0 && (
            <p className="mb-[2px] mt-[14px] text-[12px] font-semibold uppercase tracking-wide text-[#80848e]">Not on ARCADE</p>
          )}
          {offArcade.map((f) => (
            <div key={f.name} className="flex w-full items-center gap-[12px] py-[8px]">
              <span className="relative shrink-0">
                <Avatar color={f.color} size={40} />
                <span className="absolute -bottom-[1px] -right-[1px] size-[13px] rounded-full ring-[3px] ring-[#2b2d31]" style={{ backgroundColor: '#80848e' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white">{capName(f.name)}</p>
                <p className="text-[13px]" style={{ color: '#80848e' }}>Offline</p>
              </div>
              <button
                onClick={() => setGifted((g) => ({ ...g, [f.name]: true }))}
                disabled={gifted[f.name]}
                className={'flex shrink-0 items-center gap-[6px] rounded-[8px] px-[12px] py-[7px] text-[13px] font-semibold text-white transition ' + (gifted[f.name] ? 'bg-[#3a3d41]' : 'bg-[#5765f2] hover:brightness-110')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]"><path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" /></svg>
                {gifted[f.name] ? 'Gifted' : 'Gift'}
              </button>
            </div>
          ))}
        </div>
        {dupMix && (
          <div className="mx-[24px] mb-[2px] mt-[4px] flex items-center justify-between gap-[10px] rounded-[8px] bg-[#f0505b]/12 px-[12px] py-[10px]">
            <p className="text-[13px] text-[#f0a0a6]">You already have a Mix with these people — <span className="font-semibold text-white">{dupMix.name}</span>.</p>
            <button onClick={() => onCreated?.(dupMix.id)} className="shrink-0 text-[13px] font-semibold text-[#5765f2] transition hover:underline">Open it</button>
          </div>
        )}
        <div className="flex items-center justify-center gap-[10px] border-t border-black/20 px-[24px] py-[16px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button
            disabled={!chosen.length}
            onClick={createMix}
            className="rounded-[8px] bg-[#5765f2] px-[18px] py-[10px] text-[14px] font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create a Mix{chosen.length ? ` with ${chosen.length}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// The "Gift ARCADE" nav button opens this — a list of friends who aren't on
// Arcade yet, with select-to-gift.
function GiftArcadeModal({ onClose }) {
  const [sel, setSel] = useState({})
  const [q, setQ] = useState('')
  const [sent, setSent] = useState(false)
  useEscClose(onClose)
  const query = q.trim().toLowerCase()
  const list = OFF_ARCADE_FRIENDS.filter((f) => !query || capName(f.name).toLowerCase().includes(query))
  const toggle = (n) => setSel((s) => ({ ...s, [n]: !s[n] }))
  const chosen = OFF_ARCADE_FRIENDS.filter((f) => sel[f.name])
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[460px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Gift ARCADE</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Pick friends who aren’t on Arcade yet.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-[24px] pt-[16px]">
          <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] pb-[16px] pt-[10px]">
          {list.length === 0 && <p className="py-[6px] text-[13px] text-[#6f7276]">No friends match “{q}”.</p>}
          {list.map((f) => {
            const on = !!sel[f.name]
            return (
              <button key={f.name} onClick={() => toggle(f.name)} className="flex w-full items-center gap-[12px] py-[8px] text-left">
                <span className="relative shrink-0">
                  <Avatar color={f.color} size={40} />
                  <span className="absolute -bottom-[1px] -right-[1px] size-[13px] rounded-full ring-[3px] ring-[#2b2d31]" style={{ backgroundColor: '#80848e' }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{capName(f.name)}</p>
                  <p className="text-[13px]" style={{ color: '#80848e' }}>Not on Arcade</p>
                </div>
                <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
                  {on && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-[10px] border-t border-black/20 px-[24px] py-[16px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button
            disabled={!chosen.length}
            onClick={() => { setSent(true); setTimeout(onClose, 700) }}
            className="flex items-center gap-[7px] rounded-[8px] bg-[#5765f2] px-[18px] py-[10px] text-[14px] font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-[16px]"><path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" /></svg>
            {sent ? 'Gift sent!' : `Gift Arcade${chosen.length ? ` to ${chosen.length}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateBlendModal({ onClose, onCreated }) {
  const { blends, setBlends } = useRoomCtx()
  const hiddenP = useHidden()
  const friends = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const [sel, setSel] = useState({})
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const [nameOverride, setNameOverride] = useState(null)
  const [dupMix, setDupMix] = useState(null)
  const toggleSel = (name) => { setDupMix(null); setSel((s) => ({ ...s, [name]: !s[name] })) }
  const selectedFriends = friends.filter((f) => sel[f.name])
  const selectedNames = selectedFriends.map((f) => cap(f.name))
  const anySelected = selectedNames.length > 0
  // The generated name includes you (the creator), not just the people invited.
  const blendName = nameOverride !== null ? nameOverride : [cap(SELF_NAME), ...selectedNames].join(', ')
  function createBlend() {
    // Block making a second Mix with the exact same people.
    const dup = findDuplicateMix(blends, [SELF, ...selectedFriends.map((f) => f.color)])
    if (dup) { setDupMix(dup); return }
    const name = (blendName || 'New Mix').trim()
    const games = STARTER_MIX_GAMES
    const newBlend = {
      id: slug(name) + '-' + Date.now().toString(36).slice(-4),
      name,
      color: BLEND_COLORS[blends.length % BLEND_COLORS.length],
      when: 'just now',
      // Only the creator is a member up front; invitees join once they accept.
      members: [SELF],
      invited: selectedFriends.map((f) => f.color),
      games,
      wishlist: [],
    }
    setBlends([...blends, newBlend])
    // Drop an invitation into each invitee's DM — they accept or decline there.
    selectedFriends.forEach((f) => {
      putDM(f.name, {
        from: SELF_NAME, to: f.name, kind: 'invite',
        blendId: newBlend.id, blendName: name, status: 'pending', ts: Date.now(),
      })
    })
    onCreated?.(newBlend.id)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
      >
        <div className="p-[24px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[22px] font-bold text-white">Create a Mix</h3>
              <p className="mt-[4px] text-[15px] text-[#b5bac1]">Select who you want to create a Mix with.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="mt-[16px] flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[10px]">
            <svg viewBox="0 0 24 24" className="size-[18px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>

          <p className="mt-[16px] text-[12px] font-semibold uppercase tracking-wide text-[#b5bac1]">
            Add friends or server members to Mixes
          </p>
          <div className="no-scrollbar mt-[8px] flex max-h-[280px] flex-col overflow-y-auto">
            {friends.map((f) => {
              const on = !!sel[f.name]
              return (
                <button
                  key={f.name}
                  onClick={() => toggleSel(f.name)}
                  className="flex items-center gap-[12px] rounded-[8px] py-[8px] pl-[4px] pr-[6px] text-left transition hover:bg-white/5"
                >
                  <Avatar color={f.color} size={40} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[15px] font-semibold text-white">{cap(f.name)}</p>
                    <p className="text-[13px] text-[#b5bac1]">{f.name}</p>
                  </div>
                  <span className={'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 transition ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4e5058]')}>
                    {on && (
                      <svg viewBox="0 0 24 24" className="size-[16px] text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {anySelected ? (
          // Selected state — name the blend + create/cancel (Figma 564:1209)
          <div className="bg-[#232428] p-[24px]">
            <div className="flex items-center gap-[16px]">
              <div className="relative size-[56px] shrink-0">
                <div className="flex size-[56px] items-center justify-center rounded-full bg-[#1e1f22]">
                  <svg viewBox="0 0 24 24" className="size-[28px] text-[#6a6d73]" fill="currentColor"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5v1H3v-1Zm13.5-4.3c2 .6 3.5 2 3.5 4.3v1h-3v-1c0-1.6-.6-2.9-1.6-3.8.4-.3.7-.4 1.1-.5Z" /></svg>
                </div>
                <span className="absolute -right-[1px] -top-[1px] flex size-[22px] items-center justify-center rounded-full border-[3px] border-[#232428] bg-[#5765f2]">
                  <svg viewBox="0 0 24 24" className="size-[11px] text-white" fill="currentColor"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" /></svg>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <label className="text-[13px] text-[#b5bac1]">Mix Name (optional)</label>
                <input
                  value={blendName}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder="Mix name"
                  className="mt-[4px] w-full rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px] text-[14px] text-white outline-none placeholder:text-[#87898c]"
                />
              </div>
            </div>
            {dupMix && (
              <div className="mt-[14px] flex items-center justify-between gap-[10px] rounded-[8px] bg-[#f0505b]/12 px-[12px] py-[10px]">
                <p className="text-[13px] text-[#f0a0a6]">You already have a Mix with these people — <span className="font-semibold text-white">{dupMix.name}</span>.</p>
                <button onClick={() => onCreated?.(dupMix.id)} className="shrink-0 text-[13px] font-semibold text-[#5765f2] transition hover:underline">Open it</button>
              </div>
            )}
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button onClick={onClose} className="rounded-[8px] bg-[#2b2d31] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#35373c]">Cancel</button>
              <button onClick={createBlend} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Create a new Mix</button>
            </div>
          </div>
        ) : (
          // Default state — invite link (Figma 531:2105)
          <div className="bg-[#232428] p-[24px]">
            <p className="text-[14px] font-semibold text-white">Or, send an invite link</p>
            <div className="mt-[10px] truncate rounded-[8px] bg-[#1e1f22] px-[14px] py-[11px] text-[14px] text-[#b5bac1]">
              https://discord.gg/sfsdkjsjfjs
            </div>
            <p className="mt-[8px] text-[12px] text-[#7e7f87]">Your invite link expires in 24 hours.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add a game to a Blend's wishlist (opened from a card's bookmark) ────────
function WishlistModal({ game, onClose }) {
  const { blends, setBlends } = useRoomCtx()
  const key = KEY_OF_TITLE[game] || game // wishlist stores catalog keys
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  function toggle(b) {
    const has = (b.wishlist || []).includes(key)
    const wishlist = has ? b.wishlist.filter((x) => x !== key) : [...(b.wishlist || []), key]
    setBlends(blends.map((x) => (x.id === b.id ? { ...x, wishlist } : x)))
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[420px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="p-[24px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[20px] font-bold text-white">Add to Mix</h3>
              <p className="mt-[4px] text-[14px] text-[#b5bac1]">Add <span className="font-semibold text-white">{game}</span> to a Mix&rsquo;s XBOX PLAYlist.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="no-scrollbar mt-[16px] flex max-h-[320px] flex-col gap-[2px] overflow-y-auto">
            {blends.filter((b) => (b.members || []).includes(SELF)).map((b) => {
              const on = (b.wishlist || []).includes(key)
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b)}
                  className="flex items-center gap-[12px] rounded-[8px] p-[8px] text-left transition hover:bg-white/5"
                >
                  <span className="size-[40px] shrink-0 rounded-[10px]" style={{ backgroundColor: b.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-white">{b.name}</p>
                    <p className="text-[12px] text-[#80848e]">{b.members.length} members</p>
                  </div>
                  <span className={'flex shrink-0 items-center rounded-[6px] px-[14px] py-[7px] text-[13px] font-semibold text-white transition ' + (on ? 'bg-[#248046]' : 'bg-[#4e5058]')}>
                    {on ? '✓ Added' : '+ Add'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── "Add Your Preferences" modal (Figma node 561:2666) ─────────────────────
// Each member tells the group what they're in the mood for; picks flow into the
// decision page. Styled to match CreateBlendModal.
function PrefRow({ who, label, onRemove }) {
  return (
    <div className="flex items-center gap-[12px] rounded-[8px] py-[8px] pl-[4px] pr-[6px]">
      <Avatar color={who} size={34} />
      <span className="min-w-0 flex-1 truncate text-[15px] text-white">{label}</span>
      <span className="shrink-0 text-[12px] font-medium" style={{ color: D.mute }}>{NAME[who] || 'you'}</span>
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove" className="shrink-0 text-[#b5bac1] transition hover:text-white">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  )
}

function PreferenceModal({ blend, onClose, onContinue }) {
  // Preferences are shared per blend, keyed by member name — every member's
  // picks sync live into "the group so far".
  const [groupPrefs, setGroupPrefs] = useRoomNode('prefs/' + blend.id, {})
  const mine = groupPrefs[SELF_NAME] || []
  const [input, setInput] = useState('')
  const MAX = 3
  const full = mine.length >= MAX

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Flatten all members' prefs (only this blend's members), newest members last.
  const groupSoFar = blend.members
    .map((c) => NAME[c])
    .flatMap((n) => (groupPrefs[n] || []).map((p) => ({ ...p, name: n, who: COLOR_OF[n] })))
  const has = (label) => groupSoFar.some((p) => p.label === label)
  function setMinePrefs(list) {
    setGroupPrefs({ ...groupPrefs, [SELF_NAME]: list })
  }
  function add(pref) {
    if (full || has(pref.label)) return
    setMinePrefs([...mine, { label: pref.label, tag: pref.tag }])
  }
  function addTyped() {
    const label = input.trim()
    if (!label || full || has(label)) { setInput(''); return }
    setMinePrefs([...mine, { label, tag: guessTag(label) }])
    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
      >
        <div className="p-[24px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[22px] font-bold italic text-white">Add Your Preferences</h3>
              <p className="mt-[4px] text-[15px]" style={{ color: D.dim }}>What are you in the mood for tonight?</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Input + n/3 counter */}
          <div className="mt-[18px] flex items-stretch gap-[10px]">
            <div className="flex min-w-0 flex-1 items-center rounded-[8px] bg-[#1e1f22] px-[14px]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTyped() }}
                disabled={full}
                placeholder={full ? "That's 3 — you're set" : 'Type a preference and press Enter'}
                className="min-w-0 flex-1 bg-transparent py-[12px] text-[14px] text-white outline-none placeholder:text-[#87898c] disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex w-[54px] shrink-0 items-center justify-center rounded-[8px] bg-[#1e1f22] text-[15px] font-semibold" style={{ color: full ? D.green : D.dim }}>
              {mine.length}/{MAX}
            </div>
          </div>

          {/* Suggested picks */}
          <div className="mt-[14px] flex flex-wrap gap-[8px]">
            {PREF_SUGGESTIONS.map((p) => {
              const on = has(p.label)
              return (
                <button
                  key={p.label}
                  onClick={() => add(p)}
                  disabled={on || full}
                  className={
                    'rounded-full border px-[12px] py-[6px] text-[13px] transition ' +
                    (on
                      ? 'cursor-default border-[#107C10] bg-[#107C10]/15 text-[#3fbf3f]'
                      : full
                        ? 'cursor-not-allowed border-[#3a3c41] text-[#5f616a]'
                        : 'border-[#4e5058] text-[#dbdee1] hover:border-white hover:text-white')
                  }
                >
                  + {p.label}
                </button>
              )
            })}
          </div>

          {/* Everyone's preferences so far */}
          <p className="mt-[20px] text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.dim }}>
            The group so far
          </p>
          <div className="no-scrollbar mt-[6px] flex max-h-[220px] flex-col overflow-y-auto">
            {groupSoFar.length === 0 && (
              <p className="py-[8px] text-[13px]" style={{ color: D.mute }}>No preferences yet — add yours above.</p>
            )}
            {groupSoFar.map((p) => (
              <PrefRow
                key={p.name + ':' + p.label}
                who={p.who}
                label={p.label}
                onRemove={p.name === SELF_NAME ? () => setMinePrefs(mine.filter((x) => x.label !== p.label)) : undefined}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-[12px] bg-[#232428] p-[24px]">
          <p className="text-[13px]" style={{ color: D.mute }}>We&rsquo;ll spin up games that fit everyone.</p>
          <button
            onClick={() => onContinue(groupSoFar)}
            className="flex items-center gap-[8px] rounded-[10px] bg-[#107C10] px-[22px] py-[11px] text-[15px] font-semibold text-white transition hover:bg-[#0e8f0e]"
          >
            Find our game
            <span className="text-[18px] leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Decision wheel — one shared spin the whole server watches ──────────────
const WHEEL_COLORS = ['#5765f2', '#23a55a', '#eb459e', '#f0b232', '#9A45F7', '#5165F6', '#FF3737', '#3ba55d']
const SPIN_MS = 4000
// Whole turns before the wheel starts braking — a lot of them, so it whips
// around fast instead of gliding. Randomized per spin (and shared), so no two
// spins look alike.
const MIN_TURNS = 9
const MAX_TURNS = 16
// How long a spin stays the room's business before it's treated as over.
const SPIN_EXPIRY = 10 * 60 * 1000
// Cover art only reads while the slices are wide enough to show it. Past
// ART_FULL games it fades out slice by slice, and past ART_NONE it isn't
// rendered — or loaded — at all, leaving the color wheel underneath.
const ART_FULL = 7
const ART_NONE = 12

// Everything that makes one spin unique. The spinner rolls it once and writes
// it to the room, so every screen runs the identical animation.
function rollSpin(count, lastTarget) {
  // Never land on the game we just picked — a re-roll that repeats itself reads
  // as broken, however fair it is.
  const pool = [...Array(count).keys()].filter((i) => count > 2 ? i !== lastTarget : true)
  return {
    target: pool[Math.floor(Math.random() * pool.length)],
    turns: MIN_TURNS + Math.floor(Math.random() * (MAX_TURNS - MIN_TURNS + 1)),
    // Land off-center inside the slice so the pointer doesn't stop dead
    // straight every time.
    jitter: (Math.random() - 0.5) * 0.7,
  }
}

/**
 * The live spin lives at rooms/<room>/spin — one at a time for the whole
 * server. Everybody reads the same target and start time, so every wheel lands
 * on the same game at the same moment without anyone re-rolling locally.
 */
function useSpin() {
  const [raw, writeSpin, ready] = useRoomNode('spin', null)
  const [, tick] = useState(0)

  // Clock skew between testers would shift when the wheel stops, so anchor the
  // countdown to the earlier of "when the spinner says it started" and "when we
  // first heard about it" — a rejoin still resolves instantly.
  const seen = useRef({})
  const id = raw?.id
  if (id && seen.current[id] == null) seen.current[id] = Date.now()
  const anchor = raw ? Math.min(raw.startedAt || 0, seen.current[id] ?? Date.now()) : 0

  // A spin nobody cleared shouldn't haunt the room. After a while it stops
  // counting: the notification goes, and every wheel is free again.
  const spin = raw && Date.now() - anchor < SPIN_EXPIRY ? raw : null
  const remaining = spin ? anchor + SPIN_MS - Date.now() : 0

  // Re-render exactly when the wheel is due to stop: "spinning" becomes
  // "result" for everyone with no extra write.
  useEffect(() => {
    if (!spin || remaining <= 0) return
    const t = setTimeout(() => tick((v) => v + 1), remaining + 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, anchor])

  const phase = !spin ? 'idle' : remaining > 0 ? 'spinning' : 'result'
  const picked = spin && spin.games ? spin.games[spin.target] : null
  const vote = (v) => writeRoomPath(`spin/votes/${SELF_NAME}`, v)
  const clear = () => writeSpin(null)

  // Boot clean: whatever was left over from the last run is wiped the first
  // time the room loads, so the app never opens on a spun wheel. A wheel that's
  // genuinely mid-turn is left alone — reloading shouldn't yank a live spin
  // away from everyone else in the room.
  const booted = useRef(false)
  useEffect(() => {
    if (!ready || booted.current) return
    booted.current = true
    // Only a real tester should reset a stale wheel — a spectator/moderator
    // instance must never write to the shared room.
    if (IS_LIVE && phase !== 'spinning') clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  return { spin, writeSpin, phase, remaining, picked, vote, clear, ready }
}

// Who is being waited on. Anyone who votes counts, even if they came online
// after the roster was captured.
function spinTally(spin) {
  const votes = spin?.votes || {}
  const people = [...new Set([...(spin?.roster || []), ...Object.keys(votes)])]
  const yes = people.filter((n) => votes[n] === 'yes')
  const no = people.filter((n) => votes[n] === 'no')
  const waiting = people.filter((n) => !votes[n])
  return { people, votes, yes, no, waiting, allIn: people.length > 0 && waiting.length === 0 && no.length === 0 }
}

function DecisionWheel({ games, spin, remaining, onSpin, disabled, spinning }) {
  const [rotation, setRotation] = useState(0)
  const [dur, setDur] = useState(0)
  const shown = useRef(null)
  const at = useRef(0) // where the wheel currently sits, for chaining spins
  // Slice clip paths are referenced by id, so they have to be unique per wheel.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const n = games.length
  const R = 198
  const C = 210
  const seg = n ? 360 / n : 360
  // Point on the wheel at `deg` measured clockwise from the top (12 o'clock).
  const pt = (deg, rad = R) => {
    const a = (deg * Math.PI) / 180
    return [C + rad * Math.sin(a), C - rad * Math.cos(a)]
  }

  // Past ART_FULL slices the art is too narrow to read, so it fades out as
  // games pile on and stops being requested at all once it's invisible.
  const art = n <= ART_FULL ? 1 : Math.max(0, (ART_NONE - n) / (ART_NONE - ART_FULL))

  // Geometry per slice: the wedge itself, and a square big enough to cover its
  // bounding box, dropped on the slice's axis so each wedge shows its own art
  // rather than a shared crop of the whole wheel.
  const slices = games.map((g, i) => {
    const [x0, y0] = pt(i * seg)
    const [x1, y1] = pt((i + 1) * seg)
    return {
      g,
      i,
      center: i * seg + seg / 2,
      wedge: `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`,
      side: Math.max(2 * R * Math.sin((Math.min(seg, 180) / 2) * (Math.PI / 180)), R) * 1.02,
      clip: `${uid}-slice-${i}`,
    }
  })

  const target = spin?.target
  // Drive the wheel off the shared session: land `target` under the pointer,
  // and give a late arrival only the time that's actually left.
  useEffect(() => {
    if (!spin || target == null) {
      shown.current = null
      at.current = 0
      setDur(0)
      setRotation(0)
      return
    }
    if (shown.current === spin.id) return
    shown.current = spin.id
    // Where under the pointer this spin should stop, measured clockwise from
    // the top — offset inside the slice by the shared jitter.
    const stop = (target + 0.5 + (spin.jitter || 0)) * seg
    const rest = (360 - (stop % 360) + 360) % 360
    // Carry on from wherever the last spin left the wheel, so a re-roll picks
    // up speed instead of snapping back to zero first.
    const from = at.current
    const delta = (rest - (((from % 360) + 360) % 360) + 360) % 360
    const final = from + (spin.turns || MIN_TURNS) * 360 + delta
    at.current = final
    if (remaining <= 150) {
      setDur(0)
      setRotation(final)
      return
    }
    setDur(remaining)
    setRotation(final)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.id, target])

  return (
    <div className="relative" style={{ width: C * 2, height: C * 2 }}>
      {/* Pointer */}
      <div className="absolute left-1/2 top-[-7px] z-10 -translate-x-1/2">
        <svg viewBox="0 0 24 28" className="h-[34px] w-[29px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
          <path d="M12 26 L2 4 A14 14 0 0 1 22 4 Z" fill="#ffffff" />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        className="size-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          filter: 'drop-shadow(0 0 22px rgba(45,160,0,0.35))',
          // Off the line at full speed, braking only in the last stretch.
          transition: dur > 0 ? `transform ${dur}ms cubic-bezier(0.06,0.86,0.18,1)` : 'none',
        }}
      >
        <defs>
          {art > 0 && slices.map(({ wedge, clip }) => (
            <clipPath key={clip} id={clip}>
              <path d={wedge} />
            </clipPath>
          ))}
        </defs>

        {/* Bright green rim, like the design's ring around the art. */}
        <circle cx={C} cy={C} r={R + 5} fill="#0a0d08" stroke="#2DA000" strokeWidth="7" />
        {slices.map(({ g, i, wedge, clip, center, side }) => (
          <g key={g.key || i}>
            {/* Color underneath doubles as the fallback if art won't load. */}
            <path d={wedge} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} />
            {/* The clip has to sit on an untransformed wrapper: an element's
                own transform is applied to its clip path too, so clipping and
                rotating on one node would swing the wedge out of place. */}
            {art > 0 && (
              <g clipPath={`url(#${clip})`}>
                <image
                  href={CATALOG[g.key]?.image}
                  x={C - side / 2}
                  y={C - R / 2 - side / 2}
                  width={side}
                  height={side}
                  preserveAspectRatio="xMidYMid slice"
                  transform={`rotate(${center} ${C} ${C})`}
                  className="pointer-events-none select-none"
                  style={{ opacity: art, transition: 'opacity 450ms ease' }}
                />
              </g>
            )}
            <path d={wedge} fill="none" stroke="#0c0c0e" strokeWidth="2" />
          </g>
        ))}
      </svg>

      {/* Center hub — click to spin. Stays "SPIN ME" even mid-turn, per the
          design; the disabled state is what says "not now". */}
      <button
        onClick={onSpin}
        disabled={disabled}
        aria-label="Spin the wheel"
        className="absolute left-1/2 top-1/2 flex size-[118px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_14px_rgba(0,0,0,0.55)] transition hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <span
          className="text-center uppercase italic text-[#0c0c0e]"
          style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: '31px', lineHeight: 0.85 }}
        >
          Spin<br />Me
        </span>
      </button>
    </div>
  )
}

// One row of the "who's in" list.
function VoteRow({ name, vote }) {
  const state = vote === 'yes'
    ? { text: "In", color: '#3fbf3f' }
    : vote === 'no'
      ? { text: 'Out', color: '#f04747' }
      : { text: 'Deciding…', color: D.mute }
  return (
    <div className="flex items-center gap-[10px] py-[6px]">
      <Avatar color={COLOR_OF[name] || D.raised} size={26} />
      <span className="flex-1 text-[14px] font-semibold text-white">
        {capName(name)}{name === SELF_NAME ? ' (you)' : ''}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: state.color }}>{state.text}</span>
    </div>
  )
}

// "I'm in / Not tonight" — shown to everyone who hasn't answered yet.
function VoteButtons({ my, onVote, compact }) {
  const base = compact
    ? 'rounded-[8px] px-[14px] py-[7px] text-[13px] font-semibold transition '
    : 'flex-1 rounded-[10px] px-[16px] py-[10px] text-[14px] font-semibold transition '
  return (
    <div className="flex items-center gap-[8px]">
      <button
        onClick={() => onVote('yes')}
        className={base + (my === 'yes' ? 'bg-[#107C10] text-white' : 'bg-[#107C10]/15 text-[#3fbf3f] hover:bg-[#107C10]/30')}
      >
        I&rsquo;m in
      </button>
      <button
        onClick={() => onVote('no')}
        className={base + (my === 'no' ? 'bg-[#f04747] text-white' : 'bg-white/5 text-[#b5bac1] hover:bg-white/10')}
      >
        Not tonight
      </button>
    </div>
  )
}

/**
 * Edit what's on the wheel. Sits beside it and stays scrollable however many
 * games pile up. A wheel needs at least two slices, so the last two can't be
 * removed.
 */
function EditorRow({ k, action, disabled, glyph, tone }) {
  return (
    <div className="flex items-center gap-[10px] rounded-[8px] py-[5px] pl-[5px] pr-[6px] transition hover:bg-white/5">
      <img alt="" src={CATALOG[k].image} className="h-[30px] w-[52px] shrink-0 rounded-[5px] object-cover" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{CATALOG[k].title}</span>
      <button
        onClick={action}
        disabled={disabled}
        aria-label={`${glyph === '+' ? 'Add' : 'Remove'} ${CATALOG[k].title}`}
        className={
          'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] text-[15px] font-bold leading-none transition disabled:cursor-not-allowed disabled:opacity-30 ' +
          tone
        }
      >
        {glyph}
      </button>
    </div>
  )
}

function WheelGameEditor({ keys, onChange, locked, isDefault, onReset }) {
  const [adding, setAdding] = useState(false)
  const pool = Object.keys(CATALOG).filter((k) => !keys.includes(k))

  const remove = (k) => { if (keys.length > 2) onChange(keys.filter((x) => x !== k)) }
  const add = (k) => onChange([...keys, k])

  return (
    <div className="flex w-full shrink-0 flex-col rounded-[14px] bg-[#0c0c0e] p-[14px] lg:w-[268px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>On the wheel</p>
        <span className="text-[13px]" style={{ color: D.mute }}>{keys.length}</span>
      </div>
      <p className="mt-[2px] text-[12px] leading-snug" style={{ color: D.mute }}>
        {keys.length > ART_FULL
          ? `Past ${ART_FULL} the slices get too thin for cover art.`
          : 'Only changes the wheel — nothing leaves the Mix.'}
      </p>

      <div className="thin-scrollbar mt-[8px] max-h-[190px] min-h-[86px] overflow-y-auto pr-[2px]">
        {keys.map((k) => (
          <EditorRow
            key={k}
            k={k}
            glyph="×"
            action={() => remove(k)}
            disabled={locked || keys.length <= 2}
            tone="bg-white/5 text-[#b5bac1] hover:bg-[#f04747] hover:text-white"
          />
        ))}
      </div>

      <div className="my-[10px] h-px bg-[#1c1d21]" />

      {adding ? (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>Add a game</p>
            <button onClick={() => setAdding(false)} className="text-[12px] font-semibold text-[#9a9ba3] transition hover:text-white">Done</button>
          </div>
          <div className="thin-scrollbar mt-[8px] max-h-[190px] overflow-y-auto pr-[2px]">
            {pool.length === 0 ? (
              <p className="py-[8px] text-[13px]" style={{ color: D.mute }}>Every game is already on the wheel.</p>
            ) : (
              pool.map((k) => (
                <EditorRow key={k} k={k} glyph="+" action={() => add(k)} disabled={locked} tone="bg-[#107C10]/20 text-[#3fbf3f] hover:bg-[#107C10] hover:text-white" />
              ))
            )}
          </div>
        </>
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={locked}
          className="flex items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-[#3a3c41] py-[9px] text-[13px] font-semibold text-[#b5bac1] transition hover:border-[#107C10] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#3a3c41]"
        >
          <span className="text-[15px] leading-none">+</span> Add a game
        </button>
      )}

      {locked ? (
        <p className="mt-[10px] text-[12px] leading-snug" style={{ color: D.mute }}>
          Hold on — the wheel&rsquo;s turning.
        </p>
      ) : !isDefault ? (
        <button
          onClick={onReset}
          className="mt-[10px] text-left text-[12px] font-semibold text-[#9a9ba3] transition hover:text-white"
        >
          Reset to the Mix&rsquo;s games
        </button>
      ) : null}
    </div>
  )
}

/**
 * The blend page's spin area: the wheel on the left, the wheel's game list
 * beside it, and on the right the live read on the room — who's been asked,
 * who's in, who's out — plus the play button once everyone has said yes.
 */
// "SPINNNNNNING" — the N's stretch up and down while the wheel turns.
function SpinningText() {
  return (
    <p className="uppercase leading-none text-white" style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: 'clamp(28px,3vw,46px)' }}>
      SPI{[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="spin-n" style={{ animationDelay: `${i * 80}ms` }}>N</span>
      ))}ING
    </p>
  )
}

// One row of the "Who's playing?" list — avatar with an in (green ✓) / out
// (red ✗) status badge, then the name.
function StatusRow({ name, vote }) {
  const yes = vote === 'yes'
  const no = vote === 'no'
  return (
    <div className="flex items-center gap-[12px]">
      <div className="relative shrink-0">
        <Avatar color={COLOR_OF[name] || D.raised} size={34} />
        {(yes || no) && (
          <span
            className="absolute -bottom-[2px] -right-[2px] flex size-[16px] items-center justify-center rounded-full"
            style={{ backgroundColor: yes ? '#7aff46' : '#ff5a5a', boxShadow: '0 0 0 2px #272727' }}
          >
            {yes ? (
              <svg viewBox="0 0 24 24" className="size-[11px]" fill="none" stroke="#0c0c0e" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-[10px]" fill="none" stroke="#0c0c0e" strokeWidth="3.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            )}
          </span>
        )}
      </div>
      <span className="text-[16px] text-white">{capName(name)}</span>
    </div>
  )
}

function SpinPanel({ blend, state, onLaunch }) {
  const { online } = useRoomCtx()
  const { spin, writeSpin, phase, remaining, picked, vote, clear } = state
  const here = spin && spin.blendId === blend.id ? spin : null
  const elsewhere = spin && spin.blendId !== blend.id ? spin : null

  // What's on the wheel is the wheel's business: a separate shared list that
  // starts as the blend's games PLUS the group's XBOX PLAYlist, so trimming it
  // is purely a "don't spin for that tonight" call and never touches the blend
  // or the catalog.
  const [savedKeys, setWheelKeys] = useRoomNode('wheel/' + blend.id, null)
  const saved = Array.isArray(savedKeys) ? savedKeys.filter((k) => CATALOG[k]) : null
  const custom = saved && saved.length >= 2 ? saved : null
  // Never trust a key straight from the room — a game that's left the catalog
  // would take the whole page down with it. PLAYlist picks lead, then the rest
  // of the Mix's games, deduped.
  const wheelKeys = custom || [...new Set([...(blend.wishlist || []), ...(blend.games || [])])].filter((k) => CATALOG[k])

  // Edits show on the wheel straight away. The one exception is the ~4s it's
  // actually turning: that animation is locked to the list the spinner rolled
  // against, or it would land somewhere other than the game everyone was told
  // won.
  const mid = !!here && phase === 'spinning'
  const games = mid ? here.games : wheelKeys.map((k) => ({ key: k, title: CATALOG[k].title }))
  const { people, votes, yes, no, allIn } = spinTally(here)
  const my = here ? votes[SELF_NAME] : undefined
  const iSpun = here?.spinner === SELF_NAME
  const cover = picked && here ? CATALOG[picked.key]?.image : null

  // A spin here puts the panel under a spotlight: everything else on the page
  // goes dark behind a scrim. The scrim outlives the spin by one fade so the
  // page eases back to full brightness instead of snapping.
  const spotlight = mid
  const [scrim, setScrim] = useState(spotlight)
  // The wheel's game list hides behind the "Add or delete Games" gear.
  const [editOpen, setEditOpen] = useState(false)
  useEffect(() => {
    if (spotlight) { setScrim(true); return }
    const t = setTimeout(() => setScrim(false), 480)
    return () => clearTimeout(t)
  }, [spotlight])

  function startSpin() {
    // Only a wheel that's mid-turn blocks a new spin — a finished one anywhere
    // just gets replaced, so nobody is ever stuck waiting on a stale result.
    if (games.length === 0 || phase === 'spinning') return
    // Everyone online when the wheel is spun gets asked — including the
    // spinner, who has to ready up (or bail) like anyone else.
    const roster = [...new Set([SELF_NAME, ...online])]
    writeSpin({
      id: Date.now().toString(36),
      blendId: blend.id,
      blendName: blend.name,
      spinner: SELF_NAME,
      games,
      ...rollSpin(games.length, here?.target),
      startedAt: Date.now(),
      roster,
      votes: {},
    })
  }

  return (
    <section className="relative" style={{ zIndex: scrim ? 60 : 'auto' }}>
      {/* Page-wide scrim: a fixed sheet slotted behind the band's own
          background (negative z inside this stacking context), so the band
          stays lit while everything around it goes dark. */}
      {scrim && (
        <div
          aria-hidden
          className="spin-scrim pointer-events-none fixed inset-0 -z-10"
          style={{ opacity: spotlight ? 1 : 0 }}
        />
      )}

      {/* Full-bleed band: a bright green horizon along the top, green haze
          falling away to black, and a faint green floor at the bottom. */}
      <div
        className="relative w-full"
        style={{
          background:
            'linear-gradient(0deg, rgba(45,160,0,0.20), transparent 16%), radial-gradient(85% 75% at 50% 0%, rgba(45,160,0,0.30), transparent 62%), #080a07',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background: 'linear-gradient(90deg, rgba(61,191,30,0), #3dbf1e 15%, #3dbf1e 85%, rgba(61,191,30,0))',
            boxShadow: '0 0 18px rgba(61,191,30,0.8)',
          }}
        />
        {/* Matching bottom edge — same horizon, no notch. */}
        <div
          className="absolute inset-x-0 bottom-0 h-[3px]"
          style={{
            background: 'linear-gradient(90deg, rgba(61,191,30,0), #3dbf1e 15%, #3dbf1e 85%, rgba(61,191,30,0))',
            boxShadow: '0 0 18px rgba(61,191,30,0.8)',
          }}
        />
        {/* The band goes near-black while the wheel is actually turning. */}
        <div
          className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-500"
          style={{ opacity: spotlight ? 0.45 : 0 }}
        />

        <div className="relative mx-auto w-full max-w-[1280px] px-[40px] pb-[46px] pt-[76px]">
          {/* Notch pointing back up at the "Can't Decide?" control */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[310px] top-[-9px] h-0 w-0"
            style={{
              borderLeft: '13px solid transparent',
              borderRight: '13px solid transparent',
              borderBottom: '10px solid #3dbf1e',
              filter: 'drop-shadow(0 0 8px rgba(61,191,30,0.7))',
            }}
          />

          {/* The wheel's game list waits behind the gear, out of the way — set
              off the band's top edge rather than tucked against it. */}
          <div className="absolute left-[40px] top-[34px] z-20">
            <button
              onClick={() => setEditOpen((v) => !v)}
              aria-expanded={editOpen}
              className="flex items-center gap-[8px] text-[13px] font-semibold text-[#3fbf3f] transition hover:text-[#7aff46]"
            >
              <svg viewBox="0 0 24 24" className="size-[17px]" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
              </svg>
              Add or delete Games
            </button>
            {editOpen && (
              <div className="absolute left-0 top-[30px] w-[300px] rounded-[14px] shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
                <WheelGameEditor
                  keys={wheelKeys}
                  onChange={setWheelKeys}
                  locked={mid}
                  isDefault={!custom}
                  onReset={() => setWheelKeys(null)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-[40px] lg:flex-row lg:gap-[56px]">
            {/* Wheel */}
            <div className="flex shrink-0 flex-col items-center">
              <DecisionWheel
                games={games}
                spin={here}
                remaining={remaining}
                onSpin={startSpin}
                spinning={!!here && phase === 'spinning'}
                disabled={phase === 'spinning'}
              />
              {/* This Mix's own states need no narration — the wheel, the
                  result card and the button already show them. The one thing
                  nothing else on this page would tell you is that the spin is
                  happening in a different Mix, so that alone gets a line. */}
              {elsewhere && (
                <p className="mt-[16px] max-w-[380px] text-center text-[13px]" style={{ color: D.mute }}>
                  {phase === 'spinning'
                    ? `${capName(elsewhere.spinner)} is spinning in ${elsewhere.blendName} — hang on.`
                    : `${elsewhere.blendName} picked ${elsewhere.games?.[elsewhere.target]?.title} — spin here to take over.`}
                </p>
              )}
            </div>

            {/* Right half: pitch, the big SPINNNNNNING, or the result card */}
            <div className="w-full flex-1 self-stretch lg:min-w-[380px]">
              {!here && (
                <div className="flex h-full flex-col justify-center">
                  <h3 className="text-[24px] font-semibold text-white">Let the wheel decide</h3>
                  <p className="mt-[8px] max-w-[46ch] text-[15px] leading-snug" style={{ color: D.dim }}>
                    Spinning notifies everyone on the server. When it lands, a party starts for the
                    picked game — you host, and everyone on the call gets invited to ready up.
                  </p>
                  <div className="mt-[18px] flex items-center gap-[8px]">
                    <span className="text-[13px]" style={{ color: D.mute }}>Online right now</span>
                    <span className="flex items-center">
                      {[...new Set([SELF_NAME, ...online])].map((n, i) => (
                        <Avatar key={n} color={COLOR_OF[n] || D.raised} size={26} style={{ marginRight: -8, boxShadow: '0 0 0 2px #0a0c08', zIndex: 10 - i }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {here && phase === 'spinning' && (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center">
                  <SpinningText />
                </div>
              )}

              {here && phase === 'result' && picked && (
                <div className="flex h-full flex-col justify-center">
                  {/* The wheel landed — go straight to a party for the picked
                      game (the spinner hosts, the call gets invited). No vote. */}
                  <div className="relative overflow-hidden rounded-[10px] border border-[#7aff46]/40">
                    {cover && <img alt="" src={cover} className="absolute inset-0 size-full object-cover" />}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(21,43,13,0.55), rgba(12,12,14,0.92))' }}
                    />
                    <div className="relative z-10 flex min-h-[238px] flex-col p-[24px]">
                      <p className="text-[16px] font-semibold text-[#7aff46]">The wheel picked</p>
                      <p
                        className="mt-[2px] uppercase leading-[0.95] text-white"
                        style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: 'clamp(30px,3.4vw,46px)' }}
                      >
                        {picked.title}
                      </p>
                      <div className="mt-auto flex items-center gap-[10px] pt-[20px]">
                        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#5765f2]">
                          <svg viewBox="0 0 24 24" className="size-[15px] animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                        </span>
                        <p className="text-[15px] text-[#dbdee1]">
                          {iSpun
                            ? 'Starting a party with everyone on the call…'
                            : `${capName(here.spinner)} is starting a party…`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Server-wide notification. Rendered above every page so a spin reaches people
 * who aren't on the blend — first "a game is about to be chosen", then the
 * pick, the in/out vote, and finally the shared play button.
 */
function SpinNotification({ state }) {
  const spinNames = useNames()
  const { spin, phase } = state
  const [dismissed, setDismissed] = useState(null)
  const key = spin ? spin.id : null

  // Once the wheel lands the party flow takes over (the spinner's client starts
  // a party for the picked game), so this heads-up only runs while it's turning.
  if (!spin || phase !== 'spinning' || dismissed === key) return null

  const iSpun = spin.spinner === SELF_NAME

  return (
    <div className="pointer-events-none fixed top-[24px] right-[24px] z-[90] flex justify-end px-4">
      <div className="pointer-events-auto flex max-w-[720px] items-center gap-[14px] rounded-[14px] border border-[#1c1d21] bg-[#111214] px-[18px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <span className="relative flex size-[34px] shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#107C10]/40" />
          <Avatar color={COLOR_OF[spin.spinner] || D.raised} size={34} />
        </span>
        <p className="text-[15px] text-[#dbdee1]">
          <span className="font-semibold text-white">{iSpun ? 'You' : dispName(spin.spinner, spinNames)}</span>
          {iSpun ? ' spun the wheel in ' : ' is spinning the wheel in '}
          <span className="font-semibold text-white">{spin.blendName}</span> — a game is about to be chosen.
        </p>
        <button
          onClick={() => setDismissed(key)}
          aria-label="Dismiss"
          className="ml-[4px] shrink-0 text-[#7e7f87] transition hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  )
}

// ── The spin wheel, as a standalone module (opened from the top bar) ─────────
// It's personal: you build it up with "Add to Wheel" or by loading a Mix's
// PLAYlist, and the spin runs locally on your screen. The only synced moment is
// the party it starts when it lands — that snapshots whoever's on the call right
// then, which is exactly why membership can keep changing without breaking it.
const CALL_WHEEL_EXPIRY = 20 * 60 * 1000
function WheelModal({ keys, setKeys, blends, online, onParty, onClose, autoJoin }) {
  // Two modes. Personal (default): your own list, local spin. Jam ("Sync with
  // call"): a shared, hosted session keyed to the room — one person starts it
  // empty, everyone else JOINS the live one (inheriting its games) and watches
  // it spin together, like a Spotify Jam. It ends when the host ends it or the
  // last person leaves; `lastActive` refreshes on every write so an in-use jam
  // never expires from under everyone.
  const jamNames = useNames()
  const [callWheel, setCallWheel] = useRoomNode('wheelCall', null)
  const participants = callWheel?.participants || {}
  const jamLive = !!callWheel && Object.keys(participants).length > 0 && Date.now() - (callWheel.lastActive || callWheel.startedAt || 0) < CALL_WHEEL_EXPIRY
  const isHost = callWheel?.host === SELF_NAME
  const [synced, setSynced] = useState(false)
  const [inviting, setInviting] = useState(false) // the "Start a wheel jam" invite module
  const [localSpin, setLocalSpin] = useState(null) // { id, target, turns, jitter, games, startedAt, by }
  const [mixMenu, setMixMenu] = useState(false)
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false) // copy-invite-link feedback
  const [, tick] = useState(0)
  const handledRef = useRef(null)
  const leftRef = useRef(false) // set when I explicitly leave, so I'm not auto-rejoined

  const patchJam = (patch) => setCallWheel({ ...(callWheel || {}), ...patch, lastActive: Date.now() })
  function startOrJoin() {
    if (synced) return
    leftRef.current = false
    if (jamLive) { patchJam({ participants: { ...participants, [SELF_NAME]: true } }); setSynced(true) } // join the live one, keep its games
    else setInviting(true) // open the "Start a wheel jam" module to pick who to invite
  }
  function startJam(invitees) {
    leftRef.current = false
    setCallWheel({
      host: SELF_NAME,
      participants: { [SELF_NAME]: true },
      invited: Object.fromEntries((invitees || []).map((n) => [n, true])),
      keys: [], spin: null, startedAt: Date.now(), lastActive: Date.now(),
    })
    setInviting(false)
    setSynced(true)
  }
  const copyInviteLink = () => { try { navigator.clipboard?.writeText(`${location.origin}/?jam=${callWheel?.startedAt || Date.now()}`) } catch {} setCopied(true); setTimeout(() => setCopied(false), 1600) }
  function leaveOrEnd() {
    if (!synced) return
    leftRef.current = true
    if (isHost) setCallWheel(null) // host ends it for everyone
    else {
      const p = { ...participants }; delete p[SELF_NAME]
      if (Object.keys(p).length === 0) setCallWheel(null) // last one out ends it
      else patchJam({ participants: p })
    }
    setSynced(false)
  }

  // Once I'm a participant, I stay in the jam view every time I open the wheel —
  // until I explicitly leave. (Also covers the "Join" toast: joining adds me to
  // participants, which drops the toast and flips me in here.)
  useEffect(() => {
    if (!leftRef.current && jamLive && participants[SELF_NAME] && !synced) setSynced(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callWheel?.participants])

  // The host ended the jam (or it expired) while I was in it — drop back to my
  // personal wheel instead of leaving a dead shared view (which would blank out).
  useEffect(() => {
    if (synced && !callWheel) setSynced(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callWheel])

  // A live shared spin pulls everyone who has the wheel open into the synced
  // view so they watch it turn together.
  useEffect(() => {
    if (callWheel?.spin && !synced) setSynced(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callWheel?.spin?.id])

  // Opened via the "Join" toast — join automatically as soon as the jam data is
  // available (no second click), then stay joined.
  useEffect(() => {
    if (autoJoin && !synced && !leftRef.current && jamLive && !participants[SELF_NAME]) {
      patchJam({ participants: { ...participants, [SELF_NAME]: true } })
      setSynced(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, jamLive, callWheel?.participants])

  const activeKeys = synced ? (callWheel?.keys || []) : (keys || [])
  const activeSpin = synced ? (callWheel?.spin || null) : localSpin
  const spinRemaining = activeSpin ? activeSpin.startedAt + SPIN_MS - Date.now() : 0
  const phase = !activeSpin ? 'idle' : spinRemaining > 0 ? 'spinning' : 'result'
  const boardGames = activeKeys.map((k) => ({ key: k, title: wheelTitle(k) })).filter((g) => CATALOG[g.key] || STARTER_BY_KEY[g.key])
  // Mid-spin the wheel is locked to the exact list the spin rolled against.
  const games = phase !== 'idle' && activeSpin?.games ? activeSpin.games : boardGames
  const picked = phase === 'result' && activeSpin?.games ? activeSpin.games[activeSpin.target] : null
  const iSpun = activeSpin?.by === SELF_NAME
  const canSpin = boardGames.length >= 2 && phase !== 'spinning'

  const myMixes = (blends || []).filter((b) => (b.members || []).includes(SELF))
  // Only the Mix's curated PLAYlist (wishlist) — not its daily recommended games.
  const mixGames = (b) => (b.wishlist || []).filter((k) => CATALOG[k] || STARTER_BY_KEY[k])

  const query = q.trim().toLowerCase()
  const results = query
    ? ALL_WHEEL_KEYS.filter((k) => !activeKeys.includes(k) && wheelTitle(k).toLowerCase().includes(query)).slice(0, 8)
    : []

  // Write the active list to the right place (shared jam vs personal state).
  function writeKeys(next) {
    const arr = typeof next === 'function' ? next(activeKeys) : next
    if (synced) patchJam({ keys: arr })
    else setKeys(arr)
  }
  const addKey = (k) => { writeKeys([...new Set([...activeKeys, k])]); setQ('') }
  const removeKey = (k) => { if (phase !== 'spinning') writeKeys(activeKeys.filter((x) => x !== k)) }
  const clearAll = () => writeKeys([])
  const loadMix = (b) => { writeKeys([...new Set([...activeKeys, ...mixGames(b)])]); setMixMenu(false) }

  // Keep remaining/phase fresh while a spin is turning.
  useEffect(() => {
    if (!activeSpin) return
    const id = setInterval(() => tick((t) => t + 1), 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpin?.id])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && phase !== 'spinning') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, phase])

  function doSpin() {
    if (!canSpin) return
    const roll = rollSpin(boardGames.length, activeSpin?.target)
    const s = { id: Date.now().toString(36), ...roll, games: boardGames, startedAt: Date.now(), by: SELF_NAME }
    if (synced) patchJam({ spin: s })
    else setLocalSpin(s)
  }

  // On land, the spinner starts the party (host = them, invitees = the call).
  useEffect(() => {
    if (phase !== 'result' || !picked || !activeSpin || !iSpun) return
    if (handledRef.current === activeSpin.id) return
    handledRef.current = activeSpin.id
    const t = setTimeout(() => {
      onParty(picked)
      if (synced) patchJam({ spin: null }) // keep the jam alive for another round
      else setLocalSpin(null)
      onClose()
    }, 1300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, picked?.key, activeSpin?.id])

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={phase === 'spinning' ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[92vh] w-[980px] max-w-full flex-col overflow-hidden rounded-[20px] border border-[#1c1d21] bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, rgba(61,191,30,0), #3dbf1e 15%, #3dbf1e 85%, rgba(61,191,30,0))', boxShadow: '0 0 18px rgba(61,191,30,0.8)' }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 60% at 28% 0%, rgba(45,160,0,0.18), transparent 60%)' }} />
        <button onClick={onClose} aria-label="Close" className="absolute right-[16px] top-[16px] z-10 text-[#9a9ba3] transition hover:text-white">
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {inviting ? (
          <WheelInviteStep online={online} onCancel={() => setInviting(false)} onStart={startJam} />
        ) : (
        <div className="no-scrollbar relative flex w-full flex-col gap-[28px] overflow-y-auto p-[32px] lg:flex-row lg:items-center">
          {/* Wheel */}
          <div className="flex shrink-0 flex-col items-center">
            {games.length > 0 ? (
              <DecisionWheel games={games} spin={activeSpin} remaining={Math.max(0, spinRemaining || SPIN_MS)} onSpin={doSpin} spinning={phase === 'spinning'} disabled={!canSpin} />
            ) : (
              <div className="flex size-[420px] items-center justify-center rounded-full border-2 border-dashed border-[#2b2d31] p-[40px] text-center">
                <p className="max-w-[220px] text-[15px] text-[#7e7f87]">{synced ? 'The call wheel is empty. Anyone can add games or load a PLAYlist.' : 'Your wheel is empty. Add games or load a Mix’s PLAYlist.'}</p>
              </div>
            )}
          </div>

          {/* Right column: title / result, sync toggle, load-a-mix, search, list */}
          <div className="min-w-0 flex-1">
            {phase === 'result' && picked ? (
              <div>
                <p className="text-[16px] font-semibold text-[#7aff46]">The wheel picked</p>
                <p className="mt-[2px] uppercase leading-[0.95] text-white" style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: 'clamp(30px,3.4vw,46px)' }}>{picked.title}</p>
                <p className="mt-[16px] text-[15px] text-[#dbdee1]">{iSpun ? 'Starting a party with everyone on the call…' : `${capName(activeSpin.by)} is starting a party…`}</p>
              </div>
            ) : phase === 'spinning' ? (
              <div>
                <h2 className="text-[28px] font-bold text-white">{synced ? 'The call is spinning…' : 'Spinning…'}</h2>
                <p className="mt-[6px] text-[15px] text-[#9a9ba3]">Landing on a game — then a party starts.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-[12px]">
                  <div>
                    <h2 className="text-[28px] font-bold text-white">Spin the Wheel</h2>
                    <p className="mt-[6px] max-w-[46ch] text-[15px] leading-snug text-[#9a9ba3]">
                      When it lands, a party starts for the picked game — the spinner hosts, and everyone on the call is invited to ready up.
                    </p>
                  </div>
                </div>

                {/* Sync with the call — a shared wheel everyone on the call
                    builds and watches together. */}
                <div className="mt-[16px] flex flex-wrap items-center gap-[10px]">
                  {!synced && jamLive ? (
                    // A jam I'm not in yet: who started it + who's joined, click to join.
                    <button
                      onClick={startOrJoin}
                      className="flex items-center gap-[10px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[9px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]"
                    >
                      <span>{dispName(callWheel?.host, jamNames)} started the call wheel</span>
                      <span className="flex items-center">
                        {Object.keys(participants).map((n, i) => (
                          <Avatar key={n} color={COLOR_OF[n] || D.raised} size={24} style={{ marginRight: -7, boxShadow: '0 0 0 2px #1c1c1f', zIndex: 10 - i }} />
                        ))}
                      </span>
                      <span className="text-[#3fbf3f]">Join</span>
                    </button>
                  ) : (
                    <button
                      onClick={synced ? leaveOrEnd : startOrJoin}
                      className={'flex items-center gap-[9px] rounded-[10px] px-[16px] py-[10px] text-[14px] font-semibold transition ' + (synced ? 'bg-[#2da000] text-white hover:brightness-110' : 'bg-[#1c1c1f] text-white ring-1 ring-white/10 hover:bg-[#26262a]')}
                    >
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4" /></svg>
                      {synced ? (isHost ? 'End wheel jam' : 'Leave wheel jam') : 'Start wheel jam'}
                    </button>
                  )}
                  {synced && (
                    <button onClick={copyInviteLink} className="flex items-center gap-[8px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[10px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>
                      {copied ? 'Link copied!' : 'Copy invite link'}
                    </button>
                  )}
                  {synced && (
                    <span className="flex items-center">
                      {Object.keys(participants).map((n, i) => (
                        <Avatar key={n} color={COLOR_OF[n] || D.raised} size={26} style={{ marginRight: -8, boxShadow: '0 0 0 2px #0c0c0e', zIndex: 10 - i }} />
                      ))}
                    </span>
                  )}
                </div>
                <p className="mt-[8px] text-[12px] text-[#7e7f87]">
                  {synced
                    ? (isHost ? 'You started this jam — everyone on the call can join, edit and watch it spin.' : `Jam hosted by ${dispName(callWheel?.host, jamNames)} — edits and spins are live for the whole call.`)
                    : jamLive
                      ? 'Join to build and spin the wheel together.'
                      : 'Starts a shared wheel the whole call builds and watches together.'}
                </p>

                {/* Load a Mix's PLAYlist */}
                <div className="relative z-20 mt-[16px]">
                  <button onClick={() => setMixMenu((v) => !v)} aria-expanded={mixMenu} className="flex items-center gap-[8px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[10px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
                    <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
                    Load a Mix&rsquo;s PLAYlist
                    <svg viewBox="0 0 24 24" className={'size-[14px] transition-transform ' + (mixMenu ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {mixMenu && (
                    <>
                      <div className="fixed inset-0 z-[-1]" onClick={() => setMixMenu(false)} />
                      <div className="absolute left-0 top-[48px] w-[300px] overflow-hidden rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                        {myMixes.length ? myMixes.map((b) => (
                          <button key={b.id} onClick={() => loadMix(b)} className="flex w-full items-center justify-between gap-[10px] px-[14px] py-[9px] text-left text-[14px] text-[#dbdee1] transition hover:bg-white/5">
                            <span className="truncate">{b.name}</span>
                            <span className="shrink-0 text-[12px] text-[#7e7f87]">{mixGames(b).length} games</span>
                          </button>
                        )) : <p className="px-[14px] py-[8px] text-[13px] text-[#7e7f87]">You&rsquo;re not in any Mixes yet.</p>}
                      </div>
                    </>
                  )}
                </div>

                {/* Search any game to add */}
                <div className="relative z-10 mt-[14px]">
                  <div className="flex items-center gap-[8px] rounded-[10px] bg-[#1c1c1f] px-[12px] py-[10px] ring-1 ring-white/10">
                    <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any game to add" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
                    {q && <button onClick={() => setQ('')} aria-label="Clear search" className="text-[#7e7f87] transition hover:text-white"><svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
                  </div>
                  {query && (
                    <div className="absolute left-0 right-0 top-[50px] z-30 max-h-[240px] overflow-y-auto rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                      {results.length ? results.map((k) => (
                        <button key={k} onClick={() => addKey(k)} className="flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left transition hover:bg-white/5">
                          {wheelThumb(k) ? <img alt="" src={wheelThumb(k)} className="h-[26px] w-[46px] shrink-0 rounded-[4px] object-cover" /> : <span className="h-[26px] w-[46px] shrink-0 rounded-[4px] bg-[#2b2d31]" />}
                          <span className="min-w-0 flex-1 truncate text-[14px] text-white">{wheelTitle(k)}</span>
                          <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-[#3fbf3f]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                      )) : <p className="px-[12px] py-[8px] text-[13px] text-[#7e7f87]">No games match &ldquo;{q}&rdquo;.</p>}
                    </div>
                  )}
                </div>

                {/* Games on the wheel */}
                <div className="mt-[20px]">
                  <div className="mb-[10px] flex items-center justify-between">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">{synced ? 'Call wheel' : 'On the wheel'} · {boardGames.length}</p>
                    {boardGames.length > 0 && <button onClick={clearAll} className="text-[12px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear all</button>}
                  </div>
                  <div className="no-scrollbar flex max-h-[140px] flex-wrap content-start gap-[8px] overflow-y-auto">
                    {boardGames.length === 0 && <p className="text-[13px] text-[#7e7f87]">Search above, right-click any game &rarr; &ldquo;Add to Wheel&rdquo;, or load a Mix&rsquo;s PLAYlist.</p>}
                    {boardGames.map((g) => (
                      <span key={g.key} className="flex items-center gap-[8px] rounded-[8px] bg-[#1c1c1f] py-[6px] pl-[8px] pr-[6px] text-[13px] text-white ring-1 ring-white/5">
                        {wheelThumb(g.key) ? <img alt="" src={wheelThumb(g.key)} className="h-[22px] w-[38px] rounded-[4px] object-cover" /> : <span className="h-[22px] w-[38px] rounded-[4px] bg-[#2b2d31]" />}
                        <span className="max-w-[150px] truncate">{g.title}</span>
                        <button onClick={() => removeKey(g.key)} aria-label={`Remove ${g.title}`} className="text-[#7e7f87] transition hover:text-white">
                          <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  {boardGames.length === 1 && <p className="mt-[10px] text-[12px] text-[#f0b232]">Add at least 2 games to spin.</p>}
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

// The "who to send this jam to" step (Spotify-Jam style): pick people from the
// call / friends, or copy a link. Choosing none is fine — a link still shares it.
function WheelInviteStep({ online, onCancel, onStart }) {
  const hiddenP = useHidden()
  const others = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const inCall = others.filter((d) => online.includes(d.name))
  const elsewhere = others.filter((d) => !online.includes(d.name))
  const [sel, setSel] = useState(() => Object.fromEntries(inCall.map((d) => [d.name, true])))
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)
  const toggle = (n) => setSel((s) => ({ ...s, [n]: !s[n] }))
  const chosen = Object.keys(sel).filter((n) => sel[n])
  const filtered = elsewhere.filter((d) => capName(d.name).toLowerCase().includes(q.toLowerCase()))
  const copyLink = () => { try { navigator.clipboard?.writeText(`${location.origin}/?jam=${Date.now().toString(36)}`) } catch {} setCopied(true) }

  const Row = ({ d }) => (
    <button onClick={() => toggle(d.name)} className="flex w-full items-center gap-[12px] py-[8px]">
      <Avatar color={d.color} size={38} />
      <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-white">{capName(d.name)}</span>
      <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (sel[d.name] ? 'border-[#2da000] bg-[#2da000]' : 'border-[#4a4d55]')}>
        {sel[d.name] && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
      </span>
    </button>
  )

  return (
    <div className="no-scrollbar relative flex max-h-[92vh] w-full flex-col overflow-y-auto p-[32px]">
      <h2 className="text-[28px] font-bold text-white">Start a wheel jam</h2>
      <p className="mt-[6px] text-[15px] leading-snug text-[#9a9ba3]">Invite people to build the wheel and watch it spin with you — or copy a link to share.</p>

      {/* Copy link */}
      <button onClick={copyLink} className="mt-[18px] flex w-fit items-center gap-[9px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[10px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
        <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>
        {copied ? 'Link copied!' : 'Copy invite link'}
      </button>

      <div className="mt-[22px] flex items-center gap-[10px]">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">In your call</span>
      </div>
      <div className="mt-[2px]">
        {inCall.length ? inCall.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one else is on the call right now — invite someone below or share the link.</p>}
      </div>

      <p className="mb-[6px] mt-[18px] text-[15px] text-white">Invite someone else</p>
      <div className="flex items-center gap-[8px] rounded-[8px] bg-[#111214] px-[12px] py-[9px] ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
      </div>
      {q && (
        <div className="mt-[4px] max-h-[160px] overflow-y-auto">
          {filtered.length ? filtered.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one matches “{q}”.</p>}
        </div>
      )}

      <div className="mt-[24px] flex justify-end gap-[10px]">
        <button onClick={onCancel} className="rounded-[8px] bg-[#3a3c42] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Cancel</button>
        <button onClick={() => onStart(chosen)} className="rounded-[8px] bg-[#2da000] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110">
          {chosen.length ? `Start jam · invite ${chosen.length}` : 'Start jam'}
        </button>
      </div>
    </div>
  )
}

// "X started a wheel — Join" — the jam invite, top-right like the other toasts.
function WheelJamToast({ host, count, onJoin, onDismiss }) {
  const names = useNames()
  return (
    <div className="pointer-events-none fixed top-[24px] right-[24px] z-[88] flex justify-end px-4">
      <div className="pointer-events-auto flex items-center gap-[14px] rounded-[14px] border border-[#1c1d21] bg-[#111214] px-[18px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <span className="relative flex size-[34px] shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#3dbf1e]/40" />
          <Avatar color={COLOR_OF[host] || D.raised} size={34} />
        </span>
        <p className="text-[15px] text-[#dbdee1]">
          <span className="font-semibold text-white">{dispName(host, names)}</span> started a wheel on the call{count > 1 ? ` · ${count} in` : ''}
        </p>
        <button
          onClick={onJoin}
          className="ml-[6px] flex shrink-0 items-center gap-[7px] rounded-[10px] bg-[#2da000] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110"
        >
          <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4" /></svg>
          Join
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" className="ml-[2px] shrink-0 text-[#7e7f87] transition hover:text-white">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  )
}

// ── Game launch / party ready-up flow (Figma 863:4265 … 863:4469) ───────────
// A launch party is one shared session at room node `launch`, mirrored to every
// tester in the room (same mechanism as the spin wheel). The host invites other
// testers, each readies up on their own screen, and the host launches once
// enough are ready.
const LAUNCH_RESPOND_MS = 60000 // an invitee's "Respond in 60s" window (display)
const LAUNCH_EXPIRY = 180000 // a party nobody launched clears itself after this

function useLaunch() {
  const [raw, writeLaunch, ready] = useRoomNode('launch', null)
  const [, tick] = useState(0)

  // Anchor to the earlier of "host says it started" and "we first saw it", so a
  // rejoin doesn't restart the clock (mirrors the spin hook).
  const seen = useRef({})
  const id = raw?.id
  if (id && seen.current[id] == null) seen.current[id] = Date.now()
  const anchor = raw ? Math.min(raw.startedAt || 0, seen.current[id] ?? Date.now()) : 0
  const launch = raw && Date.now() - anchor < LAUNCH_EXPIRY ? raw : null

  // Never open on someone else's stale party — a live tester wipes an expired one.
  const booted = useRef(false)
  useEffect(() => {
    if (!ready || booted.current) return
    booted.current = true
    if (IS_LIVE && raw && Date.now() - (raw.startedAt || 0) >= LAUNCH_EXPIRY) writeLaunch(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Tick once a second while a party is live so the countdown/among-readies update.
  useEffect(() => {
    if (!launch || launch.launched) return
    const t = setInterval(() => tick((v) => v + 1), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, launch?.launched])

  const start = (game, invitees) =>
    writeLaunch({
      id: `${Date.now().toString(36)}-${SELF_NAME}`,
      game,
      host: SELF_NAME,
      invitees,
      ready: { [SELF_NAME]: true }, // the host is implicitly ready
      declined: {},
      startedAt: Date.now(),
      launched: false,
    })
  const readyUp = () => writeRoomPath(`launch/ready/${SELF_NAME}`, true)
  const undoReady = () => writeRoomPath(`launch/ready/${SELF_NAME}`, null)
  const decline = () => writeRoomPath(`launch/declined/${SELF_NAME}`, true)
  const launchNow = () => writeRoomPath('launch/launched', true)
  const clear = () => writeLaunch(null)

  return { launch, start, readyUp, undoReady, decline, launchNow, clear }
}

// Who's ready / still pending among the invited testers (the host aside).
function launchTally(launch) {
  const invitees = launch?.invitees || []
  const ready = launch?.ready || {}
  const declined = launch?.declined || {}
  const readyInvitees = invitees.filter((n) => ready[n])
  const pending = invitees.filter((n) => !ready[n] && !declined[n])
  const allReady = invitees.length > 0 && pending.length === 0 && readyInvitees.length > 0
  return { invitees, ready, declined, readyInvitees, pending, allReady }
}

// Step 1 — "Who's playing?" invite picker (Figma 863:4265). Online testers are
// listed under "In your call" and pre-selected; everyone else is searchable
// under "Invite someone else".
function WhosPlayingModal({ game, onClose, onStart }) {
  const { online } = useRoomCtx()
  const hiddenP = useHidden()
  const others = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const inCall = others.filter((d) => online.includes(d.name))
  const elsewhere = others.filter((d) => !online.includes(d.name))
  const [sel, setSel] = useState(() => Object.fromEntries(inCall.map((d) => [d.name, true])))
  const [q, setQ] = useState('')
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const toggle = (n) => setSel((s) => ({ ...s, [n]: !s[n] }))
  const selectAll = () => setSel((s) => ({ ...s, ...Object.fromEntries(inCall.map((d) => [d.name, true])) }))
  const chosen = Object.keys(sel).filter((n) => sel[n])
  const filtered = elsewhere.filter((d) => capName(d.name).toLowerCase().includes(q.toLowerCase()))

  const Row = ({ d }) => (
    <button onClick={() => toggle(d.name)} className="flex w-full items-center gap-[12px] py-[8px]">
      <Avatar color={d.color} size={40} />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[15px] font-semibold text-white">{capName(d.name)}</p>
        <p className="truncate text-[13px] text-[#9a9ba3]">{capName(d.name)}</p>
      </div>
      <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (sel[d.name] ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
        {sel[d.name] && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
      </span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Who’s playing?</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Choose who to invite to <span className="font-semibold text-white">{game.title}</span>.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] py-[16px]">
          <div className="flex items-center gap-[12px]">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">In your call</span>
            {inCall.length > 0 && <button onClick={selectAll} className="text-[13px] font-semibold text-[#8aa0ff] transition hover:underline">Select all</button>}
          </div>
          {inCall.length ? inCall.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one else is in the room right now — invite someone below.</p>}
          <p className="mb-[6px] mt-[16px] text-[15px] text-white">Invite someone else</p>
          <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full bg-transparent text-[14px] text-white placeholder:text-[#87898c] focus:outline-none" />
          </div>
          <p className="mt-[10px] text-[12px] text-[#9a9ba3]">Search friends and server members</p>
          {filtered.map((d) => <Row key={d.name} d={d} />)}
        </div>
        <div className="flex items-center justify-center gap-[10px] border-t border-black/20 px-[24px] py-[16px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button
            onClick={() => onStart(chosen)}
            className={'rounded-[8px] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 ' + (chosen.length ? 'bg-[#5765f2]' : 'bg-[#2da000]')}
          >
            {chosen.length ? `Send Ready Up [${chosen.length} selected]` : 'Launch Solo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// The party roster row: each member's avatar with a green check once ready.
function PartyAvatars({ launch }) {
  const { ready, declined } = launchTally(launch)
  const members = [launch.host, ...(launch.invitees || [])]
  return (
    <div className="flex items-center">
      {members.map((n, i) => {
        const isReady = n === launch.host || ready[n]
        const isDeclined = declined[n]
        // ready → green check, declined → red X, still deciding → no badge (dim).
        return (
          <span key={n} className="relative" style={{ marginRight: i < members.length - 1 ? -8 : 0 }}>
            <Avatar color={COLOR_OF[n] || '#4a4d55'} size={38} style={{ boxShadow: '0 0 0 2px #17181b', opacity: isReady ? 1 : isDeclined ? 0.45 : 0.55 }} />
            {isReady ? (
              <span className="absolute -bottom-[1px] -right-[1px] flex size-[15px] items-center justify-center rounded-full bg-[#23a55a] ring-2 ring-[#17181b]">
                <svg viewBox="0 0 24 24" className="size-[9px] text-white" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
              </span>
            ) : isDeclined ? (
              <span className="absolute -bottom-[1px] -right-[1px] flex size-[15px] items-center justify-center rounded-full bg-[#f04747] ring-2 ring-[#17181b]">
                <svg viewBox="0 0 24 24" className="size-[9px] text-white" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

const CheckBadge = () => (
  <span className="flex size-[16px] items-center justify-center rounded-full bg-[#23a55a]">
    <svg viewBox="0 0 24 24" className="size-[10px] text-white" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
  </span>
)

// The cross-page party toast (Figma 863:4361 / 4425 / 4382 / 4469). Which face it
// shows depends on whether you're the host or an invitee and your ready state.
// Rendered once at the app root so it follows you across every page.
function LaunchNotification({ launch, readyUp, undoReady, decline, launchNow, clear, onLaunch }) {
  const launchNames = useNames()
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // When the host launches, everyone drops the "Launching…" toast; the host then
  // clears the shared party a beat later.
  const launched = !!launch?.launched
  const isHost = launch?.host === SELF_NAME
  useEffect(() => {
    if (!launched) return
    onLaunch(launch.game?.title)
    if (isHost && IS_LIVE) { // only the real host clears the shared party (never a spectator)
      const t = setTimeout(clear, 1400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launched])

  if (!launch || launched) return null

  const isInvitee = (launch.invitees || []).includes(SELF_NAME)
  if (!isHost && !isInvitee) return null // a bystander in the room sees nothing

  const iReady = !!(launch.ready || {})[SELF_NAME]
  const iDeclined = !!(launch.declined || {})[SELF_NAME]
  if (isInvitee && !isHost && iDeclined) return null // I passed — toast gone

  const { invitees, readyInvitees, pending, allReady } = launchTally(launch)
  const cover = launch.game?.image || CATALOG[launch.game?.key]?.image
  const remaining = Math.max(0, Math.ceil((launch.startedAt + LAUNCH_RESPOND_MS - Date.now()) / 1000))

  // Pick the body for this viewer's role/state.
  let body
  if (isInvitee && !iReady) {
    // Screen 2 — incoming invite.
    body = (
      <>
        <div>
          <p className="text-[13px] text-[#c7c9cb]"><span className="font-semibold text-white">{dispName(launch.host, launchNames)}</span> invited you to play</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">Ready up to join this session.</p>
          <p className="text-[12px] text-[#9a9ba3]">Respond in {remaining}s</p>
        </div>
        <div className="flex gap-[8px]">
          <button onClick={decline} className="flex-1 rounded-[8px] bg-[#3a3c42] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Not Now</button>
          <button onClick={readyUp} className="flex-1 rounded-[8px] bg-[#5765f2] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Ready Up</button>
        </div>
      </>
    )
  } else if (isInvitee && !isHost && iReady) {
    // Screen 4 — you're ready.
    body = (
      <>
        <div>
          <p className="flex items-center gap-[7px] text-[13px] text-[#c7c9cb]"><CheckBadge /> You’re ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
        </div>
        <PartyAvatars launch={launch} />
        <button onClick={undoReady} className="w-full rounded-[8px] bg-[#3a3c42] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Undo Ready Up</button>
      </>
    )
  } else if (allReady) {
    // Screen 5 — host, party ready.
    body = (
      <>
        <div>
          <p className="flex items-center gap-[7px] text-[13px] text-[#c7c9cb]"><CheckBadge /> Party is ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
        </div>
        <PartyAvatars launch={launch} />
        <div className="flex gap-[8px]">
          <button onClick={clear} className="rounded-[8px] bg-[#3a3c42] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Cancel</button>
          <button onClick={launchNow} className="flex-1 rounded-[8px] bg-[#5765f2] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Launch Game</button>
        </div>
      </>
    )
  } else {
    // Screen 3 — host, getting the party ready.
    body = (
      <>
        <div>
          <p className="text-[13px] text-[#c7c9cb]">Getting the party ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
        </div>
        <PartyAvatars launch={launch} />
        {pending.length > 0 && (
          <p className="text-[12px] text-[#9a9ba3]">Waiting for {pending.length} member{pending.length === 1 ? '' : 's'} to ready up…</p>
        )}
        <div className="flex gap-[8px]">
          <button onClick={clear} className="rounded-[8px] bg-[#3a3c42] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Cancel</button>
          <button onClick={launchNow} className="flex-1 rounded-[8px] bg-[#5765f2] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">
            {readyInvitees.length === 0 ? 'Launch Anyways' : `Launch with ${readyInvitees.length} Ready`}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="pointer-events-auto fixed top-[24px] right-[24px] z-[85] w-[416px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-[#1c1d21] bg-[#17181b] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
      <div className="flex">
        {cover && <img alt="" src={cover} className="w-[116px] shrink-0 self-stretch object-cover" />}
        <div className="flex min-w-0 flex-1 flex-col gap-[12px] p-[16px]">{body}</div>
      </div>
    </div>
  )
}

// ── Decision page — wheel + preference-matched game list ────────────────────
function DecidePage({ blend, prefs, onBack }) {
  const [launching, setLaunching] = useState(null)
  const selectedTags = [...new Set(prefs.map((p) => p.tag).filter(Boolean))]

  // Annotate each blend game with which of the group's preferences it matches.
  const ranked = blend.games
    .filter((key) => CATALOG[key])
    .map((key) => {
      const tags = GAME_TAGS[key] || []
      const matched = prefs.filter((p) => p.tag && tags.includes(p.tag))
      const matchedLabels = [...new Set(matched.map((p) => p.label))]
      return { key, ...CATALOG[key], matched, matchedLabels, score: matchedLabels.length }
    })
    .sort((a, b) => b.score - a.score)

  // The game meeting the most preferences gets the spotlight; the rest list below.
  const top = ranked[0]
  const rest = ranked.slice(1)
  const selectedLabels = [...new Set(prefs.map((p) => p.label))]

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[28px]">
        <div className="mx-auto w-full max-w-[1200px]">

          {/* Header */}
          <div>
            <h1 className="text-[40px] font-semibold leading-none tracking-tight text-white">Let&rsquo;s decide a game</h1>
            <div className="mt-[10px] flex items-center gap-[8px] text-[15px] text-[#9a9ba3]">
              Matched to
              <span className="flex items-center">
                {blend.members.map((c, i) => (
                  <Avatar key={i} color={c} size={24} style={{ marginRight: i < blend.members.length - 1 ? -8 : 0, boxShadow: '0 0 0 2px #0c0c0e' }} />
                ))}
              </span>
              in {blend.name}
            </div>
          </div>

          {/* Selected preferences summary */}
          {selectedTags.length > 0 && (
            <div className="mt-[18px] flex flex-wrap items-center gap-[8px]">
              <span className="text-[13px]" style={{ color: D.mute }}>Preferences:</span>
              {[...new Set(prefs.map((p) => p.label))].map((label) => (
                <span key={label} className="rounded-full bg-[#107C10]/15 px-[12px] py-[5px] text-[13px] text-[#3fbf3f]">{label}</span>
              ))}
            </div>
          )}

          <div className="my-[28px] h-px bg-[#1c1d21]" />

          {/* Games that fit everyone — the primary section */}
          <section>
            <h2 className="mb-[6px] text-[30px] font-semibold text-white">Games that fit everyone</h2>
            <p className="mb-[24px] text-[14px]" style={{ color: D.mute }}>Ranked by how many of the group&rsquo;s preferences each game hits.</p>

            {/* Spotlight — the game meeting the most preferences gets top billing */}
            {top && (
              <div className="mb-[28px] overflow-hidden rounded-[20px] bg-[#121214] ring-1 ring-[#107C10]/30">
                <div className="flex flex-col lg:flex-row">
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-[#1a1a1d] lg:w-[58%]">
                    <img alt="" src={top.image} className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute left-[16px] top-[16px] rounded-[10px] bg-[#107C10] px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wide text-white shadow-[0_2px_10px_rgba(16,124,16,0.5)]">
                      {top.score > 0 ? 'Best match' : 'Top pick'}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-[16px] p-[28px]">
                    <div>
                      <div className="flex items-center gap-[10px]">
                        <p className="text-[34px] font-bold leading-tight text-white">{top.title}</p>
                        {top.score > 0 && (
                          <span className="rounded-full bg-[#107C10]/15 px-[10px] py-[3px] text-[13px] font-semibold text-[#3fbf3f]">
                            {top.score}/{selectedLabels.length || top.score} prefs
                          </span>
                        )}
                      </div>
                      <p className="mt-[4px] text-[14px] text-[#7e7f87]">{top.players} players · {top.playtime} · {top.genre}</p>
                    </div>
                    <p className="max-w-[52ch] text-[16px] leading-snug text-[#c7c8ce]">{top.caption}</p>
                    {top.matchedLabels.length > 0 && (
                      <div>
                        <p className="mb-[8px] text-[12px] font-semibold uppercase tracking-wide text-[#7e7f87]">Why it fits</p>
                        <div className="flex flex-wrap gap-[8px]">
                          {top.matchedLabels.map((label) => (
                            <span key={label} className="rounded-full bg-[#107C10]/15 px-[12px] py-[5px] text-[13px] text-[#3fbf3f]">✓ {label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-[4px] flex items-center gap-[10px]">
                      <button onClick={() => setLaunching(top.title)} className="flex items-center gap-[8px] rounded-[10px] bg-[#107C10] px-[24px] py-[10px] text-[15px] font-semibold text-white transition hover:bg-[#0e8f0e]">
                        <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        Play now
                      </button>
                      <button className="rounded-[10px] bg-[#2b2d31] px-[24px] py-[10px] text-[15px] font-semibold text-white transition hover:bg-[#35373c]">Add to chat</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* The rest, ranked */}
            <div className="flex flex-col gap-[12px]">
              {rest.map((g) => (
                <div
                  key={g.key}
                  className="group flex items-center gap-[20px] rounded-[14px] p-[10px] transition hover:bg-[#151517]"
                >
                  <div className="relative h-[110px] w-[196px] shrink-0 overflow-hidden rounded-[12px] bg-[#1a1a1d]">
                    <img alt="" src={g.image} className="size-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-[10px]">
                      <p className="text-[20px] font-semibold text-white">{g.title}</p>
                      {g.score > 0 && (
                        <span className="rounded-full bg-[#107C10]/15 px-[8px] py-[2px] text-[12px] font-semibold text-[#3fbf3f]">
                          {g.score} match{g.score > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                    <p className="mt-[2px] text-[13px] text-[#7e7f87]">{g.players} players · {g.playtime} · {g.genre}</p>
                    <p className="mt-[8px] max-w-[60ch] text-[14px] leading-snug text-[#9a9ba3]">{g.caption}</p>
                    {g.matchedLabels.length > 0 && (
                      <div className="mt-[10px] flex flex-wrap gap-[6px]">
                        {g.matchedLabels.map((label) => (
                          <span key={label} className="rounded-full border border-[#107C10]/50 px-[10px] py-[3px] text-[12px] text-[#3fbf3f]">
                            ✓ {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <PlayButton onClick={() => setLaunching(g.title)} size={52} title={`Launch ${g.title}`} />
                  <div className="w-[6px] shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <div className="my-[40px] h-px bg-[#1c1d21]" />

          {/* Still stuck? The wheel now lives on the blend page. */}
          <section className="flex flex-col items-center">
            <h2 className="mb-[6px] text-[22px] font-semibold text-white">Still can&rsquo;t decide?</h2>
            <p className="mb-[20px] max-w-[52ch] text-center text-[14px]" style={{ color: D.mute }}>
              Head back to {blend.name} and hit &ldquo;Decide a game&rdquo; — the wheel spins for the whole
              server and everyone gets a say.
            </p>
            <button
              onClick={onBack}
              className="rounded-[10px] bg-[#107C10] px-[22px] py-[11px] text-[15px] font-semibold text-white transition hover:bg-[#0e8f0e]"
            >
              Spin the wheel in {blend.name}
            </button>
          </section>
        </div>
      </div>
      {launching && <LaunchToast title={launching} onDone={() => setLaunching(null)} />}
    </main>
  )
}

// ── Forward a game to chat (opened from a card's chat button) ──────────────
function ShareModal({ game, initialFriend, onClose }) {
  const { blends, setBlends } = useRoomCtx()
  const hiddenP = useHidden()
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const friends = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const myGroups = blends.filter((b) => (b.members || []).includes(SELF))
  const [selF, setSelF] = useState(() => (initialFriend ? { [initialFriend]: true } : {}))
  const [selG, setSelG] = useState({})
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('individual') // when 2+ friends and no group
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const chosenFriends = friends.filter((f) => selF[f.name])
  const chosenGroups = myGroups.filter((g) => selG[g.id])
  const anyChosen = chosenFriends.length + chosenGroups.length > 0
  const setKey = (arr) => [...arr].sort().join(',')
  const chosenSet = setKey([SELF, ...chosenFriends.map((f) => f.color)])
  const existingGroup = myGroups.find((g) => setKey(g.members) === chosenSet)
  const needsChoice = chosenFriends.length >= 2 && !existingGroup
  const cover = CATALOG[KEY_OF_TITLE[game] || game]?.image
  const Check = ({ on }) => (
    <span className={'flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 transition ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4e5058]')}>
      {on && <svg viewBox="0 0 24 24" className="size-[15px] text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
    </span>
  )

  function send() {
    // Prototype: "create a group chat" spins up a new group (a blend) and syncs.
    if (needsChoice && mode === 'group') {
      const name = [SELF_NAME, ...chosenFriends.map((f) => f.name)].map(cap).join(', ')
      setBlends([...blends, {
        id: slug(name) + '-' + Date.now().toString(36).slice(-4),
        name, color: BLEND_COLORS[blends.length % BLEND_COLORS.length], when: 'group chat',
        members: [SELF, ...chosenFriends.map((f) => f.color)],
        games: STARTER_MIX_GAMES,
        wishlist: [],
      }])
    } else {
      // Forward the game into each chosen friend's DM, where it syncs live.
      const note = message.trim()
      chosenFriends.forEach((f) => {
        putDM(f.name, { from: SELF_NAME, to: f.name, kind: 'game', game, text: note, ts: Date.now() })
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="p-[24px] pb-[12px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[20px] font-bold text-white">Forward to</h3>
              <p className="mt-[4px] text-[14px] text-[#b5bac1]">Select where you want to share this game.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="mt-[16px] flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[10px]">
            <svg viewBox="0 0 24 24" className="size-[18px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px]">
          {myGroups.length > 0 && (
            <>
              <p className="pb-[4px] pt-[4px] text-[12px] font-semibold uppercase tracking-wide text-[#b5bac1]">Group chats</p>
              {myGroups.map((g) => (
                <button key={g.id} onClick={() => setSelG((s) => ({ ...s, [g.id]: !s[g.id] }))} className="flex w-full items-center gap-[12px] rounded-[8px] py-[8px] pl-[4px] pr-[6px] text-left transition hover:bg-white/5">
                  <span className="size-[40px] shrink-0 rounded-[12px]" style={{ backgroundColor: g.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-white">{g.name}</p>
                    <p className="text-[12px] text-[#80848e]">{g.members.length} members</p>
                  </div>
                  <Check on={!!selG[g.id]} />
                </button>
              ))}
            </>
          )}
          <p className="pb-[4px] pt-[10px] text-[12px] font-semibold uppercase tracking-wide text-[#b5bac1]">Friends</p>
          {friends.map((f) => (
            <button key={f.name} onClick={() => setSelF((s) => ({ ...s, [f.name]: !s[f.name] }))} className="flex w-full items-center gap-[12px] rounded-[8px] py-[8px] pl-[4px] pr-[6px] text-left transition hover:bg-white/5">
              <Avatar color={f.color} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white">{cap(f.name)}</p>
                <p className="text-[13px] text-[#b5bac1]">{f.name}</p>
              </div>
              <Check on={!!selF[f.name]} />
            </button>
          ))}
        </div>

        <div className="bg-[#232428] p-[24px]">
          {/* Preview of the game being forwarded */}
          <div className="flex items-center gap-[10px] rounded-[8px] bg-[#1e1f22] p-[8px]">
            {cover && <img alt="" src={cover} className="h-[38px] w-[68px] shrink-0 rounded-[6px] object-cover" />}
            <div className="min-w-0">
              <p className="text-[12px] text-[#80848e]">Sharing a game</p>
              <p className="truncate text-[14px] font-semibold text-white">{game}</p>
            </div>
          </div>

          {/* Multiple friends with no existing group → choose how to send */}
          {needsChoice && (
            <div className="mt-[12px] flex gap-[8px]">
              {[['individual', 'Send individually'], ['group', 'Create a group chat']].map(([m, txt]) => (
                <button key={m} onClick={() => setMode(m)} className={'flex-1 rounded-[8px] border px-[12px] py-[8px] text-[13px] font-semibold transition ' + (mode === m ? 'border-[#5765f2] bg-[#5765f2]/15 text-white' : 'border-[#4e5058] text-[#b5bac1] hover:text-white')}>
                  {txt}
                </button>
              ))}
            </div>
          )}

          <div className="mt-[12px] flex items-center gap-[10px]">
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add an optional message..." className="min-w-0 flex-1 rounded-[8px] bg-[#1e1f22] px-[14px] py-[10px] text-[14px] text-white outline-none placeholder:text-[#87898c]" />
            <button onClick={send} disabled={!anyChosen} className="flex shrink-0 items-center gap-[6px] rounded-[8px] bg-[#5765f2] px-[20px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              Send <span className="text-[16px] leading-none">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Direct-message conversation page ───────────────────────────────────────
// Opened from a friend in the DM sidebar. Real, synced messages: plain text,
// shared games, and Blend invitations you can accept or decline in place.
function DmDivider({ label }) {
  return (
    <div className="my-[16px] flex items-center gap-[12px] px-[4px]">
      <div className="h-px flex-1" style={{ backgroundColor: '#26272b' }} />
      <span className="text-[12px] font-semibold" style={{ color: D.mute }}>{label}</span>
      <div className="h-px flex-1" style={{ backgroundColor: '#26272b' }} />
    </div>
  )
}

const dmTime = (ts) => {
  try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
  catch { return '' }
}
const dmDay = (ts) => {
  try { return new Date(ts).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return '' }
}

function InviteMessage({ msg, mine, onRespond }) {
  const pending = (msg.status || 'pending') === 'pending'
  const accepted = msg.status === 'accepted'
  const declined = msg.status === 'declined'
  return (
    <div className="mt-[6px] w-full max-w-[440px] overflow-hidden rounded-[10px] border border-[#3a3c42] bg-[#232428]">
      <div className="flex items-center gap-[10px] border-b border-[#2f3136] bg-[#1e1f22] px-[14px] py-[10px]">
        <span className="flex size-[34px] items-center justify-center rounded-[8px] bg-[#5765f2] text-[16px]">🎮</span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>Mix invitation</p>
          <p className="truncate text-[15px] font-semibold text-white">{msg.blendName}</p>
        </div>
      </div>
      <div className="px-[14px] py-[12px]">
        <p className="text-[14px] text-[#dbdee1]">
          {mine
            ? <>You invited <span className="font-semibold text-white">{capName(msg.to)}</span> to join this Mix.</>
            : <><span className="font-semibold text-white">{capName(msg.from)}</span> invited you to join this Mix.</>}
        </p>
        {msg.text ? <p className="mt-[6px] text-[13px] text-[#b5bac1]">“{msg.text}”</p> : null}

        {mine ? (
          <p className="mt-[10px] text-[13px] font-semibold" style={{ color: accepted ? D.green : declined ? '#f0787a' : D.mute }}>
            {accepted ? '✓ Accepted' : declined ? '✕ Declined' : '• Waiting for a response…'}
          </p>
        ) : pending ? (
          <div className="mt-[12px] flex gap-[8px]">
            <button onClick={() => onRespond(true)} className="flex-1 rounded-[8px] bg-[#248046] px-[14px] py-[8px] text-[14px] font-semibold text-white transition hover:brightness-110">Accept</button>
            <button onClick={() => onRespond(false)} className="flex-1 rounded-[8px] bg-[#3a3c42] px-[14px] py-[8px] text-[14px] font-semibold text-white transition hover:bg-[#4a4c52]">Decline</button>
          </div>
        ) : (
          <p className="mt-[10px] text-[13px] font-semibold" style={{ color: accepted ? D.green : '#f0787a' }}>
            {accepted ? '✓ You joined this Mix' : '✕ You declined'}
          </p>
        )}
      </div>
    </div>
  )
}

// Quick share straight to one person (from a "Played By" avatar) — no picker,
// just a compose box that forwards this game into their DM.
function QuickShareModal({ game, to, onClose }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const cover = CATALOG[KEY_OF_TITLE[game] || game]?.image
  const send = () => {
    putDM(to, { from: SELF_NAME, to, kind: 'game', game, text: message.trim(), ts: Date.now() })
    setSent(true)
    setTimeout(onClose, 700)
  }
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[440px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex items-center gap-[12px]">
            <Avatar color={COLOR_OF[to] || D.raised} size={44} />
            <div>
              <p className="text-[13px] text-[#b5bac1]">Share with</p>
              <p className="text-[18px] font-bold text-white">{capName(to)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="mt-[16px] flex items-center gap-[12px] rounded-[10px] bg-[#1e1f22] p-[10px]">
          {cover && <img alt="" src={cover} className="h-[46px] w-[82px] shrink-0 rounded-[6px] object-cover" />}
          <div className="min-w-0">
            <p className="text-[12px] text-[#9a9ba3]">Sharing a game</p>
            <p className="truncate text-[15px] font-semibold text-white">{game}</p>
          </div>
        </div>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={`Add a message to ${capName(to)}…`}
          className="mt-[14px] w-full rounded-[8px] bg-[#1e1f22] px-[12px] py-[10px] text-[14px] text-white outline-none ring-1 ring-white/10 placeholder:text-[#87898c] focus:ring-[#5765f2]"
        />

        <div className="mt-[16px] flex justify-end">
          <button onClick={send} disabled={sent} className="flex items-center gap-[8px] rounded-[8px] bg-[#5765f2] px-[20px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
            {sent ? 'Sent ✓' : <>Send <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function GameMessage({ msg, onOpen }) {
  const key = KEY_OF_TITLE[msg.game] || msg.game
  const cover = CATALOG[key]?.image
  const meta = CATALOG[key]
  return (
    <button
      type="button"
      data-game={msg.game}
      onClick={() => onOpen?.(msg.game)}
      className="mt-[6px] block w-full max-w-[440px] cursor-pointer overflow-hidden rounded-[10px] border border-[#3a3c42] bg-[#232428] text-left transition hover:border-[#5765f2]"
    >
      {cover && <img alt="" src={cover} className="h-[150px] w-full object-cover" />}
      <div className="px-[14px] py-[12px]">
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>Shared a game</p>
        <p className="mt-[2px] text-[16px] font-semibold text-white">{msg.game}</p>
        {meta?.caption && <p className="mt-[4px] text-[13px] leading-snug text-[#b5bac1]">{meta.caption}</p>}
        {msg.text ? <p className="mt-[8px] text-[13px] text-[#dbdee1]">{msg.text}</p> : null}
      </div>
    </button>
  )
}

function DMPage({ friend, onBack, onOpenBlend, onOpen }) {
  const { blends, setBlends } = useRoomCtx()
  const names = useNames()
  const fname = dispName(friend.name, names)
  const msgs = useDM(friend.name)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  function sendText() {
    const text = draft.trim()
    if (!text) return
    putDM(friend.name, { from: SELF_NAME, to: friend.name, kind: 'text', text, ts: Date.now() })
    setDraft('')
  }

  function respondInvite(msg, accept) {
    // Rewrite the same invite leaf so the inviter sees the result live…
    putDM(friend.name, { ...msg, status: accept ? 'accepted' : 'declined' })
    // …and update the shared blend: joining adds me to members, either way I
    // drop off the pending "invited" list.
    setBlends(blends.map((b) => {
      if (b.id !== msg.blendId) return b
      const invited = (b.invited || []).filter((c) => c !== SELF)
      const members = accept ? [...new Set([...(b.members || []), SELF])] : (b.members || [])
      return { ...b, invited, members }
    }))
  }

  // Group consecutive messages by calendar day for the divider labels.
  let lastDay = null

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <header className="flex h-[56px] shrink-0 items-center gap-[12px] border-b border-[#1c1d21] px-[20px]">
        <Avatar color={friend.color} size={30} />
        <div className="leading-tight">
          <div className="text-[16px] font-semibold text-white">{fname}</div>
          <div className="text-[12px]" style={{ color: D.mute }}>Online</div>
        </div>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-[24px] py-[20px]">
        <div className="mx-auto w-full max-w-[860px]">
          {/* Conversation start card */}
          <div className="mb-[8px] flex flex-col items-start">
            <Avatar color={friend.color} size={72} />
            <h2 className="mt-[12px] text-[28px] font-bold text-white">{fname}</h2>
            <p className="mt-[2px] text-[15px]" style={{ color: D.dim }}>
              This is the beginning of your direct message history with <span className="font-semibold text-white">{fname}</span>.
            </p>
          </div>

          {msgs.length === 0 && (
            <p className="mt-[16px] text-[14px]" style={{ color: D.mute }}>No messages yet. Say hi, share a game, or invite {fname} to a Mix.</p>
          )}

          {msgs.map((m) => {
            const mine = m.from === SELF_NAME
            const day = dmDay(m.ts)
            const showDay = day !== lastDay
            lastDay = day
            const senderName = mine ? dispName(SELF_NAME, names) : fname
            const senderColor = mine ? SELF : friend.color
            return (
              <Fragment key={m.id}>
                {showDay && <DmDivider label={day} />}
                <div className="group flex items-start gap-[14px] rounded-[6px] px-[8px] py-[6px] transition hover:bg-white/[0.03]">
                  <Avatar color={senderColor} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-[8px]">
                      <span className="text-[15px] font-semibold text-white">{senderName}</span>
                      <span className="text-[11px]" style={{ color: D.mute }}>{dmTime(m.ts)}</span>
                    </div>
                    {m.kind === 'invite' ? (
                      <InviteMessage msg={m} mine={mine} onRespond={(accept) => respondInvite(m, accept)} />
                    ) : m.kind === 'game' ? (
                      <GameMessage msg={m} onOpen={onOpen} />
                    ) : (
                      <p className="mt-[2px] whitespace-pre-wrap break-words text-[15px] leading-snug text-[#dbdee1]">{m.text}</p>
                    )}
                    {m.kind === 'invite' && m.status === 'accepted' && (
                      <button onClick={() => onOpenBlend(m.blendId)} className="mt-[8px] text-[13px] font-semibold text-[#5765f2] transition hover:underline">Open the Mix →</button>
                    )}
                  </div>
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="px-[24px] pb-[24px] pt-[4px]">
        <div className="mx-auto flex w-full max-w-[860px] items-center gap-[10px] rounded-[10px] bg-[#1e1f22] px-[16px] py-[4px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendText() }}
            placeholder={`Message ${fname}`}
            className="min-w-0 flex-1 bg-transparent py-[12px] text-[15px] text-white outline-none placeholder:text-[#87898c]"
          />
          <button onClick={sendText} disabled={!draft.trim()} className="shrink-0 rounded-[8px] bg-[#5765f2] px-[16px] py-[8px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Send</button>
        </div>
      </div>
    </main>
  )
}

// ── Live observation: publish + mirror + moderator wall ─────────────────────
// A live tester publishes their view (nav), pointer, clicks, scroll and a
// heartbeat into rooms/{ROOM_ID}/spectate/{name}. A spectator instance replays
// it read-only; the moderator wall embeds one spectator per participant.
function useMirrorPublish(nav) {
  const navKey = JSON.stringify(nav)
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/view`, nav)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey])

  useEffect(() => {
    if (!IS_LIVE) return
    // A backgrounded tab can momentarily report a 0/1px viewport; never publish
    // a degenerate size (it would make the mirror scale a 1px app up to a wall).
    const ok = () => window.innerWidth > 200 && window.innerHeight > 200
    const setVp = () => { if (ok()) writeRoomPath(`${SPECTATE_PATH}/vp`, { w: window.innerWidth, h: window.innerHeight }) }
    setVp()
    let lastMove = 0
    const onMove = (e) => {
      const t = Date.now()
      if (t - lastMove < 55 || !ok()) return
      lastMove = t
      writeRoomPath(`${SPECTATE_PATH}/pointer`, { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, t })
    }
    const onDown = (e) => { if (ok()) writeRoomPath(`${SPECTATE_PATH}/click`, { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, t: Date.now() }) }
    let lastScroll = 0
    // Scroll containers share the .no-scrollbar class, so the same ordered list
    // exists on the mirror — index into it to replay the exact scroll.
    const onScroll = (e) => {
      const t = Date.now()
      if (t - lastScroll < 70) return
      lastScroll = t
      const i = [...document.querySelectorAll('.no-scrollbar')].indexOf(e.target)
      if (i < 0) return
      writeRoomPath(`${SPECTATE_PATH}/scroll`, { i, top: e.target.scrollTop || 0, left: e.target.scrollLeft || 0, t })
    }
    writeRoomPath(`${SPECTATE_PATH}/ts`, Date.now())
    const beat = setInterval(() => writeRoomPath(`${SPECTATE_PATH}/ts`, Date.now()), 4000)
    window.addEventListener('resize', setVp)
    document.addEventListener('visibilitychange', setVp)
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', setVp)
      document.removeEventListener('visibilitychange', setVp)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('scroll', onScroll, true)
      clearInterval(beat)
    }
  }, [])
}

function SpectatorCursor({ pointer, click }) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const r = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])
  const x = (pointer?.x ?? 0.5) * size.w
  const y = (pointer?.y ?? 0.5) * size.h
  return (
    <div className="pointer-events-none fixed inset-0 z-[9998]">
      <div className="absolute left-0 top-0 transition-transform duration-[80ms] ease-linear" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <svg viewBox="0 0 24 24" className="size-[24px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ transform: 'translate(-2px,-1px)' }}>
          <path d="M5 2l13 7.5-5.6 1.4L10 19 5 2z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
      {click && (
        <span key={click.t} className="sp-ripple absolute size-[16px] rounded-full" style={{ left: click.x * size.w, top: click.y * size.h }} />
      )}
    </div>
  )
}

function describeView(v) {
  if (!v) return 'Idle'
  if (v.shareGame) return `Sharing “${v.shareGame}”`
  if (v.wishlistGame) return `Add to Mix: ${v.wishlistGame}`
  if (v.createOpen) return 'Creating a Mix'
  if (v.prefsForId) return 'Setting preferences'
  if (v.decide) return 'The Jumble (deciding)'
  if (v.dmName) return `DM with ${v.dmName}`
  if (v.blendId) return 'Viewing a Mix'
  return 'Home / For you'
}

// Scales a full-size participant iframe to FIT ENTIRELY inside its box (contain,
// centered, letterboxed if the aspect differs) so nothing the participant sees
// is ever cropped.
function FitFrame({ src, vp }) {
  const ref = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])
  const scale = box.w && box.h ? Math.min(box.w / vp.w, box.h / vp.h) : 0
  const sw = vp.w * scale
  const sh = vp.h * scale
  return (
    <div ref={ref} className="relative size-full overflow-hidden bg-black">
      {scale > 0 && (
        <iframe
          title="participant"
          src={src}
          className="absolute origin-top-left border-0"
          style={{ width: vp.w, height: vp.h, transform: `scale(${scale})`, left: Math.round((box.w - sw) / 2), top: Math.round((box.h - sh) / 2) }}
        />
      )}
    </div>
  )
}

function ModeratorTile({ name, displayName, onRename, color, vp, online, view, src, hidden, onHide, onNudge, onExpand }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#1c1d21] bg-[#111114]">
      <div className="flex items-center gap-[10px] px-[12px] py-[8px]">
        <span className="relative shrink-0">
          <Avatar color={color} size={24} />
          <span className="absolute -bottom-[1px] -right-[1px] size-[9px] rounded-full" style={{ backgroundColor: online ? '#23a55a' : '#5c5e66', border: '2px solid #111114' }} />
        </span>
        <div className="min-w-0">
          {/* Editable display name — the moderator can rename each participant;
              the name syncs to the room and shows across that person's screens. */}
          <input
            key={displayName}
            defaultValue={displayName}
            onBlur={(e) => onRename(e.target.value.trim())}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            title="Rename this participant"
            className="w-full rounded-[4px] bg-transparent px-[3px] py-[1px] text-[14px] font-semibold leading-tight text-white outline-none transition hover:bg-[#1c1d21] focus:bg-[#1c1d21]"
          />
          <div className="truncate px-[3px] text-[11px] text-[#80848e]">{online ? describeView(view) : 'offline'}</div>
        </div>
        <div className="ml-auto flex shrink-0 gap-[6px]">
          <button onClick={onHide} title={hidden ? 'Show this participant' : 'Hide this participant'} className="rounded-[6px] bg-[#2b2d31] px-[8px] py-[4px] text-[11px] font-semibold transition hover:bg-[#35373c]">{hidden ? 'Show' : 'Hide'}</button>
          {!hidden && <>
            <button onClick={onExpand} title="Expand" className="rounded-[6px] bg-[#2b2d31] px-[8px] py-[4px] text-[11px] font-semibold transition hover:bg-[#35373c]">Expand</button>
            <button onClick={() => onNudge('home')} title="Send them to Home" className="rounded-[6px] bg-[#2b2d31] px-[8px] py-[4px] text-[11px] font-semibold transition hover:bg-[#35373c]">Home</button>
            <button onClick={() => onNudge('reload')} title="Reload their tab" className="rounded-[6px] bg-[#2b2d31] px-[8px] py-[4px] text-[11px] font-semibold transition hover:bg-[#35373c]">Reload</button>
          </>}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {hidden ? (
          <div className="flex size-full items-center justify-center text-[13px] text-[#80848e]">Hidden</div>
        ) : (
          <FitFrame src={src} vp={vp} />
        )}
      </div>
    </div>
  )
}

function ModeratorWall() {
  const room = useRoom({ self: null, seedBlends: SEED_BLENDS })
  const [spec] = useRoomNode('spectate', {})
  const [focus, setFocus] = useState(null)
  const hidden = room.hiddenProfiles || {} // shared — hidden participants disappear everywhere
  const src = (name) => `${window.location.pathname}?u=${NAME_TO_U[name] || name}&spectate=1&room=${ROOM_ID}`
  const nudge = (name, type) => writeRoomPath(`spectate/${name}/cmd`, { type, id: Date.now().toString(36), ts: Date.now() })
  const now = Date.now()
  const specMap = spec && typeof spec === 'object' ? spec : {}
  return (
    <RoomProvider value={room}>
      <div className="flex h-screen w-screen flex-col bg-[#0b0b0d] text-white" onContextMenu={(e) => e.preventDefault()}>
        <header className="flex items-center gap-[14px] border-b border-[#1c1d21] px-[24px] py-[14px]">
          <span className="text-[18px] font-bold">Moderator · live participant wall</span>
          <span className="rounded-full bg-[#1c1d21] px-[10px] py-[3px] text-[12px] text-[#b5bac1]">room: {ROOM_ID}</span>
          <button
            onClick={() => { if (window.confirm('Reset the room to a fresh state for everyone?')) room.resetRoom() }}
            className="ml-auto rounded-[8px] border border-[#4e5058] px-[14px] py-[7px] text-[13px] font-semibold text-[#f0a0a0] transition hover:bg-[#4e5058]/30"
          >
            Reset room
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[16px] overflow-hidden p-[16px]">
          {DMS.map((t) => {
            const s = specMap[t.name] || {}
            const vp = s.vp && s.vp.w > 200 && s.vp.h > 200 ? s.vp : { w: 1280, h: 800 }
            const online = s.ts && now - s.ts < 15000
            return (
              <ModeratorTile
                key={t.name}
                name={t.name}
                displayName={dispName(t.name, room.names)}
                onRename={(n) => room.setName(t.name, n)}
                color={t.color}
                vp={vp}
                online={online}
                view={s.view}
                src={src(t.name)}
                hidden={!!hidden[t.name]}
                onHide={() => room.setHiddenProfile(t.name, !hidden[t.name])}
                onNudge={(type) => nudge(t.name, type)}
                onExpand={() => setFocus(t.name)}
              />
            )
          })}
        </div>

        {focus && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/85 p-[24px]" onClick={() => setFocus(null)}>
            <div className="mb-[12px] flex items-center gap-[10px]" onClick={(e) => e.stopPropagation()}>
              <span className="text-[16px] font-semibold">{focus}</span>
              <button onClick={() => nudge(focus, 'home')} className="rounded-[6px] bg-[#2b2d31] px-[12px] py-[6px] text-[12px] font-semibold transition hover:bg-[#35373c]">Send to Home</button>
              <button onClick={() => nudge(focus, 'reload')} className="rounded-[6px] bg-[#2b2d31] px-[12px] py-[6px] text-[12px] font-semibold transition hover:bg-[#35373c]">Reload their tab</button>
              <button onClick={() => setFocus(null)} className="ml-auto rounded-[6px] bg-[#2b2d31] px-[12px] py-[6px] text-[12px] font-semibold transition hover:bg-[#35373c]">Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] bg-black" onClick={(e) => e.stopPropagation()}>
              <FitFrame src={src(focus)} vp={specMap[focus]?.vp?.w > 200 ? specMap[focus].vp : { w: 1280, h: 800 }} />
            </div>
          </div>
        )}
      </div>
    </RoomProvider>
  )
}

// ── Game content detail page (Figma node 822:2328) ──────────────────────────
// Opens when a game card is clicked anywhere in the app. Data-driven from the
// existing CATALOG/details, with richer showcase copy per game in DETAIL_COPY
// (games without bespoke copy fall back to sensible defaults). The left Discord
// chrome (ServerRail + Sidebar) is provided by Landing; this is the main pane.

// Simple inline glyphs (the Figma assets live on a temporary dev server, so we
// draw these to match the app's existing inline-SVG convention).
function ThumbsUpGlyph({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm3.5 10a2 2 0 0 1-1.5-.7V10l4.2-6.6c.4-.7 1.3-.9 2-.5.6.4.9 1.1.7 1.8L14.9 9H20a2 2 0 0 1 2 2.4l-1.4 6.9A2.4 2.4 0 0 1 18.2 20H10.5Z" />
    </svg>
  )
}
function ShareGlyph({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
    </svg>
  )
}
function AppleGlyph({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.7-1.7-3.3-1.8-1.4-.1-2.7.8-3.4.8s-1.8-.8-2.9-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.1c.9-1.3 1.2-2.5 1.2-2.5-.1 0-2.4-.9-2.4-3.6ZM14.3 6.2c.6-.7 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.6-1.1 1.7-1 2.7 1 .1 2.1-.5 2.8-1.2Z" />
    </svg>
  )
}
function StarGlyph({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.4L12 16.9 6 19.9l1.5-6.4-5-4.4 6.6-.6z" />
    </svg>
  )
}
function PersonGlyph({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0Z" />
    </svg>
  )
}

// A 2×2 white tile grid — the Windows/tiles platform mark from the design.
function WindowsGlyph({ size = 24 }) {
  const cell = (size - 3) / 2
  return (
    <div style={{ width: size, height: size, display: 'grid', gridTemplateColumns: `${cell}px ${cell}px`, gridTemplateRows: `${cell}px ${cell}px`, gap: 3 }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ background: '#fff', borderRadius: 1 }} />)}
    </div>
  )
}

const DETAIL_COPY = {
  ac: {
    title: "Assassin's Creed Black Flag Resynced",
    description:
      "Discover Assassin's Creed IV Black Flag, the classic pirate action-adventure game. Command your ship, hunt Templars and carve your legend as Edward Kenway across the Caribbean's Golden Age of Piracy.",
    publisher: 'Ubisoft Montreal', developer: 'Ubisoft Montreal',
    released: '10/29/2013', storage: '16 GB RAM', difficulty: 'Intermediate',
    ratingPct: '80%', ratingCount: '15K', recPct: '75%',
    lastSession: '04/18/2026', sessionRecord: '4.2 Hours', totalTime: '14.8 Hours',
  },
}

// Merge catalog data + showcase copy into one view model, with fallbacks so any
// game opens a sensible page even without bespoke copy.
function detailFor(key) {
  // Library-only games (no Steam art, so never folded into CATALOG) fall back
  // to their Starter entry, so every Library tile still opens a real page
  // rather than an "Untitled" one.
  const s = STARTER_BY_KEY[key]
  const g = CATALOG[key] || (s
    ? {
        title: s.title,
        players: s.players === 'MMO' ? '1+' : s.players,
        genre: s.genre,
        developer: 'Game Pass',
        playtime: '~2hrs',
        caption: `${s.genre} — playable free with Game Pass Starter.`,
      }
    : {})
  const c = DETAIL_COPY[key] || {}
  return {
    key,
    image: g.image,
    title: c.title || g.title || 'Untitled',
    description: c.description || g.caption || '',
    players: g.players || '1-4',
    playtime: g.playtime || '~2hrs',
    genre: capName(g.genre || 'action'),
    difficulty: c.difficulty || 'Intermediate',
    publisher: c.publisher || g.developer || 'Unknown',
    developer: c.developer || g.developer || 'Unknown',
    released: c.released || 'TBA',
    storage: c.storage || '16 GB',
    ratingPct: c.ratingPct || '80%',
    ratingCount: c.ratingCount || '12K',
    recPct: c.recPct || '75%',
    lastSession: c.lastSession || '04/18/2026',
    sessionRecord: c.sessionRecord || '4.2 Hours',
    totalTime: c.totalTime || '14.8 Hours',
  }
}

const REVIEWS = [
  { name: 'ShinyPlastic_099', color: AVATAR.blue, joined: '02/23/2019', skill: 'Intermediate', privacy: 'Friends Only', title: 'We should Play This Again', thumb: 'up', body: 'I have never really been able to get into the AC Games for some reason, they should appeal to me since I tend to enjoy this type of game but despite trying many (I have several outside of the ones I have on Steam), they just never managed to hold my attention. At least until now that is . . .' },
  { name: 'Pastel_089', color: AVATAR.purple, joined: '04/14/2020', skill: 'Intermediate', privacy: 'Public', title: 'Ugh. Gross', thumb: 'down', body: 'Ass.' },
  { name: 'PastyBeans2021', color: AVATAR.green, joined: '04/14/2020', skill: 'Intermediate', privacy: 'Public', title: 'Nice Graphics', thumb: 'up', body: "I've never been able to get into AC Games. They should appeal to me, but despite trying many, they never held my attention until now. The graphics really pull you into the Golden Age of Piracy." },
  { name: 'NovaTheWolf', color: AVATAR.red, joined: '11/02/2018', skill: 'Advanced', privacy: 'Friends Only', title: 'Best co-op night in ages', thumb: 'up', body: 'We ran a full lobby and nobody wanted to stop. The chaos ramps up perfectly the more people you cram in, and the learning curve is gentle enough that our least-gamer friend still had a blast.' },
  { name: 'QuietStorm_42', color: AVATAR.blue, joined: '07/19/2021', skill: 'Beginner', privacy: 'Public', title: 'Good but grindy', thumb: 'up', body: 'Solid fun for the first several hours. It does start to feel repetitive once you have seen all the maps, but by then you have more than gotten your money’s worth.' },
  { name: 'mossy_antler', color: AVATAR.green, joined: '03/30/2022', skill: 'Intermediate', privacy: 'Friends Only', title: 'Surprisingly deep', thumb: 'up', body: 'Looks casual on the surface, but there is real strategy once everyone knows what they are doing. Highly recommend playing with voice chat on.' },
  { name: 'ByteSizedBrian', color: AVATAR.purple, joined: '09/12/2019', skill: 'Advanced', privacy: 'Public', title: 'Servers can be rough', thumb: 'down', body: 'The game itself is great, but I hit a few laggy sessions and one hard crash. When it works it is a 9/10; when it does not it is frustrating.' },
  { name: 'Cloudberry', color: AVATAR.red, joined: '01/05/2023', skill: 'Beginner', privacy: 'Friends Only', title: 'My new comfort game', thumb: 'up', body: 'Perfect for unwinding after work with the group. Low stakes, lots of laughs, easy to hop in and out of.' },
  { name: 'Grimlock_Prime', color: AVATAR.blue, joined: '05/28/2017', skill: 'Advanced', privacy: 'Public', title: 'Skill ceiling is real', thumb: 'up', body: 'Casual players will have fun, but there is a ton of room to master the mechanics. The gap between a new player and a veteran is huge, in a good way.' },
  { name: 'peachy_keen', color: AVATAR.green, joined: '10/14/2020', skill: 'Intermediate', privacy: 'Friends Only', title: 'Wish there was more content', thumb: 'up', body: 'What is here is polished and great, I just burned through it faster than I expected. Hoping the devs keep adding maps and modes.' },
  { name: 'V0idWalker', color: AVATAR.purple, joined: '06/06/2021', skill: 'Beginner', privacy: 'Public', title: 'Not for me', thumb: 'down', body: 'I can see why people love it, but the pacing did not click with me. Gave it a few sessions and just bounced off.' },
  { name: 'SunnySideUp', color: AVATAR.red, joined: '02/11/2022', skill: 'Intermediate', privacy: 'Public', title: 'Great with strangers too', thumb: 'up', body: 'Even queuing solo I ended up in fun lobbies. The community is friendlier than most, which is rare these days.' },
  { name: 'takoyaki_lord', color: AVATAR.blue, joined: '08/23/2019', skill: 'Advanced', privacy: 'Friends Only', title: 'Ran it for our game night', thumb: 'up', body: 'Hosted eight people and it handled the crowd better than expected. A couple of them bought it the next day. That is the best endorsement I can give.' },
]

function DetailPill({ children }) {
  return (
    <span className="flex items-center gap-[6px] whitespace-nowrap rounded-full border border-[#8e9297] px-[12px] py-[3px] text-[14px] font-semibold text-[#c7c9cb]">
      {children}
    </span>
  )
}

function InfoLine({ label, children }) {
  return (
    <p className="text-[16px] leading-[1.7] text-[#9a9ba3]">
      {label} <span className="font-semibold text-[#e7e7e7]">{children}</span>
    </p>
  )
}

function PrivacyBadge({ kind }) {
  const friends = kind === 'Friends Only'
  return (
    <span className={'flex w-fit items-center gap-[7px] whitespace-nowrap rounded-[6px] border px-[11px] py-[5px] text-[13px] font-semibold ' + (friends ? 'border-[#7aff46]/55 text-[#7aff46]' : 'border-white/40 text-[#c7c9cb]')}>
      {friends ? <StarGlyph size={14} /> : <PersonGlyph size={14} />}
      {kind}
    </span>
  )
}

function ReviewCard({ r }) {
  const down = r.thumb === 'down'
  return (
    <div className="flex gap-[18px] rounded-[8px] bg-[#1c1c1c] p-[16px]">
      <Avatar color={r.color} size={104} className="shrink-0 rounded-[6px]" style={{ borderRadius: 6 }} />
      {/* Reviewer meta — name, joined, skill, privacy badge */}
      <div className="flex w-[200px] shrink-0 flex-col justify-start pt-[2px]">
        <p className="text-[20px] font-bold leading-tight text-white">{r.name}</p>
        <p className="mt-[8px] text-[13px] text-[#6f7276]">Joined: <span className="text-[#9a9ba3]">{r.joined}</span></p>
        <p className="text-[13px] text-[#6f7276]">Skill Level: <span className="text-[#9a9ba3]">{r.skill}</span></p>
        <div className="mt-[12px]"><PrivacyBadge kind={r.privacy} /></div>
      </div>
      {/* Review panel — title + body on the left, big thumb on the right */}
      <div className="flex flex-1 items-center gap-[16px] rounded-[8px] bg-[#121214] p-[18px]">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[24px] font-semibold leading-tight text-white">{r.title}</p>
          <p
            className="mt-[8px] max-h-[96px] overflow-hidden text-[15px] leading-[1.5] text-transparent"
            style={{ backgroundImage: 'linear-gradient(to bottom, #b9bbc0 40%, rgba(18,19,21,0) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
          >
            {r.body}
          </p>
        </div>
        <div className="flex shrink-0 items-center pr-[10px] text-white">
          <ThumbsUpGlyph size={46} className={down ? 'rotate-180' : undefined} />
        </div>
      </div>
    </div>
  )
}

// Reviews block on the game detail page: filter by audience (all / friends /
// public), show the first page collapsed behind a "Show more" button, then
// paginate the rest six at a time.
const REVIEWS_PER_PAGE = 6
const REVIEWS_PREVIEW = 3
function ReviewsSection({ reviews = REVIEWS }) {
  const [filter, setFilter] = useState('All') // 'All' | 'Friends Only' | 'Public'
  const [filterOpen, setFilterOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1) // 1-based
  const [writing, setWriting] = useState(false)
  const [added, setAdded] = useState([]) // reviews written this session (newest first)

  const all = [...added, ...reviews]
  const shown = filter === 'All' ? all : all.filter((r) => r.privacy === filter)
  const pageCount = Math.max(1, Math.ceil(shown.length / REVIEWS_PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const visible = expanded
    ? shown.slice((safePage - 1) * REVIEWS_PER_PAGE, safePage * REVIEWS_PER_PAGE)
    : shown.slice(0, REVIEWS_PREVIEW)

  // Changing the filter resets back to the collapsed first page.
  const pickFilter = (f) => { setFilter(f); setFilterOpen(false); setExpanded(false); setPage(1) }

  const FILTERS = ['All', 'Friends Only', 'Public']

  return (
    <section className="mt-[40px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-[12px]">
          <h2 className="text-[26px] font-bold text-white">Reviews</h2>
          {filter !== 'All' && (
            <span className="text-[14px] font-semibold text-[#9a9ba3]">{filter} · {shown.length}</span>
          )}
        </div>
        <div className="flex items-center gap-[16px]">
        {/* Write a review */}
        <button
          onClick={() => setWriting(true)}
          className="flex items-center gap-[8px] rounded-[10px] bg-[#2b2d31] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#35373c]"
        >
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          Write a review
        </button>
        {/* Filter — All / Friends Only / Public */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="Filter reviews"
            aria-expanded={filterOpen}
            className="group relative flex items-center justify-center text-[#9a9ba3] transition hover:text-white"
          >
            <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/80 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
              Filter
            </span>
            <svg viewBox="0 0 30 30" className="size-[24px]" fill="currentColor">
              <path d="M28.4375 21.875C28.4375 22.3875 28.0125 22.8125 27.5 22.8125H18.75V23.125C18.75 25 17.625 25.625 16.25 25.625H8.75C7.375 25.625 6.25 25 6.25 23.125V22.8125H2.5C1.9875 22.8125 1.5625 22.3875 1.5625 21.875C1.5625 21.3625 1.9875 20.9375 2.5 20.9375H6.25V20.625C6.25 18.75 7.375 18.125 8.75 18.125H16.25C17.625 18.125 18.75 18.75 18.75 20.625V20.9375H27.5C28.0125 20.9375 28.4375 21.3625 28.4375 21.875Z" />
              <path d="M28.4375 8.125C28.4375 8.6375 28.0125 9.0625 27.5 9.0625H23.75V9.375C23.75 11.25 22.625 11.875 21.25 11.875H13.75C12.375 11.875 11.25 11.25 11.25 9.375V9.0625H2.5C1.9875 9.0625 1.5625 8.6375 1.5625 8.125C1.5625 7.6125 1.9875 7.1875 2.5 7.1875H11.25V6.875C11.25 5 12.375 4.375 13.75 4.375H21.25C22.625 4.375 23.75 5 23.75 6.875V7.1875H27.5C28.0125 7.1875 28.4375 7.6125 28.4375 8.125Z" />
            </svg>
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-[34px] z-[50] w-[184px] overflow-hidden rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => pickFilter(f)}
                    className={'flex w-full items-center justify-between px-[14px] py-[9px] text-left text-[14px] transition hover:bg-white/5 ' + (filter === f ? 'text-[#7aff46]' : 'text-[#dbdee1]')}
                  >
                    {f === 'All' ? 'All reviews' : f === 'Friends Only' ? 'Friends only' : 'Public'}
                    {filter === f && <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      <div className="mt-[16px] flex flex-col gap-[16px]">
        {visible.map((r, i) => <ReviewCard key={`${r.name}-${i}`} r={r} />)}
        {visible.length === 0 && (
          <p className="rounded-[8px] bg-[#1c1c1c] py-[28px] text-center text-[14px] text-[#9a9ba3]">No {filter === 'All' ? '' : filter.toLowerCase() + ' '}reviews yet.</p>
        )}
      </div>

      {/* Collapsed: reveal the full first page. Expanded: page through the rest. */}
      {!expanded && shown.length > REVIEWS_PREVIEW && (
        <div className="mt-[20px] flex justify-center">
          <button
            onClick={() => { setExpanded(true); setPage(1) }}
            className="flex items-center gap-[8px] rounded-[10px] border border-[#3a3d41] px-[24px] py-[11px] text-[15px] font-semibold text-white transition hover:border-[#7aff46]/60 hover:text-[#7aff46]"
          >
            Show more reviews
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
      )}

      {expanded && pageCount > 1 && (
        <div className="mt-[24px] flex items-center justify-center gap-[8px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
            className="flex size-[36px] items-center justify-center rounded-[8px] border border-[#3a3d41] text-white transition hover:border-[#7aff46]/60 hover:text-[#7aff46] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#3a3d41] disabled:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === safePage}
              className={'flex size-[36px] items-center justify-center rounded-[8px] text-[15px] font-semibold transition ' + (p === safePage ? 'bg-[#7aff46] text-black' : 'border border-[#3a3d41] text-white hover:border-[#7aff46]/60 hover:text-[#7aff46]')}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
            aria-label="Next page"
            className="flex size-[36px] items-center justify-center rounded-[8px] border border-[#3a3d41] text-white transition hover:border-[#7aff46]/60 hover:text-[#7aff46] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#3a3d41] disabled:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}

      {writing && (
        <WriteReviewModal
          onClose={() => setWriting(false)}
          onSubmit={(r) => { setAdded((a) => [r, ...a]); setWriting(false); setFilter('All'); setExpanded(false); setPage(1) }}
        />
      )}
    </section>
  )
}

// Compose a review on the detail page — thumb up/down, title, body, and a
// Friends Only / Public visibility toggle (mirrors the review privacy badges).
function WriteReviewModal({ onClose, onSubmit }) {
  const [thumb, setThumb] = useState('up')
  const [privacy, setPrivacy] = useState('Public') // 'Public' | 'Friends Only'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const canPost = title.trim() && body.trim()
  const post = () => {
    if (!canPost) return
    onSubmit({
      name: capName(SELF_NAME), color: SELF, joined: '01/01/2024', skill: 'Intermediate',
      privacy, thumb, title: title.trim(), body: body.trim(),
    })
  }
  const Vis = ({ value, glyph, label }) => (
    <button
      onClick={() => setPrivacy(value)}
      className={'flex flex-1 items-center justify-center gap-[7px] rounded-[8px] border px-[12px] py-[9px] text-[13px] font-semibold transition ' + (privacy === value ? (value === 'Friends Only' ? 'border-[#7aff46] text-[#7aff46]' : 'border-white text-white') : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}
    >
      {glyph}{label}
    </button>
  )
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex w-[520px] max-w-full flex-col gap-[18px] rounded-[16px] border border-[#1c1d21] bg-[#1c1c1f] p-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[22px] font-bold text-white">Write a review</h3>
          <button onClick={onClose} aria-label="Close" className="text-[#9a9ba3] transition hover:text-white"><svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        {/* Recommend? — thumb up / down */}
        <div>
          <p className="mb-[8px] text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">Do you recommend it?</p>
          <div className="flex gap-[10px]">
            <button onClick={() => setThumb('up')} className={'flex flex-1 items-center justify-center gap-[8px] rounded-[8px] border px-[12px] py-[10px] text-[14px] font-semibold transition ' + (thumb === 'up' ? 'border-[#7aff46] bg-[#107C10]/15 text-[#7aff46]' : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}>
              <ThumbsUpGlyph size={18} /> Yes
            </button>
            <button onClick={() => setThumb('down')} className={'flex flex-1 items-center justify-center gap-[8px] rounded-[8px] border px-[12px] py-[10px] text-[14px] font-semibold transition ' + (thumb === 'down' ? 'border-[#f04747] bg-[#f04747]/15 text-[#ff8a8a]' : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}>
              <ThumbsUpGlyph size={18} className="rotate-180" /> No
            </button>
          </div>
        </div>

        <div>
          <p className="mb-[8px] text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up" maxLength={80} className="w-full rounded-[8px] bg-[#111214] px-[12px] py-[10px] text-[14px] text-white outline-none ring-1 ring-white/10 placeholder:text-[#6f7276] focus:ring-[#5765f2]" />
        </div>
        <div>
          <p className="mb-[8px] text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">Your review</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" rows={4} className="w-full resize-none rounded-[8px] bg-[#111214] px-[12px] py-[10px] text-[14px] leading-[1.5] text-white outline-none ring-1 ring-white/10 placeholder:text-[#6f7276] focus:ring-[#5765f2]" />
        </div>

        {/* Visibility — Public / Friends Only */}
        <div>
          <p className="mb-[8px] text-[13px] font-semibold uppercase tracking-wide text-[#9a9ba3]">Who can see this?</p>
          <div className="flex gap-[10px]">
            <Vis value="Public" glyph={<PersonGlyph size={14} />} label="Public" />
            <Vis value="Friends Only" glyph={<StarGlyph size={14} />} label="Friends only" />
          </div>
        </div>

        <div className="flex justify-end gap-[10px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#3a3c42] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Cancel</button>
          <button onClick={post} disabled={!canPost} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Post review</button>
        </div>
      </div>
    </div>
  )
}

// Extra screenshot slides per game (beyond the cover), extensible as art lands.
const GALLERY = {}

// Build the ordered media slides for a game's hero carousel: cover first, then
// any bespoke screenshots, then the trailer (as a video slide) if one exists.
function slidesFor(key, cover) {
  const slides = cover ? [{ type: 'image', src: cover }] : []
  for (const src of GALLERY[key] || []) slides.push({ type: 'image', src })
  if (VIDEOS[key]) slides.push({ type: 'video', youTubeId: VIDEOS[key], poster: cover })
  // A game with no art and no trailer still needs one slide to render against.
  return slides.length ? slides : [{ type: 'image' }]
}

// Hero image/video carousel — arrow buttons wrap around, dots jump directly,
// and left/right arrow keys page through. Only the active video slide mounts a
// live trailer; the rest fall back to their poster so we never stack iframes.
function HeroCarousel({ slides, children }) {
  const [i, setI] = useState(0)
  const n = slides.length
  const go = (dir) => setI((p) => (p + dir + n) % n)
  useEffect(() => {
    if (n <= 1) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setI((p) => (p - 1 + n) % n)
      else if (e.key === 'ArrowRight') setI((p) => (p + 1) % n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])
  return (
    <div className="group relative w-full shrink-0 overflow-hidden rounded-[10px] bg-black shadow-[0_4px_20px_rgba(0,0,0,0.5)] lg:w-[560px]">
      <div
        className="flex aspect-[16/10] w-full transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {slides.map((s, idx) => (
          <div key={idx} className="relative size-full shrink-0 basis-full bg-black">
            {s.type === 'video' && idx === i ? (
              <VideoTrailer youTubeId={s.youTubeId} poster={s.poster} />
            ) : (
              <img alt="" src={s.type === 'video' ? s.poster : s.src} className="absolute inset-0 size-full object-cover" />
            )}
            {s.type === 'video' && (
              <span className="pointer-events-none absolute right-[12px] top-[12px] rounded-[4px] bg-black/60 px-[8px] py-[3px] text-[11px] font-semibold uppercase tracking-wide text-white">Trailer</span>
            )}
          </div>
        ))}
      </div>

      {/* Overlay content (platform marks) passed by the parent */}
      {children}

      {n > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-[10px] top-1/2 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-[10px] top-1/2 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div className="absolute bottom-[14px] left-1/2 flex -translate-x-1/2 gap-[7px]">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={'size-[7px] rounded-full transition ' + (idx === i ? 'scale-110 bg-white' : 'bg-white/40 hover:bg-white/70')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// A "Played By" / rating avatar that responds to hover, shows the person's name,
// and on click opens a quick-share of this game straight to that person.
function PlayerAvatar({ color, size, marginRight, gameTitle, onShare }) {
  const name = NAME[color]
  // The user (green) and any unmapped color aren't share targets.
  if (color === SELF || !name) {
    return <Avatar color={color} size={size} style={{ marginRight, boxShadow: '0 0 0 2px #0c0c0e' }} />
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onShare?.({ title: gameTitle, to: name }) }}
      title={`Share ${gameTitle} with ${capName(name)}`}
      className="group/av relative shrink-0 rounded-full transition hover:z-10 hover:-translate-y-[2px]"
      style={{ marginRight }}
    >
      <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-black/85 px-[8px] py-[3px] text-[12px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover/av:opacity-100">
        {capName(name)}
      </span>
      <Avatar color={color} size={size} className="rounded-full ring-0 transition group-hover/av:ring-2 group-hover/av:ring-[#5765f2]" style={{ boxShadow: '0 0 0 2px #0c0c0e' }} />
    </button>
  )
}

function GameDetailPage({ gameKey, onBack, onHome, onLibrary, onMixes, onWishlist, onShare, onOpen, onPlay }) {
  const d = detailFor(gameKey)
  const slides = slidesFor(gameKey, d.image)
  // A game no friend has played yet ("Be the first" state) shows no friend
  // reviews or social proof.
  const unplayed = STARTER_DESC[gameKey]?.friends === ''
  // Friends who've played it — never the current user.
  const playedBy = [AVATAR.blue, AVATAR.purple, AVATAR.red]
  const recCinematic = CINEMATIC_ROW.filter((c) => c.id !== gameKey)
  const recPortrait = PORTRAIT_ROW.filter((c) => c.id !== gameKey)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      {/* Top nav — same Home / Library / Mixes header as the homepage */}
      <header className="flex h-[56px] shrink-0 items-center gap-[32px] border-b border-[#1c1d21] px-[40px]">
        <XboxLogo size={24} />
        <button onClick={onHome || onBack} className="pb-[2px] text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Home</button>
        <button onClick={onLibrary} className="pb-[2px] text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Library</button>
        <button onClick={onMixes} className="pb-[2px] text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Mixes</button>
        <div className="flex flex-1 items-center justify-end gap-[20px]">
          <WheelNavButton />
          <GiftArcadeButton onClick={() => setSearchOpen(true)} />
        </div>
      </header>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}

      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[32px]">
        <div className="mx-auto w-full max-w-[1240px]">
          {/* Hero — cover on the left, title/description/tags/ratings on the right */}
          <section className="flex flex-col gap-[32px] lg:flex-row">
            <HeroCarousel slides={slides}>
              {/* Platform marks, bottom-left of the cover */}
              <div className="pointer-events-none absolute bottom-[16px] left-[16px] z-[1] flex items-center gap-[16px] text-white [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.8))]">
                <WindowsGlyph size={24} />
                <AppleGlyph size={30} />
              </div>
            </HeroCarousel>

            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="text-[44px] font-bold leading-[1.05] tracking-tight text-white">{d.title}</h1>
              {/* Also Played By — right under the title */}
              <div className="mt-[14px] flex items-center gap-[10px] text-[16px] text-[#a2a4ae]">
                Also Played By:
                {unplayed ? (
                  <span className="text-[15px] text-[#7e7f87]">No one in your Mix yet</span>
                ) : (
                  <span className="flex items-center">
                    {playedBy.map((c, i) => (
                      <PlayerAvatar key={i} color={c} size={26} marginRight={i < playedBy.length - 1 ? -8 : 0} gameTitle={d.title} onShare={onShare} />
                    ))}
                  </span>
                )}
              </div>
              <p className="mt-[16px] max-w-[560px] text-[16px] leading-[1.5] text-[#a2a4ae]">{d.description}</p>
              <div className="mt-[20px] flex flex-wrap items-center gap-[8px]">
                <DetailPill>
                  <img alt="" src={userGroup} className="size-[15px] -scale-x-100" />
                  {d.players}
                </DetailPill>
                <DetailPill>{d.playtime}</DetailPill>
                <DetailPill>{d.genre}</DetailPill>
                <DetailPill>{d.difficulty}</DetailPill>
              </div>
            </div>
          </section>

          {/* Action band — buttons + publisher on the left, ratings + session
              stats on the right (Figma 977:3261) */}
          <section className="mt-[32px] flex flex-col gap-[28px] lg:flex-row lg:items-start lg:gap-[32px]">
            {/* Left: play/wishlist/share, then publisher info — width matches the cover */}
            <div className="flex flex-col lg:w-[560px] lg:shrink-0">
              <div className="flex items-center gap-[10px]">
                {/* Start a Party — green primary action */}
                <button
                  onClick={() => onPlay?.(gameKey)}
                  className="flex items-center gap-[9px] rounded-[8px] bg-[#2da000] px-[22px] py-[14px] text-[16px] font-bold text-white shadow-[0_2px_12px_rgba(45,160,0,0.4)] transition hover:brightness-110"
                >
                  <svg viewBox="0 0 24 24" className="size-[20px]" fill="currentColor"><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 19c0-2.7 2.9-4.3 6.5-4.3s6.5 1.6 6.5 4.3v.5H2zm14.4-4.2c.3-.04.6-.05 1-.02 2.2.16 3.6 1.4 3.6 3.2V19h-3.9v-.5c0-1.6-.55-2.9-1.5-4z" /></svg>
                  Start a Party
                </button>
                {/* Add to Mix — outlined */}
                <button
                  onClick={() => onWishlist?.(d.title)}
                  className="flex items-center gap-[9px] rounded-[8px] border-2 border-white/85 px-[20px] py-[12px] text-[16px] font-bold text-white transition hover:bg-white/10"
                >
                  <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
                  Add to Mix
                </button>
                <button
                  onClick={() => onShare?.(d.title)}
                  aria-label="Share"
                  className="flex size-[50px] shrink-0 items-center justify-center rounded-[8px] border-2 border-white/85 text-white transition hover:bg-white/10"
                >
                  <ShareGlyph size={22} />
                </button>
              </div>
              <div className="mt-[24px]">
                <InfoLine label="Publisher:">{d.publisher}</InfoLine>
                <InfoLine label="Developer:">{d.developer}</InfoLine>
                <InfoLine label="Released:">{d.released}</InfoLine>
              </div>
            </div>

            {/* Right: ratings + session stats — aligned under the hero info column */}
            {!unplayed && (
              <div className="flex flex-1 flex-col items-start gap-[18px]">
                <div className="flex flex-col gap-[10px]">
                  <div className="flex items-center gap-[12px]">
                    <span className="text-[34px] font-semibold leading-none text-[#7aff46]">{d.recPct}</span>
                    <ThumbsUpGlyph size={24} className="text-[#7aff46]" />
                    <div className="flex items-center">
                      {playedBy.map((c, i) => (
                        <PlayerAvatar key={i} color={c} size={30} marginRight={i < playedBy.length - 1 ? -9 : 0} gameTitle={d.title} onShare={onShare} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-[12px]">
                    <span className="text-[34px] font-semibold leading-none text-white">{d.ratingPct}</span>
                    <ThumbsUpGlyph size={24} className="text-white" />
                    <span className="text-[13px] leading-[1.15] text-[#9a9ba3]">out of<br /><span className="font-semibold text-[#c7c9cb]">{d.ratingCount} ratings</span></span>
                  </div>
                </div>
                <div className="mt-[2px]">
                  <InfoLine label="Last Group Session:">{d.lastSession}</InfoLine>
                  <InfoLine label="Group Session Record:">{d.sessionRecord}</InfoLine>
                  <InfoLine label="Total Game Time:">{d.totalTime}</InfoLine>
                </div>
              </div>
            )}
          </section>

          {/* Reviews — hidden until a friend has actually played it */}
          {unplayed ? (
            <section className="mt-[36px] flex flex-col items-center gap-[8px] rounded-[16px] border border-dashed border-[#2b2d31] py-[36px] text-center">
              <svg viewBox="0 0 24 24" className="size-[26px] text-[#9BF00B]" fill="currentColor"><path d="M12 2l2.4 5.4L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5L8 11.9 4 8l5.6-.6L12 2z" /></svg>
              <p className="text-[16px] font-semibold text-white">No friend reviews yet</p>
              <p className="text-[14px] text-[#9a9ba3]">Be the first to suggest this to your Mix and share what you think.</p>
            </section>
          ) : (
            <ReviewsSection />
          )}

          {/* Friends Also Liked — cinematic cards that always lead with friend
              activity (avatars + what they did), like "Highly Rated by Friends". */}
          <div className="mt-[32px]">
            <ShelfRow title="Friends Also Liked">
              {recCinematic.map((c) => (
                <CinematicCard key={c.id} {...c} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />
              ))}
            </ShelfRow>
          </div>
          {/* Like This Game — portrait cards like "Something Different for You":
              a friend's review when there is one, else "Be the first to suggest". */}
          <ShelfRow title="Like This Game">
            {recPortrait.map((c) => (
              <PortraitCard key={c.id} {...pcard(c.id)} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />
            ))}
          </ShelfRow>
        </div>
      </div>
    </main>
  )
}

export default function Landing() {
  if (IS_MODERATOR) return <ModeratorWall />
  const room = useRoom({ self: IS_LIVE ? SELF_NAME : null, seedBlends: SEED_BLENDS })
  const blends = room.blends || SEED_BLENDS
  const byId = (id) => blends.find((b) => b.id === id) || null

  const [blendId, setBlendId] = useState(null)
  const [detailKey, setDetailKey] = useState(null) // game content detail page
  const [detailFrom, setDetailFrom] = useState(null) // where the detail was opened from ({dm}|{blend}|null)
  const [createOpen, setCreateOpen] = useState(false)
  const [wishlistGame, setWishlistGame] = useState(null)
  const [shareGame, setShareGame] = useState(null)
  const [prefsForId, setPrefsForId] = useState(null)
  const [decide, setDecide] = useState(null) // { blendId, prefs }
  const [launching, setLaunching] = useState(null)
  const [playKey, setPlayKey] = useState(null) // game key whose "Who's playing?" modal is open
  const [whoOpen, setWhoOpen] = useState(false) // "See who's on PARTY" friends popup
  const [gameMenu, setGameMenu] = useState(null) // { x, y, title } — global right-click game menu
  const [wheelOpen, setWheelOpen] = useState(false) // the top-bar spin-wheel module
  const [wheelAutoJoin, setWheelAutoJoin] = useState(false) // opened via the jam "Join" toast
  const [wheelKeys, setWheelKeys] = useState([]) // personal wheel game list (session-scoped)
  const [dmName, setDmName] = useState(null)
  const [mixesTab, setMixesTab] = useState(false) // the "Mixes" top-nav tab (Figma 926:4875)
  const [libraryTab, setLibraryTab] = useState(false) // the "Library" top-nav tab — all games

  // Per-conversation "last read" timestamps drive the unread dots in the
  // sidebar. Persisted in localStorage so a reload doesn't re-flag old messages.
  const READ_KEY = `dmReads:${SELF_NAME}`
  const [reads, setReads] = useState(() => {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}') } catch { return {} }
  })
  const markRead = (name) => {
    const next = { ...reads, [dmConvId(SELF_NAME, name)]: Date.now() }
    setReads(next)
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)) } catch {}
  }
  const openDm = (name) => { markRead(name); setDmName(name); setBlendId(null); setDecide(null); setDetailKey(null); setMixesTab(false); setLibraryTab(false) }
  const openBlend = (id) => { setBlendId(id); setDmName(null); setDecide(null); setDetailKey(null); setMixesTab(false); setLibraryTab(false) }
  const goHome = () => { setBlendId(null); setDmName(null); setDecide(null); setDetailKey(null); setMixesTab(false); setLibraryTab(false) }
  const openMixes = () => { setMixesTab(true); setLibraryTab(false); setBlendId(null); setDmName(null); setDecide(null); setDetailKey(null) }
  const openLibrary = () => { setLibraryTab(true); setMixesTab(false); setBlendId(null); setDmName(null); setDecide(null); setDetailKey(null) }
  // Cards hand back a game title; map it to a catalog key and open the detail page.
  const openGame = (titleOrKey) => {
    // Starter keys count as known even without a CATALOG entry — the art-less
    // Library games live only in STARTER_BY_KEY.
    const known = CATALOG[titleOrKey] || STARTER_BY_KEY[titleOrKey]
    const key = known ? titleOrKey : (KEY_OF_TITLE[titleOrKey] || Object.keys(CATALOG).find((k) => CATALOG[k].title === titleOrKey))
    if (!key) return
    // Remember where we came from so the detail page's Back returns there.
    setDetailFrom(dmName ? { dm: dmName } : blendId ? { blend: blendId } : null)
    setDetailKey(key); setDmName(null); setBlendId(null); setDecide(null); setMixesTab(false); setLibraryTab(false)
  }
  const closeDetail = () => {
    setDetailKey(null)
    if (detailFrom?.dm) setDmName(detailFrom.dm)
    else if (detailFrom?.blend) setBlendId(detailFrom.blend)
    setDetailFrom(null)
  }

  // ── Back/forward history (Discord-style global nav) ──────────────────────
  // The primary view is a snapshot of these five nav vars. Every change pushes
  // onto a stack; the arrows walk it. `applying` suppresses the push while a
  // snapshot is being re-applied by back()/forward().
  const [hist, setHist] = useState(() => ({ stack: [{ blendId: null, detailKey: null, dmName: null, decide: null, mixesTab: false, libraryTab: false }], idx: 0 }))
  const applying = useRef(false)
  useEffect(() => {
    if (IS_SPECTATE) return
    if (applying.current) { applying.current = false; return }
    const cur = { blendId, detailKey, dmName, decide, mixesTab, libraryTab }
    setHist((h) => {
      if (JSON.stringify(h.stack[h.idx]) === JSON.stringify(cur)) return h
      const stack = h.stack.slice(0, h.idx + 1)
      stack.push(cur)
      return { stack, idx: stack.length - 1 }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blendId, detailKey, dmName, decide, mixesTab, libraryTab])
  const applyView = (v) => {
    applying.current = true
    setBlendId(v.blendId ?? null)
    setDetailKey(v.detailKey ?? null)
    setDmName(v.dmName ?? null)
    setDecide(v.decide ?? null)
    setMixesTab(!!v.mixesTab)
    setLibraryTab(!!v.libraryTab)
  }
  const goBack = () => { if (hist.idx <= 0) return; const idx = hist.idx - 1; applyView(hist.stack[idx]); setHist((h) => ({ ...h, idx })) }
  const goForward = () => { if (hist.idx >= hist.stack.length - 1) return; const idx = hist.idx + 1; applyView(hist.stack[idx]); setHist((h) => ({ ...h, idx })) }
  // Add a game (by title or key) to the personal wheel, then flash the wheel
  // open so it's clear where it went. Deduped, and only real catalog games.
  const addToWheel = (titleOrKey) => {
    const key = CATALOG[titleOrKey] ? titleOrKey : (KEY_OF_TITLE[titleOrKey] || Object.keys(CATALOG).find((k) => CATALOG[k].title === titleOrKey))
    if (!key) return
    setWheelKeys((ks) => (ks.includes(key) ? ks : [...ks, key]))
  }
  // Live "wheel jam" on the call — drives the top-bar dot + the Join toast.
  const [callWheelRoot] = useRoomNode('wheelCall', null)
  const jamParticipants = callWheelRoot?.participants || {}
  const jamLive = !!callWheelRoot && Object.keys(jamParticipants).length > 0 && Date.now() - (callWheelRoot.lastActive || callWheelRoot.startedAt || 0) < CALL_WHEEL_EXPIRY
  const inJam = !!jamParticipants[SELF_NAME]
  const [jamDismissed, setJamDismissed] = useState(null) // startedAt of a dismissed jam invite
  const navCtx = { canBack: hist.idx > 0, canForward: hist.idx < hist.stack.length - 1, back: goBack, forward: goForward, openWheel: () => setWheelOpen(true), addToWheel, wheelLive: jamLive }

  // Observation plumbing. A live tester publishes their nav + pointer/scroll;
  // a spectator instance reads it back and drives the view read-only.
  const nav = { blendId, detailKey, dmName, decide, mixesTab, libraryTab, createOpen, wishlistGame, shareGame, prefsForId, playKey, whoOpen, gameMenu }
  useMirrorPublish(nav)
  const [mirror] = useRoomNode(IS_SPECTATE ? SPECTATE_PATH : 'spectate/__none', null)
  const [cmd] = useRoomNode(IS_LIVE ? `${SPECTATE_PATH}/cmd` : 'spectate/__nocmd', null)

  // Moderator "nudge" commands (only a live tester obeys them). A command is a
  // momentary signal, not persisted state, so it has to be consumed: the node is
  // cleared once handled, the id is remembered across a reload, and anything
  // older than a few seconds is dropped. Without those guards a `reload` left in
  // the database re-fires on every fresh load and the tab reloads forever.
  const CMD_KEY = `lastCmd:${SELF_NAME}`
  const lastCmd = useRef(null)
  if (lastCmd.current === null) {
    try { lastCmd.current = sessionStorage.getItem(CMD_KEY) } catch {}
  }
  useEffect(() => {
    if (!IS_LIVE || !cmd?.id || cmd.id === lastCmd.current) return
    lastCmd.current = cmd.id
    try { sessionStorage.setItem(CMD_KEY, cmd.id) } catch {}
    writeRoomPath(`${SPECTATE_PATH}/cmd`, null)
    if (Date.now() - (cmd.ts || 0) > 15000) return
    if (cmd.type === 'reload') { window.location.reload(); return }
    if (cmd.type === 'home') { setBlendId(null); setDetailKey(null); setDmName(null); setDecide(null); setCreateOpen(false); setWishlistGame(null); setShareGame(null); setPrefsForId(null); setPlayKey(null); setWhoOpen(false); setGameMenu(null) }
  }, [cmd])

  // Replay the mirrored scroll onto the matching container.
  useEffect(() => {
    if (!IS_SPECTATE || !mirror?.scroll) return
    const { i, top, left } = mirror.scroll
    const id = requestAnimationFrame(() => {
      const el = document.querySelectorAll('.no-scrollbar')[i]
      if (el) { el.scrollTop = top; el.scrollLeft = left }
    })
    return () => cancelAnimationFrame(id)
  }, [mirror?.scroll?.t])

  // In spectate mode the whole view is driven by the published `view` blob.
  const mv = IS_SPECTATE ? (mirror?.view || {}) : null
  const eBlendId = IS_SPECTATE ? (mv.blendId ?? null) : blendId
  const eDetailKey = IS_SPECTATE ? (mv.detailKey ?? null) : detailKey
  const eDmName = IS_SPECTATE ? (mv.dmName ?? null) : dmName
  const eDecide = IS_SPECTATE ? (mv.decide ?? null) : decide
  const eCreateOpen = IS_SPECTATE ? !!mv.createOpen : createOpen
  const eWishlistGame = IS_SPECTATE ? (mv.wishlistGame ?? null) : wishlistGame
  const eShareGame = IS_SPECTATE ? (mv.shareGame ?? null) : shareGame
  const ePrefsForId = IS_SPECTATE ? (mv.prefsForId ?? null) : prefsForId
  const ePlayKey = IS_SPECTATE ? (mv.playKey ?? null) : playKey
  const eWhoOpen = IS_SPECTATE ? !!mv.whoOpen : whoOpen
  const eGameMenu = IS_SPECTATE ? (mv.gameMenu ?? null) : gameMenu
  const eMixesTab = IS_SPECTATE ? !!mv.mixesTab : mixesTab
  const eLibraryTab = IS_SPECTATE ? !!mv.libraryTab : libraryTab

  // The live launch party — shared, so its ready-up toast reaches every page.
  const party = useLaunch()

  // The wheel lands into a party: the spinner hosts the picked game and everyone
  // on the call right then is invited. The wheel itself is personal/local (see
  // WheelModal), so this is the single synced moment.
  const startWheelParty = (game) => {
    const g = CATALOG[game.key]
    const invitees = [...new Set(room.online || [])].filter((n) => n !== SELF_NAME)
    party.start({ key: game.key, title: game.title, image: g?.image }, invitees)
  }

  // A SYNCED wheel spin pulls everyone on the call into the wheel so they watch
  // it turn together. Personal spins never touch this node, so they stay local.
  useEffect(() => {
    if (callWheelRoot?.spin && !wheelOpen) setWheelOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callWheelRoot?.spin?.id])

  const blend = byId(eBlendId)
  const prefsFor = byId(ePrefsForId)
  const decideBlend = eDecide ? byId(eDecide.blendId) : null
  const dmFriend = eDmName ? DMS.find((d) => d.name === eDmName) : null

  return (
    <RoomProvider value={room}>
      <div
        className={'flex h-screen w-screen flex-col overflow-hidden bg-black text-white' + (IS_SPECTATE ? ' pointer-events-none select-none' : '')}
        onContextMenu={(e) => {
          e.preventDefault()
          // Right-clicking any game card (tagged with data-game) opens the game menu.
          const el = e.target.closest?.('[data-game]')
          if (el) setGameMenu({ x: e.clientX, y: e.clientY, title: el.getAttribute('data-game') })
        }}
      >
        <NavCtx.Provider value={navCtx}>
        <TopBar />
        <div className="group/rail relative flex min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: D.rail }}>
        <ServerRail />
        {/* The menu (sidebar) + main content — flush to the window, with only the
            top-left corner rounded and a gray border on the top + left edges
            (against the server rail). */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-tl-[10px] border-l border-t border-white/10">
        <Sidebar online={room.online} onReset={room.resetRoom} activeDm={eDmName} onOpenDm={openDm} onOpenBlend={openBlend} onHome={goHome} reads={reads} />
        {dmFriend ? (
          <DMPage
            key={dmFriend.name}
            friend={dmFriend}
            onBack={() => setDmName(null)}
            onOpenBlend={(id) => { setDmName(null); setBlendId(id) }}
            onOpen={openGame}
          />
        ) : decideBlend ? (
          <DecidePage key={decideBlend.id} blend={decideBlend} prefs={eDecide.prefs} onBack={() => setDecide(null)} />
        ) : blend ? (
          <BlendPage key={blend.id} blend={blend} onBack={() => setBlendId(null)} onDecide={() => setPrefsForId(blend.id)} onOpen={openGame} onPlay={setPlayKey} onShare={setShareGame} />
        ) : eDetailKey ? (
          <GameDetailPage
            key={eDetailKey}
            gameKey={eDetailKey}
            onBack={closeDetail}
            onHome={goHome}
            onLibrary={openLibrary}
            onMixes={openMixes}
            onWishlist={setWishlistGame}
            onShare={setShareGame}
            onOpen={openGame}
            onPlay={setPlayKey}
          />
        ) : eLibraryTab ? (
          <LibraryPage onHome={goHome} onMixes={openMixes} onOpen={openGame} />
        ) : eMixesTab ? (
          <MixesPage onHome={goHome} onLibrary={openLibrary} onOpenBlend={(b) => openBlend(b.id)} onCreate={() => setCreateOpen(true)} onOpen={openGame} />
        ) : (
          <Content onOpenBlend={(b) => openBlend(b.id)} onCreateBlend={() => setCreateOpen(true)} onWishlist={setWishlistGame} onShare={setShareGame} onOpen={openGame} onWhosOn={() => setWhoOpen(true)} onMixes={openMixes} onLibrary={openLibrary} />
        )}
        </div>
        {/* Voice + user panel — a rounded card floating at the bottom-left,
            overlapping the server rail + sidebar. */}
        <div className="absolute bottom-[8px] left-[8px] z-[40] w-[298px]"><VoiceUserPanel /></div>
        </div>
        {eCreateOpen && <CreateBlendModal onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setBlendId(id) }} />}
        {eWhoOpen && <WhosOnModal onClose={() => setWhoOpen(false)} onCreated={(id) => { setWhoOpen(false); setBlendId(id) }} />}
        {eWishlistGame && <WishlistModal game={eWishlistGame} onClose={() => setWishlistGame(null)} />}
        {eShareGame && (typeof eShareGame === 'object' && eShareGame.to
          ? <QuickShareModal game={eShareGame.title} to={eShareGame.to} onClose={() => setShareGame(null)} />
          : <ShareModal game={typeof eShareGame === 'string' ? eShareGame : eShareGame.title} onClose={() => setShareGame(null)} />)}
        {prefsFor && (
          <PreferenceModal
            blend={prefsFor}
            onClose={() => setPrefsForId(null)}
            onContinue={(prefs) => { setDecide({ blendId: prefsFor.id, prefs }); setPrefsForId(null) }}
          />
        )}

        {/* "Who's playing?" invite picker (host only), opened from a game's Play button */}
        {ePlayKey && CATALOG[ePlayKey] && (
          <WhosPlayingModal
            game={{ key: ePlayKey, title: CATALOG[ePlayKey].title, image: CATALOG[ePlayKey].image }}
            onClose={() => setPlayKey(null)}
            onStart={(invitees) => {
              // Solo (no one invited) launches straight away — no ready-up party.
              if (!invitees.length) setLaunching(CATALOG[ePlayKey].title)
              else party.start({ key: ePlayKey, title: CATALOG[ePlayKey].title, image: CATALOG[ePlayKey].image }, invitees)
              setPlayKey(null)
            }}
          />
        )}

        {/* Global right-click game menu (any card tagged data-game) */}
        {eGameMenu && (
          <ContextMenu
            x={eGameMenu.x}
            y={eGameMenu.y}
            onClose={() => setGameMenu(null)}
            items={[
              { label: 'Start a party', icon: PLAY_GLYPH, primary: true, onClick: () => { const k = KEY_OF_TITLE[eGameMenu.title]; setGameMenu(null); if (k) setPlayKey(k) } },
              { divider: true },
              { label: 'Add to Mix', icon: BOOKMARK_MENU_GLYPH, onClick: () => { setWishlistGame(eGameMenu.title); setGameMenu(null) } },
              { label: 'Add to Wheel', icon: WHEEL_MENU_GLYPH, onClick: () => { addToWheel(eGameMenu.title); setGameMenu(null) } },
              { label: 'Share', icon: SHARE_MENU_GLYPH, onClick: () => { setShareGame(eGameMenu.title); setGameMenu(null) } },
            ]}
          />
        )}

        {/* The spin wheel — a standalone module opened from the top bar */}
        {wheelOpen && (
          <WheelModal
            keys={wheelKeys}
            setKeys={setWheelKeys}
            blends={blends}
            online={room.online}
            onParty={startWheelParty}
            autoJoin={wheelAutoJoin}
            onClose={() => { setWheelOpen(false); setWheelAutoJoin(false) }}
          />
        )}
        {/* "X started a wheel — Join" — top-right, like the other toasts */}
        {jamLive && !inJam && !wheelOpen && jamDismissed !== callWheelRoot.startedAt && (
          <WheelJamToast
            host={callWheelRoot.host}
            count={Object.keys(jamParticipants).length}
            onJoin={() => { setWheelAutoJoin(true); setWheelOpen(true) }}
            onDismiss={() => setJamDismissed(callWheelRoot.startedAt)}
          />
        )}
        {/* Server-wide launch-party toast — follows you across pages */}
        <LaunchNotification
          launch={party.launch}
          readyUp={party.readyUp}
          undoReady={party.undoReady}
          decline={party.decline}
          launchNow={party.launchNow}
          clear={party.clear}
          onLaunch={setLaunching}
        />
        {launching && <LaunchToast title={launching} onDone={() => setLaunching(null)} />}

        {/* Read-only mirror overlay: the participant's live cursor + click ripples */}
        {IS_SPECTATE && <SpectatorCursor pointer={mirror?.pointer} click={mirror?.click} />}
        </NavCtx.Provider>
      </div>
    </RoomProvider>
  )
}
