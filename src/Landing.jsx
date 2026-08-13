import { createContext, Fragment, useContext, useEffect, useId, useRef, useState } from 'react'
import { RecCard, CardRow, CinematicCard, PortraitCard, ShelfRow, VideoTrailer, AVATAR, PartyGlyph, TagCtx, PartyCtx, WheelCtx, SpectateHoverCtx, SpectateAvCtx, avKey } from './RecCard.jsx'
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
const COLOR_OF = { clarisse: AVATAR.green, caleb: AVATAR.blue, sauhee: AVATAR.yellow, meera: AVATAR.red, yessenia: AVATAR.pink }
const U_TO_NAME = { 1: 'clarisse', 2: 'caleb', 3: 'sauhee', 4: 'meera', 5: 'yessenia' }
const NAME_TO_U = { clarisse: 1, caleb: 2, sauhee: 3, meera: 4, yessenia: 5 }
const _u = new URLSearchParams(window.location.search).get('u')
// Accept ?u=1..4 (preferred) or a legacy ?u=clarisse..meera.
const SELF_NAME = U_TO_NAME[_u] || (COLOR_OF[_u] ? _u : 'clarisse')
const SELF = COLOR_OF[SELF_NAME]

// ── Observation modes (for the moderator's live participant wall) ────────────
// ?moderator=1 → the wall itself. ?spectate=1 → a read-only mirror of one
// participant (embedded per-tile in the wall). Neither flag → a live tester.
const _params = new URLSearchParams(window.location.search)
const IS_MODERATOR = _params.get('moderator') === '1'
const IS_SPECTATE = _params.get('spectate') === '1'
// ?overview=1 → a solo feature-tour + notification simulator (no room needed).
const IS_OVERVIEW = _params.get('overview') === '1'
const IS_LIVE = !IS_MODERATOR && !IS_SPECTATE && !IS_OVERVIEW
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
// Caleb / Sauhee / Meera are on Arcade.
const DMS = [
  { name: 'clarisse', color: AVATAR.green },
  { name: 'caleb', color: AVATAR.blue, status: 'Playing Sea of Thieves' },
  { name: 'sauhee', color: AVATAR.yellow, status: 'Listening to Spotify' },
  { name: 'meera', color: AVATAR.red, status: 'Streaming Minecraft' },
  { name: 'yessenia', color: AVATAR.pink, status: 'Playing Hades' },
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
          // Actually in the Arcade voice call (same roster the wheel sync uses).
          <span className="flex items-center gap-[5px] text-[12px] font-medium" style={{ color: D.green }}>
            <svg viewBox="0 0 24 24" className="size-[13px]" fill="currentColor"><path d="M6.6 10.8a15.6 15.6 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.2 2.2z" /></svg>
            In a call
          </span>
        ) : (
          // Not heartbeating presence → their tab isn't open → Offline.
          <span className="text-[12px]" style={{ color: D.mute }}>Offline</span>
        )}
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
              <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>PlayLists</span>
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
                online={(online || []).includes(d.name)}
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
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves, owners: [AVATAR.blue, AVATAR.green, AVATAR.yellow] },
  { featured: true, avatars: [AVATAR.yellow], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft, owners: [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red] },
  { avatars: [AVATAR.green], label: 'PlayListed this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol, free: true, owners: [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red] },
  { avatars: [AVATAR.red, AVATAR.yellow], label: 'played this for 4 hours', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, owners: [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red], shared: true },
  { avatars: [AVATAR.yellow, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, owners: [AVATAR.green, AVATAR.yellow] },
]

const shelfFriends = [
  { avatars: [AVATAR.green], label: 'PlayListed this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, owners: [AVATAR.green, AVATAR.red] },
  { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: details.monsterHunter, owners: [AVATAR.blue, AVATAR.red], shared: true },
  { avatars: [AVATAR.red], label: 'PlayListed this game', players: '1-8', image: heroGangBeasts, video: { youTubeId: 'Lm3HDdLufmA', poster: heroGangBeasts }, details: details.gangBeasts, owners: [AVATAR.yellow, AVATAR.red] },
  { avatars: [AVATAR.yellow], label: 'PlayListed this game', players: '1-4', image: heroWildHearts, video: { youTubeId: '8vw9PlFrrOk', poster: heroWildHearts }, details: details.wildHearts, owners: [AVATAR.blue] },
  { avatars: [AVATAR.red], label: 'recommends this game', players: '1-4', image: heroMinecraftDungeons, video: { youTubeId: 'TxNH6bapa3A', poster: heroMinecraftDungeons }, details: details.minecraftDungeons, owners: [AVATAR.red, AVATAR.yellow] },
]

const shelfMore = [
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves },
  { avatars: [AVATAR.yellow], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft },
  { avatars: [AVATAR.green], label: 'PlayListed this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol },
  { avatars: [AVATAR.red], label: 'PlayListed this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat },
  { avatars: [AVATAR.yellow, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded },
]

// Friend colors → display names (green is always the user).
const NAME = { [AVATAR.green]: 'clarisse', [AVATAR.blue]: 'caleb', [AVATAR.yellow]: 'sauhee', [AVATAR.red]: 'meera', [AVATAR.pink]: 'yessenia' }
// Color → name including not-yet-on-Arcade friends, so invited (pending) members
// can still be named on hover.
const OFF_NAME = Object.fromEntries(OFF_ARCADE_FRIENDS.map((f) => [f.color, f.name]))
const nameForColor = (c) => NAME[c] || OFF_NAME[c] || null

// Last pointer-down position + the clicked game card's center, so popover-style
// modals (Add to PlayList) can open centered on the card the user clicked.
const LAST_POINTER = { x: null, y: null, cardX: null, cardY: null }
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => {
  LAST_POINTER.x = e.clientX; LAST_POINTER.y = e.clientY
  const card = e.target.closest?.('[data-game], [data-game-card]')
  if (card) { const r = card.getBoundingClientRect(); LAST_POINTER.cardX = r.left + r.width / 2; LAST_POINTER.cardY = r.top + r.height / 2 }
  else { LAST_POINTER.cardX = null; LAST_POINTER.cardY = null }
}, true)

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
const ALL_COLORS = [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red]
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
// Pending PlayList invites addressed to me — powers the on-page invite cards and
// the nav badge. Reads every DM thread and keeps invites still awaiting a reply.
function usePendingInvites() {
  const [all] = useRoomNode('dms', {})
  const convs = all && typeof all === 'object' ? all : {}
  const out = []
  Object.values(convs).forEach((conv) => {
    if (conv && typeof conv === 'object') Object.values(conv).forEach((m) => {
      if (m && m.kind === 'invite' && m.to === SELF_NAME && m.status === 'pending') out.push(m)
    })
  })
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0))
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
    { avatars: [who], label: `${name} PlayListed this game` },
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
  clarisse: {
    rows: [
      { mode: 'overlay', title: 'You’d rather build than sleep', subtitle: 'Cozy craft-and-survive worlds, sized to your sessions.', games: ['grounded', 'gp_astroneer', 'gp_stardewvalley', 'gp_medievaldynasty', 'gp_snowrunner'] },
    ],
  },
  caleb: {
    rows: [
      { mode: 'overlay', title: 'One more night, one more base', subtitle: 'Craft-and-survive loops your hours say you can’t quit.', games: ['grounded', 'gp_stateofdecay2', 'gp_dayz', 'gp_medievaldynasty', 'gp_powerwashsimulator'] },
    ],
  },
  sauhee: {
    rows: [
      { mode: 'overlay', title: 'Certified sweat, respectfully', subtitle: 'Combat-heavy picks to keep your reflexes honest.', games: ['gp_doometernal', 'gp_hades', 'gp_deeprockgalactic', 'gp_warhammer40000darktide', 'gp_chivalry2'] },
    ],
  },
  meera: {
    rows: [
      { mode: 'overlay', title: 'Here for the beautiful chaos', subtitle: 'Loud, silly nights that end with everyone yelling.', games: ['humanFallFlat', 'gangBeasts', 'overcooked', 'gp_amongus', 'gp_golfwithyourfriends'] },
    ],
  },
}

// ── Two extra "For you" rows in bespoke styles (Figma 622:2733/2755 + 620:2460).
// Both reuse the game CATALOG for covers/metadata and VIDEOS for trailers, so
// this stays a self-contained layout/animation mock.
const CINEMATIC_ROW = [
  { key: 'seaOfThieves', avatars: [AVATAR.blue, AVATAR.green], label: 'PlayListed this game' },
  { key: 'monsterHunter', avatars: [AVATAR.blue], label: 'recommends this game' },
  { key: 'grounded', avatars: [AVATAR.yellow, AVATAR.green], label: 'played this for 6 hours' },
  { key: 'humanFallFlat', avatars: [AVATAR.red, AVATAR.yellow], label: 'played this for 4 hours' },
  { key: 'minecraft', avatars: [AVATAR.green], label: 'recommends this game' },
  { key: 'gangBeasts', avatars: [AVATAR.red], label: 'PlayListed this game' },
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
  { key: 'grounded', released: 'Released on Sep 27, 2022', recommend: 'Popular in your PlayLists', multiplayer: 'Online co-op (1-4)', tags: ['Survival', 'Crafting', 'Everyone 10+'] },
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
// clarisse=green, caleb=blue, sauhee=purple, meera=red. Each person is in exactly
// two of these, so everyone sees two groups: the all-four group + their pair.
const BLENDS = [
  { name: 'The Squad', color: '#5765f2', when: 'Fri 8pm', members: [AVATAR.green, AVATAR.blue, AVATAR.yellow, AVATAR.red],
    games: ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'monsterHunter'] },
  { name: 'Clarisse & Caleb', color: '#34a172', when: 'weeknights', members: [AVATAR.green, AVATAR.blue],
    games: ['seaOfThieves', 'grounded', 'monsterHunter', 'wildHearts', 'forHonor', 'minecraft'] },
  { name: 'Sauhee & Meera', color: '#d64b7e', when: 'weekends', members: [AVATAR.yellow, AVATAR.red],
    games: ['overcooked', 'humanFallFlat', 'gangBeasts', 'minecraftDungeons', 'lol', 'ac'] },
]

// The seed the shared room is initialized with — each blend gets a stable id and
// an initial wishlist order (the shared, drag-rankable list).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
// Start with no premade Mixes — everyone builds their own.
const SEED_BLENDS = []

// Playful default PlayList names — an "inside joke" about the group's collective
// gaming personality instead of a boring list of usernames. Picked at random on
// creation; the creator can always rename.
const FUNNY_MIX_NAMES = [
  'Cozy Chaos After Midnight',
  'Three Sweats and a Casual',
  'One More Game, Apparently',
  'Loot Goblins With Commitment Issues',
  'Side Quests Over Main Objectives',
  'Competitive Until Someone Gets Hungry',
  'We Definitely Have Time for This',
  'Emotionally Invested in Fake Loot',
  'Respawning on Pure Spite',
  'Sweaty but Extremely Casual',
  'Just Five More Minutes, Liars',
  'Chronically Online, Occasionally Winning',
  'Peer Pressure and Power-Ups',
  'Aggressively Chill Grinders',
  'The Ready-Up Never Comes',
  'Snacks First, Strategy Later',
  'Unranked and Unbothered',
  'Certified Menu-Screen Enjoyers',
]
const funnyMixName = () => FUNNY_MIX_NAMES[Math.floor(Math.random() * FUNNY_MIX_NAMES.length)]

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

// A member's avatar with a username tooltip on hover/keyboard-focus. Used on the
// PlayList cards and inside the PlayList header.
function MemberChip({ color, size = 28, marginRight = 0, pending = false }) {
  const name = nameForColor(color)
  const label = name ? capName(name) + (pending ? ' · pending' : '') : (pending ? 'Invited · pending' : null)
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-flex outline-none"
      style={{ marginRight, zIndex: show ? 10 : undefined }}
      tabIndex={label ? 0 : undefined}
      aria-label={label || undefined}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <Avatar color={color} size={size} style={{ boxShadow: '0 0 0 2px #0c0c0e', opacity: pending ? 0.45 : 1, filter: pending ? 'grayscale(0.7)' : undefined }} />
      {label && (
        <span className={'pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-black/90 px-[8px] py-[3px] text-[12px] font-semibold text-white transition-opacity duration-150 ' + (show ? 'opacity-100' : 'opacity-0')}>
          {label}
        </span>
      )}
    </span>
  )
}

function BlendCard({ id, name, color, members, games = [], cover, onOpen, onContext, onMenu, onOpenGame }) {
  // Cover art: a custom thumbnail if one's been set, otherwise a 2×2 collage.
  const covers = mixCoverImages({ id, name, games })
  // The hover ellipsis opens the same menu as right-click, anchored to itself.
  const openMenu = (e) => { e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); onMenu?.(r.left, r.bottom + 4) }
  // Games inside this PlayList — shown in a popover on hover.
  const [peek, setPeek] = useState(false)
  const gameTitles = games.map((k) => CATALOG[k]?.title || STARTER_BY_KEY[k]?.title).filter(Boolean)
  return (
    <div className="group relative flex w-[200px] shrink-0 flex-col text-left">
      {/* The game-list popover only opens while hovering the thumbnail or title —
          not the member avatars below. */}
      <div className="relative" onMouseEnter={() => setPeek(true)} onMouseLeave={() => setPeek(false)}>
      {/* Peek popover: the games inside this PlayList — anchored to the right of
          the cover so it never gets clipped by the page's top scroll edge. The
          `pl-[10px]` bridges the gap to the cover so the pointer can travel onto
          the list without the card's hover dropping. Always mounted so it can
          fade in/out smoothly. */}
      {gameTitles.length > 0 && (
        <div
          className={
            'absolute left-[200px] top-0 z-[80] w-[246px] pl-[10px] transition-[opacity,transform] duration-200 ease-out ' +
            (peek ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[6px] opacity-0')
          }
        >
          <div className="rounded-[12px] border border-[#2b2d31] bg-[#101012] p-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
            <p className="mb-[8px] text-[11px] font-bold uppercase tracking-wide text-[#87898c]">{gameTitles.length} game{gameTitles.length === 1 ? '' : 's'} in this PlayList</p>
            <div className="no-scrollbar flex max-h-[248px] flex-col gap-[4px] overflow-y-auto">
              {gameTitles.map((t, i) => {
                const k = KEY_OF_TITLE[t]
                const img = (CATALOG[k] || STARTER_BY_KEY[k])?.image
                return (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onOpenGame?.(t) }}
                    className="flex items-center gap-[9px] rounded-[7px] p-[3px] text-left transition hover:bg-white/[0.06]"
                  >
                    {img ? <img alt="" src={img} className="h-[28px] w-[50px] shrink-0 rounded-[5px] object-cover" /> : <span className="h-[28px] w-[50px] shrink-0 rounded-[5px] bg-white/10" />}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{t}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <button onClick={onOpen} onContextMenu={onContext} className="block w-full text-left">
        <div
          className="size-[200px] overflow-hidden rounded-[20px] transition-[translate] duration-200 group-hover:-translate-y-[3px]"
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
      </div>{/* end hover zone (thumbnail + title) */}
      {/* Member profile images — spaced circles, up to 5 then a "+N" (Figma 1133:7885).
          Each is hoverable/focusable and shows the member's name. */}
      <div className="mt-[10px] flex items-center gap-[4px]">
        {members.slice(0, 5).map((c, i) => (
          <MemberChip key={i} color={c} size={28} />
        ))}
        {members.length > 5 && (
          <span
            className="flex h-[28px] items-center justify-center rounded-full bg-white/12 px-[8px] text-[12px] font-semibold leading-none text-white"
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
    <button onClick={onClick} className="group flex w-[200px] shrink-0 flex-col text-left">
      {/* Dark tile with a green ring + the same plus glyph as the "Add to PlayList"
          button (Figma 1135:1711). */}
      <div className="flex size-[200px] items-center justify-center rounded-[20px] bg-[#0f0f12] ring-[1.5px] ring-[#9BF00B]/35 transition duration-200 group-hover:-translate-y-[3px] group-hover:ring-[#9BF00B]/70">
        <svg viewBox="0 0 17 18" className="size-[40px] transition group-hover:scale-110 group-hover:[filter:drop-shadow(0_0_10px_rgba(155,240,11,0.6))]" fill="none" style={{ color: '#9BF00B' }}>
          <path d="M8.67 1V17M1 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-[10px] text-[16px] font-semibold text-white">Create a new PlayList</p>
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
  { avatars: [AVATAR.red], label: 'PlayListed this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, steam: { released: 'Aug 7, 2018', desc: 'Chaotic co-op cooking across wobbling, falling-apart kitchens. Chop, cook and serve before the timer runs out.', review: 'Very Positive', reviews: '58K', tags: ['Co-op', 'Party', 'Casual', 'Local Multiplayer'] } },
  { avatars: [AVATAR.yellow], label: 'recommends this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, steam: { released: 'Jul 22, 2016', desc: 'Floppy physics puzzles in surreal dreamscapes. No skill floor at all, endless slapstick, and better with friends.', review: 'Overwhelmingly Positive', reviews: '180K', tags: ['Puzzle', 'Physics', 'Co-op', 'Funny'] } },
  { avatars: [AVATAR.yellow, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, steam: { released: 'Sep 27, 2022', desc: 'Shrunk to the size of an ant, survive the backyard: build bases, brew gear and fight off giant bugs with friends.', review: 'Very Positive', reviews: '96K', tags: ['Survival', 'Co-op', 'Crafting', 'Adventure'] } },
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
        className="flex items-center gap-[9px] rounded-[8px] bg-black/40 px-[14px] py-[8px] text-[14px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/75"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0">
          <path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" />
        </svg>
        <span className="leading-none">Gift Nitro</span>
      </button>
      {open && <GiftArcadeModal onClose={() => setOpen(false)} />}
    </>
  )
}

// Top-bar entry to the spin wheel — its own module now, not tied to a Mix.
// Sits just left of the Gift ARCADE button on every page's nav. A green dot
// shows when a wheel jam is live on the call.
function WheelNavButton() {
  const { openWheel, wheelLive, wheelCount = 0 } = useContext(NavCtx)
  return (
    <button
      onClick={openWheel}
      title={wheelLive ? 'A wheel sync is live on the call — tap to watch it spin together' : wheelCount > 0 ? `${wheelCount} game${wheelCount === 1 ? '' : 's'} on your wheel` : 'Spin the wheel'}
      className={'relative flex items-center gap-[9px] rounded-[8px] px-[14px] py-[8px] text-[14px] font-semibold ring-1 backdrop-blur-sm transition ' + (wheelLive ? 'bg-[#123a00] text-[#8dff5a] ring-[#3dbf1e] shadow-[0_0_14px_rgba(61,191,30,0.35)] hover:bg-[#164700]' : 'bg-black/40 text-white ring-white/10 hover:bg-black/75')}
    >
      {wheelCount > 0 && (
        <span className={'absolute -right-[7px] -top-[7px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold leading-none ring-2 ring-[#0c0c0e] ' + (wheelLive ? 'bg-white text-[#0e3b00]' : 'bg-[#3dbf1e] text-black')}>
          {wheelCount}
        </span>
      )}
      <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" />
        <path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" />
        <path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" />
      </svg>
      <span className="leading-none">Wheel</span>
      {wheelLive && (
        <span className="ml-[1px] flex items-center gap-[5px] rounded-full bg-[#3dbf1e] px-[8px] py-[3px] text-[11px] font-bold uppercase leading-none tracking-wide text-black">
          <span className="relative flex size-[7px]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-black/70 opacity-75" />
            <span className="relative inline-flex size-[7px] rounded-full bg-black" />
          </span>
          Live
        </span>
      )}
    </button>
  )
}

// Tracks whether the inner-page back button was already showing on the page we
// just came from, so moving between two inner pages (e.g. a Mix ↔ a game detail)
// doesn't replay the emerge animation — it only plays when the button first
// appears coming from a page without one (the Recommended home).
let navBackWasShown = false

// Shared top nav for the inner pages (Library / Mixes / detail). An Xbox-green
// back button animates in while the logo + tabs slide right to make room, and
// the logo is a link back to the Recommended home.
function PageNav({ active, onHome, onLibrary, onMixes, onBack }) {
  const showBack = !!onBack
  // Only animate when the back button wasn't already on the previous page.
  const [animate] = useState(() => showBack && !navBackWasShown)
  useEffect(() => { navBackWasShown = showBack }, [showBack])
  const anim = animate ? ' [animation:navBackIn_.4s_.06s_cubic-bezier(0.16,1,0.3,1)_both]' : ''
  const groupAnim = animate ? ' [animation:navGroupSlide_.4s_cubic-bezier(0.16,1,0.3,1)_both]' : ''
  const inviteCount = IS_SPECTATE ? 0 : usePendingInvites().length
  const Tab = ({ label, isActive, onClick, badge }) => (
    <button onClick={onClick} data-tab aria-current={isActive ? 'page' : undefined} className={'relative flex h-[56px] items-center gap-[7px] border-b-2 text-[16px] font-medium transition ' + (isActive ? 'border-white text-white' : 'border-transparent text-[#c7c9cb] hover:text-white')}>
      {label}
      {badge > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#9BF00B] px-[5px] text-[11px] font-bold text-[#0c0c0e]">{badge}</span>}
    </button>
  )
  // Left/Right arrow moves between the nav tabs (horizontal layout → ←/→).
  const onTabsKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const tabs = [...e.currentTarget.querySelectorAll('[data-tab]')]
    const i = tabs.indexOf(document.activeElement)
    if (i === -1) return
    e.preventDefault()
    tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]?.focus()
  }
  return (
    <header className="flex h-[56px] shrink-0 items-center border-b border-[#1c1d21] px-[40px]">
      {onBack && (
        <button onClick={onBack} aria-label="Back" className={'mr-[14px] flex size-[30px] shrink-0 items-center justify-center rounded-full text-[#3fbf3f] transition hover:bg-white/10' + anim}>
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div className={'flex items-center gap-[32px]' + groupAnim} onKeyDown={onTabsKeyDown}>
        <button onClick={onHome} aria-label="Xbox Arcade home" className="flex shrink-0 items-center transition hover:opacity-80"><XboxLogo size={24} /></button>
        <Tab label="Recommended" isActive={active === 'recommended'} onClick={onHome} />
        <Tab label="Library" isActive={active === 'library'} onClick={onLibrary} />
        <Tab label="PlayLists" isActive={active === 'mixes'} onClick={onMixes} badge={inviteCount} />
      </div>
      <div className="flex flex-1 items-center justify-end gap-[20px]">
        <WheelNavButton />
        <GiftArcadeButton />
      </div>
    </header>
  )
}

// Home hero card for a live party you're invited to — game art, the ready-up
// roster, and a Join / Ready / Start action depending on your role + state.
function HomePartyCard({ party, launch, onOpen }) {
  const { readyUp, undoReady, launchNow } = party
  const isHost = launch.host === SELF_NAME
  const iAmReady = isHost || !!launch.ready?.[SELF_NAME]
  const { readyInvitees, invitees } = launchTally(launch)
  const game = launch.game || {}
  const readyCount = 1 + readyInvitees.length // host is always ready
  const total = 1 + invitees.length
  return (
    <div className="flex w-full max-w-[720px] items-center gap-[20px] rounded-[20px] border border-white/10 bg-[#121214] p-[16px]">
      <button
        onClick={() => onOpen?.(game.title)}
        className="relative h-[132px] w-[234px] shrink-0 overflow-hidden rounded-[12px] bg-[#1a1a1d] focus-ring-strong"
        aria-label={`Open ${game.title}`}
      >
        {game.image && <img alt="" src={game.image} className="size-full object-cover" />}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex size-[46px] items-center justify-center rounded-full bg-black/55 backdrop-blur">
            <svg viewBox="0 0 24 24" className="size-[22px] text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-[7px] text-[13px] font-semibold uppercase tracking-wide text-[#9BF00B]">
          <span className="size-[8px] animate-pulse rounded-full bg-[#9BF00B]" /> Live party
        </p>
        <p className="mt-[4px] truncate text-[24px] font-bold text-white">{game.title}</p>
        <div className="mt-[12px] flex items-center gap-[10px]">
          <PartyAvatars launch={launch} />
          <span className="text-[14px] text-[#9a9ba3]">{readyCount}/{total} ready</span>
        </div>
      </div>
      <div className="shrink-0 pr-[6px]">
        {isHost ? (
          <button onClick={launchNow} className="rounded-[10px] bg-[#9BF00B] px-[22px] py-[12px] text-[15px] font-bold text-[#0c0c0e] transition hover:brightness-110">Start now</button>
        ) : iAmReady ? (
          <button onClick={undoReady} className="flex items-center gap-[7px] rounded-[10px] bg-[#248046] px-[20px] py-[12px] text-[15px] font-bold text-white transition hover:brightness-110">
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
            Ready
          </button>
        ) : (
          <button onClick={readyUp} className="rounded-[10px] bg-[#9BF00B] px-[22px] py-[12px] text-[15px] font-bold text-[#0c0c0e] shadow-[0_2px_12px_rgba(45,160,0,0.4)] transition hover:brightness-110">Join party</button>
        )}
      </div>
    </div>
  )
}

function Content({ onOpenBlend, onCreateBlend, onWishlist, onShare, onOpen, onWhosOn, onHome, onMixes, onLibrary, menuGame, party, onStartParty, onAddToWheel }) {
  // Home has no back button, so re-arm the inner-page emerge animation for the
  // next time we drill into a page that does.
  useEffect(() => { navBackWasShown = false }, [])
  const inviteCount = IS_SPECTATE ? 0 : usePendingInvites().length
  // A card keeps its hover reveal while its right-click/More menu is open, so
  // moving the cursor onto the menu doesn't collapse the card.
  const titleOf = (k) => STARTER_BY_KEY[k]?.title || CATALOG[k]?.title
  const revealed = (k) => (IS_SPECTATE && eHover === titleOf(k)) || (!!menuGame && menuGame === titleOf(k))
  const { blends, setBlends } = useRoomCtx()
  const recs = RECS[SELF_NAME] || RECS.clarisse

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
  // Live users reveal cards purely from native hover/focus on the specific card,
  // so we never force-reveal by title here — otherwise a second card for the same
  // game would light up too. `hover` is still tracked above and broadcast so the
  // moderator's spectate mirror (which has no real pointer) can echo the reveal.
  const eHover = IS_SPECTATE ? (cUI?.hover ?? null) : null

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
      <header
        className="absolute inset-x-0 top-0 z-20 flex h-[56px] shrink-0 items-center gap-[32px] px-[40px]"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          const tabs = [...e.currentTarget.querySelectorAll('[data-tab]')]
          const i = tabs.indexOf(document.activeElement)
          if (i === -1) return
          e.preventDefault()
          tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]?.focus()
        }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-black/25 backdrop-blur-md" />
        {/* Discord-style thin divider under the nav */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
        <button onClick={onHome} aria-label="Xbox Arcade home" className="flex shrink-0 items-center transition hover:opacity-80"><XboxLogo size={24} /></button>
        <button data-tab aria-current="page" className="flex h-[56px] items-center border-b-2 border-white text-[16px] font-medium text-white">Recommended</button>
        <button onClick={onLibrary} data-tab className="flex h-[56px] items-center border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">Library</button>
        <button onClick={onMixes} data-tab className="relative flex h-[56px] items-center gap-[7px] border-b-2 border-transparent text-[16px] font-medium text-[#c7c9cb] transition hover:text-white">
          PlayLists
          {inviteCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#9BF00B] px-[5px] text-[11px] font-bold text-[#0c0c0e]">{inviteCount}</span>}
        </button>
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
            {/* Party — a live party you're invited to (Jump in), else a Start-a-party
                CTA. The "See who's on ARCADE" button stays beside the heading. */}
            {(() => {
              const launch = party?.launch
              const myParty = launch && !launch.launched && (launch.host === SELF_NAME || (launch.invitees || []).includes(SELF_NAME)) ? launch : null
              return (
                <div className="relative mt-[88px] flex flex-col items-start">
                  {/* One flex row, no wrap: the heading and the pill share a single
                      line and `items-end` sits them on the same bottom edge. The
                      heading's font-relative `mb` trims its sub-baseline descent so
                      the pill lands on the visual baseline, not the line-box bottom. */}
                  <div className="relative flex w-full items-end justify-between gap-[24px]">
                    <h2
                      className="-mb-[0.13em] whitespace-nowrap text-[clamp(40px,6vw,88px)] uppercase leading-[0.95] tracking-[0.02em] text-white [text-shadow:0_3px_10px_rgba(0,0,0,0.6)]"
                      style={{ fontFamily: '"Base Neue Cond Bold"' }}
                    >
                      Jump in
                    </h2>
                    {/* "See who's on ARCADE" — opens the friends popup (Figma 1148:1562):
                        dark-green pill, 30px avatars, Xbox-green ARCADE. */}
                    <button
                      onClick={onWhosOn}
                      className="flex shrink-0 items-center gap-[10px] rounded-[12px] bg-[#092000] px-[24px] py-[9px] transition hover:brightness-125"
                    >
                      <div className="flex items-center">
                        {[AVATAR.blue, AVATAR.pink, AVATAR.yellow].map((c, i) => (
                          <Avatar key={i} color={c} size={22} style={{ marginRight: i < 2 ? -6 : 0, boxShadow: '0 0 0 2px #092000' }} />
                        ))}
                      </div>
                      <span className="text-[16px] text-white">See who’s on</span>
                      <span className="flex items-center gap-[3px]">
                        <XboxLogo size={16} />
                        <span className="text-[12px] font-bold uppercase tracking-wide text-[#9BF00B]">Arcade</span>
                      </span>
                    </button>
                  </div>
                  <div className="relative mt-[24px] w-full">
                    {myParty ? (
                      <HomePartyCard party={party} launch={myParty} onOpen={onOpen} />
                    ) : (
                      <button
                        onClick={onStartParty}
                        className="group flex items-center gap-[18px] rounded-[20px] border-2 border-[#9BF00B]/55 bg-[#0d1a06] px-[28px] py-[22px] text-left transition hover:border-[#9BF00B] hover:bg-[#112407]"
                      >
                        <span className="flex size-[54px] shrink-0 items-center justify-center transition group-hover:scale-105">
                          <PartyGlyph size={40} className="text-[#9BF00B]" />
                        </span>
                        <span>
                          <span className="block text-[24px] font-bold text-white">Start a party</span>
                          <span className="block text-[15px] text-[#9db08f]">Pick a game and invite your friends to jump in.</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* Curated homepage shelves over the Starter catalog (Figma 937:8591) */}
        <div className="mx-auto w-full max-w-[1400px] px-[40px]">
          {/* Recommended by Your Friends — wide cinematic cards */}
          <HighlyRatedRow items={HOME_HIGHLY_RATED} onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} menuGame={menuGame} revealTitle={eHover} />

          {/* Trending in Your Communities — compact list */}
          <TrendingRow items={HOME_TRENDING} onOpen={onOpen} onShare={onShare} />

          {/* Friends Are Playing Now — horizontal cinematic cards (compact) */}
          <ShelfRow title="Friends Are Playing Now" padTop={30}>
            {HOME_FRIENDS_PLAYING.map((k) => (
              <CinematicCard key={k} {...cineCard(k)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={revealed(k)} />
            ))}
          </ShelfRow>

          {/* Because You Played… — horizontal cinematic cards (compact) */}
          <ShelfRow title="Because You Played Deathloop" padTop={30}>
            {HOME_BECAUSE_PLAYED.map((k) => (
              <CinematicCard key={k} {...cineCard(k)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={revealed(k)} />
            ))}
          </ShelfRow>

          {/* Worth a Closer Look — featured game + detail panel */}
          <WorthACloserLook gameKey={HOME_CLOSER_LOOK} onOpen={onOpen} onShare={onShare} revealTitle={eHover} />

          {/* Something Different for You — horizontal cinematic cards (compact) */}
          <ShelfRow title="Something Different for You" padTop={30}>
            {HOME_DIFFERENT.map((k) => (
              <CinematicCard key={k} {...cineCard(k)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={revealed(k)} />
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

// ── Mixes tab (Figma 926:4875) — the "Your PlayLists" grid on its own top-nav tab.
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
  // Pending PlayList invites for me — shown as cards with Accept / Decline.
  const pendingInvites = usePendingInvites()
  const acceptInvite = (m) => {
    setBlends(blends.map((b) => b.id === m.blendId
      ? { ...b, members: [...new Set([...(b.members || []), SELF])], invited: (b.invited || []).filter((c) => c !== SELF) }
      : b))
    putDM(m.from, { ...m, status: 'accepted' })
  }
  const declineInvite = (m) => putDM(m.from, { ...m, status: 'declined' })

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // Publish this page's right-click menu + modals so the moderator's mirror
  // shows them (same pattern as the home Content page's contentUI).
  const bybid = (id) => blends.find((b) => b.id === id) || null
  const [mUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/mixesUI` : 'spectate/__nomui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/mixesUI`, {
      mixMenu: mixMenu ? { x: mixMenu.x, y: mixMenu.y, blendId: mixMenu.blend?.id || null } : null,
      coverForId: coverFor?.id || null,
      renameForId: renameFor?.id || null,
      inviteForId: inviteFor?.id || null,
      searchOpen: !!searchOpen,
    })
  }, [mixMenu, coverFor, renameFor, inviteFor, searchOpen])
  const eMixMenu = IS_SPECTATE ? (mUI?.mixMenu ? { x: mUI.mixMenu.x, y: mUI.mixMenu.y, blend: bybid(mUI.mixMenu.blendId) } : null) : mixMenu
  const eCoverFor = IS_SPECTATE ? bybid(mUI?.coverForId) : coverFor
  const eRenameFor = IS_SPECTATE ? bybid(mUI?.renameForId) : renameFor
  const eInviteFor = IS_SPECTATE ? bybid(mUI?.inviteForId) : inviteFor
  const eSearchOpen = IS_SPECTATE ? !!mUI?.searchOpen : searchOpen
  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <PageNav active="mixes" onHome={onHome} onLibrary={onLibrary} onBack={onHome} />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[36px]">
        <div className="mx-auto w-full max-w-[1400px]">
          <h1 className="text-[clamp(30px,3vw,44px)] uppercase tracking-[0.02em] text-white" style={{ fontFamily: '"Base Neue Cond Bold"' }}>Your PlayLists</h1>
          {/* Pending invites — Accept / Decline right here on the page. */}
          {!IS_SPECTATE && pendingInvites.length > 0 && (
            <div className="mt-[24px] rounded-[16px] border border-[#9BF00B]/25 bg-[#9BF00B]/[0.06] p-[16px]">
              <p className="mb-[12px] text-[13px] font-bold uppercase tracking-wide text-[#9BF00B]">{pendingInvites.length} PlayList invite{pendingInvites.length === 1 ? '' : 's'}</p>
              <div className="flex flex-col gap-[10px]">
                {pendingInvites.map((m) => (
                  <div key={m.blendId + m.from} className="flex items-center gap-[12px] rounded-[12px] bg-[#161618] p-[10px] ring-1 ring-white/5">
                    <Avatar color={COLOR_OF[m.from] || '#4a4d55'} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-white">{m.blendName || 'a PlayList'}</p>
                      <p className="truncate text-[13px] text-[#9a9ba3]">{capName(m.from)} invited you</p>
                    </div>
                    <button onClick={() => acceptInvite(m)} className="shrink-0 rounded-[8px] bg-[#9BF00B] px-[16px] py-[8px] text-[13px] font-bold text-[#0c0c0e] transition hover:brightness-110">Accept</button>
                    <button onClick={() => declineInvite(m)} className="shrink-0 rounded-[8px] bg-[#3a3c42] px-[16px] py-[8px] text-[13px] font-semibold text-white transition hover:bg-[#45474e]">Decline</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-[28px] flex flex-wrap gap-x-[16px] gap-y-[28px]">
            <CreateBlendCard onClick={onCreate} />
            {mine.map((b) => (
              <BlendCard
                key={b.id}
                {...b}
                onOpen={() => onOpenBlend(b)}
                onOpenGame={onOpen}
                onContext={(e) => { e.preventDefault(); e.stopPropagation(); setMixMenu({ x: e.clientX, y: e.clientY, blend: b }) }}
                onMenu={(x, y) => setMixMenu({ x, y, blend: b })}
              />
            ))}
          </div>
        </div>
      </div>
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
      {eCoverFor && <CoverPickerModal blend={eCoverFor} games={(eCoverFor.games || []).map((k) => CATALOG[k]).filter(Boolean)} onClose={() => setCoverFor(null)} onSave={(patch) => patchMix(eCoverFor, patch)} />}
      {eRenameFor && <RenameMixModal blend={eRenameFor} onClose={() => setRenameFor(null)} onSave={(patch) => patchMix(eRenameFor, patch)} />}
      {eInviteFor && <InviteMembersModal blend={eInviteFor} onClose={() => setInviteFor(null)} onSave={(patch) => patchMix(eInviteFor, patch)} />}
      {eSearchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}
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
  // Title → key must include Starter games too, or "already in PlayList" checks
  // (and right-click "Add to PlayList") silently miss them.
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
  gp_doometernal: { studio: 'id Software', released: 'Mar 20, 2020', desc: 'Rip and tear through Hell in the fastest, most brutal DOOM yet.', tags: ['FPS', 'Action', 'Mature 17+'], friends: '3 friends have played recently' },
  gp_deeprockgalactic: { studio: 'Ghost Ship Games', released: 'May 13, 2020', desc: 'Four dwarves, one cave, endless bugs. Mine, fight and drink together.', tags: ['Co-op', 'FPS', 'Mining'], friends: '3 friends have played recently' },
  gp_chivalry2: { studio: 'Torn Banner Studios', released: 'Jun 8, 2021', desc: 'Massive medieval battlefields — sieges, catapults and a lot of yelling.', tags: ['Action', 'Multiplayer', 'Mature 17+'], friends: '2 friends have played recently' },
  gp_warhammer40000darktide: { studio: 'Fatshark', released: 'Nov 30, 2022', desc: 'Co-op horde slaughter in the grim dark of the 41st millennium.', tags: ['Co-op FPS', 'Action', 'Mature 17+'], friends: '3 friends have played recently' },
  gp_warhammervermintide2: { studio: 'Fatshark', released: 'Mar 8, 2018', desc: 'Four heroes hold the line against endless Skaven and Chaos hordes.', tags: ['Co-op', 'Melee', 'Action'], friends: '2 friends have played recently' },
  gp_amongus: { studio: 'Innersloth', released: 'Nov 16, 2018', desc: 'Crew a spaceship, find the impostor, betray your friends. Repeat.', tags: ['Party', 'Social Deduction', 'Online'], friends: '3 friends have played recently' },
  gp_hades: { studio: 'Supergiant Games', released: 'Sep 17, 2020', desc: 'A god-like roguelike — fight out of Hell one perfect run at a time.', tags: ['Roguelike', 'Action', 'Story Rich'], friends: 'Trending with 120+ players', rec: 97, recFriends: 4 },
  gp_doom64: { studio: 'id Software', released: 'Mar 20, 2020', desc: 'The 1997 cult classic, restored — pure retro demon-blasting.', tags: ['FPS', 'Retro', 'Mature 17+'], friends: 'Rising in your communities' },
  gp_vampiresurvivors: { studio: 'poncle', released: 'Oct 20, 2022', desc: 'One button, a thousand monsters. Absurdly moreish bullet-heaven.', tags: ['Roguelike', 'Bullet Hell', 'Casual'], friends: 'Everyone is playing this' },
  gp_stardewvalley: { studio: 'ConcernedApe', released: 'Feb 26, 2016', desc: 'Inherit a farm, build a life, lose a hundred hours to it happily.', tags: ['Farming Sim', 'Co-op', 'Cozy'], friends: 'Caleb rated this 5 stars', rec: 96, recFriends: 5 },
  gp_oriandthewillofthewisps: { studio: 'Moon Studios', released: 'Mar 11, 2020', desc: 'A gorgeous, heartbreaking platformer with movement that just sings.', tags: ['Platformer', 'Metroidvania', 'Story Rich'], friends: 'Sauhee rated this 5 stars', rec: 94, recFriends: 4 },
  gp_batmanarkhamknight: { studio: 'Rocksteady', released: 'Jun 23, 2015', desc: 'Be the Batman across a stormy, open Gotham in the Arkham finale.', tags: ['Action', 'Open World', 'Mature 17+'], friends: '3 friends recommend this' },
  gp_controlultimateedition: { studio: 'Remedy', released: 'Aug 27, 2019', desc: 'A brutalist secret agency, telekinetic combat and a shifting building.', tags: ['Action', 'Supernatural', 'Mature 17+'], friends: 'Caleb said "telekinetic combat never gets old"' },
  gp_dishonored2: { studio: 'Arkane', released: 'Nov 11, 2016', desc: 'Stealth, powers and a dozen ways through every level. Ghost it or gut it.', tags: ['Stealth', 'Action', 'Mature 17+'], friends: '2 friends recommend this' },
  gp_fallout4: { studio: 'Bethesda', released: 'Nov 10, 2015', desc: 'Build, scavenge and shoot your way across the Commonwealth wasteland.', tags: ['RPG', 'Open World', 'Mature 17+'], friends: 'Meera said "lost a whole weekend to the Commonwealth"' },
  gp_hellbladesenuassacrifice: { studio: 'Ninja Theory', released: 'Aug 8, 2017', desc: 'A harrowing descent into Norse myth and psychosis. Wear headphones.', tags: ['Action', 'Psychological', 'Mature 17+'], friends: 'Meera recommends this' },
  gp_fallout76: { studio: 'Bethesda', released: 'Nov 14, 2018', desc: 'Rebuild Appalachia with friends in a wide-open online wasteland.', tags: ['RPG', 'Online', 'Mature 17+'], friends: '' },
  gp_firewatch: { studio: 'Campo Santo', released: 'Feb 9, 2016', desc: 'Firewatch is a single-player mystery set in the Wyoming wilderness, where your only lifeline is the voice on the other end of a handheld radio.', tags: ['Adventure', 'Story Rich', 'Mystery'], friends: 'Meera has played 3 hrs recently' },
  gp_unpacking: { studio: 'Witch Beam', released: 'Nov 2, 2021', desc: 'Unpack boxes, arrange a life. A quiet, lovely game about moving house.', tags: ['Puzzle', 'Cozy', 'Relaxing'], friends: 'Sauhee said "oddly therapeutic, lost an hour"' },
  gp_spiritfarer: { studio: 'Thunder Lotus', released: 'Aug 18, 2020', desc: 'A cozy management game about ferrying spirits to their final rest.', tags: ['Adventure', 'Cozy', 'Story Rich'], friends: '3 friends recommend this' },
  gp_tunic: { studio: 'Andrew Shouldice', released: 'Mar 16, 2022', desc: 'A tiny fox, a huge secret-filled world, and a manual you decode as you go.', tags: ['Adventure', 'Puzzle', 'Souls-like'], friends: 'Caleb said "the secret manual blew my mind"' },
  gp_inside: { studio: 'Playdead', released: 'Jun 29, 2016', desc: "A wordless, dread-soaked puzzle-platformer you won't stop thinking about.", tags: ['Platformer', 'Puzzle', 'Atmospheric'], friends: 'Sauhee recommends this' },
  gp_limbo: { studio: 'Playdead', released: 'Jul 21, 2010', desc: 'Stark, monochrome and menacing — the puzzle-platformer that started it.', tags: ['Platformer', 'Puzzle', 'Atmospheric'], friends: '2 friends recommend this' },
  gp_celeste: { studio: 'Maddy Makes Games', released: 'Jan 25, 2018', desc: 'A razor-tight precision platformer about climbing a mountain — and yourself.', tags: ['Platformer', 'Precision', 'Story Rich'], friends: 'Meera said "hardest game I love"', rec: 95, recFriends: 3 },
}
// A stable, per-game pair of friend avatars so different cards show different
// profiles (varied but consistent for a given game).
const AV_POOL = [AVATAR.blue, AVATAR.yellow, AVATAR.green, AVATAR.red]
function pickAvatars(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const a = h % AV_POOL.length
  const b = (a + 1 + ((h >>> 3) % (AV_POOL.length - 1))) % AV_POOL.length
  return [AV_POOL[a], AV_POOL[b]]
}

// One deterministic source of a game's FRIEND activity (never the current user),
// so the same game shows the same friends, count and hours everywhere it appears
// — cards, the "Similar to" row, and the detail page. Keyed by catalog key.
const FRIEND_POOL = [AVATAR.blue, AVATAR.yellow, AVATAR.red, AVATAR.pink] // Caleb, Sauhee, Meera, Yessenia
const FRIEND_NAMES = { [AVATAR.blue]: 'Caleb', [AVATAR.yellow]: 'Sauhee', [AVATAR.red]: 'Meera', [AVATAR.pink]: 'Yessenia' }
function friendInfo(key) {
  let h = 0
  for (let i = 0; i < String(key).length; i++) h = (h * 31 + String(key).charCodeAt(i)) >>> 0
  // Single source of truth for a game's friend activity. Prefer an AUTHORED
  // count — the Trending stats or a "N friends…" card label — so the faces and
  // number stay identical everywhere the game appears (cards AND the detail
  // page). Only games with no explicit number fall back to a stable hash count.
  const trend = TRENDING_STATS[key]
  const labelMatch = /^(\d+)\s+friends?\b/i.exec(STARTER_DESC[key]?.friends || '')
  const r = h % 5
  const authored = trend?.friends ?? (labelMatch ? parseInt(labelMatch[1], 10) : (r === 0 ? 1 : r <= 2 ? 2 : 3))
  // Never claim more friends than actually exist — there are only FRIEND_POOL of them.
  const count = Math.min(Math.max(authored, 1), FRIEND_POOL.length)
  const avatars = avatarsForCount(key, count) // deterministic faces, capped at the friend pool
  const hours = trend?.hours ?? (4 + (h % 22)) // avg hours played, 4..25
  // A single friend gets named ("Caleb recommends…"); multiples show the count.
  const recommend = count === 1
    ? `${FRIEND_NAMES[avatars[0]]} recommends this game`
    : `${count} friends recommend this game`
  return { avatars, count, hours, recommend }
}
// A short friend review quote per game, so a card's social line can be a real
// comment ("X said …") — mixed in with the recommend + hours lines. Speakers are
// the four friends (Caleb / Sauhee / Meera / Yessenia).
const CARD_QUOTES = {
  gp_doometernal: 'Caleb said "the combat loop is unreal"',
  gp_deeprockgalactic: 'Meera said "Rock and Stone, forever"',
  gp_amongus: 'Sauhee said "chaos with the group every time"',
  gp_chivalry2: 'Caleb said "pure medieval mayhem"',
  gp_warhammer40000darktide: 'Meera said "best horde shooter in ages"',
  gp_warhammervermintide2: 'Sauhee said "the melee just clicks"',
  gp_stardewvalley: 'Caleb said "lost a hundred hours, happily"',
  gp_oriandthewillofthewisps: 'Sauhee said "the movement just sings"',
  gp_hades: 'Meera said "one more run, every night"',
  gp_celeste: 'Meera said "hardest game I love"',
  gp_batmanarkhamknight: 'Caleb said "being the Batman never gets old"',
  gp_controlultimateedition: 'Caleb said "telekinetic combat never gets old"',
  gp_dishonored2: 'Sauhee said "so many ways through every level"',
  gp_fallout4: 'Meera said "lost a whole weekend to the Commonwealth"',
  gp_hellbladesenuassacrifice: 'Meera said "wear headphones, trust me"',
  gp_unpacking: 'Sauhee said "oddly therapeutic, lost an hour"',
  gp_spiritfarer: 'Yessenia said "it made me cry, lovingly"',
  gp_tunic: 'Caleb said "the secret manual blew my mind"',
  gp_inside: 'Sauhee said "couldn\'t stop thinking about it"',
  gp_limbo: 'Caleb said "stark and unforgettable"',
}
// Friend display name → avatar color, to resolve a quote's speaker to their face.
const COLOR_OF_FRIEND = Object.fromEntries(Object.entries(FRIEND_NAMES).map(([col, nm]) => [nm, col]))
// The social line + faces a card shows — a deterministic MIX of three styles so a
// row isn't all one note: a recommendation, an avg-hours-played line, or a
// friend's review comment. Keyed by catalog key so it's stable per game.
function cineSocial(k) {
  const fi = friendInfo(k)
  const d = STARTER_DESC[k] || {}
  const quote = CARD_QUOTES[k] || (/\bsaid\s+"/.test(d.friends || '') ? d.friends : null)
  const styles = ['recommend', 'hours']
  if (quote) styles.push('review')
  let h = 0
  for (let i = 0; i < String(k).length; i++) h = (h * 33 + String(k).charCodeAt(i) + 11) >>> 0
  const pick = styles[h % styles.length]
  if (pick === 'hours') {
    const label = fi.count === 1
      ? `${FRIEND_NAMES[fi.avatars[0]]} played this for ${fi.hours} hrs`
      : `${fi.count} friends played this for avg. ${fi.hours} hrs`
    return { label, avatars: fi.avatars }
  }
  if (pick === 'review') {
    const who = (/^(\w+)\s+said/.exec(quote) || [])[1]
    const col = who && COLOR_OF_FRIEND[who]
    return { label: quote, avatars: col ? [col] : fi.avatars }
  }
  return { label: fi.recommend, avatars: fi.avatars }
}
// Deterministic set of `n` distinct friend faces for a game — used when a card's
// label states an explicit count ("2 friends recommend this") so the avatars
// shown always match the number in the text.
function avatarsForCount(key, n) {
  let h = 0
  for (let i = 0; i < String(key).length; i++) h = (h * 31 + String(key).charCodeAt(i)) >>> 0
  const start = h % FRIEND_POOL.length
  const len = Math.min(Math.max(n, 1), FRIEND_POOL.length)
  return Array.from({ length: len }, (_, i) => FRIEND_POOL[(start + i) % FRIEND_POOL.length])
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
  gp_hades: 'xH8qHf5QxrU',
  gp_celeste: 'gBByzDmJFgU',
  gp_doometernal: '3CWzCwCmHho',
  gp_deeprockgalactic: 'pWeYah0FZqU',
  gp_amongus: 'uHqSPGIZIEA',
  gp_batmanarkhamknight: 'Wx-P9Kp7eFg',
  gp_controlultimateedition: 'lSmi5e4LL5U',
  gp_dishonored2: 'k-LkH5A3oG4',
  gp_fallout4: 'ETcYeakuFYs',
  gp_vampiresurvivors: 'bzYEU3rBD-Y',
  gp_tunic: '9NlMf_oVetI',
  gp_inside: 'LqZa-8_avSQ',
  gp_limbo: 'IXnrrwdD7Eo',
  gp_chivalry2: 'brnJ611LkwY',
  gp_warhammer40000darktide: 'EehS0H9f0jc',
  gp_warhammervermintide2: '2PoYt9UaHWk',
  gp_doom64: 'jswXuV30e1k',
  gp_spiritfarer: 'PRzGApgrYd4',
  gp_unpacking: '5SAV6weubRI',
  gp_hellbladesenuassacrifice: 'MEUbYGlY7mE',
  gp_fallout76: 'g15KbByVsCI',
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
    video: GAMEPLAY_LANDSCAPE[k] ? { youTubeId: GAMEPLAY_LANDSCAPE[k], badge: 'Gameplay' } : g?.youTubeId ? { youTubeId: g.youTubeId, badge: 'Trailer' } : undefined,
    title: c.title || g?.title,
    publisher: d.studio || c.developer || 'Game Pass',
    released: STARTER_RELEASED[k] ? `Released on ${STARTER_RELEASED[k]}` : '',
    // Friend recommend line + faces come from the one per-game source, so a
    // game is never all "be the first" and always matches its cards elsewhere.
    recommend: d.friends || friendInfo(k).recommend,
    // friendInfo already derives its faces from the same authored count that
    // d.friends states, so the pics never contradict the number.
    avatars: friendInfo(k).avatars,
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
  gp_hades: { friends: 3, hours: 12 },
  gp_doom64: { friends: 3, hours: 4 },
  gp_vampiresurvivors: { friends: 3, hours: 8 },
}

// Trending list thumbnail — static cover art (no hover trailer for this list).
function TrendingThumb({ gameKey }) {
  return (
    <div className="relative h-[104px] w-[185px] shrink-0 overflow-hidden rounded-[10px] bg-black">
      <img alt="" src={starterHeader(gameKey)} loading="lazy" className="absolute inset-0 size-full object-cover" />
    </div>
  )
}

// "Trending in Your Communities" — a compact list of games (Figma 937:8591).
function TrendingRow({ items, onOpen, onShare }) {
  return (
    <section className="mt-[56px]">
      <p className="text-[24px] font-semibold text-white">Trending amongst Your Friends</p>
      <div className="mt-[16px] flex flex-col gap-[4px]">
        {items.map((k) => {
          const g = STARTER_BY_KEY[k]
          const c = CATALOG[k] || {}
          const d = STARTER_DESC[k] || {}
          const title = c.title || g?.title
          return (
            <div
              key={k}
              data-game={title}
              role="button"
              tabIndex={0}
              onClick={() => onOpen?.(title)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(title) } }}
              className="group flex w-full cursor-pointer items-center gap-[20px] rounded-[12px] p-[12px] text-left transition hover:bg-white/[0.03]"
            >
              <TrendingThumb gameKey={k} />
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-semibold text-white">{title}</p>
                {(() => {
                  // Same friend source as the cards + detail page, so the faces
                  // and the count always agree (and never exceed the 3 friends).
                  const fi = friendInfo(k)
                  const avs = fi.avatars
                  return (
                    <div className="mt-[8px] flex items-center gap-[9px]">
                      <span className="flex items-center">
                        {avs.slice(0, 2).map((cc, i) => (
                          <PlayerAvatar key={i} color={cc} size={22} marginRight={i < 1 ? -8 : 0} gameTitle={title} onShare={onShare} hrs={friendHours(k, cc)} />
                        ))}
                        {avs.length > 2 && <span className="ml-[3px] text-[13px] font-semibold leading-none text-white">+</span>}
                      </span>
                      <p className="text-[13px] font-semibold text-white">{fi.count} {fi.count === 1 ? 'friend' : 'friends'} played this for avg. {fi.hours} hours</p>
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
                className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[#9a9ba3] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
              >{ELLIPSIS_GLYPH}</button>
            </div>
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
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group relative aspect-video min-w-0 flex-1 overflow-hidden rounded-[16px] bg-[#121214] text-left"
    >
      <img alt="" src={starterHeader(gkey)} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      {hover && (GAMEPLAY_LANDSCAPE[gkey] || g?.youTubeId) && <VideoTrailer youTubeId={GAMEPLAY_LANDSCAPE[gkey] || g.youTubeId} poster={starterHeader(gkey)} bare />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <p className="pointer-events-none absolute bottom-[14px] left-[16px] right-[16px] text-[22px] font-bold text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.7)]">{title}</p>
    </button>
  )
}

// Release dates for the local-art CATALOG games (the detail-page rows), so their
// cinematic cards show "studio · date" like the Recommended page.
const CATALOG_RELEASED = {
  minecraft: 'Nov 18, 2011', seaOfThieves: 'Jun 3, 2020', monsterHunter: 'Jan 12, 2022',
  grounded: 'Sep 27, 2022', overcooked: 'Aug 7, 2018', forHonor: 'Feb 14, 2017',
  humanFallFlat: 'Jul 22, 2016', gangBeasts: 'Dec 12, 2017',
}
// CinematicCard props for a Starter game — the rich horizontal hover overlay
// (trailer + title + social proof + tag pills, no default title).
function cineCard(k) {
  const g = STARTER_BY_KEY[k]
  const c = CATALOG[k] || {}
  const d = STARTER_DESC[k] || {}
  // Prefer landscape gameplay, then the starter trailer, then the local-art
  // catalog trailer (so the detail-page "Similar to" cards also play on hover).
  const vid = GAMEPLAY_LANDSCAPE[k] || g?.youTubeId || VIDEOS[k]
  // A mix of social lines (recommend / avg hrs / a friend's review comment), with
  // faces that match the line (a quote shows just its speaker).
  const social = cineSocial(k)
  return {
    image: starterHeader(k),
    video: vid ? { youTubeId: vid, poster: starterHeader(k), badge: GAMEPLAY_LANDSCAPE[k] ? 'Gameplay' : 'Trailer' } : undefined,
    avatars: social.avatars,
    label: social.label,
    // Each face is a share target: parallel {to, name, hrs} so the card can show
    // "name · hrs" on hover and forward the game straight to that friend on click.
    avatarTargets: social.avatars.map((c) => ({ to: NAME[c], name: capName(NAME[c] || ''), hrs: friendHours(k, c), rec: /recommend/i.test(social.label) || friendRecommends(k, c) })),
    avatarsPlus: false,
    // Fall back to CATALOG for games not in the Starter list (e.g. Sea of
    // Thieves) so their capacity + genre pills aren't blank.
    players: (() => { const p = g?.players || c.players || '1'; return p === 'MMO' ? 'MMO' : p })(),
    genre: capName(g?.genre || c.genre || ''),
    genre2: (d.tags || []).find((t) => t && capName(t) !== capName(g?.genre || c.genre || '')) || null,
    title: c.title || g?.title,
    // Persistent caption under the card — the studio and release date.
    studio: d.studio || c.developer || '',
    released: d.released || CATALOG_RELEASED[k] || '',
    recommendPct: d.rec,
  }
}

// "Highly Rated by Your Friends" — wide cards with the cinematic hover overlay.
function HighlyRatedRow({ items, onOpen, onWishlist, onShare, menuGame, revealTitle }) {
  const titleOf = (k) => STARTER_BY_KEY[k]?.title || CATALOG[k]?.title
  // Force the hover reveal when the participant's mirrored pointer (revealTitle)
  // or an open right-click menu (menuGame) is on this card.
  return (
    <ShelfRow title="Recommended by Your Friends" padTop={30}>
      {items.map((k) => <CinematicCard key={k} {...cineCard(k)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={(!!menuGame && menuGame === titleOf(k)) || (!!revealTitle && revealTitle === titleOf(k))} />)}
    </ShelfRow>
  )
}

// "Worth a Closer Look" — one featured game with a detail panel (Figma 937:8591).
function WorthACloserLook({ gameKey, onOpen, onShare, revealTitle }) {
  const [hover, setHover] = useState(false)
  const g = STARTER_BY_KEY[gameKey]
  const c = CATALOG[gameKey] || {}
  const d = STARTER_DESC[gameKey] || {}
  const title = c.title || g?.title
  // On the moderator's mirror there's no real hover, so drive the trailer +
  // reveal from the participant's mirrored pointer (revealTitle).
  const shown = hover || (!!revealTitle && revealTitle === title)
  return (
    <section className="mt-[56px]">
      <p className="text-[24px] font-semibold text-white">Worth a Closer Look</p>
      <div className="mt-[20px] flex flex-col gap-[28px] lg:flex-row">
        <button
          data-game={title}
          onClick={() => onOpen?.(title)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          className={'group relative aspect-video w-full shrink-0 overflow-hidden rounded-[16px] bg-[#121214] lg:w-[56%]' + (shown ? ' is-revealed' : '')}
        >
          <img alt="" src={starterHeader(gameKey)} className={'absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.02]' + (shown ? ' scale-[1.02]' : '')} />
          {shown && (GAMEPLAY_LANDSCAPE[gameKey] || g?.youTubeId) && <VideoTrailer youTubeId={GAMEPLAY_LANDSCAPE[gameKey] || g.youTubeId} poster={starterHeader(gameKey)} bare />}
          {(GAMEPLAY_LANDSCAPE[gameKey] || g?.youTubeId) && (
            <span className={'pointer-events-none absolute left-[14px] top-[14px] z-[2] rounded-[4px] bg-black/70 px-[8px] py-[3px] text-[11px] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity duration-[300ms] ease-out group-hover:opacity-100 group-focus-within:opacity-100' + (shown ? ' !opacity-100' : '')}>{GAMEPLAY_LANDSCAPE[gameKey] ? 'Gameplay' : 'Trailer'}</span>
          )}
        </button>
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-start gap-[10px]">
            {/* Match the avatars' height to the text's first line so they sit
                centered on that line (not the whole wrapped block). */}
            <div className="flex h-[18px] items-center">
              {FRIEND_POOL.map((col, i) => (
                <PlayerAvatar key={i} color={col} size={22} marginRight={i < FRIEND_POOL.length - 1 ? -8 : 0} gameTitle={title} onShare={onShare} hrs={friendHours(gameKey, col)} />
              ))}
            </div>
            <p className="text-[13px] font-semibold leading-[18px] text-white">{`Most-played by your friends · avg. ${friendInfo(gameKey).hours} hrs`}</p>
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
function LibraryTile({ g, onClick, metric, onWishlist, onShare }) {
  const [broken, setBroken] = useState(false)
  const onParty = useContext(PartyCtx)
  const onWheelAdd = useContext(WheelCtx)
  // On the moderator's mirror, force this tile's hover reveal when it's the card
  // the participant is hovering.
  const spHover = useContext(SpectateHoverCtx)
  // Keyboard parity: focusing the tile (or a control in it) forces the same
  // reveal a mouse hover gives (Add-to-Mix / More buttons + ring).
  const [kbFocus, setKbFocus] = useState(false)
  const fr = kbFocus || (!!spHover && spHover === g.title)
  const localArt = g.key && CATALOG[g.key]?.image
  // Cover: local art → Steam capsule → the game's YouTube still (for the handful
  // of console-only games with no Steam page) → gradient fallback.
  const cover = broken ? null : (localArt || (g.steamAppId ? STEAM_COVER(g.steamAppId) : null) || (g.youTubeId ? ytThumb(g.youTubeId) : null))
  // Ellipsis → same menu as a right-click: dispatch a bubbling contextmenu event
  // that the global game-card menu handler catches (the tile is tagged data-game).
  const openMenu = (e) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left, clientY: r.top }))
  }
  return (
    <div
      onClick={onClick}
      data-game={g.title}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      onFocus={() => setKbFocus(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKbFocus(false) }}
      className="group cursor-pointer text-left"
    >
      <div className="relative">
      <div className={'relative aspect-[3/4] overflow-hidden rounded-[12px] bg-[#151518] ring-1 ring-white/5 transition group-hover:ring-white/25' + (fr ? ' !ring-white/25' : '')}>
        {cover ? (
          <img alt="" src={cover} onError={() => setBroken(true)} className={'size-full object-cover transition duration-300 group-hover:scale-[1.06]' + (fr ? ' scale-[1.06]' : '')} />
        ) : (
          <div className="absolute inset-0 transition duration-300 group-hover:scale-[1.04]" style={{ background: `linear-gradient(150deg, ${g.colors[0]}, ${g.colors[1]})` }}>
            <div className="absolute inset-0 flex items-center justify-center p-[14px]">
              <span className="text-center uppercase leading-[0.92] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]" style={{ fontFamily: '"Base Neue Cond Bold"', fontSize: 'clamp(15px,1.5vw,24px)' }}>{g.title}</span>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
        {/* Add-to-PlayList + party — bottom-right, revealed on hover. Placed
            OUTSIDE the image's overflow-hidden so the + hover-menu isn't clipped. */}
        <div className={'absolute bottom-[14px] right-[16px] flex items-center gap-[16px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100' + (fr ? ' !opacity-100' : '')}>
          {onParty && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onParty(g.title) }} aria-label="Start a party" className="group/party relative flex size-[28px] items-center justify-center">
              <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/party:opacity-100 group-focus-within/party:opacity-100">Start a party</span>
              <PartyGlyph size={22} className="text-[#9BF00B] transition-[scale,filter] duration-200 group-hover/party:scale-110 group-hover/party:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]" />
            </button>
          )}
          <div className="group/add relative flex size-[28px] items-center justify-center">
            <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(g.title) }} aria-label="Add this game" className="flex size-full items-center justify-center">
              <svg viewBox="0 0 17 18" fill="none" className="size-[24px] transition-[scale,filter] duration-200 group-hover/add:scale-110 group-hover/add:[filter:drop-shadow(0_0_8px_rgba(155,240,11,0.95))_drop-shadow(0_0_18px_rgba(155,240,11,0.5))]" style={{ color: '#9BF00B' }}><path d="M8.67 1V17M1 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            {onWheelAdd ? (
              <div className="pointer-events-none absolute bottom-full right-0 z-[20] pb-[8px] opacity-0 transition-opacity duration-150 group-hover/add:pointer-events-auto group-hover/add:opacity-100">
                <div className="w-[172px] overflow-hidden rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[5px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onWishlist?.(g.title) }} className="flex w-full items-center gap-[9px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#dbdee1] transition hover:bg-white/5">
                    <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
                    Add to PlayList
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onWheelAdd(g.title) }} className="flex w-full items-center gap-[9px] px-[12px] py-[8px] text-left text-[13px] font-medium text-[#dbdee1] transition hover:bg-white/5">
                    <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" /><path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" /><path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" /></svg>
                    Add to Wheel
                  </button>
                </div>
              </div>
            ) : (
              <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/75 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover/add:opacity-100 group-focus-within/add:opacity-100">Add this game</span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-[8px] truncate text-[15px] font-semibold text-white">{g.title}</p>
      <p className="truncate text-[13px] text-[#7e7f87]">{g.players === 'MMO' ? 'MMO' : g.players === '1' ? '1 player' : `${g.players} players`} · {g.genre}</p>
      {metric && <p className="truncate text-[13px] font-semibold text-[#c7c9cb]">{metric}</p>}
    </div>
  )
}

// ── Library filter facets ───────────────────────────────────────────────────
// A game's max party size, derived from its `players` range ("1-4" → 4, "MMO" → 999).
const maxPlayers = (p) => p === 'MMO' ? 999 : Math.max(1, ...String(p).split('-').map(Number).filter((n) => !isNaN(n)))
// A game's supported player span as [min,max] ("1-4"→[1,4], "1+"→[1,999],
// "MMO"→[1,999], "2"→[2,2]). Used by the min–max player-range filter.
const playerRange = (p) => {
  if (!p) return [1, 1]
  if (/mmo/i.test(String(p))) return [1, 999]
  const parts = String(p).replace(/\+/, '-999').split('-').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))
  if (!parts.length) return [1, 1]
  return [parts[0], parts[parts.length - 1]]
}
// Does a game's player span overlap a requested [min,max] range? (Either bound
// may be null → open-ended.) A game "supports" the range if the spans intersect,
// so a 2–2 filter surfaces every game playable with exactly two people.
const playerRangeOverlaps = (p, fmin, fmax) => {
  const [gmin, gmax] = playerRange(p)
  return gmin <= (fmax ?? 999) && gmax >= (fmin ?? 1)
}
// Every distinct genre in the catalog, for the genre filter chips.
const ALL_GENRES = [...new Set(STARTER_LIBRARY.map((g) => g.genre))].sort((a, b) => a.localeCompare(b))
// Descriptive tags a game carries (from its Starter blurb) — used by the generic
// "tag" filter facet that clicked card tags land on when they aren't a genre.
const gameTags = (g) => STARTER_DESC[g.catKey]?.tags || []
// Compare two {kind,value} filter facets.
const sameFacet = (a, b) => a.kind === b.kind && a.value === b.value
// Human label for a filter facet — the player-capacity facet is a number ("N").
const facetLabel = (f) =>
  f.kind === 'cap' ? (f.value >= 999 ? 'MMO' : `Up to ${f.value} player${f.value === 1 ? '' : 's'}`)
  : f.kind === 'range' ? (
      f.min != null && f.max != null ? (f.min === f.max ? `${f.min} players` : `${f.min}–${f.max} players`)
      : f.min != null ? `${f.min}+ players`
      : `Up to ${f.max} players`)
  : f.kind === 'session' ? `≤ ${f.value} hrs / session`
  : f.value
// Resolve a clicked card-tag string to a Library filter facet: a real genre, a
// player-capacity number (the game's max), or otherwise a generic descriptive tag.
const facetForTag = (text) => {
  const t = String(text || '').trim()
  if (!t) return null
  if (ALL_GENRES.includes(t)) return { kind: 'genre', value: t }
  const m = t.match(/^\d+(?:-\d+)?|MMO/)
  if (m && (/player|MMO/i.test(t) || /^\d/.test(t))) return { kind: 'cap', value: maxPlayers(m[0]) }
  return { kind: 'tag', value: t }
}

// ── Library sort metrics ─────────────────────────────────────────────────────
// Deterministic per-game numbers so the same value shows on the detail page and
// drives the Library sort. friends' rating uses an authored `rec` when present.
const ratingHash = (key, salt) => { let h = 0; const s = key + ':' + salt; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const friendsRating = (key) => { const a = STARTER_DESC[key]?.rec; return typeof a === 'number' ? a : 78 + (ratingHash(key, 'fr') % 21) } // 78..98
const overallRating = (key) => 70 + (ratingHash(key, 'ov') % 26) // 70..95
const avgFriendHours = (key) => friendInfo(key).hours
// Average group session length in whole hours. Parsed from a game's "~2hrs"
// playtime string; falls back to a stable per-game value (1..4h) when unknown.
const sessionHours = (key) => {
  const src = CATALOG[key]?.playtime || STARTER_BY_KEY[key]?.playtime || details[key]?.playtime
  const n = src && parseInt(String(src).replace(/[^0-9]/g, ''), 10)
  return n || (1 + (ratingHash(key, 'sess') % 4))
}
// Per-friend playtime for a game — deterministic, spread around the game's avg
// so each friend's avatar tooltip can read "Name · N hrs".
const friendHours = (key, color) => {
  let h = 0; const s = key + ':' + color; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return Math.max(1, friendInfo(key).hours - 3 + (h % 7))
}
// Whether a given friend recommends a game — deterministic per (game, friend) so
// the card's hover tooltip can show a green thumbs-up for the ones who did.
const friendRecommends = (key, color) => {
  let h = 0; const s = key + ':rec:' + color; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 3 !== 0 // ~two thirds recommend
}
// Friend-activity line for the default (Recommended) sort — same phrasing family
// the game cards use: "N friends played it" / "Name played it" / be-the-first.
const friendActivityLine = (key) => {
  if (STARTER_DESC[key]?.friends === '') return 'Be the first to play it!'
  const fi = friendInfo(key)
  if (fi.count === 1) return `${FRIEND_NAMES[fi.avatars[0]] || 'A friend'} played this`
  return `${fi.count} friends played this`
}
const LIB_SORTS = [
  { id: 'default', label: 'A to Z', metric: (k) => friendActivityLine(k), cmp: (a, b) => (a.title || '').localeCompare(b.title || '') },
  { id: 'hours', label: 'Avg friend playtime', metric: (k) => `${avgFriendHours(k)} hrs avg`, cmp: (a, b) => avgFriendHours(b.catKey) - avgFriendHours(a.catKey) },
  { id: 'friends', label: "Friend's rating", metric: (k) => `${friendsRating(k)}% of friends`, cmp: (a, b) => friendsRating(b.catKey) - friendsRating(a.catKey) },
  { id: 'overall', label: 'Overall rating', metric: (k) => `${overallRating(k)}% overall`, cmp: (a, b) => overallRating(b.catKey) - overallRating(a.catKey) },
  { id: 'session', label: 'Session length', metric: (k) => `~${sessionHours(k)} hrs / session`, cmp: (a, b) => sessionHours(a.catKey) - sessionHours(b.catKey) },
]

// Min–max player-range inputs, shared by the Library and PlayList filters.
// Either bound can be left blank (open-ended); "2 to 2" isolates 2-player games.
function PlayerRangeInputs({ min, max, onChange }) {
  const cls = 'h-[34px] w-[64px] rounded-[8px] bg-[#1f1f23] px-[10px] text-center text-[14px] font-semibold text-white outline-none ring-1 ring-white/10 placeholder:font-normal placeholder:text-[#87898c] focus:ring-[#9BF00B] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
  const num = (v) => { const n = parseInt(v, 10); return (!v || isNaN(n) || n < 1) ? null : n }
  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <input type="number" min="1" inputMode="numeric" value={min ?? ''} onChange={(e) => onChange(num(e.target.value), max)} placeholder="min" aria-label="Minimum players" className={cls} />
      <span className="text-[14px] text-[#c7c9cb]">to</span>
      <input type="number" min="1" inputMode="numeric" value={max ?? ''} onChange={(e) => onChange(min, num(e.target.value))} placeholder="max" aria-label="Maximum players" className={cls} />
      <span className="text-[14px] text-[#c7c9cb]">players</span>
      {(min != null || max != null) && <button onClick={() => onChange(null, null)} className="text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear</button>}
    </div>
  )
}

// ── Library tab — the full Game Pass Starter Edition catalog ────────────────
function LibraryPage({ onHome, onMixes, onOpen, initialFilter, onWishlist, onShare }) {
  const { addToWheel } = useContext(NavCtx)
  const { blends, setBlends } = useRoomCtx()
  const [addPlOpen, setAddPlOpen] = useState(false)
  const myLibBlends = (blends || []).filter((b) => (b.members || []).includes(SELF))
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(initialFilter || []) // [{kind:'cap'|'genre', value}]
  const [filterOpen, setFilterOpen] = useState(false)
  const [sort, setSort] = useState('default')
  const [sortOpen, setSortOpen] = useState(false)
  // Arriving from a clicked tag applies (replaces) the incoming filter.
  useEffect(() => { if (initialFilter && initialFilter.length) setActive(initialFilter) }, [initialFilter])

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // Publish the search text, active filters, sort and the two dropdowns so the
  // moderator's mirror shows the same filtered/sorted grid and open menus.
  const [lUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/libraryUI` : 'spectate/__nolui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/libraryUI`, { q: q || '', active: active || [], sort: sort || 'default', filterOpen: !!filterOpen, sortOpen: !!sortOpen, searchOpen: !!searchOpen })
  }, [q, active, sort, filterOpen, sortOpen, searchOpen])
  const eQ = IS_SPECTATE ? (lUI?.q || '') : q
  const eActive = IS_SPECTATE ? (lUI?.active || []) : active
  const eSort = IS_SPECTATE ? (lUI?.sort || 'default') : sort
  const eFilterOpen = IS_SPECTATE ? !!lUI?.filterOpen : filterOpen
  const eSortOpen = IS_SPECTATE ? !!lUI?.sortOpen : sortOpen
  const filterPop = usePopover(eFilterOpen, () => setFilterOpen(false))
  const sortPop = usePopover(eSortOpen, () => setSortOpen(false), { menu: true })
  const eSearchOpen = IS_SPECTATE ? !!lUI?.searchOpen : searchOpen

  const query = eQ.trim().toLowerCase()
  // A clicked player pill still arrives as {kind:'cap', value:N} → treated as the
  // range [1..N]. The manual filter sets a {kind:'range', min, max} facet.
  const capFacet = eActive.find((a) => a.kind === 'cap')
  const rangeFacet = eActive.find((a) => a.kind === 'range')
  const genres = eActive.filter((a) => a.kind === 'genre').map((a) => a.value)
  const tagFacets = eActive.filter((a) => a.kind === 'tag').map((a) => a.value)
  const sessionFacet = eActive.find((a) => a.kind === 'session')
  // Faceted: OR within a group, AND across groups, AND with the text search.
  const filtered = STARTER_LIBRARY.filter((g) =>
    (!query || g.title.toLowerCase().includes(query) || g.genre.toLowerCase().includes(query)) &&
    (!capFacet || playerRangeOverlaps(g.players, 1, capFacet.value)) &&
    (!rangeFacet || playerRangeOverlaps(g.players, rangeFacet.min, rangeFacet.max)) &&
    (genres.length === 0 || genres.includes(g.genre)) &&
    (!sessionFacet || sessionHours(g.catKey) <= sessionFacet.value) &&
    (tagFacets.length === 0 || tagFacets.some((t) => gameTags(g).includes(t))))
  const activeSort = LIB_SORTS.find((s) => s.id === eSort) || LIB_SORTS[0]
  const shown = activeSort.cmp ? [...filtered].sort(activeSort.cmp) : filtered
  const isOn = (f) => eActive.some((a) => sameFacet(a, f))
  const toggle = (f) => setActive((cur) => cur.some((a) => sameFacet(a, f)) ? cur.filter((a) => !sameFacet(a, f)) : [...cur, f])
  // Set (or clear) the player-range facet from the min/max inputs.
  const rangeMin = rangeFacet?.min ?? null
  const rangeMax = rangeFacet?.max ?? null
  const setRange = (min, max) => setActive((cur) => {
    const rest = cur.filter((a) => a.kind !== 'range' && a.kind !== 'cap')
    return (min == null && max == null) ? rest : [...rest, { kind: 'range', min, max }]
  })
  // Filter to games whose average session fits within `n` hours.
  const setSessionMax = (n) => setActive((cur) => {
    const rest = cur.filter((a) => a.kind !== 'session')
    return n == null ? rest : [...rest, { kind: 'session', value: n }]
  })
  const open = (g) => onOpen(g.catKey)
  // Bulk-add the currently filtered games to a chosen playlist.
  const addAllToBlend = (b) => {
    const keys = shown.map((g) => g.catKey)
    const wl = [...new Set([...(b.wishlist || []), ...keys])]
    const addedBy = { ...(b.addedBy || {}) }
    keys.forEach((k) => { if (!addedBy[k]) addedBy[k] = SELF_NAME })
    setBlends((blends || []).map((x) => (x.id === b.id ? { ...x, wishlist: wl, addedBy } : x)))
    setAddPlOpen(false)
  }

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <PageNav active="library" onHome={onHome} onMixes={onMixes} onBack={onHome} />
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[36px]">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex flex-wrap items-end justify-between gap-[16px]">
            <div>
              <h1 className="text-[clamp(30px,3vw,44px)] uppercase tracking-[0.02em] text-white" style={{ fontFamily: '"Base Neue Cond Bold"' }}>Library</h1>
              <div className="mt-[6px] flex items-center gap-[8px] text-[15px] text-[#9a9ba3]">
                <XboxLogo size={16} />
                Game Pass Starter Edition · {shown.length} / {STARTER_LIBRARY.length} games{(eActive.length || query) ? '' : ', playable in the cloud.'}
              </div>
            </div>
            <div className="flex flex-row-reverse items-center gap-[10px]">
              {/* Filters — multi-select player-capacity + genre tags (sits to the right of search) */}
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-haspopup="dialog"
                  aria-expanded={eFilterOpen}
                  className="flex h-[38px] items-center gap-[8px] rounded-[8px] bg-[#1a1a1d] px-[14px] text-[14px] font-semibold text-white transition hover:bg-[#232327]"
                >
                  <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M3 5.5h18a1 1 0 0 1 .8 1.6l-6.3 8.2V20a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 10.5 18.5v-3.2L2.2 7.1A1 1 0 0 1 3 5.5z" /></svg>
                  Filters
                  {eActive.length > 0 && <span className="rounded-full bg-white/15 px-[7px] py-[1px] text-[12px] font-bold">{eActive.length}</span>}
                </button>
                {eFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => setFilterOpen(false)} />
                    <div ref={filterPop} role="dialog" aria-label="Filters" className="absolute right-0 top-[46px] z-[50] max-h-[62vh] w-[340px] overflow-y-auto rounded-[12px] border border-[#2b2d31] bg-[#161618] p-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                      <p className="mb-[9px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Players</p>
                      <PlayerRangeInputs min={rangeMin} max={rangeMax} onChange={setRange} />
                      <p className="mb-[9px] mt-[16px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Session length</p>
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <span className="text-[14px] text-[#c7c9cb]">Up to</span>
                        <input type="number" min="1" inputMode="numeric" value={sessionFacet?.value ?? ''} onChange={(e) => { const n = parseInt(e.target.value, 10); setSessionMax(!e.target.value || isNaN(n) || n < 1 ? null : n) }} placeholder="hrs" aria-label="Max hours per session" className="h-[34px] w-[64px] rounded-[8px] bg-[#1f1f23] px-[10px] text-center text-[14px] font-semibold text-white outline-none ring-1 ring-white/10 placeholder:font-normal placeholder:text-[#87898c] focus:ring-[#9BF00B] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                        <span className="text-[14px] text-[#c7c9cb]">hrs / session</span>
                        {sessionFacet && <button onClick={() => setSessionMax(null)} className="text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear</button>}
                      </div>
                      <p className="mb-[9px] mt-[16px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Genre</p>
                      <div className="flex flex-wrap gap-[8px]">
                        {ALL_GENRES.map((gname) => {
                          const f = { kind: 'genre', value: gname }
                          return (
                            <button key={gname} onClick={() => toggle(f)} className={'rounded-full px-[12px] py-[6px] text-[13px] font-semibold transition ' + (isOn(f) ? 'bg-white text-black' : 'bg-[#1f1f23] text-[#c7c9cb] hover:bg-[#2a2a2f] hover:text-white')}>{gname}</button>
                          )
                        })}
                      </div>
                      {eActive.length > 0 && (
                        <button onClick={() => setActive([])} className="mt-[16px] text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear all filters</button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Sort menu — order by friend playtime / friends' rating / overall */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={eSortOpen}
                  className="flex h-[38px] items-center gap-[8px] rounded-[8px] bg-[#1a1a1d] px-[14px] text-[14px] font-semibold text-white transition hover:bg-[#232327]"
                >
                  <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6" /></svg>
                  {eSort === 'default' ? 'Sort' : activeSort.label}
                </button>
                {eSortOpen && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => setSortOpen(false)} />
                    <div ref={sortPop} role="menu" aria-label="Sort" aria-orientation="vertical" className="absolute right-0 top-[46px] z-[50] w-[230px] overflow-hidden rounded-[12px] border border-[#2b2d31] bg-[#161618] py-[6px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                      {LIB_SORTS.map((s) => (
                        <button
                          key={s.id}
                          role="menuitem"
                          onClick={() => { setSort(s.id); setSortOpen(false) }}
                          className={'flex w-full items-center justify-between px-[14px] py-[9px] text-left text-[14px] transition hover:bg-white/5 ' + (eSort === s.id ? 'font-semibold text-white' : 'text-[#c7c9cb]')}
                        >
                          {s.label}
                          {eSort === s.id && <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Search box — text search, distinct from the tag filter above */}
              <div className="flex h-[38px] w-[240px] max-w-full items-center gap-[8px] rounded-[8px] bg-[#1a1a1d] px-[12px]">
                <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                <input value={eQ} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
              </div>
            </div>
          </div>

          {/* Active filter chips — click to remove */}
          {eActive.length > 0 && (
            <div className="mt-[18px] flex flex-wrap items-center gap-[8px]">
              {eActive.map((f, i) => (
                <button key={i} onClick={() => toggle(f)} className="flex items-center gap-[6px] rounded-full bg-[#9BF00B]/12 px-[12px] py-[6px] text-[13px] font-semibold text-[#9BF00B] ring-1 ring-inset ring-[#9BF00B]/25 transition hover:bg-[#9BF00B]/20">
                  {facetLabel(f)}
                  <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              ))}
              {/* Add more tags — opens the filter panel */}
              <button onClick={() => setFilterOpen(true)} aria-label="Add more tags" className="flex size-[30px] items-center justify-center rounded-full bg-[#1f1f23] text-[#c7c9cb] transition hover:bg-[#2a2a2f] hover:text-white">
                <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button onClick={() => setActive([])} className="ml-[2px] text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear all</button>
              {/* Bulk actions on the filtered set. */}
              <span className="mx-[2px] h-[18px] w-px bg-white/10" />
              <div className="relative">
                <button onClick={() => setAddPlOpen((v) => !v)} aria-haspopup="menu" aria-expanded={addPlOpen} className="flex items-center gap-[6px] rounded-full bg-[#1f1f23] px-[12px] py-[6px] text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#2a2a2f]">
                  <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
                  Add {shown.length} to PlayList
                </button>
                {addPlOpen && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => setAddPlOpen(false)} />
                    <div role="menu" className="absolute left-0 top-[40px] z-[50] max-h-[240px] w-[240px] overflow-y-auto rounded-[12px] border border-[#2b2d31] bg-[#161618] py-[6px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                      {myLibBlends.length ? myLibBlends.map((b) => (
                        <button key={b.id} role="menuitem" onClick={() => addAllToBlend(b)} className="flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left text-[14px] text-[#dbdee1] transition hover:bg-white/5">
                          <span className="size-[28px] shrink-0 overflow-hidden rounded-[6px] bg-[#2b2d31]" style={b.color ? { backgroundColor: b.color } : undefined}>
                            {b.cover ? <img alt="" src={b.cover} className="size-full object-cover" /> : <span className="grid size-full grid-cols-2 grid-rows-2 gap-[1px]">{mixCoverImages(b).map((src, i) => <img key={i} alt="" src={src} className="size-full object-cover" />)}</span>}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{b.name}</span>
                        </button>
                      )) : <p className="px-[12px] py-[8px] text-[13px] text-[#7e7f87]">You&rsquo;re not in any PlayLists yet.</p>}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => shown.forEach((g) => addToWheel(g.title))} className="flex items-center gap-[6px] rounded-full bg-[#1f1f23] px-[12px] py-[6px] text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#2a2a2f]">
                <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" /><path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" /><path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" /></svg>
                Add {shown.length} to Wheel
              </button>
            </div>
          )}

          <div className="mt-[24px] grid grid-cols-2 gap-x-[18px] gap-y-[24px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((g) => <LibraryTile key={g.title} g={g} onClick={() => open(g)} metric={activeSort.metric ? activeSort.metric(g.catKey) : null} onWishlist={onWishlist} onShare={onShare} />)}
          </div>
          {shown.length === 0 && <p className="mt-[40px] text-center text-[15px] text-[#7e7f87]">No games match your filters.</p>}
        </div>
      </div>
      {eSearchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}
    </main>
  )
}

// ── Blend group page (Figma node 489:2783) ─────────────────────────────────
function FeedRow({ who, text, pre, game, post, when, onOpen }) {
  const names = useNames()
  return (
    <div className="flex items-start gap-[10px]">
      <Avatar color={who} size={28} />
      <p className="flex-1 text-[13px] leading-snug text-[#b5bac1]">
        <span className="font-semibold text-white">{dispName(NAME[who], names)}</span>{' '}
        {game ? (
          <>
            {pre}{' '}
            <button
              onClick={(e) => { e.stopPropagation(); onOpen?.(game) }}
              className="font-semibold text-white underline decoration-white/30 underline-offset-2 transition hover:decoration-white"
            >{game}</button>
            {post}
          </>
        ) : text}
      </p>
      <span className="shrink-0 text-[11px]" style={{ color: when === 'live' ? '#9BF00B' : '#7e7f87' }}>{when}</span>
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
  const menuRef = useRef(null)
  const [openSub, setOpenSub] = useState(null) // index of the submenu opened via keyboard
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
    // Move focus onto the first item so the menu is operable by keyboard the
    // moment it opens (it can be opened from a card's "More" button).
    const raf = requestAnimationFrame(() => { menuRef.current?.querySelector('[data-mi]')?.focus() })
    return () => {
      clearTimeout(id)
      cancelAnimationFrame(raf)
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [onClose])
  // Roving Up/Down/Home/End across the top-level items (data-mi).
  const onMenuKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const els = [...(menuRef.current?.querySelectorAll('[data-mi]') || [])]
    if (!els.length) return
    e.preventDefault()
    const i = els.indexOf(document.activeElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1
      : (i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length
    els[next]?.focus()
  }
  // Open submenu i and move focus into its first option.
  const enterSub = (i) => {
    setOpenSub(i)
    requestAnimationFrame(() => menuRef.current?.querySelector(`[data-sub="${i}"] [role="menuitem"]`)?.focus())
  }
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 220)
  const topY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - (items.length * 40 + 16))
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={onMenuKeyDown}
      className="fixed z-[100] w-[204px] rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
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
        // A submenu opens to the right — on hover (mouse) or via the keyboard
        // (ArrowRight / Enter to open + enter it, ArrowLeft to step back out).
        if (it.submenu) {
          const open = openSub === i
          return (
            <div
              key={i}
              className="group/sub relative"
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub((v) => (v === i ? null : v))}
            >
              <button
                data-mi
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                className={cls}
                onClick={() => (open ? setOpenSub(null) : enterSub(i))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterSub(i) }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); setOpenSub(null) }
                }}
              >{content}</button>
              <div
                data-sub={i}
                className={(open ? 'visible opacity-100 ' : 'invisible opacity-0 ') + 'absolute left-full top-[-6px] z-[71] pl-[6px] transition group-hover/sub:visible group-hover/sub:opacity-100'}
              >
                <div role="menu" aria-orientation="vertical" className="w-[190px] rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                  {it.submenu.map((opt, j) => (
                    <button
                      key={j}
                      role="menuitem"
                      onClick={opt.onClick}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); setOpenSub(null); menuRef.current?.querySelectorAll('[data-mi]')[i]?.focus() }
                        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault(); e.stopPropagation()
                          const opts = [...e.currentTarget.parentElement.querySelectorAll('[role="menuitem"]')]
                          const k = opts.indexOf(e.currentTarget)
                          opts[(k + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length]?.focus()
                        }
                      }}
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
        return <button key={i} data-mi role="menuitem" onClick={it.onClick} className={cls}>{content}</button>
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
    <div className="fixed top-[24px] right-[24px] z-[200] flex items-center gap-[12px] rounded-[12px] border border-[#1c1d21] bg-[#111214] px-[20px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
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
  if (h.onOpen) items.push({ label: 'Open PlayList', icon: PLAY_GLYPH, primary: true, onClick: h.onOpen }, { divider: true })
  items.push(
    { label: 'Rename', icon: EDIT_MENU_GLYPH, onClick: h.onRename },
    { label: 'Change cover art', icon: IMAGE_MENU_GLYPH, onClick: h.onCover },
    { label: pinned ? 'Unpin from sidebar' : 'Pin to sidebar', icon: PIN_MENU_GLYPH, onClick: h.onPin },
    { label: 'Manage members', icon: PEOPLE_MENU_GLYPH, chevron: true, onClick: h.onManage },
    { label: 'Notification Settings', icon: BELL_MENU_GLYPH, sub: notif, submenu: MIX_NOTIF_LEVELS.map((lvl) => ({ label: lvl, active: notif === lvl, onClick: () => h.onSetNotif(lvl) })) },
    { divider: true },
    { label: 'Leave PlayList', icon: LEAVE_MENU_GLYPH, onClick: h.onLeave },
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

// Everything the browser will land Tab focus on. Used by the dialog focus trap
// and by the roving-tabindex widgets to find their members.
const FOCUSABLE_SEL =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
// Visible focusables only — a display:none control (e.g. a not-yet-revealed
// hover button) must never be a trap boundary.
function focusablesIn(node) {
  if (!node) return []
  return [...node.querySelectorAll(FOCUSABLE_SEL)].filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

// Turns any overlay container into an accessible modal dialog:
//   • labels it role="dialog" aria-modal (spread {...dlg.props} on the panel),
//   • moves focus inside on open (to [data-autofocus], else the first control),
//   • traps Tab within it so focus can't wander to the page behind,
//   • closes on Escape,
//   • restores focus to whatever was focused before it opened (the trigger).
// Attach the returned ref to the dialog PANEL (not the backdrop).
function useDialog(onClose, { label, labelledBy } = {}) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const node = ref.current
    const restore = document.activeElement
    // Focus the requested element, else the first control, else the panel.
    const target = node?.querySelector('[data-autofocus]') || focusablesIn(node)[0] || node
    target?.focus?.()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); return }
      if (e.key !== 'Tab' || !node) return
      const els = focusablesIn(node)
      if (!els.length) { e.preventDefault(); node.focus(); return }
      const first = els[0]
      const last = els[els.length - 1]
      const idx = els.indexOf(document.activeElement)
      // idx === -1 means focus is on the dialog container (or something outside
      // the focusable list): Tab → first, Shift+Tab → last. Otherwise wrap the ends.
      if (e.shiftKey && idx <= 0) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (idx === -1 || idx === els.length - 1)) { e.preventDefault(); first.focus() }
    }
    node?.addEventListener('keydown', onKey)
    return () => {
      node?.removeEventListener('keydown', onKey)
      // Return focus to the trigger, if it's still in the document.
      if (restore && restore.focus && document.contains(restore)) restore.focus()
    }
  }, [])
  const props = { role: 'dialog', 'aria-modal': true, tabIndex: -1 }
  if (label) props['aria-label'] = label
  if (labelledBy) props['aria-labelledby'] = labelledBy
  return { ref, props }
}

// A small in-app confirmation dialog (replaces window.confirm so the styling
// matches the rest of the app). `danger` tints the confirm button red.
function ConfirmModal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onClose }) {
  const dlg = useDialog(onClose, { label: title })
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[400px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="px-[24px] pb-[8px] pt-[22px]">
          <p className="text-[20px] font-bold text-white">{title}</p>
          {body && <p className="mt-[8px] text-[15px] leading-snug text-[#b5bac1]">{body}</p>}
        </div>
        <div className="flex items-center justify-end gap-[10px] px-[24px] py-[16px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">{cancelLabel}</button>
          <button data-autofocus onClick={onConfirm} className={'rounded-[8px] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 ' + (danger ? 'bg-[#d83c3e]' : 'bg-[#5765f2]')}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// Keyboard behavior for a toggle-button + popover panel (the filter / sort
// dropdowns). Attach the returned ref to the PANEL. When it opens, focus moves
// to the first option; Escape closes it and returns focus to the toggle; for
// `menu` popovers Up/Down rove the options. Tab still works throughout.
function usePopover(open, onClose, { menu = false } = {}) {
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const node = ref.current
    const raf = requestAnimationFrame(() => {
      const first = node?.querySelector(menu ? '[role="menuitem"]' : FOCUSABLE_SEL)
      first?.focus?.()
    })
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); triggerRef.current?.focus?.(); return }
      if (menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const els = [...(node?.querySelectorAll('[role="menuitem"]') || [])]
        if (!els.length) return
        e.preventDefault()
        const i = els.indexOf(document.activeElement)
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus?.()
      }
    }
    node?.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); node?.removeEventListener('keydown', onKey) }
  }, [open, menu])
  return ref
}

// Pick a cover for a Mix — one of the thumbnail options, an uploaded image, or
// the default collage. Whatever's chosen is saved to the shared Mix, so it
// updates for every member.
function CoverPickerModal({ blend, games, onClose, onSave }) {
  const dlg = useDialog(onClose, { label: 'Change cover image' })
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
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[460px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
  const dlg = useDialog(onClose, { label: 'Rename PlayList' })
  const save = () => { const n = name.trim(); if (n) onSave({ name: n }); onClose() }
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[420px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <h3 className="text-[20px] font-bold text-white">Rename PlayList</h3>
        <input
          value={name}
          autoFocus
          data-autofocus
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
  const dlg = useDialog(onClose, { label: 'Manage members' })
  const toggle = (c) => setSel((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })
  // People who've been sent an invite but haven't accepted/declined yet.
  const invited = new Set(blend.invited || [])
  const isMember = (c) => (blend.members || []).includes(c)
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[420px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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

// The full group PlayList (Figma 863:3952) — every game in the Mix's shared
// list as a numbered, drag-to-rank grid, plus a search to add or remove games.
function PlaylistModal({ blend, keys, onClose, onReorder, onToggle }) {
  const dlg = useDialog(onClose, { label: 'Your PlayList' })
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
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[600px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#17181b] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <h3 className="text-[20px] font-bold text-white">Your PlayList</h3>
            <p className="mt-[2px] text-[13px] text-[#9a9ba3]">Drag to rank</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Search — above the ranking grid */}
        <div className="border-b border-black/30 px-[24px] py-[16px]">
          <p className="text-[12px] font-semibold tracking-wide text-[#9a9ba3]">Search your PlayList</p>
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

        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] py-[18px]">
          {games.length ? (
            <div className="grid grid-cols-3 gap-[14px]">
              {games.map((g, i) => (
                <div
                  key={g.key}
                  data-game={g.title}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
                  onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                  onDrop={() => { reorder(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                  className={
                    'group relative cursor-grab select-none overflow-hidden rounded-[10px] bg-[#101012] ring-2 transition ' +
                    (dragIdx === i ? 'opacity-0 ' : '') +
                    (overIdx === i && dragIdx !== i ? 'ring-[#5765f2]' : 'ring-transparent')
                  }
                >
                  <div className="relative aspect-video bg-[#1a1a1d]">
                    <img alt="" src={g.image} draggable={false} className="size-full object-cover" />
                    <span className="absolute left-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-[6px] bg-black text-[13px] font-bold text-white">{i + 1}</span>
                    <button onClick={() => onToggle(g.key, false)} aria-label="Remove from PlayList" className="absolute right-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-[#f0505b] group-hover:opacity-100 focus-visible:opacity-100">
                      <svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                  <p className="truncate px-[8px] py-[6px] text-[12px] font-semibold text-white">{g.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-[28px] text-center text-[14px] text-[#7e7f87]">No games in this PlayList yet — search above to add some.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Up/down vote control for a PlayList game — taps adjust the net score, which
// re-ranks the list. `mine` is this member's current vote (1/-1/0).
function VoteControl({ score, mine, onUp, onDown, upVoters = [], downVoters = [] }) {
  const btn = (active, activeCls) => 'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] transition ' + (active ? activeCls : 'text-[#9a9ba3] hover:bg-white/10 hover:text-white')
  // Hover tooltip listing who voted this way.
  const tip = (voters, label) => (
    <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-[80] w-max max-w-[180px] -translate-x-1/2 rounded-[7px] bg-black/90 px-[9px] py-[6px] text-left text-[12px] leading-snug text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-opacity duration-150 group-hover/v:opacity-100">
      {voters.length ? (<><span className="font-semibold">{voters.length} {label}</span><br />{voters.join(', ')}</>) : <span className="text-[#b5bac1]">No {label} yet</span>}
    </span>
  )
  return (
    <div className="flex items-center gap-[3px]" onClick={(e) => e.stopPropagation()}>
      <span className="group/v relative">
        <button onClick={(e) => { e.stopPropagation(); onUp() }} aria-label="Upvote" aria-pressed={mine === 1} className={btn(mine === 1, 'bg-[#9BF00B]/25 text-[#9BF00B]')}>
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 11l6-6 6 6" /></svg>
        </button>
        {tip(upVoters, upVoters.length === 1 ? 'upvote' : 'upvotes')}
      </span>
      <span className={'min-w-[20px] text-center text-[14px] font-bold tabular-nums ' + (score > 0 ? 'text-[#9BF00B]' : score < 0 ? 'text-[#f0505b]' : 'text-white')}>{score}</span>
      <span className="group/v relative">
        <button onClick={(e) => { e.stopPropagation(); onDown() }} aria-label="Downvote" aria-pressed={mine === -1} className={btn(mine === -1, 'bg-[#f0505b]/20 text-[#f0505b]')}>
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 13l6 6 6-6" /></svg>
        </button>
        {tip(downVoters, downVoters.length === 1 ? 'downvote' : 'downvotes')}
      </span>
    </div>
  )
}

function BlendPage({ blend, onBack, onDecide, onOpen, onPlay, onShare, onWishlist, onHome, onLibrary, onMixes }) {
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
    e.stopPropagation() // this page has its own PlayList-aware menu; don't also fire the global one
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
  // Add/remove a game from this Mix's shared PlayList (the right-click menu).
  function setPlaylistMembership(title, add) {
    const key = KEY_OF_TITLE[title] || title
    const cur = blend.wishlist || []
    const next = add ? (cur.includes(key) ? cur : [...cur, key]) : cur.filter((k) => k !== key)
    // Record who added each game so the card can credit the real adder.
    const addedBy = { ...(blend.addedBy || {}) }
    if (add) { if (!addedBy[key]) addedBy[key] = SELF_NAME } else { delete addedBy[key] }
    setBlends(blends.map((b) => (b.id === blend.id ? { ...b, wishlist: next, addedBy } : b)))
    setMenu(null)
  }
  // Mix cover right-click menu + its editor modals.
  const [coverMenu, setCoverMenu] = useState(null) // { x, y }
  const [coverPicker, setCoverPicker] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const patchBlend = (patch) => setBlends(blends.map((b) => (b.id === blend.id ? { ...b, ...patch } : b)))
  function leaveMix() { setConfirmLeave(true) }
  function doLeaveMix() {
    patchBlend({ members: blend.members.filter((c) => c !== SELF) })
    setConfirmLeave(false)
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
    { who: SELF, pre: 'PlayListed', game: g(2).title, when: '1h' },
    { who: m[1] || SELF, pre: 'finished', game: g(0).title, post: ' and left it five stars', when: '2h' },
    { who: m[2] || m[1] || SELF, pre: 'is in a', game: g(1).title, post: ' lobby — one seat open', when: 'live' },
    { who: SELF, pre: 'added', game: g(3).title, post: ' to the group list', when: 'yest' },
    { who: m[1] || SELF, text: `pinned ${blend.when} as their free window`, when: '2d' },
  ]

  // Rankable group wishlist — shared. Dragging reorders blend.wishlist for
  // everyone in the room (writes the new order to the realtime DB).
  // The PlayList is exactly what the group curates — empty until they add games.
  const wishKeys = blend.wishlist || []
  const wish = wishKeys.map((k) => (CATALOG[k] ? { key: k, ...CATALOG[k] } : null)).filter(Boolean)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  // ── Group voting + sort/filter (replaces drag-to-rank) ───────────────────
  // Each game carries a deterministic base score; up/down taps add a delta and
  // the list auto-ranks by the net score. `myVote` tracks this member's tap so
  // it can be toggled off.
  // Votes are shared: votes/{blendId} = { [gameKey]: { [member]: 1 | -1 } }, so
  // every member sees the live tally and who cast each vote.
  const [voteData, setVoteData] = useRoomNode('votes/' + blend.id, {})
  const votesFor = (key) => voteData[key] || {}
  const myVoteFor = (key) => votesFor(key)[SELF_NAME] || 0
  const [plSort, setPlSort] = useState('votes')
  const [plSortOpen, setPlSortOpen] = useState(false)
  const [plGenres, setPlGenres] = useState([])    // genre filter facets
  const [plRange, setPlRange] = useState(null)     // { min, max } player range
  const [plSession, setPlSession] = useState(null) // max hours / session
  const [plFilterOpen, setPlFilterOpen] = useState(false)
  const plSortPop = usePopover(plSortOpen, () => setPlSortOpen(false), { menu: true })
  const plFilterPop = usePopover(plFilterOpen, () => setPlFilterOpen(false))
  const setPlPlayerRange = (min, max) => setPlRange(min == null && max == null ? null : { min, max })
  const plFilterCount = plGenres.length + (plRange ? 1 : 0) + (plSession ? 1 : 0)
  // A game starts with no votes; its score is the sum of every member's vote.
  const scoreOf = (key) => Object.values(votesFor(key)).reduce((s, v) => s + (v || 0), 0)
  const applyVote = (key, dir) => {
    if (IS_SPECTATE) return
    const cur = myVoteFor(key)
    const next = cur === dir ? 0 : dir
    const forKey = { ...votesFor(key) }
    if (next === 0) delete forKey[SELF_NAME]; else forKey[SELF_NAME] = next
    setVoteData({ ...voteData, [key]: forKey })
  }
  // Same sort menu the Library offers, plus the group's own vote ranking.
  const PL_SORTS = [
    { id: 'votes', label: 'Top voted' },
    { id: 'az', label: 'A to Z' },
    { id: 'hours', label: 'Avg friend playtime' },
    { id: 'session', label: 'Session length' },
    { id: 'friends', label: "Friend's rating" },
    { id: 'overall', label: 'Overall rating' },
  ]
  // Playlist display — grid (4 per row) or list, with an expand/collapse after
  // four rows.
  const [playlistView, setPlaylistView] = useState('grid')
  const [playlistExpanded, setPlaylistExpanded] = useState(false)
  // Search across all games: matching games already in the Mix get highlighted,
  // matching games that aren't get an "Add" option.
  const [playlistSearch, setPlaylistSearch] = useState('')
  // The card under the pointer, so the moderator's mirror can force-reveal it.
  const [hover, setHover] = useState(null)

  // Extend the spectate mirror with this page's PlayList view state + hovered
  // card (published alongside the menus above via a second effect so both stay
  // in sync). Read back below and used throughout the render in spectate.
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/blendUI2`, { blendId: blend.id, playlistView, playlistExpanded, playlistSearch: playlistSearch || '', hover: hover || null, launching: launching || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blend.id, playlistView, playlistExpanded, playlistSearch, hover, launching])
  const [bUI2] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/blendUI2` : 'spectate/__nobui2', {})
  const bui2 = IS_SPECTATE && bUI2?.blendId === blend.id ? bUI2 : null
  const ePlaylistView = IS_SPECTATE ? (bui2?.playlistView || 'grid') : playlistView
  const ePlaylistExpanded = IS_SPECTATE ? !!bui2?.playlistExpanded : playlistExpanded
  const ePlaylistSearch = IS_SPECTATE ? (bui2?.playlistSearch || '') : playlistSearch
  // See the note in Content: live view never force-reveals by title (that would
  // light up a second card for the same game). Only the spectate mirror echoes.
  const eHover = IS_SPECTATE ? (bui2?.hover ?? null) : null
  const eLaunching = IS_SPECTATE ? (bui2?.launching ?? null) : launching

  const PLAYLIST_LIMIT = ePlaylistView === 'grid' ? 16 : 4 // four rows either way
  const plAllGenres = [...new Set(wish.map((g) => g.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const plFiltered = wish.filter((g) =>
    (plGenres.length === 0 || plGenres.includes(g.genre)) &&
    (!plRange || playerRangeOverlaps(g.players, plRange.min, plRange.max)) &&
    (!plSession || sessionHours(g.key) <= plSession))
  const plList = [...plFiltered].sort((a, b) =>
    plSort === 'az' ? (a.title || '').localeCompare(b.title || '')
    : plSort === 'hours' ? (avgFriendHours(b.key) - avgFriendHours(a.key))
    : plSort === 'session' ? (sessionHours(a.key) - sessionHours(b.key))
    : plSort === 'friends' ? (friendsRating(b.key) - friendsRating(a.key))
    : plSort === 'overall' ? (overallRating(b.key) - overallRating(a.key))
    : (scoreOf(b.key) - scoreOf(a.key)))
  const wishShown = ePlaylistExpanded ? plList : plList.slice(0, PLAYLIST_LIMIT)
  // Who added each game. Prefer the recorded adder (blend.addedBy, written on add);
  // fall back to a stable per-(blend,game) guess from the members for legacy games.
  const guessColor = (key) => { const pool = m.length ? m : [SELF]; return pool[ratingHash(blend.id + key, 'addedby') % pool.length] }
  const adderColor = (key) => { const rec = blend.addedBy?.[key]; return rec ? (COLOR_OF[rec] || guessColor(key)) : guessColor(key) }
  const adderName = (key) => { const rec = blend.addedBy?.[key]; return capName((rec || NAME[guessColor(key)]) || 'a member') }
  // Who voted which way — read live from the shared vote data. Powers the tooltips.
  const voterNames = (key, dir) => {
    const forKey = votesFor(key)
    return Object.keys(forKey).filter((n) => forKey[n] === dir).map((n) => (n === SELF_NAME ? 'You' : capName(n)))
  }
  // When the list is ranked by a play-stat, surface that stat on each card.
  const showSortMeta = plSort === 'hours' || plSort === 'session' || plSort === 'friends' || plSort === 'overall'
  const sortRating = (key) => plSort === 'overall' ? `${overallRating(key)}% overall` : `${friendsRating(key)}% friends`
  const q = ePlaylistSearch.trim().toLowerCase()
  const isHit = (title) => !!q && title.toLowerCase().includes(q)
  const searchAddable = q
    ? Object.entries(CATALOG)
        .filter(([k, v]) => v.title.toLowerCase().includes(q) && !wishKeys.includes(k))
        .slice(0, 6)
        .map(([k, v]) => ({ key: k, title: v.title, image: v.image }))
    : []
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
      {/* Top nav — same Home / Library / Mixes header as the other pages */}
      <PageNav onHome={onHome} onLibrary={onLibrary} onMixes={onMixes} onBack={onBack} />
      {/* The gutters live on the inner wrappers (not the scroll container) so
          the banner and the wheel band can bleed to the pane's edges. */}
      <div
        className="no-scrollbar flex-1 overflow-y-auto pb-[80px]"
        onMouseOver={IS_LIVE ? (e) => { const el = e.target.closest?.('[data-game]'); setHover(el ? el.getAttribute('data-game') : null) } : undefined}
        onMouseLeave={IS_LIVE ? () => setHover(null) : undefined}
      >
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
              PlayList below it, so the header isn't crowded against the frame. */}
          <div className="relative mx-auto w-full max-w-[1280px] px-[40px] pb-[40px] pt-[74px]">

          {/* Header — cover quad + name + members on the left, group-activity
              panel on the right. Both live inside the heading so the activity
              box no longer overlaps the divider below. */}
          <div className="flex items-start gap-[32px]">
            <div className="flex min-w-0 flex-1 items-center gap-[28px]">
            <div
              onClick={() => setCoverPicker(true)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCoverMenu({ x: e.clientX, y: e.clientY }) }}
              title="Click to change the cover art (right-click for more)"
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
              {/* Clicking the cover goes straight to Change cover art. */}
              <button
                onClick={(e) => { e.stopPropagation(); setCoverPicker(true) }}
                title="Change cover art"
                aria-label="Change cover art"
                className="absolute bottom-[8px] right-[8px] flex size-[34px] items-center justify-center rounded-full bg-black/70 text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur transition hover:bg-black/85 group-hover/cover:opacity-100 focus-visible:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" /><path d="M5 18l5-5 4 4 2-2 3 3" /></svg>
              </button>
            </div>
            <div>
              {/* The edit affordance flows inline after the title text, so it sits
                  wherever the (possibly wrapping) title ends. */}
              <h1 className="text-[52px] font-semibold leading-[1.05] tracking-tight text-white">
                {blend.name}
                <button
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCoverMenu({ x: r.left, y: r.bottom + 6 }) }}
                  title="Edit this PlayList"
                  aria-label="Edit this PlayList"
                  className="ml-[14px] inline-flex size-[36px] translate-y-[3px] items-center justify-center rounded-full bg-white/10 align-middle text-white transition hover:bg-white/20"
                >
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
              </h1>
              <div className="mt-[16px] flex flex-wrap items-center gap-[10px] text-[18px] text-[#e7e7e7]">
                A PlayList of games for
                <span className="flex items-center">
                  {blend.members.map((c, i) => (
                    <MemberChip key={i} color={c} size={30} marginRight={i < blend.members.length - 1 ? -10 : 0} />
                  ))}
                </span>
                {/* Pending invites — people invited who haven't accepted yet.
                    Grayed out, hoverable for their name + pending status. */}
                {(() => {
                  const pend = (blend.invited || []).filter((c) => !(blend.members || []).includes(c))
                  if (!pend.length) return null
                  return (
                    <span className="flex items-center">
                      {pend.map((c, i) => (
                        <MemberChip key={i} color={c} size={30} marginRight={i < pend.length - 1 ? -10 : 0} pending />
                      ))}
                    </span>
                  )
                })()}
              </div>
            </div>
            </div>

            {/* Group activity — now lives in the header, to the right of the
                title, so it clears the divider below. Shows three rows. */}
            <aside className="hidden w-[340px] shrink-0 self-stretch lg:block">
              <div className="h-full rounded-[16px] border border-white/10 bg-[#121214]/95 p-[18px] backdrop-blur">
                <p className="text-[16px] font-semibold text-white">What the group members are doing</p>
                <p className="mt-[2px] text-[12px] text-[#7e7f87]">Activity only shows this group.</p>
                <div className="mt-[18px] flex flex-col gap-[16px]">
                  {feed.slice(0, 3).map((f, i) => <FeedRow key={i} {...f} onOpen={onOpen} />)}
                </div>
              </div>
            </aside>
          </div>

          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-[40px]">
          {/* The band carries its own green edges now, so this stays neutral. */}
          <div className="my-[28px] h-px" style={{ backgroundColor: '#1c1d21' }} />

          <div className="flex gap-[32px]">
            {/* Main column — the group's Mix (playlist) + daily recommended.
                Spans the full width now that group activity moved to the header. */}
            <div className="min-w-0 flex-1">
              {/* The Mix (this group's playlist) — grid (4/row) or list, expandable */}
              <section>
                {/* Search + Filters + Sort in one row, like the Library page. The
                    search finds/adds games; Filters (genre + player range) and Sort
                    narrow and rank the list. */}
                <div className="relative z-[30] mb-[18px] flex flex-wrap items-center gap-[10px]">
                  <div className="relative min-w-[240px] flex-1">
                    <div className="kbd-ring flex items-center gap-[10px] rounded-[10px] bg-[#151517] px-[14px] py-[10px] ring-1 ring-white/5">
                      <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                      <input value={ePlaylistSearch} onChange={(e) => setPlaylistSearch(e.target.value)} placeholder="Search games to find or add to this PlayList" className="w-full bg-transparent text-[14px] text-white placeholder:text-[#87898c] focus:outline-none" />
                      {ePlaylistSearch && (
                        <button onClick={() => setPlaylistSearch('')} aria-label="Clear search" className="shrink-0 text-[#87898c] transition hover:text-white">
                          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      )}
                    </div>
                    {/* Add-a-game results for games not already in the PlayList */}
                    {q && searchAddable.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[12px] border border-[#2b2d31] bg-[#1a1a1d] shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
                        <p className="px-[14px] pb-[6px] pt-[10px] text-[11px] font-semibold uppercase tracking-wide text-[#7e7f87]">Not in this PlayList — add one</p>
                        {searchAddable.map((g) => (
                          <button key={g.key} onClick={() => { setPlaylistMembership(g.title, true); setPlaylistSearch('') }} className="flex w-full items-center gap-[12px] px-[14px] py-[9px] text-left transition hover:bg-white/[0.05]">
                            <img alt="" src={g.image} className="h-[36px] w-[64px] shrink-0 rounded-[6px] object-cover" />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{g.title}</span>
                            <span className="flex items-center gap-[5px] text-[13px] font-semibold text-[#9BF00B]">
                              <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                              Add
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Filters — genre chips + player range (same as the Library) */}
                  <div className="relative">
                    <button onClick={() => setPlFilterOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={plFilterOpen} className="flex h-[42px] items-center gap-[8px] rounded-[10px] bg-[#151517] px-[14px] text-[14px] font-semibold text-white ring-1 ring-white/5 transition hover:bg-[#1d1d20]">
                      <svg viewBox="0 0 24 24" className="size-[15px]" fill="currentColor"><path d="M3 5.5h18a1 1 0 0 1 .8 1.6l-6.3 8.2V20a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 10.5 18.5v-3.2L2.2 7.1A1 1 0 0 1 3 5.5z" /></svg>
                      Filters
                      {plFilterCount > 0 && <span className="rounded-full bg-white/15 px-[7px] py-[1px] text-[12px] font-bold">{plFilterCount}</span>}
                    </button>
                    {plFilterOpen && (
                      <>
                        <div className="fixed inset-0 z-[40]" onClick={() => setPlFilterOpen(false)} />
                        <div ref={plFilterPop} role="dialog" aria-label="Filter PlayList" className="absolute right-0 top-[48px] z-[50] max-h-[62vh] w-[320px] overflow-y-auto rounded-[12px] border border-[#2b2d31] bg-[#161618] p-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                          <p className="mb-[9px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Players</p>
                          <PlayerRangeInputs min={plRange?.min ?? null} max={plRange?.max ?? null} onChange={setPlPlayerRange} />
                          <p className="mb-[9px] mt-[16px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Session length</p>
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <span className="text-[14px] text-[#c7c9cb]">Up to</span>
                            <input type="number" min="1" inputMode="numeric" value={plSession ?? ''} onChange={(e) => { const n = parseInt(e.target.value, 10); setPlSession(!e.target.value || isNaN(n) || n < 1 ? null : n) }} placeholder="hrs" aria-label="Max hours per session" className="h-[34px] w-[64px] rounded-[8px] bg-[#1f1f23] px-[10px] text-center text-[14px] font-semibold text-white outline-none ring-1 ring-white/10 placeholder:font-normal placeholder:text-[#87898c] focus:ring-[#9BF00B] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                            <span className="text-[14px] text-[#c7c9cb]">hrs / session</span>
                          </div>
                          <p className="mb-[9px] mt-[16px] text-[12px] font-bold uppercase tracking-wide text-[#87898c]">Genre</p>
                          {plAllGenres.length ? (
                            <div className="flex flex-wrap gap-[8px]">
                              {plAllGenres.map((gn) => {
                                const on = plGenres.includes(gn)
                                return <button key={gn} onClick={() => setPlGenres((cur) => on ? cur.filter((x) => x !== gn) : [...cur, gn])} className={'rounded-full px-[12px] py-[6px] text-[13px] font-semibold transition ' + (on ? 'bg-white text-black' : 'bg-[#1f1f23] text-[#c7c9cb] hover:bg-[#2a2a2f] hover:text-white')}>{gn}</button>
                              })}
                            </div>
                          ) : <p className="text-[13px] text-[#7e7f87]">No games to filter yet.</p>}
                          {plFilterCount > 0 && <button onClick={() => { setPlGenres([]); setPlRange(null); setPlSession(null) }} className="mt-[16px] text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear filters</button>}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Sort */}
                  <div className="relative">
                    <button onClick={() => setPlSortOpen((v) => !v)} aria-haspopup="menu" aria-expanded={plSortOpen} className="flex h-[42px] items-center gap-[8px] rounded-[10px] bg-[#151517] px-[14px] text-[14px] font-semibold text-white ring-1 ring-white/5 transition hover:bg-[#1d1d20]">
                      <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6" /></svg>
                      {PL_SORTS.find((s) => s.id === plSort)?.label}
                    </button>
                    {plSortOpen && (
                      <>
                        <div className="fixed inset-0 z-[40]" onClick={() => setPlSortOpen(false)} />
                        <div ref={plSortPop} role="menu" aria-label="Sort PlayList" aria-orientation="vertical" className="absolute right-0 top-[48px] z-[50] w-[220px] overflow-hidden rounded-[12px] border border-[#2b2d31] bg-[#161618] py-[6px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                          {PL_SORTS.map((s) => (
                            <button key={s.id} role="menuitem" onClick={() => { setPlSort(s.id); setPlSortOpen(false) }} className={'flex w-full items-center justify-between px-[14px] py-[9px] text-left text-[14px] transition hover:bg-white/5 ' + (plSort === s.id ? 'font-semibold text-white' : 'text-[#c7c9cb]')}>
                              {s.label}
                              {plSort === s.id && <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* List / grid view toggle */}
                  <div className="flex items-center gap-[2px] rounded-[9px] bg-[#151517] p-[3px]">
                    <button onClick={() => setPlaylistView('list')} aria-label="List view" className={'flex size-[30px] items-center justify-center rounded-[6px] transition ' + (ePlaylistView === 'list' ? 'bg-[#2b2d31] text-white' : 'text-[#9a9ba3] hover:text-white')}>
                      <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                    </button>
                    <button onClick={() => setPlaylistView('grid')} aria-label="Grid view" className={'flex size-[30px] items-center justify-center rounded-[6px] transition ' + (ePlaylistView === 'grid' ? 'bg-[#2b2d31] text-white' : 'text-[#9a9ba3] hover:text-white')}>
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                    </button>
                  </div>
                </div>

                {/* Active filter pills (on-brand, subtle) + bulk Add-to-Wheel. */}
                {plFilterCount > 0 && (
                  <div className="mb-[12px] flex flex-wrap items-center gap-[8px]">
                    {plGenres.map((gn) => (
                      <button key={gn} onClick={() => setPlGenres((cur) => cur.filter((x) => x !== gn))} className="flex items-center gap-[6px] rounded-full bg-[#9BF00B]/12 px-[12px] py-[6px] text-[13px] font-semibold text-[#9BF00B] ring-1 ring-inset ring-[#9BF00B]/25 transition hover:bg-[#9BF00B]/20">
                        {gn}
                        <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    ))}
                    {plRange && (
                      <button onClick={() => setPlRange(null)} className="flex items-center gap-[6px] rounded-full bg-[#9BF00B]/12 px-[12px] py-[6px] text-[13px] font-semibold text-[#9BF00B] ring-1 ring-inset ring-[#9BF00B]/25 transition hover:bg-[#9BF00B]/20">
                        {facetLabel({ kind: 'range', min: plRange.min, max: plRange.max })}
                        <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    )}
                    {plSession && (
                      <button onClick={() => setPlSession(null)} className="flex items-center gap-[6px] rounded-full bg-[#9BF00B]/12 px-[12px] py-[6px] text-[13px] font-semibold text-[#9BF00B] ring-1 ring-inset ring-[#9BF00B]/25 transition hover:bg-[#9BF00B]/20">
                        ≤ {plSession} hrs / session
                        <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    )}
                    <button onClick={() => { setPlGenres([]); setPlRange(null); setPlSession(null) }} className="ml-[2px] text-[13px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear all</button>
                    <span className="mx-[2px] h-[18px] w-px bg-white/10" />
                    <button onClick={() => plList.forEach((g) => addToWheel(g.title))} className="flex items-center gap-[6px] rounded-full bg-[#1f1f23] px-[12px] py-[6px] text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#2a2a2f]">
                      <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7.5" /><circle cx="12" cy="10" r="1.5" /><path d="M12 2.5v15M4.5 10h15M6.7 4.7l10.6 10.6M17.3 4.7 6.7 15.3" /><path d="M8.5 21.5 12 10l3.5 11.5M7 21.5h10" /></svg>
                      Add {plList.length} to Wheel
                    </button>
                  </div>
                )}
                {wish.length > 0 && (
                  <p className="mb-[14px] text-[13px] text-[#7e7f87]">
                    {plList.length === wish.length ? `${wish.length} games` : `${plList.length} / ${wish.length} games`}
                  </p>
                )}
                {wish.length === 0 ? (
                  <button onClick={() => setPlaylistOpen(true)} className="flex w-full items-center gap-[14px] rounded-[14px] border border-dashed border-[#2b2d31] px-[20px] py-[22px] text-left transition hover:border-[#5765f2] hover:bg-white/[0.02]">
                    <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#5765f2]/15 text-[#8b95ff]">
                      <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                    <span>
                      <span className="block text-[16px] font-semibold text-white">This PlayList is empty</span>
                      <span className="block text-[13px] text-[#9a9ba3]">Right-click a game below to add the ones your group wants to play.</span>
                    </span>
                  </button>
                ) : plList.length === 0 ? (
                  <p className="rounded-[12px] bg-[#151517] py-[28px] text-center text-[14px] text-[#9a9ba3]">No games match the filter.</p>
                ) : ePlaylistView === 'grid' ? (
                  <div className="grid grid-cols-4 gap-[20px]">
                    {wishShown.map((g, i) => (
                      <div
                        key={g.key}
                        onClick={() => onOpen?.(g.title)}
                        onContextMenu={(e) => openMenu(e, g.title)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${g.title}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(g.title) } }}
                        className={'cursor-pointer select-none rounded-[14px] p-[6px] ring-2 transition ' + (isHit(g.title) ? 'ring-[#9BF00B] [box-shadow:0_0_0_3px_#9BF00B,0_0_28px_5px_rgba(155,240,11,0.6)]' : 'ring-transparent')}
                      >
                        <div className="relative aspect-video overflow-hidden rounded-[12px] bg-[#1a1a1d]">
                          <img alt="" src={g.image} className="size-full object-cover" />
                          <span className="absolute left-[10px] top-[10px] flex size-[30px] items-center justify-center rounded-[9px] bg-black/70 text-[15px] font-bold text-white backdrop-blur">{i + 1}</span>
                          {/* Who added this game — profile + name, bottom-left. */}
                          <span title={`Added by ${adderName(g.key)}`} className="absolute bottom-[8px] left-[8px] flex max-w-[calc(100%-16px)] items-center gap-[6px] rounded-full bg-black/65 py-[3px] pl-[3px] pr-[10px] backdrop-blur">
                            <Avatar color={adderColor(g.key)} size={18} />
                            <span className="truncate text-[11px] font-semibold text-white">{adderName(g.key)}</span>
                          </span>
                        </div>
                        <div className="mt-[10px] flex items-center gap-[8px]">
                          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-white">{g.title}</p>
                          <VoteControl score={scoreOf(g.key)} mine={myVoteFor(g.key)} onUp={() => applyVote(g.key, 1)} onDown={() => applyVote(g.key, -1)} upVoters={voterNames(g.key, 1)} downVoters={voterNames(g.key, -1)} />
                        </div>
                        {/* Ranked-by stat: session length, or avg friend playtime + rating. */}
                        {showSortMeta && (
                          <div className="mt-[3px] flex items-center gap-[7px] text-[12px] text-[#9a9ba3]">
                            {plSort === 'session' ? (
                              <span className="inline-flex items-center gap-[3px]"><svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>~{sessionHours(g.key)} hrs / session</span>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-[3px]"><svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>~{avgFriendHours(g.key)}h avg</span>
                                <span className="text-[#4a4d55]">·</span>
                                <span>{sortRating(g.key)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-[10px]">
                    {wishShown.map((g, i) => (
                      <div
                        key={g.key}
                        onClick={() => onOpen?.(g.title)}
                        onContextMenu={(e) => openMenu(e, g.title)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${g.title}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(g.title) } }}
                        className={'group flex cursor-pointer select-none items-center gap-[16px] rounded-[12px] p-[8px] ring-2 transition hover:bg-[#151517] ' + (isHit(g.title) ? 'ring-[#9BF00B] [box-shadow:0_0_0_3px_#9BF00B,0_0_28px_5px_rgba(155,240,11,0.6)]' : 'ring-transparent')}
                      >
                        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] bg-white/10 text-[14px] font-bold text-white">{i + 1}</span>
                        <div className="h-[68px] w-[121px] shrink-0 overflow-hidden rounded-[10px] bg-[#1a1a1d]">
                          <img alt="" src={g.image} className="size-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-semibold text-white">{g.title}</p>
                          <p className="truncate text-[13px] text-[#7e7f87]">{capName(g.genre || 'game')} · {g.players} players</p>
                          <span title={`Added by ${adderName(g.key)}`} className="mt-[4px] inline-flex items-center gap-[5px] text-[12px] text-[#9a9ba3]">
                            <Avatar color={adderColor(g.key)} size={16} />
                            <span className="truncate">Added by {adderName(g.key)}</span>
                          </span>
                        </div>
                        {showSortMeta && (
                          <div className="hidden shrink-0 flex-col items-end text-[12px] text-[#9a9ba3] sm:flex">
                            {plSort === 'session' ? (
                              <span>~{sessionHours(g.key)} hrs / session</span>
                            ) : (
                              <>
                                <span>~{avgFriendHours(g.key)}h avg</span>
                                <span>{sortRating(g.key)}</span>
                              </>
                            )}
                          </div>
                        )}
                        <VoteControl score={scoreOf(g.key)} mine={myVoteFor(g.key)} onUp={() => applyVote(g.key, 1)} onDown={() => applyVote(g.key, -1)} upVoters={voterNames(g.key, 1)} downVoters={voterNames(g.key, -1)} />
                      </div>
                    ))}
                  </div>
                )}

                {plList.length > PLAYLIST_LIMIT && (
                  <button onClick={() => setPlaylistExpanded((v) => !v)} className="mt-[16px] flex items-center gap-[6px] rounded-[8px] border border-[#2b2d31] px-[16px] py-[8px] text-[13px] font-semibold text-white transition hover:bg-white/[0.04]">
                    {ePlaylistExpanded ? 'Collapse' : `Expand (${plList.length - PLAYLIST_LIMIT} more)`}
                    <svg viewBox="0 0 24 24" className={'size-[15px] transition ' + (ePlaylistExpanded ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                )}
              </section>

              {/* Recommended carousel — extra top gap separates it from the
                  PlayList grid above. */}
              <section className="mt-[200px]">
                <ShelfRow title="Recommended for this PlayList" padTop={30}>
                  {blend.games.map((k) => (
                    <CinematicCard key={k} {...cineCard(k)} mini onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} forceReveal={!!eHover && eHover === (CATALOG[k]?.title || STARTER_BY_KEY[k]?.title)} />
                  ))}
                </ShelfRow>
              </section>
            </div>
          </div>
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
              ? { label: 'Remove from PlayList', icon: REMOVE_MENU_GLYPH, onClick: () => setPlaylistMembership(eMenu.title, false) }
              : { label: 'Add to PlayList', icon: BOOKMARK_MENU_GLYPH, onClick: () => setPlaylistMembership(eMenu.title, true) },
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
      {eLaunching && <LaunchToast title={eLaunching} onDone={() => setLaunching(null)} />}
      {confirmLeave && (
        <ConfirmModal
          title="Leave this PlayList?"
          body={`Are you sure you want to leave ${blend.name}? You can be re-invited later.`}
          confirmLabel="Leave PlayList"
          danger
          onConfirm={doLeaveMix}
          onClose={() => setConfirmLeave(false)}
        />
      )}
    </main>
  )
}

// ── Create a "Blend" modal (Figma node 531:2105) ───────────────────────────
// Game search — a command-palette-style overlay that filters the catalog and
// opens a game's detail page on select (Enter picks the top result).
function SearchModal({ onClose, onOpen }) {
  const [q, setQ] = useState('')
  const dlg = useDialog(onClose, { label: 'Search games' })
  const query = q.trim().toLowerCase()
  const results = Object.entries(CATALOG)
    .filter(([, v]) => !query || v.title.toLowerCase().includes(query) || (v.genre || '').toLowerCase().includes(query))
    .slice(0, 8)
  const pick = (title) => { onOpen(title); onClose() }
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 p-4 pt-[12vh]" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[560px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-[12px] border-b border-black/20 px-[18px] py-[14px]">
          <svg viewBox="0 0 24 24" className="size-[20px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <input
            autoFocus
            data-autofocus
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
  // Caleb / Sauhee / Meera are on Arcade (selectable for a Mix); OFF_ARCADE
  // friends aren't yet and get a Gift button.
  const sorted = friends.filter((d) => !query || capName(d.name).toLowerCase().includes(query))
  const offArcade = OFF_ARCADE_FRIENDS.filter((d) => !query || capName(d.name).toLowerCase().includes(query))
  const dlg = useDialog(onClose, { label: 'Who’s on ARCADE' })
  const [dupMix, setDupMix] = useState(null)
  const toggle = (n) => { setDupMix(null); setSel((s) => ({ ...s, [n]: !s[n] })) }
  // Both on-Arcade friends and not-yet-on-Arcade friends can be selected into a
  // Mix; the not-yet ones just get a "get Nitro first" invite unless gifted.
  const offSet = new Set(OFF_ARCADE_FRIENDS.map((f) => f.name))
  const chosen = [...friends, ...OFF_ARCADE_FRIENDS].filter((f) => sel[f.name])
  function createMix() {
    if (!chosen.length) return
    // A group can have multiple Mixes (each is a separate playlist), so no
    // duplicate-group check here.
    // Default to a playful, personality-based name instead of listing usernames.
    const name = funnyMixName()
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
      // Not on Arcade and not gifted → they need to get Nitro first.
      needsNitro: offSet.has(f.name) && !gifted[f.name],
    }))
    onCreated?.(newBlend.id)
  }
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[460px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Who’s on ARCADE</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Pick who to start a PlayList with.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-[24px] pt-[16px]">
          <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input autoFocus data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] pb-[16px] pt-[10px]">
          {sorted.length === 0 && offArcade.length === 0 && <p className="py-[6px] text-[13px] text-[#6f7276]">No friends match “{q}”.</p>}
          {/* On ARCADE — selectable for a Mix. The status dot is green only when
              they're actually on a call (in the room); otherwise Offline. */}
          {sorted.map((f) => {
            const on = !!sel[f.name]
            const isOnline = online.includes(f.name)
            return (
              <button key={f.name} onClick={() => toggle(f.name)} className="flex w-full items-center gap-[12px] py-[8px] text-left">
                <span className="relative shrink-0">
                  <Avatar color={f.color} size={40} />
                  <span className="absolute -bottom-[1px] -right-[1px] size-[13px] rounded-full ring-[3px] ring-[#2b2d31]" style={{ backgroundColor: isOnline ? '#9BF00B' : '#80848e' }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{capName(f.name)}</p>
                  <p className="text-[13px]" style={{ color: isOnline ? '#9BF00B' : '#80848e' }}>{isOnline ? 'On Arcade' : 'Offline'}</p>
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
          {offArcade.map((f) => {
            const on = !!sel[f.name]
            return (
              <div
                key={f.name}
                onClick={() => toggle(f.name)}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${capName(f.name)} — ${on ? 'selected' : 'not selected'}`}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(f.name) } }}
                className="flex w-full cursor-pointer items-center gap-[12px] rounded-[8px] py-[8px]"
              >
                <span className="relative shrink-0">
                  <Avatar color={f.color} size={40} />
                  <span className="absolute -bottom-[1px] -right-[1px] size-[13px] rounded-full ring-[3px] ring-[#2b2d31]" style={{ backgroundColor: '#80848e' }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{capName(f.name)}</p>
                  <p className="text-[13px]" style={{ color: gifted[f.name] ? '#9BF00B' : '#80848e' }}>
                    {gifted[f.name] ? 'Nitro gift sent' : on ? 'Will be asked to subscribe' : 'Not on Arcade'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setGifted((g) => ({ ...g, [f.name]: !g[f.name] })) }}
                  className={'flex shrink-0 items-center gap-[6px] rounded-[8px] px-[12px] py-[7px] text-[13px] font-semibold text-white transition ' + (gifted[f.name] ? 'bg-[#3a3d41]' : 'bg-[#5765f2] hover:brightness-110')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]"><path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" /></svg>
                  {gifted[f.name] ? 'Gifting' : 'Gift'}
                </button>
                <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (on ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
                  {on && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
                </span>
              </div>
            )
          })}
        </div>
        {dupMix && (
          <div className="mx-[24px] mb-[2px] mt-[4px] flex items-center justify-between gap-[10px] rounded-[8px] bg-[#f0505b]/12 px-[12px] py-[10px]">
            <p className="text-[13px] text-[#f0a0a6]">You already have a PlayList with these people — <span className="font-semibold text-white">{dupMix.name}</span>.</p>
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
            Create a PlayList{chosen.length ? ` with ${chosen.length}` : ''}
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
  const dlg = useDialog(onClose, { label: 'Gift Nitro' })
  const query = q.trim().toLowerCase()
  const list = OFF_ARCADE_FRIENDS.filter((f) => !query || capName(f.name).toLowerCase().includes(query))
  const toggle = (n) => setSel((s) => ({ ...s, [n]: !s[n] }))
  const chosen = OFF_ARCADE_FRIENDS.filter((f) => sel[f.name])
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[460px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Gift Nitro</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Pick friends who aren’t on Arcade yet.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="px-[24px] pt-[16px]">
          <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input autoFocus data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
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
  const dlg = useDialog(onClose, { label: 'Create a PlayList' })
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const [nameOverride, setNameOverride] = useState(null)
  const [dupMix, setDupMix] = useState(null)
  // A playful default name, generated once, so it's stable while the modal is open.
  const [funnyDefault] = useState(funnyMixName)
  const toggleSel = (name) => { setDupMix(null); setSel((s) => ({ ...s, [name]: !s[name] })) }
  const selectedFriends = friends.filter((f) => sel[f.name])
  const selectedNames = selectedFriends.map((f) => cap(f.name))
  const anySelected = selectedNames.length > 0
  // Default to a playful, personality-based name instead of listing usernames;
  // the creator can still type their own (nameOverride).
  const blendName = nameOverride !== null ? nameOverride : funnyDefault
  function createBlend() {
    // A group can have multiple Mixes (each is a separate playlist).
    const name = (blendName || 'New PlayList').trim()
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
        ref={dlg.ref}
        {...dlg.props}
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-full overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
      >
        <div className="p-[24px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[22px] font-bold text-white">Create a PlayList</h3>
              <p className="mt-[4px] text-[15px] text-[#b5bac1]">Select who you want to create a PlayList with.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="mt-[16px] flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[10px]">
            <svg viewBox="0 0 24 24" className="size-[18px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
          </div>

          <p className="mt-[16px] text-[12px] font-semibold tracking-wide text-[#b5bac1]">
            Add friends or server members to mixes
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
                <label className="text-[13px] text-[#b5bac1]">PlayList Name (optional)</label>
                <input
                  value={blendName}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder="PlayList name"
                  className="mt-[4px] w-full rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px] text-[14px] text-white outline-none placeholder:text-[#87898c]"
                />
              </div>
            </div>
            {dupMix && (
              <div className="mt-[14px] flex items-center justify-between gap-[10px] rounded-[8px] bg-[#f0505b]/12 px-[12px] py-[10px]">
                <p className="text-[13px] text-[#f0a0a6]">You already have a PlayList with these people — <span className="font-semibold text-white">{dupMix.name}</span>.</p>
                <button onClick={() => onCreated?.(dupMix.id)} className="shrink-0 text-[13px] font-semibold text-[#5765f2] transition hover:underline">Open it</button>
              </div>
            )}
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button onClick={onClose} className="rounded-[8px] bg-[#2b2d31] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#35373c]">Cancel</button>
              <button onClick={createBlend} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Create a new PlayList</button>
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
function WishlistModal({ game, onClose, onAddToWheel }) {
  const { blends, setBlends } = useRoomCtx()
  const key = KEY_OF_TITLE[game] || game // wishlist stores catalog keys
  const dlg = useDialog(onClose, { label: 'Add to PlayList' })
  // Open centered on the clicked game card (falls back to the pointer, then the
  // screen center) so it lands right where the user is looking.
  const W = 380, H = 300
  const pos = (() => {
    if (typeof window === 'undefined') return null
    const vw = window.innerWidth, vh = window.innerHeight
    if (LAST_POINTER.cardX != null) {
      const left = Math.min(Math.max(LAST_POINTER.cardX - W / 2, 12), vw - W - 12)
      const top = Math.min(Math.max(LAST_POINTER.cardY - H / 2, 12), vh - H - 12)
      return { left, top }
    }
    if (LAST_POINTER.x == null) return null
    return { left: Math.min(Math.max(LAST_POINTER.x - 40, 12), vw - W - 12), top: Math.min(Math.max(LAST_POINTER.y - 20, 12), vh - 360) }
  })()
  function toggle(b) {
    const has = (b.wishlist || []).includes(key)
    const wishlist = has ? b.wishlist.filter((x) => x !== key) : [...(b.wishlist || []), key]
    const addedBy = { ...(b.addedBy || {}) }
    if (has) delete addedBy[key]; else if (!addedBy[key]) addedBy[key] = SELF_NAME
    setBlends(blends.map((x) => (x.id === b.id ? { ...x, wishlist, addedBy } : x)))
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()}
        className="absolute w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
        style={pos ? { left: pos.left, top: pos.top } : { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      >
        <div className="p-[20px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div>
              <h3 className="text-[19px] font-bold text-white">Add to PlayList</h3>
              <p className="mt-[3px] text-[14px] text-[#b5bac1]">Add <span className="font-semibold text-white">{game}</span> to a PlayList.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="no-scrollbar mt-[14px] flex max-h-[300px] flex-col gap-[2px] overflow-y-auto">
            {blends.filter((b) => (b.members || []).includes(SELF)).map((b) => {
              const on = (b.wishlist || []).includes(key)
              const by = b.addedBy?.[key]
              const byOther = on && by && by !== SELF_NAME
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b)}
                  className="flex items-center gap-[12px] rounded-[8px] p-[8px] text-left transition hover:bg-white/5"
                >
                  <span className="size-[40px] shrink-0 overflow-hidden rounded-[10px] bg-[#1a1a1d]" style={b.color ? { backgroundColor: b.color } : undefined}>
                    {b.cover ? (
                      <img alt="" src={b.cover} className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full grid-cols-2 grid-rows-2 gap-[1px]">
                        {mixCoverImages(b).map((src, i) => <img key={i} alt="" src={src} className="size-full object-cover" />)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-white">{b.name}</p>
                    {/* If someone else already added this game, credit them here. */}
                    {byOther ? (
                      <span className="mt-[2px] inline-flex items-center gap-[5px] text-[12px] text-[#9BF00B]">
                        <Avatar color={COLOR_OF[by] || '#4a4d55'} size={14} />
                        {capName(by)} already added
                      </span>
                    ) : (
                      <p className="text-[12px] text-[#80848e]">{b.members.length} member{b.members.length === 1 ? '' : 's'}</p>
                    )}
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
  const dlg = useDialog(onClose, { label: 'Add Your Preferences' })

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
        ref={dlg.ref}
        {...dlg.props}
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
          : 'Only changes the wheel — nothing leaves the PlayList.'}
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
          Reset to the PlayList&rsquo;s games
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
            style={{ backgroundColor: yes ? '#9BF00B' : '#ff5a5a', boxShadow: '0 0 0 2px #272727' }}
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
  // starts as the blend's games PLUS the group's XBOX PlayList, so trimming it
  // is purely a "don't spin for that tonight" call and never touches the blend
  // or the catalog.
  const [savedKeys, setWheelKeys] = useRoomNode('wheel/' + blend.id, null)
  const saved = Array.isArray(savedKeys) ? savedKeys.filter((k) => CATALOG[k]) : null
  const custom = saved && saved.length >= 2 ? saved : null
  // Never trust a key straight from the room — a game that's left the catalog
  // would take the whole page down with it. PlayList picks lead, then the rest
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
              className="flex items-center gap-[8px] text-[13px] font-semibold text-[#3fbf3f] transition hover:text-[#9BF00B]"
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
                        <MemberChip key={n} color={COLOR_OF[n] || D.raised} size={26} marginRight={-8} />
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
                  <div className="relative overflow-hidden rounded-[10px] border border-[#9BF00B]/40">
                    {cover && <img alt="" src={cover} className="absolute inset-0 size-full object-cover" />}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(21,43,13,0.55), rgba(12,12,14,0.92))' }}
                    />
                    <div className="relative z-10 flex min-h-[238px] flex-col p-[24px]">
                      <p className="text-[16px] font-semibold text-[#9BF00B]">The wheel picked</p>
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
    <div className="pointer-events-none fixed top-[24px] right-[24px] z-[200] flex justify-end px-4">
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
// PlayList, and the spin runs locally on your screen. The only synced moment is
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
  const [callWheel, setCallWheelRaw] = useRoomNode('wheelCall', null)
  // A spectate/moderator mirror must never write to the shared jam.
  const setCallWheel = IS_LIVE ? setCallWheelRaw : () => {}
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

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // The wheel's personal (non-jam) state + its menus live only in this
  // component, so a moderator watching the mirror can't see them. Publish them
  // to this participant's spectate path; a spectate instance reads them back and
  // renders the same wheel, dropdown, search and personal spin. (Jam state is
  // already shared through `wheelCall`, so it mirrors on its own.)
  const [wUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/wheelUI` : 'spectate/__nowui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/wheelUI`, { synced, inviting, mixMenu, q: q || '', localSpin: localSpin || null })
  }, [synced, inviting, mixMenu, q, localSpin])
  const eSynced = IS_SPECTATE ? !!wUI?.synced : synced
  const eInviting = IS_SPECTATE ? !!wUI?.inviting : inviting
  const eMixMenu = IS_SPECTATE ? !!wUI?.mixMenu : mixMenu
  const eQ = IS_SPECTATE ? (wUI?.q || '') : q
  const eLocalSpin = IS_SPECTATE ? (wUI?.localSpin ?? null) : localSpin

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

  const activeKeys = eSynced ? (callWheel?.keys || []) : (keys || [])
  const activeSpin = eSynced ? (callWheel?.spin || null) : eLocalSpin
  const spinRemaining = activeSpin ? activeSpin.startedAt + SPIN_MS - Date.now() : 0
  const phase = !activeSpin ? 'idle' : spinRemaining > 0 ? 'spinning' : 'result'
  const boardGames = activeKeys.map((k) => ({ key: k, title: wheelTitle(k) })).filter((g) => CATALOG[g.key] || STARTER_BY_KEY[g.key])
  // Mid-spin the wheel is locked to the exact list the spin rolled against.
  const games = phase !== 'idle' && activeSpin?.games ? activeSpin.games : boardGames
  const picked = phase === 'result' && activeSpin?.games ? activeSpin.games[activeSpin.target] : null
  const iSpun = activeSpin?.by === SELF_NAME
  const canSpin = boardGames.length >= 2 && phase !== 'spinning'

  const myMixes = (blends || []).filter((b) => (b.members || []).includes(SELF))
  // Only the Mix's curated PlayList (wishlist) — not its daily recommended games.
  const mixGames = (b) => (b.wishlist || []).filter((k) => CATALOG[k] || STARTER_BY_KEY[k])

  const query = eQ.trim().toLowerCase()
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
  // Load a Mix's games onto the wheel; keep the dropdown open so several can be added.
  const loadMix = (b) => { writeKeys([...new Set([...activeKeys, ...mixGames(b)])]) }

  // Keep remaining/phase fresh while a spin is turning.
  useEffect(() => {
    if (!activeSpin) return
    const id = setInterval(() => tick((t) => t + 1), 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpin?.id])

  // Escape closes the wheel — but never mid-spin (the spin must resolve first),
  // matching the disabled backdrop-click below. Focus trap + return come with it.
  const dlg = useDialog(() => { if (phase !== 'spinning') onClose() }, { label: 'Spin the wheel' })

  function doSpin() {
    if (!canSpin) return
    const roll = rollSpin(boardGames.length, activeSpin?.target)
    const s = { id: Date.now().toString(36), ...roll, games: boardGames, startedAt: Date.now(), by: SELF_NAME }
    if (synced) patchJam({ spin: s })
    else setLocalSpin(s)
  }

  // The wheel no longer auto-starts a party on landing — the spinner reviews the
  // result and taps "Start a party" (or spins again) from the module.
  function startPartyNow() {
    if (!picked) return
    onParty(picked)
    // Keep the modal open AND stay on the result view — don't auto-clear back to
    // the wheel or close. The party toast pops up over the modal; use Restart to
    // spin again for another round.
  }
  // Clear the result and return to the wheel-building view (no party started).
  const backToWheel = () => { if (synced) patchJam({ spin: null }); else setLocalSpin(null) }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={phase === 'spinning' ? undefined : onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="relative flex max-h-[92vh] w-[980px] max-w-full flex-col overflow-hidden rounded-[20px] border border-[#1c1d21] bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, rgba(61,191,30,0), #3dbf1e 15%, #3dbf1e 85%, rgba(61,191,30,0))', boxShadow: '0 0 18px rgba(61,191,30,0.8)' }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 60% at 28% 0%, rgba(45,160,0,0.18), transparent 60%)' }} />
        <button onClick={onClose} aria-label="Close" className="absolute right-[16px] top-[16px] z-10 text-[#9a9ba3] transition hover:text-white">
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="no-scrollbar relative flex w-full flex-col gap-[28px] overflow-y-auto p-[32px] lg:flex-row lg:items-center">
          {/* Wheel */}
          <div className="flex shrink-0 flex-col items-center">
            {games.length > 0 ? (
              <DecisionWheel games={games} spin={activeSpin} remaining={Math.max(0, spinRemaining || SPIN_MS)} onSpin={doSpin} spinning={phase === 'spinning'} disabled={!canSpin} />
            ) : (
              <div className="flex size-[420px] items-center justify-center rounded-full border-2 border-dashed border-[#2b2d31] p-[40px] text-center">
                <p className="max-w-[220px] text-[15px] text-[#7e7f87]">{synced ? 'The call wheel is empty. Anyone can add games or load a PlayList.' : 'Your wheel is empty. Add games or load a Mix’s PlayList.'}</p>
              </div>
            )}
          </div>

          {/* Right column: title / result, sync toggle, load-a-mix, search, list */}
          <div className="min-w-0 flex-1 lg:pr-[24px]">
            {phase === 'result' && picked ? (
              <div>
                <p className="text-[16px] font-semibold text-[#9BF00B]">The wheel picked</p>
                <p className="mt-[2px] uppercase leading-[0.95] text-white" style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: 'clamp(30px,3.4vw,46px)' }}>{picked.title}</p>
                <p className="mt-[14px] text-[15px] text-[#9a9ba3]">
                  {synced && !iSpun ? `${capName(activeSpin.by)} spun it — anyone can start the party for ${picked.title}, or restart.` : `Ready when you are — start a party for ${picked.title}, or restart.`}
                </p>
                <div className="mt-[16px] flex flex-wrap items-center gap-[10px]">
                  <button onClick={startPartyNow} className="flex items-center gap-[9px] rounded-[10px] bg-[#9BF00B] px-[20px] py-[11px] text-[15px] font-bold text-[#0c0c0e] shadow-[0_2px_12px_rgba(45,160,0,0.4)] transition hover:brightness-110">
                    <PartyGlyph size={18} />
                    Start a party
                  </button>
                  <button onClick={backToWheel} className="flex items-center gap-[8px] rounded-[10px] bg-[#1c1c1f] px-[18px] py-[11px] text-[15px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
                    <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8M3 4v4h4" /></svg>
                    Restart
                  </button>
                </div>
              </div>
            ) : phase === 'spinning' ? (
              <div>
                <h2 className="text-[28px] font-bold text-white">{synced ? 'The call is spinning…' : 'Spinning…'}</h2>
                {/* Who's spinning — shown live during the spin, with their avatar. */}
                {synced && activeSpin?.by ? (
                  <div className="mt-[10px] flex items-center gap-[9px]">
                    <Avatar color={COLOR_OF[activeSpin.by] || D.raised} size={26} />
                    <p className="text-[15px] text-white"><span className="font-semibold">{iSpun ? 'You are' : `${capName(activeSpin.by)} is`}</span> spinning the wheel…</p>
                  </div>
                ) : (
                  <p className="mt-[6px] text-[15px] text-[#9a9ba3]">Landing on a game…</p>
                )}
              </div>
            ) : (
              <>
                {/* Header — styled title + Invite (opens the wheel-sync invite) */}
                <div className="flex items-center justify-between gap-[12px]">
                  <h2 className="uppercase leading-[0.92] tracking-[0.02em] text-white" style={{ fontFamily: '"Base Neue Cond ExtBd"', fontSize: 'clamp(28px,3vw,44px)' }}>Spin the Wheel</h2>
                  <button onClick={() => setInviting(true)} className="shrink-0 rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Invite</button>
                </div>

                {/* Load games from your PlayList — a Select-Mix dropdown */}
                <p className="mt-[22px] text-[16px] font-medium text-white">Load games from your PlayList</p>
                <div className="relative z-40 mt-[10px]">
                  <button onClick={() => setMixMenu((v) => !v)} aria-expanded={eMixMenu} className="flex w-full items-center justify-between gap-[8px] rounded-[10px] bg-[#141416] px-[16px] py-[12px] text-[14px] text-[#9a9ba3] ring-1 ring-white/10 transition hover:ring-white/20">
                    <span>Select PlayList</span>
                    <svg viewBox="0 0 24 24" className={'size-[16px] transition-transform ' + (eMixMenu ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {eMixMenu && (
                    <>
                      <div className="fixed inset-0 z-[-1]" onClick={() => setMixMenu(false)} />
                      <div className="absolute left-0 right-0 top-[52px] overflow-hidden rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                        {myMixes.length ? myMixes.map((b) => {
                          const count = mixGames(b).length
                          const empty = count === 0
                          return (
                          <button key={b.id} onClick={() => !empty && loadMix(b)} disabled={empty} aria-disabled={empty} title={empty ? 'No games in this PlayList yet' : undefined} className={'flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left text-[14px] transition ' + (empty ? 'cursor-not-allowed text-[#6f7276] opacity-50' : 'text-[#dbdee1] hover:bg-white/5')}>
                            <span className="size-[36px] shrink-0 overflow-hidden rounded-[6px] bg-[#2b2d31]" style={b.color ? { backgroundColor: b.color } : undefined}>
                              {b.cover ? (
                                <img alt="" src={b.cover} className={'size-full object-cover' + (empty ? ' grayscale' : '')} />
                              ) : (
                                <span className={'grid size-full grid-cols-2 grid-rows-2 gap-[1px]' + (empty ? ' grayscale' : '')}>
                                  {mixCoverImages(b).map((src, i) => <img key={i} alt="" src={src} className="size-full object-cover" />)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{b.name}</span>
                            <span className="shrink-0 text-[12px] text-[#7e7f87]">{empty ? 'No games' : `${count} games`}</span>
                          </button>
                          )
                        }) : <p className="px-[14px] py-[8px] text-[13px] text-[#7e7f87]">You&rsquo;re not in any PlayLists yet.</p>}
                      </div>
                    </>
                  )}
                </div>

                {/* On the wheel — the search that ADDS to the wheel sits inside this
                    same block, right above the (scrollable) list, so it's clear the
                    two are connected. */}
                <p className="mt-[18px] text-[16px] font-medium text-white">or search and add any game</p>
                <div className="relative z-10 mt-[10px]">
                  <div className="flex items-center gap-[8px] rounded-[10px] bg-[#141416] px-[14px] py-[11px] ring-1 ring-white/10">
                    <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                    <input value={eQ} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
                    {eQ && <button onClick={() => setQ('')} aria-label="Clear search" className="text-[#7e7f87] transition hover:text-white"><svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
                  </div>
                  {query && (
                    <div className="absolute left-0 right-0 top-[52px] z-30 max-h-[240px] overflow-y-auto rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                      {results.length ? results.map((k) => (
                        <button key={k} onClick={() => addKey(k)} className="flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left transition hover:bg-white/5">
                          {wheelThumb(k) ? <img alt="" src={wheelThumb(k)} className="h-[26px] w-[46px] shrink-0 rounded-[4px] object-cover" /> : <span className="h-[26px] w-[46px] shrink-0 rounded-[4px] bg-[#2b2d31]" />}
                          <span className="min-w-0 flex-1 truncate text-[14px] text-white">{wheelTitle(k)}</span>
                          <svg viewBox="0 0 24 24" className="size-[16px] shrink-0 text-[#3fbf3f]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                      )) : <p className="px-[12px] py-[8px] text-[13px] text-[#7e7f87]">No games match &ldquo;{eQ}&rdquo;.</p>}
                    </div>
                  )}
                </div>

                {/* On the wheel — an outlined (border-only) results box */}
                <div className="mt-[12px] rounded-[12px] border border-white/12 p-[14px]">
                  <div className="mb-[10px] flex items-center justify-between">
                    <p className="text-[13px] font-semibold tracking-wide text-[#9a9ba3]">{synced ? 'Call wheel' : 'On the wheel'} · {boardGames.length}</p>
                    {boardGames.length > 0 && <button onClick={clearAll} className="text-[12px] font-semibold text-[#9a9ba3] transition hover:text-white">Clear all</button>}
                  </div>
                  <div className="no-scrollbar flex max-h-[168px] min-h-[64px] flex-wrap content-start gap-[8px] overflow-y-auto">
                    {boardGames.length === 0 && <p className="text-[13px] text-[#7e7f87]">Nothing yet — pick a PlayList above, search a game, or right-click any game &rarr; &ldquo;Add to Wheel&rdquo;.</p>}
                    {boardGames.map((g) => (
                      <span key={g.key} className="flex h-fit items-center gap-[8px] rounded-[8px] bg-[#1c1c1f] py-[6px] pl-[8px] pr-[6px] text-[13px] text-white ring-1 ring-white/5">
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

                {/* Spin the wheel — the primary action */}
                <button onClick={doSpin} disabled={!canSpin} className={'mt-[16px] w-full rounded-[10px] py-[13px] text-[15px] font-bold transition ' + (canSpin ? 'bg-[#9BF00B] text-[#0c0c0e] shadow-[0_2px_12px_rgba(45,160,0,0.4)] hover:brightness-110' : 'cursor-not-allowed bg-[#1c1c1f] text-[#7e7f87] ring-1 ring-white/5')}>
                  Spin the wheel
                </button>

                {/* Wheel sync — a shared wheel the whole call builds together. */}
                {(eSynced || jamLive) && (<>
                <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
                  {!eSynced && jamLive ? (
                    // A sync I'm not in yet: who started it + who's joined, click to join.
                    <button
                      onClick={startOrJoin}
                      className="flex items-center gap-[10px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[9px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]"
                    >
                      <span>{dispName(callWheel?.host, jamNames)} started the call wheel</span>
                      {/* `isolate` confines the avatars' overlap z-index to this row so
                          it can never rise above the Select-Mix dropdown above. Each
                          avatar is hoverable for the member's name. */}
                      <span className="isolate flex items-center">
                        {Object.keys(participants).map((n, i) => (
                          <MemberChip key={n} color={COLOR_OF[n] || D.raised} size={24} marginRight={-7} />
                        ))}
                      </span>
                      <span className="text-[#3fbf3f]">Join</span>
                    </button>
                  ) : eSynced ? (
                    <button
                      onClick={leaveOrEnd}
                      className="flex items-center gap-[9px] rounded-[10px] bg-[#9BF00B] px-[16px] py-[10px] text-[14px] font-semibold text-[#0c0c0e] transition hover:brightness-110"
                    >
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9M4 5v4h4M4 13a8 8 0 0 0 14.3 4.9M20 19v-4h-4" /></svg>
                      {isHost ? 'End wheel sync' : 'Leave wheel sync'}
                    </button>
                  ) : null}
                  {eSynced && (
                    <button onClick={copyInviteLink} className="flex items-center gap-[8px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[10px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>
                      {copied ? 'Link copied!' : 'Copy invite link'}
                    </button>
                  )}
                  {eSynced && (
                    /* `isolate` confines the avatars' overlap z-index to this row so
                       it can never rise above the Select-Mix dropdown above. Each
                       avatar is hoverable for the member's name. */
                    <span className="isolate flex items-center">
                      {Object.keys(participants).map((n, i) => (
                        <MemberChip key={n} color={COLOR_OF[n] || D.raised} size={26} marginRight={-8} />
                      ))}
                    </span>
                  )}
                </div>
                {/* Total members, clearly stated below the avatars. */}
                {eSynced && (
                  <p className="mt-[8px] text-[13px] font-semibold text-white">{Object.keys(participants).length} {Object.keys(participants).length === 1 ? 'member' : 'members'} in the wheel</p>
                )}
                <p className="mt-[6px] text-[12px] text-[#7e7f87]">
                  {eSynced
                    ? (isHost ? 'You started this sync — everyone on the call can join, edit and watch it spin.' : `Synced by ${dispName(callWheel?.host, jamNames)} — edits and spins are live for the whole call.`)
                    : 'Join to build and spin the wheel together.'}
                </p>
                </>)}
              </>
            )}
          </div>
        </div>

        {/* Invite — an overlay panel over the module (doesn't replace it) */}
        {eInviting && (
          <>
            <div className="absolute inset-0 z-[30] bg-black/55" onClick={() => setInviting(false)} />
            <div className="absolute right-[24px] top-[60px] z-[40] flex max-h-[calc(92vh-84px)] w-[380px] max-w-[calc(100%-48px)] flex-col overflow-hidden rounded-[14px] border border-[#2b2d31] bg-[#141416] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
              <WheelInviteStep online={online} onCancel={() => setInviting(false)} onStart={startJam} popover />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// The "who to send this jam to" step (Spotify-Jam style): pick people from the
// call / friends, or copy a link. Choosing none is fine — a link still shares it.
function WheelInviteStep({ online, onCancel, onStart, popover }) {
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
      <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (sel[d.name] ? 'border-[#9BF00B] bg-[#9BF00B]' : 'border-[#4a4d55]')}>
        {sel[d.name] && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
      </span>
    </button>
  )

  return (
    <div className={'relative flex w-full flex-col ' + (popover ? 'max-h-[calc(92vh-84px)] p-[20px]' : 'max-h-[92vh] p-[32px]')}>
      {/* Fixed header */}
      <div className="shrink-0">
        <h2 className={'font-bold text-white ' + (popover ? 'text-[20px]' : 'text-[28px]')}>Start a wheel sync</h2>
        <p className={'mt-[6px] leading-snug text-[#9a9ba3] ' + (popover ? 'text-[13px]' : 'text-[15px]')}>Invite people to build the wheel and watch it spin with you — or copy a link to share.</p>
        <button onClick={copyLink} className="mt-[18px] flex w-fit items-center gap-[9px] rounded-[10px] bg-[#1c1c1f] px-[16px] py-[10px] text-[14px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-[#26262a]">
          <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>
          {copied ? 'Link copied!' : 'Copy invite link'}
        </button>
        <p className="mt-[22px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">In your call</p>
      </div>

      {/* Scrollable people list — keeps the footer below it pinned in place */}
      <div className="no-scrollbar mt-[2px] min-h-0 flex-1 overflow-y-auto">
        {inCall.length ? inCall.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one else is on the call right now — invite someone below or share the link.</p>}
        {q && (filtered.length ? filtered.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one matches “{q}”.</p>)}
      </div>

      {/* Fixed footer — search + actions stay put while the list scrolls */}
      <div className="shrink-0 pt-[14px]">
        <p className="mb-[6px] text-[15px] text-white">Invite someone else</p>
        <div className="flex items-center gap-[8px] rounded-[8px] bg-[#111214] px-[12px] py-[9px] ring-1 ring-white/10">
          <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#87898c]" />
        </div>
        <div className="mt-[16px] flex justify-end gap-[10px]">
          <button onClick={onCancel} className="rounded-[8px] bg-[#3a3c42] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Cancel</button>
          <button onClick={() => onStart(chosen)} className="rounded-[8px] bg-[#9BF00B] px-[18px] py-[10px] text-[14px] font-semibold text-[#0c0c0e] transition hover:brightness-110">
            {chosen.length ? `Start sync · invite ${chosen.length}` : 'Start sync'}
          </button>
        </div>
      </div>
    </div>
  )
}

// "X started a wheel — Join" — the jam invite, top-right like the other toasts.
function WheelJamToast({ host, count, onJoin, onDismiss }) {
  const names = useNames()
  return (
    <div className="pointer-events-none fixed top-[24px] right-[24px] z-[200] flex justify-end px-4">
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
          className="ml-[6px] flex shrink-0 items-center gap-[7px] rounded-[10px] bg-[#9BF00B] px-[16px] py-[9px] text-[14px] font-semibold text-[#0c0c0e] transition hover:brightness-110"
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

// The game's player capacity, as clear display text ("1-4 players", "MMO").
function capText(launch) {
  const p = launch?.game?.players || CATALOG[launch?.game?.key]?.players || STARTER_BY_KEY[launch?.game?.key]?.players
  if (!p) return null
  if (/mmo/i.test(p)) return 'MMO'
  return `${p} player${String(p) === '1' ? '' : 's'}`
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
  const dlg = useDialog(onClose, { label: 'Who’s playing?' })
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
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
            <span className="text-[13px] font-semibold tracking-wide text-[#9a9ba3]">In your call</span>
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
            className={'rounded-[8px] px-[18px] py-[10px] text-[14px] font-semibold text-[#0c0c0e] transition hover:brightness-110 ' + (chosen.length ? 'bg-[#5765f2]' : 'bg-[#9BF00B]')}
          >
            {chosen.length ? `Send Ready Up [${chosen.length} selected]` : 'Launch Solo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Start a party from the home page: pick a game (search/select), invite friends,
// then launch a ready-up party. One modal for the whole flow.
function StartPartyModal({ onClose, onStart, initialGame, recent = [], onOpenGame }) {
  const { online } = useRoomCtx()
  const hiddenP = useHidden()
  const others = DMS.filter((d) => d.name !== SELF_NAME && !hiddenP[d.name])
  const inCall = others.filter((d) => online.includes(d.name))
  const elsewhere = others.filter((d) => !online.includes(d.name))
  const [sel, setSel] = useState(() => Object.fromEntries(inCall.map((d) => [d.name, true])))
  const [q, setQ] = useState('')        // friend search
  const [gameQ, setGameQ] = useState('') // game search
  const [gameKey, setGameKey] = useState(initialGame?.key || null)
  const dlg = useDialog(onClose, { label: 'Start a party' })
  const toggle = (n) => setSel((s) => ({ ...s, [n]: !s[n] }))
  const chosen = Object.keys(sel).filter((n) => sel[n])
  const gameQuery = gameQ.trim().toLowerCase()
  const gameResults = Object.entries(CATALOG)
    .filter(([, v]) => gameQuery && (v.title.toLowerCase().includes(gameQuery) || (v.genre || '').toLowerCase().includes(gameQuery)))
    .slice(0, 6)
  // Recently opened games — quick picks shown before the user types.
  const recentEntries = recent.map((k) => [k, CATALOG[k] || STARTER_BY_KEY[k]]).filter(([, v]) => v)
  // Resolve the picked game from the local-art catalog OR the Starter catalog so
  // cards from any shelf can start a party.
  const selected = gameKey ? (CATALOG[gameKey] || STARTER_BY_KEY[gameKey] || (initialGame?.key === gameKey ? initialGame : null)) : null
  const gameImg = (k) => CATALOG[k]?.image || (initialGame?.key === k ? initialGame?.image : null) || null
  const friendFiltered = elsewhere.filter((d) => capName(d.name).toLowerCase().includes(q.toLowerCase()))

  const Row = ({ d }) => (
    <button onClick={() => toggle(d.name)} className="flex w-full items-center gap-[12px] py-[8px]">
      <Avatar color={d.color} size={40} />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[15px] font-semibold text-white">{capName(d.name)}</p>
        <p className="truncate text-[13px] text-[#9a9ba3]">{online.includes(d.name) ? 'On Arcade' : 'Offline'}</p>
      </div>
      <span className={'flex size-[24px] shrink-0 items-center justify-center rounded-[6px] border-2 ' + (sel[d.name] ? 'border-[#5765f2] bg-[#5765f2]' : 'border-[#4a4d55]')}>
        {sel[d.name] && <svg viewBox="0 0 24 24" className="size-[14px] text-white" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
      </span>
    </button>
  )

  const start = () => {
    if (!selected) return
    onStart({ key: gameKey, title: selected.title, image: gameImg(gameKey) }, chosen)
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px] px-[24px] pt-[22px]">
          <div>
            <p className="text-[22px] font-bold text-white">Start a party</p>
            <p className="mt-[4px] text-[15px] text-[#b5bac1]">Pick a game and invite friends to jump in.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="mt-[2px] shrink-0 text-[#b5bac1] transition hover:text-white">
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-[24px] py-[16px]">
          {/* Game selection */}
          <p className="mb-[6px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Game</p>
          {selected ? (
            <div className="flex items-center gap-[12px] rounded-[10px] bg-[#1e1f22] p-[10px]">
              {gameImg(gameKey) && <img alt="" src={gameImg(gameKey)} className="h-[46px] w-[82px] shrink-0 rounded-[6px] object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">{selected.title}</p>
                <p className="truncate text-[13px] text-[#9a9ba3]">{capName(selected.genre || 'game')} · {selected.players} players</p>
              </div>
              <button onClick={() => { setGameKey(null); setGameQ('') }} className="shrink-0 text-[13px] font-semibold text-[#8aa0ff] transition hover:underline">Change</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
                <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
                <input data-autofocus value={gameQ} onChange={(e) => setGameQ(e.target.value)} placeholder="Search games" className="w-full bg-transparent text-[14px] text-white placeholder:text-[#87898c] focus:outline-none" />
              </div>
              {gameQuery ? (
                /* Typed a query — pick a game for the party. */
                <div className="mt-[8px] flex flex-col gap-[2px]">
                  {gameResults.map(([k, v]) => (
                    <button key={k} onClick={() => setGameKey(k)} className="flex w-full items-center gap-[12px] rounded-[8px] p-[6px] text-left transition hover:bg-white/5">
                      <img alt="" src={v.image} className="h-[40px] w-[71px] shrink-0 rounded-[6px] object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-white">{v.title}</p>
                        <p className="truncate text-[12px] text-[#9a9ba3]">{capName(v.genre || 'game')} · {v.players} players</p>
                      </div>
                    </button>
                  ))}
                  {gameResults.length === 0 && <p className="px-[6px] py-[10px] text-[13px] text-[#6f7276]">No games match “{gameQ}”.</p>}
                </div>
              ) : (
                /* No query — show recent searches (up to 3 visible, scrollable). Each
                   opens that game's detail page; the modal reopens on Back. */
                <>
                  <p className="mb-[6px] mt-[12px] text-[12px] font-semibold tracking-wide text-[#87898c]">Recent searches</p>
                  {recentEntries.length === 0 ? (
                    <p className="px-[6px] py-[10px] text-[13px] text-[#6f7276]">No recent search.</p>
                  ) : (
                    <div className="no-scrollbar flex max-h-[168px] flex-col gap-[2px] overflow-y-auto">
                      {recentEntries.map(([k, v]) => (
                        <button key={k} onClick={() => onOpenGame?.(k)} className="flex w-full items-center gap-[12px] rounded-[8px] p-[6px] text-left transition hover:bg-white/5">
                          {v.image ? <img alt="" src={v.image} className="h-[40px] w-[71px] shrink-0 rounded-[6px] object-cover" /> : <span className="h-[40px] w-[71px] shrink-0 rounded-[6px] bg-white/10" />}
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-white">{v.title}</p>
                            <p className="truncate text-[12px] text-[#9a9ba3]">{capName(v.genre || 'game')} · {v.players} players</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Invitees */}
          <div className="mt-[18px] flex items-center gap-[12px]">
            <span className="text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Invite</span>
          </div>
          {inCall.length ? inCall.map((d) => <Row key={d.name} d={d} />) : <p className="py-[6px] text-[13px] text-[#6f7276]">No one else is on right now — search below.</p>}
          <div className="mt-[10px] flex items-center gap-[8px] rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px]">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="w-full bg-transparent text-[14px] text-white placeholder:text-[#87898c] focus:outline-none" />
          </div>
          {friendFiltered.map((d) => <Row key={d.name} d={d} />)}
        </div>

        <div className="flex items-center justify-end gap-[10px] border-t border-black/20 px-[24px] py-[16px]">
          <button onClick={onClose} className="rounded-[8px] bg-[#4e5058] px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:bg-[#5a5c64]">Cancel</button>
          <button
            onClick={start}
            disabled={!selected}
            className="flex items-center gap-[7px] rounded-[8px] bg-[#9BF00B] px-[20px] py-[10px] text-[14px] font-semibold text-[#0c0c0e] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PartyGlyph size={18} />
            {chosen.length ? 'Launch' : 'Launch Solo'}
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
  const cap = capText(launch)
  const cover = launch.game?.image || CATALOG[launch.game?.key]?.image
  const remaining = Math.max(0, Math.ceil((launch.startedAt + LAUNCH_RESPOND_MS - Date.now()) / 1000))

  // A clear player-capacity pill, shown under the game title on every screen.
  const capPill = cap ? (
    <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#4e5058] px-[10px] py-[3px] text-[12px] font-semibold text-[#c7c9cb]">
      <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9" strokeLinecap="round" /></svg>
      {cap}
    </span>
  ) : null

  // Pick the body for this viewer's role/state.
  let body
  if (isInvitee && !iReady) {
    // Screen 2 — incoming invite.
    body = (
      <>
        <div className="flex flex-col gap-[6px]">
          <p className="text-[13px] text-[#c7c9cb]"><span className="font-semibold text-white">{dispName(launch.host, launchNames)}</span> invited you to play</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
          {capPill}
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
        <div className="flex flex-col gap-[6px]">
          <p className="flex items-center gap-[7px] text-[13px] text-[#c7c9cb]"><CheckBadge /> You’re ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
          {capPill}
        </div>
        <PartyAvatars launch={launch} />
        <button onClick={undoReady} className="w-full rounded-[8px] bg-[#3a3c42] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#44464d]">Undo Ready Up</button>
      </>
    )
  } else if (allReady) {
    // Screen 5 — host, party ready.
    body = (
      <>
        <div className="flex flex-col gap-[6px]">
          <p className="flex items-center gap-[7px] text-[13px] text-[#c7c9cb]"><CheckBadge /> Party is ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
          {capPill}
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
        <div className="flex flex-col gap-[6px]">
          <p className="text-[13px] text-[#c7c9cb]">Getting the party ready</p>
          <p className="text-[18px] font-bold leading-tight text-white">{launch.game?.title}</p>
          {capPill}
        </div>
        <PartyAvatars launch={launch} />
        {pending.length > 0 && (
          <p className="text-[12px] text-[#9a9ba3]">Waiting for {pending.length} member{pending.length === 1 ? '' : 's'} to respond…</p>
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
    <div className="pointer-events-auto fixed top-[24px] right-[24px] z-[200] w-[416px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-[#1c1d21] bg-[#17181b] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
      <div className="flex">
        {cover && <img alt="" src={cover} className="w-[116px] shrink-0 self-stretch object-cover" />}
        <div className="flex min-w-0 flex-1 flex-col gap-[12px] p-[16px]">{body}</div>
      </div>
    </div>
  )
}

// Cross-page toast for a SYNCED wheel spin — replaces auto-opening the full modal
// for everyone on the call. Shows who's spinning live, then the result with
// actions (start a party for the pick, open the wheel, or restart).
function WheelNotification({ spin, onOpenWheel, onStartParty, onRestart, onDismiss }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 200); return () => clearInterval(t) }, [])
  if (!spin) return null
  const spinning = Date.now() < (spin.startedAt + SPIN_MS)
  const picked = spin.games?.[spin.target]
  const by = spin.by
  const iSpun = by === SELF_NAME
  const cover = picked && (CATALOG[picked.key]?.image || STARTER_BY_KEY[picked.key]?.image)
  return (
    <div className="pointer-events-auto fixed right-[24px] top-[24px] z-[190] w-[416px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-[#1c1d21] bg-[#17181b] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
      <div className="flex">
        {!spinning && (cover ? <img alt="" src={cover} className="w-[116px] shrink-0 self-stretch object-cover" /> : <span className="w-[116px] shrink-0 self-stretch bg-[#2b2d31]" />)}
        <div className="flex min-w-0 flex-1 flex-col gap-[12px] p-[16px]">
          <div className="flex items-start justify-between gap-[10px]">
            <div className="flex items-center gap-[9px]">
              <Avatar color={COLOR_OF[by] || '#4a4d55'} size={30} />
              <p className="text-[14px] leading-snug text-white">
                <span className="font-semibold">{iSpun ? 'You' : capName(by)}</span>{spinning ? (iSpun ? ' are spinning the wheel…' : ' is spinning the wheel…') : ' spun the wheel'}
              </p>
            </div>
            <button onClick={onDismiss} aria-label="Dismiss" className="mt-[1px] shrink-0 text-[#9a9ba3] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {spinning ? (
            <div className="flex items-center gap-[10px] text-[#9a9ba3]">
              <svg viewBox="0 0 24 24" className="size-[18px] animate-spin text-[#9BF00B]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
              <span className="text-[14px]">Landing on a game…</span>
            </div>
          ) : picked ? (
            <>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[12px] font-semibold text-[#9BF00B]">The wheel picked</p>
                <p className="truncate text-[18px] font-bold leading-tight text-white">{picked.title}</p>
              </div>
              <div className="flex flex-wrap gap-[8px]">
                <button onClick={() => onStartParty(picked)} className="flex items-center gap-[7px] rounded-[8px] bg-[#9BF00B] px-[14px] py-[8px] text-[13px] font-bold text-[#0c0c0e] transition hover:brightness-110">
                  <PartyGlyph size={15} />
                  Start a party
                </button>
                <button onClick={onOpenWheel} className="rounded-[8px] bg-[#3a3c42] px-[14px] py-[8px] text-[13px] font-semibold text-white transition hover:bg-[#44464d]">Go to wheel</button>
                <button onClick={onRestart} className="flex items-center gap-[6px] rounded-[8px] bg-[#3a3c42] px-[14px] py-[8px] text-[13px] font-semibold text-white transition hover:bg-[#44464d]">
                  <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8M3 4v4h4" /></svg>
                  Restart
                </button>
              </div>
            </>
          ) : null}
        </div>
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
                  <MemberChip key={i} color={c} size={24} marginRight={i < blend.members.length - 1 ? -8 : 0} />
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
  const dlg = useDialog(onClose, { label: 'Forward to' })

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
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[16px] bg-[#2b2d31] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
  // Invitee isn't on Arcade yet → the call-to-action is to subscribe first.
  const needsNitro = !!msg.needsNitro
  return (
    <div className="mt-[6px] w-full max-w-[440px] overflow-hidden rounded-[10px] border border-[#3a3c42] bg-[#232428]">
      <div className="flex items-center gap-[10px] border-b border-[#2f3136] bg-[#1e1f22] px-[14px] py-[10px]">
        <span className="flex size-[34px] items-center justify-center rounded-[8px] bg-[#5765f2] text-[16px]">🎮</span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>PlayList invitation</p>
          <p className="truncate text-[15px] font-semibold text-white">{msg.blendName}</p>
        </div>
      </div>
      <div className="px-[14px] py-[12px]">
        <p className="text-[14px] text-[#dbdee1]">
          {mine
            ? <>You invited <span className="font-semibold text-white">{capName(msg.to)}</span> to this PlayList{needsNitro ? <> — they need to <span className="font-semibold text-white">get Nitro to join first</span>.</> : <> to join.</>}</>
            : <><span className="font-semibold text-white">{capName(msg.from)}</span> invited you to this PlayList.{needsNitro ? <> <span className="text-[#c7c9cb]">Subscribe to Arcade to join.</span></> : null}</>}
        </p>
        {msg.text ? <p className="mt-[6px] text-[13px] text-[#b5bac1]">“{msg.text}”</p> : null}

        {mine ? (
          <p className="mt-[10px] text-[13px] font-semibold" style={{ color: accepted ? D.green : declined ? '#f0787a' : D.mute }}>
            {accepted ? '✓ Joined' : declined ? '✕ Declined' : needsNitro ? '• Waiting for them to subscribe…' : '• Waiting for a response…'}
          </p>
        ) : pending ? (
          <div className="mt-[12px] flex gap-[8px]">
            {needsNitro ? (
              <button onClick={() => onRespond(true)} className="flex flex-1 items-center justify-center gap-[7px] rounded-[8px] bg-[#8b46b0] px-[14px] py-[8px] text-[14px] font-semibold text-white transition hover:brightness-110">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]"><path d="M20 7h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-5.5-1.65l-.5.67-.5-.68A3 3 0 0 0 6 6c0 .35.07.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm-6-2a1 1 0 1 1 1 1h-1V5zM9 4a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2zm2 15H7v-6h4v6zm0-8H5V9h6v2zm6 8h-4v-6h4v6zm2-8h-6V9h6v2z" /></svg>
                Subscribe to Arcade
              </button>
            ) : (
              <button onClick={() => onRespond(true)} className="flex-1 rounded-[8px] bg-[#248046] px-[14px] py-[8px] text-[14px] font-semibold text-white transition hover:brightness-110">Accept</button>
            )}
            <button onClick={() => onRespond(false)} className="flex-1 rounded-[8px] bg-[#3a3c42] px-[14px] py-[8px] text-[14px] font-semibold text-white transition hover:bg-[#4a4c52]">Decline</button>
          </div>
        ) : (
          <p className="mt-[10px] text-[13px] font-semibold" style={{ color: accepted ? D.green : '#f0787a' }}>
            {accepted ? '✓ You joined this PlayList' : '✕ You declined'}
          </p>
        )}
      </div>
    </div>
  )
}

// Quick share straight to one person (from a "Played By" avatar) — no picker,
// just a compose box that forwards this game into their DM.
function QuickShareModal({ game, to, hrs, onClose }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const dlg = useDialog(onClose, { label: `Message ${capName(to)}` })
  const cover = CATALOG[KEY_OF_TITLE[game] || game]?.image
  const send = () => {
    putDM(to, { from: SELF_NAME, to, kind: 'game', game, text: message.trim(), ts: Date.now() })
    setSent(true)
    setTimeout(onClose, 700)
  }
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="w-[440px] max-w-full rounded-[16px] bg-[#2b2d31] p-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex items-center gap-[12px]">
            <Avatar color={COLOR_OF[to] || D.raised} size={44} />
            <div>
              <p className="text-[13px] text-[#b5bac1]">Message</p>
              <p className="text-[18px] font-bold text-white">
                {capName(to)}
                {hrs != null && <span className="ml-[8px] text-[13px] font-medium text-[#9a9ba3]">{hrs} hrs played</span>}
              </p>
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

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // The message history is already shared; publish the in-progress draft so the
  // moderator's mirror shows what the participant is typing.
  const [dmUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/dmUI` : 'spectate/__nodmui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/dmUI`, { name: friend.name, draft: draft || '' })
  }, [friend.name, draft])
  const eDraft = IS_SPECTATE ? (dmUI?.name === friend.name ? (dmUI?.draft || '') : '') : draft

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
            value={eDraft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendText() }}
            placeholder={`Message ${fname}`}
            className="min-w-0 flex-1 bg-transparent py-[12px] text-[15px] text-white outline-none placeholder:text-[#87898c]"
          />
          <button onClick={sendText} disabled={!eDraft.trim()} className="shrink-0 rounded-[8px] bg-[#5765f2] px-[16px] py-[8px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Send</button>
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
  if (v.wishlistGame) return `Add to PlayList: ${v.wishlistGame}`
  if (v.createOpen) return 'Creating a PlayList'
  if (v.prefsForId) return 'Setting preferences'
  if (v.decide) return 'The Jumble (deciding)'
  if (v.dmName) return `DM with ${v.dmName}`
  if (v.blendId) return 'Viewing a PlayList'
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
          <span className="absolute -bottom-[1px] -right-[1px] size-[9px] rounded-full" style={{ backgroundColor: online ? '#9BF00B' : '#5c5e66', border: '2px solid #111114' }} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Editable display name — the moderator can rename each participant;
              the name syncs to the room and shows across that person's screens.
              Styled as an obvious input (border + pencil) so it reads as editable. */}
          <label className="mb-[2px] block text-[9px] font-bold uppercase tracking-wide text-[#6d7078]">Display name · click to edit</label>
          <div className="group/name flex items-center gap-[6px] rounded-[6px] bg-[#1c1d21] px-[8px] py-[3px] ring-1 ring-white/15 transition hover:ring-white/30 focus-within:bg-[#26272b] focus-within:ring-[#5765f2]">
            <input
              key={displayName}
              defaultValue={displayName}
              onBlur={(e) => onRename(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              placeholder="Add a name…"
              title="Rename this participant"
              className="w-full min-w-0 bg-transparent text-[14px] font-semibold leading-tight text-white outline-none placeholder:font-normal placeholder:text-[#6d7078]"
            />
            <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-[#80848e] transition group-hover/name:text-[#c7c9cb] group-focus-within/name:text-[#8b95f6]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </div>
          <div className="mt-[3px] truncate px-[1px] text-[11px] text-[#80848e]">{online ? describeView(view) : 'offline'}</div>
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
      <div className="relative aspect-[16/10] w-full">
        {hidden ? (
          <div className="flex size-full items-center justify-center text-[13px] text-[#80848e]">Hidden</div>
        ) : (
          <>
            <FitFrame src={src} vp={vp} />
            {/* Their tab isn't open (no live heartbeat) — dim the stale preview. */}
            {!online && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 backdrop-grayscale">
                <span className="flex items-center gap-[6px] rounded-full bg-black/70 px-[12px] py-[5px] text-[12px] font-semibold text-[#b5bac1] ring-1 ring-white/10">
                  <span className="size-[7px] rounded-full bg-[#5c5e66]" />
                  Tab not open
                </span>
              </div>
            )}
          </>
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
        <div className="no-scrollbar grid min-h-0 flex-1 auto-rows-max grid-cols-2 content-start gap-[16px] overflow-y-auto p-[16px]">
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
    ratingPct: c.ratingPct || `${overallRating(key)}%`,
    ratingCount: c.ratingCount || '12K',
    recPct: c.recPct || `${friendsRating(key)}%`,
    lastSession: c.lastSession || '04/18/2026',
    sessionRecord: c.sessionRecord || '4.2 Hours',
    totalTime: c.totalTime || '14.8 Hours',
  }
}

const REVIEWS = [
  { name: 'ShinyPlastic_099', color: AVATAR.blue, joined: '02/23/2019', skill: 'Intermediate', privacy: 'Public', title: 'We should Play This Again', thumb: 'up', body: 'I have never really been able to get into the AC Games for some reason, they should appeal to me since I tend to enjoy this type of game but despite trying many (I have several outside of the ones I have on Steam), they just never managed to hold my attention. At least until now that is . . .' },
  { name: 'Pastel_089', color: AVATAR.yellow, joined: '04/14/2020', skill: 'Intermediate', privacy: 'Public', title: 'Ugh. Gross', thumb: 'down', body: 'Ass.' },
  { name: 'PastyBeans2021', color: AVATAR.green, joined: '04/14/2020', skill: 'Intermediate', privacy: 'Public', title: 'Nice Graphics', thumb: 'up', body: "I've never been able to get into AC Games. They should appeal to me, but despite trying many, they never held my attention until now. The graphics really pull you into the Golden Age of Piracy." },
  { name: 'NovaTheWolf', color: AVATAR.red, joined: '11/02/2018', skill: 'Advanced', privacy: 'Public', title: 'Best co-op night in ages', thumb: 'up', body: 'We ran a full lobby and nobody wanted to stop. The chaos ramps up perfectly the more people you cram in, and the learning curve is gentle enough that our least-gamer friend still had a blast.' },
  { name: 'QuietStorm_42', color: AVATAR.blue, joined: '07/19/2021', skill: 'Beginner', privacy: 'Public', title: 'Good but grindy', thumb: 'up', body: 'Solid fun for the first several hours. It does start to feel repetitive once you have seen all the maps, but by then you have more than gotten your money’s worth.' },
  { name: 'mossy_antler', color: AVATAR.green, joined: '03/30/2022', skill: 'Intermediate', privacy: 'Public', title: 'Surprisingly deep', thumb: 'up', body: 'Looks casual on the surface, but there is real strategy once everyone knows what they are doing. Highly recommend playing with voice chat on.' },
  { name: 'ByteSizedBrian', color: AVATAR.yellow, joined: '09/12/2019', skill: 'Advanced', privacy: 'Public', title: 'Servers can be rough', thumb: 'down', body: 'The game itself is great, but I hit a few laggy sessions and one hard crash. When it works it is a 9/10; when it does not it is frustrating.' },
  { name: 'Cloudberry', color: AVATAR.red, joined: '01/05/2023', skill: 'Beginner', privacy: 'Public', title: 'My new comfort game', thumb: 'up', body: 'Perfect for unwinding after work with the group. Low stakes, lots of laughs, easy to hop in and out of.' },
  { name: 'Grimlock_Prime', color: AVATAR.blue, joined: '05/28/2017', skill: 'Advanced', privacy: 'Public', title: 'Skill ceiling is real', thumb: 'up', body: 'Casual players will have fun, but there is a ton of room to master the mechanics. The gap between a new player and a veteran is huge, in a good way.' },
  { name: 'peachy_keen', color: AVATAR.green, joined: '10/14/2020', skill: 'Intermediate', privacy: 'Public', title: 'Wish there was more content', thumb: 'up', body: 'What is here is polished and great, I just burned through it faster than I expected. Hoping the devs keep adding maps and modes.' },
  { name: 'V0idWalker', color: AVATAR.yellow, joined: '06/06/2021', skill: 'Beginner', privacy: 'Public', title: 'Not for me', thumb: 'down', body: 'I can see why people love it, but the pacing did not click with me. Gave it a few sessions and just bounced off.' },
  { name: 'SunnySideUp', color: AVATAR.red, joined: '02/11/2022', skill: 'Intermediate', privacy: 'Public', title: 'Great with strangers too', thumb: 'up', body: 'Even queuing solo I ended up in fun lobbies. The community is friendlier than most, which is rare these days.' },
  { name: 'takoyaki_lord', color: AVATAR.blue, joined: '08/23/2019', skill: 'Advanced', privacy: 'Public', title: 'Ran it for our game night', thumb: 'up', body: 'Hosted eight people and it handled the crowd better than expected. A couple of them bought it the next day. That is the best endorsement I can give.' },
]

// Short reviews attributed to the named friends (Caleb/Sauhee/Meera). Picked
// deterministically per game so the friend avatars shown by the score always
// map to a real entry in the review list.
const FRIEND_REVIEW_POOL = [
  { title: 'Great with the crew', thumb: 'up', body: 'Got the whole group in and nobody wanted to log off. Runs great and it just clicks when you play with friends.' },
  { title: 'Had a blast', thumb: 'up', body: 'Way more fun than I expected — easy to pick up, tough to put down. Would happily run it again this weekend.' },
  { title: 'Solid pick for game night', thumb: 'up', body: 'Perfect for a full lobby. A couple of us bounced off at first but it grew on everyone fast.' },
  { title: 'Won me over', thumb: 'up', body: 'Not usually my genre, but this one got me. Looks sharp and the pacing keeps you going one more round.' },
]
const FRIEND_REVIEW_DATES = ['03/12/2021', '07/08/2020', '11/24/2019']
const FRIEND_REVIEW_SKILLS = ['Beginner', 'Intermediate', 'Advanced']
const strHash = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h }
// The subset of a game's friends-who-played that actually left a review — not
// everyone does. Returns review objects (name + color + copy) so the avatars by
// the score and the entries in the reviews list are guaranteed to match.
function friendReviewsFor(key) {
  const players = friendInfo(key).avatars // friend colors who played this game
  const out = []
  players.forEach((color) => {
    const h = strHash(key + ':' + color)
    if (h % 3 === 0 && players.length > 1) return // ~1 in 3 skips leaving a review
    const t = FRIEND_REVIEW_POOL[h % FRIEND_REVIEW_POOL.length]
    out.push({
      name: capName(FRIEND_NAMES[color] || 'Friend'),
      color,
      joined: FRIEND_REVIEW_DATES[h % FRIEND_REVIEW_DATES.length],
      skill: FRIEND_REVIEW_SKILLS[h % FRIEND_REVIEW_SKILLS.length],
      privacy: 'Friends Only',
      title: t.title,
      thumb: t.thumb,
      body: t.body,
    })
  })
  // At least one friend review whenever a friend has played it.
  if (!out.length && players.length) {
    const color = players[0], h = strHash(key + ':' + color), t = FRIEND_REVIEW_POOL[h % FRIEND_REVIEW_POOL.length]
    out.push({ name: capName(FRIEND_NAMES[color] || 'Friend'), color, joined: FRIEND_REVIEW_DATES[h % FRIEND_REVIEW_DATES.length], skill: FRIEND_REVIEW_SKILLS[h % FRIEND_REVIEW_SKILLS.length], privacy: 'Friends Only', title: t.title, thumb: t.thumb, body: t.body })
  }
  return out
}

function DetailPill({ children, onClick, title }) {
  const cls = 'flex items-center gap-[6px] whitespace-nowrap rounded-full bg-[#1f1f23] px-[13px] py-[5px] text-[14px] font-semibold text-[#c7c9cb]'
  if (onClick) return <button type="button" onClick={onClick} title={title} className={cls + ' transition hover:bg-[#2a2a2f] hover:text-white'}>{children}</button>
  return <span className={cls}>{children}</span>
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
    <span className={'flex w-fit items-center gap-[7px] whitespace-nowrap rounded-[6px] border px-[11px] py-[5px] text-[13px] font-semibold ' + (friends ? 'border-[#9BF00B]/55 text-[#9BF00B]' : 'border-white/40 text-[#c7c9cb]')}>
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
          {r.tags && r.tags.length > 0 && (
            <div className="mt-[12px] flex flex-wrap gap-[6px]">
              {r.tags.map((t, i) => (
                <span key={i} className="rounded-full bg-[#26262a] px-[10px] py-[3px] text-[12px] font-semibold text-[#c7c9cb]">{t}</span>
              ))}
            </div>
          )}
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

  // ── Spectate/moderator fidelity ──────────────────────────────────────────
  // Publish the reviews list state (filter, pagination, composer, session
  // reviews) so the moderator's mirror matches what the participant sees.
  const [rUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/reviewsUI` : 'spectate/__norui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/reviewsUI`, { filter, filterOpen: !!filterOpen, expanded: !!expanded, page, writing: !!writing, added: added || [] })
  }, [filter, filterOpen, expanded, page, writing, added])
  const eFilter = IS_SPECTATE ? (rUI?.filter || 'All') : filter
  const eFilterOpen = IS_SPECTATE ? !!rUI?.filterOpen : filterOpen
  const filterPop = usePopover(eFilterOpen, () => setFilterOpen(false), { menu: true })
  const eExpanded = IS_SPECTATE ? !!rUI?.expanded : expanded
  const ePage = IS_SPECTATE ? (rUI?.page || 1) : page
  const eWriting = IS_SPECTATE ? !!rUI?.writing : writing
  const eAdded = IS_SPECTATE ? (rUI?.added || []) : added

  const all = [...eAdded, ...reviews]
  const shown = eFilter === 'All' ? all : all.filter((r) => r.privacy === eFilter)
  const pageCount = Math.max(1, Math.ceil(shown.length / REVIEWS_PER_PAGE))
  const safePage = Math.min(ePage, pageCount)
  const visible = eExpanded
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
          {eFilter !== 'All' && (
            <span className="text-[14px] font-semibold text-[#9a9ba3]">{eFilter} · {shown.length}</span>
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
            aria-haspopup="menu"
            aria-expanded={eFilterOpen}
            className="group relative flex items-center justify-center text-[#9a9ba3] transition hover:text-white"
          >
            <span className="pointer-events-none absolute bottom-[34px] right-0 whitespace-nowrap rounded-[6px] bg-black/80 px-[9px] py-[4px] text-[13px] font-semibold text-white opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
              Filter
            </span>
            <svg viewBox="0 0 30 30" className="size-[24px]" fill="currentColor">
              <path d="M28.4375 21.875C28.4375 22.3875 28.0125 22.8125 27.5 22.8125H18.75V23.125C18.75 25 17.625 25.625 16.25 25.625H8.75C7.375 25.625 6.25 25 6.25 23.125V22.8125H2.5C1.9875 22.8125 1.5625 22.3875 1.5625 21.875C1.5625 21.3625 1.9875 20.9375 2.5 20.9375H6.25V20.625C6.25 18.75 7.375 18.125 8.75 18.125H16.25C17.625 18.125 18.75 18.75 18.75 20.625V20.9375H27.5C28.0125 20.9375 28.4375 21.3625 28.4375 21.875Z" />
              <path d="M28.4375 8.125C28.4375 8.6375 28.0125 9.0625 27.5 9.0625H23.75V9.375C23.75 11.25 22.625 11.875 21.25 11.875H13.75C12.375 11.875 11.25 11.25 11.25 9.375V9.0625H2.5C1.9875 9.0625 1.5625 8.6375 1.5625 8.125C1.5625 7.6125 1.9875 7.1875 2.5 7.1875H11.25V6.875C11.25 5 12.375 4.375 13.75 4.375H21.25C22.625 4.375 23.75 5 23.75 6.875V7.1875H27.5C28.0125 7.1875 28.4375 7.6125 28.4375 8.125Z" />
            </svg>
          </button>
          {eFilterOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setFilterOpen(false)} />
              <div ref={filterPop} role="menu" aria-label="Filter reviews" aria-orientation="vertical" className="absolute right-0 top-[34px] z-[50] w-[184px] overflow-hidden rounded-[10px] border border-[#2b2d31] bg-[#1c1c1f] py-[6px] shadow-[0_16px_48px_rgba(0,0,0,0.7)]">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="menuitem"
                    onClick={() => pickFilter(f)}
                    className={'flex w-full items-center justify-between px-[14px] py-[9px] text-left text-[14px] transition hover:bg-white/5 ' + (eFilter === f ? 'text-[#9BF00B]' : 'text-[#dbdee1]')}
                  >
                    {f === 'All' ? 'All reviews' : f === 'Friends Only' ? 'Friends only' : 'Public'}
                    {eFilter === f && <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>}
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
          <p className="rounded-[8px] bg-[#1c1c1c] py-[28px] text-center text-[14px] text-[#9a9ba3]">No {eFilter === 'All' ? '' : eFilter.toLowerCase() + ' '}reviews yet.</p>
        )}
      </div>

      {/* Collapsed: reveal the full first page. Expanded: page through the rest. */}
      {!eExpanded && shown.length > REVIEWS_PREVIEW && (
        <div className="mt-[20px] flex justify-center">
          <button
            onClick={() => { setExpanded(true); setPage(1) }}
            className="flex items-center gap-[8px] rounded-[10px] border border-[#3a3d41] px-[24px] py-[11px] text-[15px] font-semibold text-white transition hover:border-[#9BF00B]/60 hover:text-[#9BF00B]"
          >
            Show more reviews
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
      )}

      {eExpanded && pageCount > 1 && (
        <div className="mt-[24px] flex items-center justify-center gap-[8px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
            className="flex size-[36px] items-center justify-center rounded-[8px] border border-[#3a3d41] text-white transition hover:border-[#9BF00B]/60 hover:text-[#9BF00B] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#3a3d41] disabled:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === safePage}
              className={'flex size-[36px] items-center justify-center rounded-[8px] text-[15px] font-semibold transition ' + (p === safePage ? 'bg-[#9BF00B] text-black' : 'border border-[#3a3d41] text-white hover:border-[#9BF00B]/60 hover:text-[#9BF00B]')}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
            aria-label="Next page"
            className="flex size-[36px] items-center justify-center rounded-[8px] border border-[#3a3d41] text-white transition hover:border-[#9BF00B]/60 hover:text-[#9BF00B] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#3a3d41] disabled:hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}

      {eWriting && (
        <WriteReviewModal
          onClose={() => setWriting(false)}
          onSubmit={(r) => { setAdded((a) => [r, ...a]); setWriting(false); setFilter('All'); setExpanded(false); setPage(1) }}
        />
      )}
    </section>
  )
}

// Descriptive tags a reviewer can attach (Steam-style), shown as chips on the
// posted review.
const REVIEW_TAG_OPTIONS = ['Best with friends', 'Story Rich', 'Relaxing', 'Challenging', 'Replayable', 'Great soundtrack', 'Funny', 'Beautiful', 'Addictive', 'Grindy', 'Short & sweet', 'Great co-op', 'Atmospheric', 'Casual', 'Competitive', 'Cozy', 'Emotional', 'Fast-paced', 'Immersive', 'Innovative', 'Nostalgic', 'Open world', 'Skill-based', 'Strategic', 'Tactical', 'Underrated', 'Well-optimized', 'Buggy', 'Steep learning curve', 'Family-friendly', 'Retro', 'Wholesome', 'Chaotic', 'Creepy', 'Satisfying', 'Difficult'].sort((a, b) => a.localeCompare(b))

// Compose a review on the detail page — thumb up/down, title, body, tags, and a
// Friends Only / Public visibility toggle (mirrors the review privacy badges).
function WriteReviewModal({ onClose, onSubmit }) {
  const [thumb, setThumb] = useState('up')
  const [privacy, setPrivacy] = useState('Public') // 'Public' | 'Friends Only'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])
  const [tagQuery, setTagQuery] = useState('')
  const toggleTag = (t) => setTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])
  const addTag = (t) => { const v = t.trim(); if (v && !tags.includes(v)) setTags((cur) => [...cur, v]); setTagQuery('') }
  const tq = tagQuery.trim().toLowerCase()
  // Available (unselected) tags, filtered by the search box.
  const tagMatches = REVIEW_TAG_OPTIONS.filter((t) => !tags.includes(t) && (!tq || t.toLowerCase().includes(tq)))
  // Let the reviewer coin a tag that isn't in the preset list.
  const canCoin = tq && !REVIEW_TAG_OPTIONS.some((t) => t.toLowerCase() === tq) && !tags.some((t) => t.toLowerCase() === tq)
  const dlg = useDialog(onClose, { label: 'Write a review' })
  const canPost = title.trim() && body.trim()
  const post = () => {
    if (!canPost) return
    onSubmit({
      name: capName(SELF_NAME), color: SELF, joined: '01/01/2024', skill: 'Intermediate',
      privacy, thumb, title: title.trim(), body: body.trim(), tags,
    })
  }
  const Vis = ({ value, glyph, label }) => (
    <button
      onClick={() => setPrivacy(value)}
      className={'flex flex-1 items-center justify-center gap-[7px] rounded-[8px] border px-[12px] py-[9px] text-[13px] font-semibold transition ' + (privacy === value ? (value === 'Friends Only' ? 'border-[#9BF00B] text-[#9BF00B]' : 'border-white text-white') : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}
    >
      {glyph}{label}
    </button>
  )
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div ref={dlg.ref} {...dlg.props} onClick={(e) => e.stopPropagation()} className="flex w-[520px] max-w-full flex-col gap-[18px] rounded-[16px] border border-[#1c1d21] bg-[#1c1c1f] p-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[22px] font-bold text-white">Write a review</h3>
          <button onClick={onClose} aria-label="Close" className="text-[#9a9ba3] transition hover:text-white"><svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        {/* Recommend? — thumb up / down */}
        <div>
          <p className="mb-[8px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Do you recommend it?</p>
          <div className="flex gap-[10px]">
            <button onClick={() => setThumb('up')} className={'flex flex-1 items-center justify-center gap-[8px] rounded-[8px] border px-[12px] py-[10px] text-[14px] font-semibold transition ' + (thumb === 'up' ? 'border-[#9BF00B] bg-[#107C10]/15 text-[#9BF00B]' : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}>
              <ThumbsUpGlyph size={18} /> Yes
            </button>
            <button onClick={() => setThumb('down')} className={'flex flex-1 items-center justify-center gap-[8px] rounded-[8px] border px-[12px] py-[10px] text-[14px] font-semibold transition ' + (thumb === 'down' ? 'border-[#f04747] bg-[#f04747]/15 text-[#ff8a8a]' : 'border-[#3a3d41] text-[#9a9ba3] hover:border-white/40')}>
              <ThumbsUpGlyph size={18} className="rotate-180" /> No
            </button>
          </div>
        </div>

        <div>
          <p className="mb-[8px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up" maxLength={80} className="w-full rounded-[8px] bg-[#111214] px-[12px] py-[10px] text-[14px] text-white outline-none ring-1 ring-white/10 placeholder:text-[#6f7276] focus:ring-[#5765f2]" />
        </div>
        <div>
          <p className="mb-[8px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Your review</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" rows={4} className="w-full resize-none rounded-[8px] bg-[#111214] px-[12px] py-[10px] text-[14px] leading-[1.5] text-white outline-none ring-1 ring-white/10 placeholder:text-[#6f7276] focus:ring-[#5765f2]" />
        </div>

        {/* Tags — searchable, multi-select, with the option to coin your own */}
        <div>
          <p className="mb-[8px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Add tags <span className="font-normal normal-case text-[#6f7276]">(optional)</span></p>
          {/* Selected tags — click to remove */}
          {tags.length > 0 && (
            <div className="mb-[10px] flex flex-wrap gap-[8px]">
              {tags.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className="flex items-center gap-[6px] rounded-full bg-white px-[11px] py-[5px] text-[13px] font-semibold text-black transition hover:brightness-95">
                  {t}
                  <svg viewBox="0 0 24 24" className="size-[12px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              ))}
            </div>
          )}
          {/* Search box */}
          <div className="kbd-ring flex h-[38px] items-center gap-[8px] rounded-[8px] bg-[#111214] px-[12px] ring-1 ring-white/10">
            <svg viewBox="0 0 24 24" className="size-[16px] text-[#87898c]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagMatches[0]) toggleTag(tagMatches[0]); else if (canCoin) addTag(tagQuery) } }}
              placeholder="Search tags…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#6f7276]"
            />
          </div>
          {/* Matching + coin-your-own options */}
          <div className="mt-[10px] flex max-h-[132px] flex-wrap gap-[8px] overflow-y-auto">
            {canCoin && (
              <button onClick={() => addTag(tagQuery)} className="flex items-center gap-[5px] rounded-full bg-[#1f1f23] px-[11px] py-[5px] text-[13px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-[#2a2a2f]">
                <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Add “{tagQuery.trim()}”
              </button>
            )}
            {tagMatches.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} className="rounded-full bg-[#1f1f23] px-[11px] py-[5px] text-[13px] font-semibold text-[#c7c9cb] transition hover:bg-[#2a2a2f] hover:text-white">
                {t}
              </button>
            ))}
            {tagMatches.length === 0 && !canCoin && (
              <p className="py-[4px] text-[13px] text-[#6f7276]">No tags match “{tagQuery.trim()}”.</p>
            )}
          </div>
        </div>

        {/* Visibility — Public / Friends Only */}
        <div>
          <p className="mb-[8px] text-[13px] font-semibold tracking-wide text-[#9a9ba3]">Who can see this?</p>
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
// A video's own YouTube still — so the Trailer and Gameplay thumbnails are
// visually distinct from each other and from the cover art.
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

// Build the ordered media slides for a game's hero carousel: cover first, then
// any bespoke screenshots, then the trailer, then the gameplay video (the same
// clip the cards preview) — deduped so we never show the same video twice.
function slidesFor(key, cover) {
  const slides = cover ? [{ type: 'image', src: cover }] : []
  for (const src of GALLERY[key] || []) slides.push({ type: 'image', src })
  const seen = new Set()
  // The catalog clip is the trailer; the bespoke landscape clip is gameplay —
  // labeled so viewers can tell the two videos apart in the carousel.
  for (const [id, badge] of [[VIDEOS[key], 'Trailer'], [GAMEPLAY_LANDSCAPE[key], 'Gameplay']]) {
    if (id && !seen.has(id)) { seen.add(id); slides.push({ type: 'video', youTubeId: id, poster: cover, badge }) }
  }
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
    <div className="w-full shrink-0 lg:w-[560px]">
      <div className="group relative w-full overflow-hidden rounded-[10px] bg-black shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div
          className="flex aspect-[16/10] w-full transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {slides.map((s, idx) => (
            <div key={idx} className="relative size-full shrink-0 basis-full bg-black">
              {s.type === 'video' && idx === i ? (
                <VideoTrailer youTubeId={s.youTubeId} poster={s.poster} start={0} controls />
              ) : (
                <img alt="" src={s.type === 'video' ? s.poster : s.src} className="absolute inset-0 size-full object-cover" />
              )}
              {s.type === 'video' && (
                <span className="pointer-events-none absolute left-[12px] top-[12px] z-[2] rounded-[4px] bg-black/60 px-[8px] py-[3px] text-[11px] font-semibold uppercase tracking-wide text-white">{s.badge || 'Trailer'}</span>
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
              className="absolute left-[10px] top-1/2 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-[10px] top-1/2 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — jump to any slide; video thumbs carry a Trailer/Gameplay banner. */}
      {n > 1 && (
        <div className="mt-[10px] flex gap-[8px]">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`${s.type === 'video' ? (s.badge || 'Trailer') : 'Screenshot'} ${idx + 1}`}
              className={'group/th relative aspect-video min-w-0 flex-1 overflow-hidden rounded-[6px] transition ' + (idx === i ? 'ring-2 ring-[#9BF00B]' : 'ring-1 ring-white/10 hover:ring-white/40')}
            >
              <img alt="" src={s.type === 'video' ? ytThumb(s.youTubeId) : s.src} className="absolute inset-0 size-full object-cover" />
              <div className={'absolute inset-0 transition ' + (idx === i ? 'bg-transparent' : 'bg-black/45 group-hover/th:bg-black/15')} />
              {s.type === 'video' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-black/55">
                    <svg viewBox="0 0 24 24" className="ml-[1px] size-[12px]" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
              )}
              {s.type === 'video' && (
                <span className="pointer-events-none absolute left-[4px] top-[4px] rounded-[3px] bg-black/75 px-[5px] py-[1px] text-[8px] font-semibold uppercase tracking-[0.04em] text-white">{s.badge || 'Trailer'}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// A "Played By" / rating avatar that responds to hover, shows the person's name,
// and on click opens a quick-share of this game straight to that person.
function PlayerAvatar({ color, size, marginRight, gameTitle, onShare, hrs, reviewed }) {
  const name = NAME[color]
  const spAv = useContext(SpectateAvCtx)
  // Keyboard parity: focusing the avatar shows its name tooltip like hover does.
  const [kbFocus, setKbFocus] = useState(false)
  // The user (green) and any unmapped color aren't share targets.
  if (color === SELF || !name) {
    return <Avatar color={color} size={size} style={{ marginRight, boxShadow: '0 0 0 2px #0c0c0e' }} />
  }
  const reveal = kbFocus || (!!spAv && spAv === avKey(gameTitle, capName(name)))
  return (
    <button
      type="button"
      data-av={avKey(gameTitle, capName(name))}
      onClick={(e) => { e.stopPropagation(); onShare?.({ title: gameTitle, to: name }) }}
      onFocus={() => setKbFocus(true)}
      onBlur={() => setKbFocus(false)}
      title={`Share ${gameTitle} with ${capName(name)}`}
      className="group/av relative shrink-0 rounded-full transition hover:z-10 hover:-translate-y-[2px]"
      style={{ marginRight, zIndex: reveal ? 10 : undefined }}
    >
      <span className={'pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-[4px] whitespace-nowrap rounded-[6px] bg-black/85 px-[8px] py-[3px] text-[12px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover/av:opacity-100 group-focus-within/av:opacity-100' + (reveal ? ' !opacity-100' : '')}>
        <span>{capName(name)}{hrs != null ? ` · ${hrs} hrs` : ''}</span>
        {/* Green thumbs-up when this friend has left a review of the game —
            mirrors the recommends badge on the cinematic cards' ShareAvatars. */}
        {reviewed && (
          <>
            <span aria-hidden className="text-white/60">·</span>
            <svg viewBox="0 0 24 24" className="size-[13px]" fill="#9BF00B" aria-label="Reviewed"><path d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm3.5 10a2 2 0 0 1-1.5-.7V10l4.2-6.6c.4-.7 1.3-.9 2-.5.6.4.9 1.1.7 1.8L14.9 9H20a2 2 0 0 1 2 2.4l-1.4 6.9A2.4 2.4 0 0 1 18.2 20H10.5Z" /></svg>
          </>
        )}
      </span>
      <Avatar color={color} size={size} className="rounded-full ring-0 transition group-hover/av:ring-2 group-hover/av:ring-[#5765f2] group-focus-within/av:ring-2 group-focus-within/av:ring-[#5765f2]" style={{ boxShadow: '0 0 0 2px #0c0c0e' }} />
    </button>
  )
}

function GameDetailPage({ gameKey, onBack, onHome, onLibrary, onMixes, onWishlist, onShare, onOpen, onPlay, onLibraryTag }) {
  const d = detailFor(gameKey)
  const slides = slidesFor(gameKey, d.image)
  // The game's Library facets, so its player + genre tags can jump into a
  // filtered Library. Only Starter-catalog games have these.
  const libGame = STARTER_BY_KEY[gameKey]
  // A game no friend has played yet ("Be the first" state) shows no friend
  // reviews or social proof.
  const unplayed = STARTER_DESC[gameKey]?.friends === ''
  // Friends who've played it — the same per-game friend set the cards use, so
  // the faces here match "Recommended by Your Friends" etc. Never the user.
  const playedBy = friendInfo(gameKey).avatars
  // Only some of the friends who played leave a review; those reviewers show by
  // the score AND appear (as themselves) in the reviews list below.
  const friendReviews = unplayed ? [] : friendReviewsFor(gameKey)
  const reviewers = friendReviews.map((r) => r.color)
  const recCinematic = CINEMATIC_ROW.filter((c) => c.id !== gameKey)
  const recPortrait = PORTRAIT_ROW.filter((c) => c.id !== gameKey)
  const [searchOpen, setSearchOpen] = useState(false)
  // Mirror the search palette to the moderator's spectate view.
  const [dUI] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/detailUI` : 'spectate/__nodui', {})
  useEffect(() => {
    if (!IS_LIVE) return
    writeRoomPath(`${SPECTATE_PATH}/detailUI`, { searchOpen: !!searchOpen })
  }, [searchOpen])
  const eSearchOpen = IS_SPECTATE ? !!dUI?.searchOpen : searchOpen

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      {/* Top nav — same Home / Library / Mixes header as the homepage */}
      <PageNav onHome={onHome || onBack} onLibrary={onLibrary} onMixes={onMixes} onBack={onBack} />
      {eSearchOpen && <SearchModal onClose={() => setSearchOpen(false)} onOpen={onOpen} />}

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
              {/* Also Played By — right under the title. Avatars bottom-align with
                  the label so they sit on its last line when it wraps. */}
              <div className="mt-[14px] flex items-end gap-[10px] text-[16px] text-[#a2a4ae]">
                Also Played By:
                {unplayed ? (
                  <span className="text-[15px] text-[#7e7f87]">No one in your PlayList yet</span>
                ) : (
                  <span className="flex items-center">
                    {playedBy.map((c, i) => (
                      <PlayerAvatar key={i} color={c} size={26} marginRight={i < playedBy.length - 1 ? -8 : 0} gameTitle={d.title} onShare={onShare} hrs={friendHours(gameKey, c)} reviewed={reviewers.includes(c)} />
                    ))}
                  </span>
                )}
              </div>
              <p className="mt-[16px] max-w-[560px] text-[16px] leading-[1.5] text-[#a2a4ae]">{d.description}</p>
              <div className="mt-[20px] flex flex-wrap items-center gap-[8px]">
                {(() => {
                  // Player capacity + genre jump to a filtered Library. Prefer the
                  // Library entry's raw facets; fall back to the detail data so the
                  // pills are clickable for local-art (non-Starter) games too.
                  const capVal = maxPlayers(libGame?.players || d.players)
                  const genreVal = libGame ? libGame.genre : d.genre
                  return (
                    <>
                      <DetailPill
                        onClick={onLibraryTag ? () => onLibraryTag({ kind: 'cap', value: capVal }) : undefined}
                        title={onLibraryTag ? `See games for up to ${capVal} players` : undefined}
                      >
                        <img alt="" src={userGroup} className="size-[15px] -scale-x-100" />
                        {d.players}
                      </DetailPill>
                      {(() => {
                        const sh = sessionHours(gameKey)
                        return (
                          <DetailPill
                            onClick={onLibraryTag ? () => onLibraryTag({ kind: 'session', value: sh }) : undefined}
                            title={onLibraryTag ? `See games around ${sh} hrs / session` : undefined}
                          >
                            <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ~{sh} hrs / session
                          </DetailPill>
                        )
                      })()}
                      <DetailPill
                        onClick={onLibraryTag ? () => onLibraryTag(facetForTag(genreVal) || { kind: 'genre', value: genreVal }) : undefined}
                        title={onLibraryTag ? `See ${genreVal} games` : undefined}
                      >{d.genre}</DetailPill>
                      <DetailPill>{d.difficulty}</DetailPill>
                    </>
                  )
                })()}
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
                  className="flex items-center gap-[9px] rounded-[8px] bg-[#9BF00B] px-[22px] py-[14px] text-[16px] font-bold text-[#0c0c0e] shadow-[0_2px_12px_rgba(45,160,0,0.4)] transition hover:brightness-110"
                >
                  <PartyGlyph size={20} />
                  Start a Party
                </button>
                {/* Add to PlayList — outlined */}
                <button
                  onClick={() => onWishlist?.(d.title)}
                  className="flex items-center gap-[9px] rounded-[8px] border-2 border-white/85 px-[20px] py-[12px] text-[16px] font-bold text-white transition hover:bg-white/10"
                >
                  <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
                  Add to PlayList
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
                    <span className="text-[34px] font-semibold leading-none text-[#9BF00B]">{d.recPct}</span>
                    <ThumbsUpGlyph size={24} className="text-[#9BF00B]" />
                    <div className="flex items-center">
                      {reviewers.map((c, i) => (
                        <PlayerAvatar key={i} color={c} size={30} marginRight={i < reviewers.length - 1 ? -9 : 0} gameTitle={d.title} onShare={onShare} hrs={friendHours(gameKey, c)} reviewed />
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

          {/* Reviews — always available so every game has Write-a-review + Filter.
              When no friend has played it yet, a note leads the section. */}
          {unplayed && (
            <section className="mt-[36px] flex flex-col items-center gap-[8px] rounded-[16px] border border-dashed border-[#2b2d31] py-[28px] text-center">
              <svg viewBox="0 0 24 24" className="size-[26px] text-[#9BF00B]" fill="currentColor"><path d="M12 2l2.4 5.4L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5L8 11.9 4 8l5.6-.6L12 2z" /></svg>
              <p className="text-[16px] font-semibold text-white">No friend reviews yet</p>
              <p className="text-[14px] text-[#9a9ba3]">Be the first to suggest this to your PlayList and share what you think.</p>
            </section>
          )}
          <ReviewsSection reviews={unplayed ? REVIEWS : [...friendReviews, ...REVIEWS]} />

          {/* Friends Also Liked — compact cinematic cards, consistent with the
              Recommended page. */}
          <div className="mt-[32px]">
            <ShelfRow title={`Friends who played ${d.title} also liked`} padTop={30}>
              {recCinematic.map((c) => (
                <CinematicCard key={c.id} {...cineCard(c.id)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />
              ))}
            </ShelfRow>
          </div>
          {/* Similar games — same compact cinematic cards as the Recommended page. */}
          <ShelfRow title={`Similar to ${d.title}`} padTop={30}>
            {recPortrait.map((c) => (
              <CinematicCard key={c.id} {...cineCard(c.id)} compact onOpen={onOpen} onWishlist={onWishlist} onShare={onShare} />
            ))}
          </ShelfRow>
        </div>
      </div>
    </main>
  )
}

// ── Overview page (?overview=1) ─────────────────────────────────────────────
// A solo, self-contained tour of the prototype for advisors/demos. Two halves:
//   1) a feature index that shows the user flows + what changed, with deep links
//      into the live prototype, and
//   2) a notification SIMULATOR. The multiplayer toasts normally only appear
//      when *another* tester acts in a second tab; here one person can trigger
//      each one and click through the flow. The real toast components are reused
//      (SpinNotification / WheelJamToast / LaunchNotification / LaunchToast) with
//      locally-scripted state instead of the Firebase room, so it's faithful but
//      needs no other tabs. On this page SELF_NAME defaults to 'clarisse'.
const OV_BASE = window.location.pathname
const OV_LINK = (q) => `${OV_BASE}?${q}`

// The pivotal flows/changes, grouped for a quick read. `steps` renders the user
// flow; `link` deep-links into the live prototype where it helps.
const OVERVIEW_FEATURES = [
  {
    title: 'Social-proof home', tag: 'Rebuilt',
    blurb: 'The home screen leads with what your friends are playing — “Recommended by Your Friends” and “Trending amongst Your Friends”, with per-game friend counts and hours.',
    steps: ['Open Home', 'See friends’ recommendations first', 'Trending list shows “N friends played this for avg. X hrs”'],
    link: { href: OV_LINK('u=1'), label: 'Open home' },
  },
  {
    title: 'Gameplay-first cards', tag: 'Updated',
    blurb: 'Cards play live gameplay footage on hover (starting partway in), with a restructured detail panel. The Trending list stays static cover art by design.',
    steps: ['Hover a card → trailer plays', 'Click → full detail page', 'Reviews, tags and “Similar to” below'],
    link: { href: OV_LINK('u=1'), label: 'Try the cards' },
  },
  {
    title: 'Decision Wheel → Jam', tag: 'Major',
    blurb: 'The solo “spin to decide” became a Spotify-Jam-style shared session: friends join one live wheel, watch it spin together, and review the result before a party starts.',
    steps: ['Open the wheel', 'Invite the call → friends Join', 'Spin together', 'Review the pick → start a party'],
    sim: 'jam',
  },
  {
    title: 'Party ready-up flow', tag: 'Major',
    blurb: 'Launching a game invites the call, each person readies up on their own screen, and the host launches once enough are in — with clear player-capacity.',
    steps: ['Host picks a game + invites', 'Invitees “Ready Up” or “Not Now”', 'Host “Launch”', '“Launching…” everywhere'],
    sim: 'host',
  },
  {
    title: 'Library page', tag: 'New',
    blurb: 'A dedicated Library with tag filtering, clickable tags, review tags, carousel thumbnails and “N friends played this” tiles.',
    steps: ['Open Library', 'Filter by a tag', 'Click a card tag to refine'],
    link: { href: OV_LINK('u=1'), label: 'Open the prototype' },
  },
  {
    title: 'PlayLists (was “Mix”)', tag: 'Renamed',
    blurb: 'Group game lists renamed to “PlayList”, with collage thumbnails, inline title editing, cover-art changing and a leave-only membership model.',
    steps: ['Open a PlayList', 'Rename / change cover', 'Manage members'],
  },
  {
    title: 'Moderator wall', tag: 'Updated',
    blurb: 'A live participant wall lets a moderator watch every tester’s screen during a session. Now scrollable, so the roster can grow past a single screen.',
    steps: ['Open the wall', 'Watch each tester live', 'Scroll for more participants'],
    link: { href: OV_LINK('moderator=1'), label: 'Open moderator wall' },
  },
  {
    title: 'Four testers + Yessenia', tag: 'New',
    blurb: 'No login — each tester opens their own link. A fourth friend, Yessenia, was added and wired through DMs, cards and social-proof counts.',
    steps: ['Clarisse = u=1', 'Caleb = u=2', 'Sauhee = u=3', 'Meera = u=4', 'Yessenia = u=5'],
    links: [
      { href: OV_LINK('u=1'), label: 'u=1' }, { href: OV_LINK('u=2'), label: 'u=2' },
      { href: OV_LINK('u=3'), label: 'u=3' }, { href: OV_LINK('u=4'), label: 'u=4' },
      { href: OV_LINK('u=5'), label: 'u=5' },
    ],
  },
]

// The notification scenarios the simulator can run. Order = suggested demo path.
const OVERVIEW_SIMS = [
  { id: 'spin', label: 'Someone spun the wheel', desc: 'Ambient heads-up that a friend is spinning in a PlayList.' },
  { id: 'jam', label: 'Wheel jam invite', desc: '“Caleb started a wheel — Join.” Click Join to hop in.' },
  { id: 'invite', label: 'Party invite (you’re invited)', desc: 'Ready Up or Not Now, then the host launches.' },
  { id: 'host', label: 'You host a party', desc: 'Invite the call, watch them ready up, then Launch.' },
]

function OverviewPage() {
  const [sim, setSim] = useState(null)       // { kind, ... } — the active notification
  const [launched, setLaunched] = useState(null) // LaunchToast title
  const idRef = useRef(1)
  const nextId = () => `sim-${idRef.current++}`
  const clear = () => setSim(null)

  // ── Scenario starters ────────────────────────────────────────────────────
  const start = (id) => {
    setLaunched(null)
    if (id === 'spin') setSim({ kind: 'spin', id: nextId(), spinner: 'meera', blendName: 'Weekend Crew' })
    else if (id === 'jam') setSim({ kind: 'jam', host: 'caleb', count: 2, joined: false })
    else if (id === 'invite') setSim({ kind: 'launch', launch: { id: nextId(), host: 'caleb', invitees: [SELF_NAME], ready: {}, declined: {}, game: { key: 'overcooked', title: 'Overcooked! 2' }, startedAt: Date.now() } })
    else if (id === 'host') setSim({ kind: 'launch', launch: { id: nextId(), host: SELF_NAME, invitees: ['caleb', 'meera'], ready: {}, declined: {}, game: { key: 'humanFallFlat', title: 'Human Fall Flat' }, startedAt: Date.now() } })
  }

  // ── Mutations on the active launch (immutable) ───────────────────────────
  const patchLaunch = (fn) => setSim((t) => (t && t.kind === 'launch' ? { ...t, launch: fn(t.launch) } : t))
  const setReady = (name, v) => patchLaunch((l) => { const ready = { ...l.ready }; if (v) ready[name] = true; else delete ready[name]; return { ...l, ready } })
  const doLaunch = () => { patchLaunch((l) => ({ ...l, launched: true })); setTimeout(clear, 1500) }

  // Contextual "simulate the other person" actions for the current scenario.
  const friendActions = (() => {
    if (sim?.kind !== 'launch' || sim.launch.launched) return []
    const l = sim.launch
    if (l.host === SELF_NAME) {
      // I'm the host — friends ready up on their own screens.
      return l.invitees.filter((n) => !l.ready[n]).map((n) => ({ label: `▶ ${capName(n)} readies up`, onClick: () => setReady(n, true) }))
    }
    // I'm an invitee — once I'm ready, the host can launch.
    if (l.ready[SELF_NAME]) return [{ label: `▶ ${capName(l.host)} launches the game`, onClick: doLaunch }]
    return [{ label: 'Waiting for you to respond above ↑', disabled: true }]
  })()

  const Chip = ({ children }) => (
    <span className="rounded-full bg-white/[0.06] px-[9px] py-[3px] text-[12px] font-medium text-[#c7c9cb]">{children}</span>
  )
  const tagColor = { Major: '#eb459e', New: '#3ba55d', Rebuilt: '#5765f2', Updated: '#f5c518', Renamed: '#9a9ba3' }

  return (
    <div className="no-scrollbar h-screen w-screen overflow-y-auto bg-[#0b0b0d] text-white">
      <div className="mx-auto w-full max-w-[1080px] px-[24px] pb-[220px] pt-[48px]">
        {/* Header */}
        <header className="border-b border-[#1c1d21] pb-[28px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8aa0ff]">Prototype overview</p>
          <h1 className="mt-[8px] text-[40px] font-bold leading-tight tracking-tight">XBOX ARCADE × Discord</h1>
          <p className="mt-[10px] max-w-[640px] text-[16px] leading-relaxed text-[#b5bac1]">
            A guided tour of the pivotal flows and recent changes — plus a notification simulator so you can experience the multiplayer moments solo, without opening a second tab.
          </p>
          <div className="mt-[16px] flex flex-wrap gap-[8px]">
            <a href={OV_LINK('u=1')} className="rounded-[8px] bg-[#5765f2] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Open the prototype ↗</a>
            <a href={OV_LINK('moderator=1')} className="rounded-[8px] border border-[#4e5058] px-[16px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-white/[0.06]">Moderator wall ↗</a>
          </div>
        </header>

        {/* Notification simulator */}
        <section className="mt-[36px]">
          <div className="flex items-baseline gap-[12px]">
            <h2 className="text-[24px] font-semibold">Notification simulator</h2>
            <span className="text-[13px] text-[#9a9ba3]">click a scenario, then step through it</span>
          </div>
          <p className="mt-[8px] max-w-[720px] text-[15px] leading-relaxed text-[#9a9ba3]">
            These toasts normally appear when a <span className="text-white">different friend</span> acts in another tab. Trigger one below — it pops up top-right, exactly as it would in the app. Use the dock at the bottom to play the other person’s side.
          </p>

          <div className="mt-[18px] grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            {OVERVIEW_SIMS.map((s) => (
              <button
                key={s.id}
                onClick={() => start(s.id)}
                className={'rounded-[12px] border p-[16px] text-left transition ' + ((sim?.kind === s.id || (s.id === 'invite' && sim?.kind === 'launch' && sim.launch.host !== SELF_NAME) || (s.id === 'host' && sim?.kind === 'launch' && sim.launch.host === SELF_NAME)) ? 'border-[#5765f2] bg-[#5765f2]/[0.08]' : 'border-[#1c1d21] bg-[#131316] hover:border-[#3a3c42]')}
              >
                <p className="text-[15px] font-semibold text-white">{s.label}</p>
                <p className="mt-[4px] text-[13px] leading-snug text-[#9a9ba3]">{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Feature index */}
        <section className="mt-[44px]">
          <h2 className="text-[24px] font-semibold">Features &amp; user flows</h2>
          <p className="mt-[8px] text-[15px] text-[#9a9ba3]">What changed since the last review, and how each flow works.</p>
          <div className="mt-[18px] grid grid-cols-1 gap-[14px] md:grid-cols-2">
            {OVERVIEW_FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col rounded-[14px] border border-[#1c1d21] bg-[#131316] p-[18px]">
                <div className="flex items-start justify-between gap-[10px]">
                  <h3 className="text-[17px] font-semibold text-white">{f.title}</h3>
                  <span className="shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-wide" style={{ color: tagColor[f.tag] || '#9a9ba3', backgroundColor: (tagColor[f.tag] || '#9a9ba3') + '22' }}>{f.tag}</span>
                </div>
                <p className="mt-[8px] text-[14px] leading-relaxed text-[#b5bac1]">{f.blurb}</p>
                {f.steps && (
                  <ol className="mt-[12px] flex flex-col gap-[6px]">
                    {f.steps.map((st, i) => (
                      <li key={i} className="flex items-center gap-[10px] text-[13px] text-[#c7c9cb]">
                        <span className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-[#8aa0ff]">{i + 1}</span>
                        {st}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
                  {f.sim && <button onClick={() => start(f.sim)} className="rounded-[8px] bg-[#2b2d31] px-[12px] py-[7px] text-[13px] font-semibold text-white transition hover:bg-[#35373c]">▶ Simulate this</button>}
                  {f.link && <a href={f.link.href} className="rounded-[8px] border border-[#4e5058] px-[12px] py-[7px] text-[13px] font-semibold text-white transition hover:bg-white/[0.06]">{f.link.label} ↗</a>}
                  {f.links && f.links.map((l) => <a key={l.label} href={l.href} className="rounded-[8px] border border-[#4e5058] px-[10px] py-[6px] text-[12px] font-semibold text-[#c7c9cb] transition hover:bg-white/[0.06]">{l.label}</a>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-[48px] border-t border-[#1c1d21] pt-[20px] text-[13px] text-[#6f7276]">
          Reachable at <span className="text-[#9a9ba3]">?overview=1</span>. Feature summary current as of Aug 11, 2026.
        </footer>
      </div>

      {/* ── Live toasts (reused app components) ─────────────────────────────── */}
      {sim?.kind === 'spin' && <SpinNotification state={{ spin: { id: sim.id, spinner: sim.spinner, blendName: sim.blendName }, phase: 'spinning' }} />}
      {sim?.kind === 'jam' && !sim.joined && (
        <WheelJamToast host={sim.host} count={sim.count} onJoin={() => setSim((t) => ({ ...t, joined: true }))} onDismiss={clear} />
      )}
      {sim?.kind === 'jam' && sim.joined && (
        <div className="pointer-events-none fixed right-[24px] top-[24px] z-[200] flex justify-end px-4">
          <div className="pointer-events-auto flex items-center gap-[12px] rounded-[14px] border border-[#1c1d21] bg-[#111214] px-[18px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
            <CheckBadge />
            <p className="text-[15px] text-[#dbdee1]">You joined <span className="font-semibold text-white">{capName(sim.host)}</span>’s wheel jam — spinning together.</p>
            <button onClick={clear} aria-label="Dismiss" className="ml-[4px] text-[#7e7f87] transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      )}
      {sim?.kind === 'launch' && (
        <LaunchNotification
          launch={sim.launch}
          readyUp={() => setReady(SELF_NAME, true)}
          undoReady={() => setReady(SELF_NAME, false)}
          decline={clear}
          launchNow={doLaunch}
          clear={clear}
          onLaunch={(title) => setLaunched(title)}
        />
      )}
      {launched && <LaunchToast title={launched} onDone={() => setLaunched(null)} />}

      {/* ── Control dock — always-visible playback controls ─────────────────── */}
      {sim && (
        <div className="fixed inset-x-0 bottom-0 z-[99] flex justify-center px-[16px] pb-[20px]">
          <div className="flex max-w-full flex-wrap items-center gap-[8px] rounded-[14px] border border-[#2b2d31] bg-[#17181b]/95 px-[16px] py-[12px] shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#8aa0ff]">Simulating</span>
            {friendActions.map((a, i) => (
              <button key={i} disabled={a.disabled} onClick={a.onClick} className={'rounded-[8px] px-[12px] py-[7px] text-[13px] font-semibold transition ' + (a.disabled ? 'cursor-default text-[#6f7276]' : 'bg-[#5765f2] text-white hover:brightness-110')}>{a.label}</button>
            ))}
            <button onClick={clear} className="rounded-[8px] border border-[#4e5058] px-[12px] py-[7px] text-[13px] font-semibold text-white transition hover:bg-white/[0.06]">Clear</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Landing() {
  if (IS_OVERVIEW) return <OverviewPage />
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
  const [startPartyOpen, setStartPartyOpen] = useState(false) // home "Start a party" modal
  const [partyGameInit, setPartyGameInit] = useState(null) // game pre-selected when a card starts a party
  const [gameMenu, setGameMenu] = useState(null) // { x, y, title } — global right-click game menu
  const [wheelOpen, setWheelOpen] = useState(false) // the top-bar spin-wheel module
  const [wheelAutoJoin, setWheelAutoJoin] = useState(false) // opened via the jam "Join" toast
  const [wheelKeys, setWheelKeys] = useState([]) // personal wheel game list (session-scoped)
  const [dmName, setDmName] = useState(null)
  const [mixesTab, setMixesTab] = useState(false) // the "Mixes" top-nav tab (Figma 926:4875)
  const [libraryTab, setLibraryTab] = useState(false) // the "Library" top-nav tab — all games
  const [libraryFilter, setLibraryFilter] = useState([]) // active tag filter carried in from a clicked tag

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
  const openLibrary = () => { setLibraryFilter([]); setLibraryTab(true); setMixesTab(false); setBlendId(null); setDmName(null); setDecide(null); setDetailKey(null) }
  // Open the Library pre-filtered by a clicked tag (a fresh array each time so the
  // Library's effect re-applies it even when the same tag is clicked twice).
  const openLibraryFiltered = (facet) => { setLibraryFilter([{ ...facet }]); setLibraryTab(true); setMixesTab(false); setBlendId(null); setDmName(null); setDecide(null); setDetailKey(null) }
  // A clicked card tag (any pill on a game card) → resolve to a Library facet.
  const handleCardTag = (text) => { const f = facetForTag(text); if (f) openLibraryFiltered(f) }
  // Cards hand back a game title; map it to a catalog key and open the detail page.
  const openGame = (titleOrKey, fromOverride) => {
    // Starter keys count as known even without a CATALOG entry — the art-less
    // Library games live only in STARTER_BY_KEY.
    const known = CATALOG[titleOrKey] || STARTER_BY_KEY[titleOrKey]
    const key = known ? titleOrKey : (KEY_OF_TITLE[titleOrKey] || Object.keys(CATALOG).find((k) => CATALOG[k].title === titleOrKey))
    if (!key) return
    recordRecent(key)
    // Remember where we came from so the detail page's Back returns there. A
    // caller can override (the Start-a-party modal wants Back to reopen it).
    setDetailFrom(fromOverride || (dmName ? { dm: dmName } : blendId ? { blend: blendId } : null))
    setDetailKey(key); setDmName(null); setBlendId(null); setDecide(null); setMixesTab(false); setLibraryTab(false)
  }
  // Recently opened games — persisted per identity, powers the Start-a-party
  // modal's "Recent searches" quick picks.
  const RECENT_KEY = `recentGames:${SELF_NAME}`
  const [recentGames, setRecentGames] = useState(() => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } })
  const recordRecent = (key) => setRecentGames((cur) => {
    const next = [key, ...cur.filter((k) => k !== key)].slice(0, 12)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
    return next
  })
  const closeDetail = () => {
    setDetailKey(null)
    if (detailFrom?.dm) setDmName(detailFrom.dm)
    else if (detailFrom?.blend) setBlendId(detailFrom.blend)
    else if (detailFrom?.party) setStartPartyOpen(true)
    setDetailFrom(null)
  }

  // ── Back/forward history (Discord-style global nav) ──────────────────────
  // The primary view is a snapshot of these five nav vars. Every change pushes
  // onto a stack; the arrows walk it. `applying` suppresses the push while a
  // snapshot is being re-applied by back()/forward().
  const [hist, setHist] = useState(() => ({ stack: [{ blendId: null, detailKey: null, dmName: null, decide: null, mixesTab: false, libraryTab: false, startPartyOpen: false }], idx: 0 }))
  const applying = useRef(false)
  useEffect(() => {
    if (IS_SPECTATE) return
    if (applying.current) { applying.current = false; return }
    // startPartyOpen rides in the snapshot so navigating to a game's detail from
    // the modal and pressing Back restores the open modal.
    const cur = { blendId, detailKey, dmName, decide, mixesTab, libraryTab, startPartyOpen }
    setHist((h) => {
      if (JSON.stringify(h.stack[h.idx]) === JSON.stringify(cur)) return h
      const stack = h.stack.slice(0, h.idx + 1)
      stack.push(cur)
      return { stack, idx: stack.length - 1 }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blendId, detailKey, dmName, decide, mixesTab, libraryTab, startPartyOpen])
  // ── Input modality flag ──────────────────────────────────────────────────
  // Text inputs match :focus-visible even on a mouse click, so that pseudo alone
  // can't tell keyboard focus from a click. Track the last interaction and stamp
  // <html data-kbd> only while navigating by keyboard; search fields key their
  // blue focus ring off this so a click never paints one.
  useEffect(() => {
    const root = document.documentElement
    // Tab is the true focus-navigation signal. Arrow keys are excluded so typing
    // (or arrowing) inside a text field doesn't suddenly paint a focus ring.
    const onKey = (e) => { if (e.key === 'Tab') root.setAttribute('data-kbd', '') }
    const onPointer = () => root.removeAttribute('data-kbd')
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onPointer, true) }
  }, [])
  // ── Per-screen landing focus ─────────────────────────────────────────────
  // On every page switch move keyboard focus to the new page's main heading, so
  // screen readers announce the screen and keyboard users start at the top and
  // Tab down. We skip the initial mount (don't yank focus on first load) and any
  // time a modal owns focus (dialogs manage their own).
  const mainRef = useRef(null)
  const navFirstRun = useRef(true)
  useEffect(() => {
    if (IS_SPECTATE) return
    if (navFirstRun.current) { navFirstRun.current = false; return }
    if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) return
    const el = mainRef.current
    if (!el) return
    // The page renders as the last child (after the Sidebar) — scope the heading
    // search there so we don't land on a sidebar heading.
    const pageEl = el.lastElementChild || el
    const target = pageEl.querySelector('[data-page-heading], h1, h2') || pageEl
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus()
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
    setStartPartyOpen(!!v.startPartyOpen)
  }
  const goBack = () => { if (hist.idx <= 0) return; const idx = hist.idx - 1; applyView(hist.stack[idx]); setHist((h) => ({ ...h, idx })) }
  const goForward = () => { if (hist.idx >= hist.stack.length - 1) return; const idx = hist.idx + 1; applyView(hist.stack[idx]); setHist((h) => ({ ...h, idx })) }
  // Start a party for a game (by title or key) from any card's hover action —
  // resolves the game across both catalogs and opens the Start-a-party modal
  // pre-filled with it.
  const startPartyForTitle = (titleOrKey) => {
    const key = (CATALOG[titleOrKey] || STARTER_BY_KEY[titleOrKey]) ? titleOrKey
      : (KEY_OF_TITLE[titleOrKey] || Object.keys(CATALOG).find((k) => CATALOG[k].title === titleOrKey))
    const g = key ? (CATALOG[key] || STARTER_BY_KEY[key]) : null
    if (!key || !g) return
    setPartyGameInit({ key, title: g.title, image: CATALOG[key]?.image || null })
    setStartPartyOpen(true)
  }
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
  const navCtx = { canBack: hist.idx > 0, canForward: hist.idx < hist.stack.length - 1, back: goBack, forward: goForward, openWheel: () => setWheelOpen(true), addToWheel, wheelLive: jamLive, wheelCount: (IS_SPECTATE ? eWheelKeys : wheelKeys).length }

  // Observation plumbing. A live tester publishes their nav + pointer/scroll;
  // a spectator instance reads it back and drives the view read-only.
  const nav = { blendId, detailKey, dmName, decide, mixesTab, libraryTab, createOpen, wishlistGame, shareGame, prefsForId, playKey, whoOpen, gameMenu, wheelOpen, wheelKeys }
  useMirrorPublish(nav)
  const [mirror] = useRoomNode(IS_SPECTATE ? SPECTATE_PATH : 'spectate/__none', null)
  const [cmd] = useRoomNode(IS_LIVE ? `${SPECTATE_PATH}/cmd` : 'spectate/__nocmd', null)

  // ── Global card-hover mirror ─────────────────────────────────────────────
  // One publisher for the whole app: the game title under the pointer (any page,
  // any card tagged data-game). A spectate instance reads it and feeds it to
  // SpectateHoverCtx, which every game card consults to force its hover reveal
  // on (a moderator can't actually hover the mirror).
  const hoverGameRef = useRef(null)
  const publishHoverGame = (title) => {
    if (!IS_LIVE || hoverGameRef.current === title) return
    hoverGameRef.current = title
    writeRoomPath(`${SPECTATE_PATH}/hoverGame`, title || null)
  }
  const [hoverGameNode] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/hoverGame` : 'spectate/__nohg', null)
  const eHoverGame = IS_SPECTATE ? (hoverGameNode ?? null) : null

  // The avatar name/label tooltips are :hover-only too. Publish the KEY of the
  // hovered avatar chip (identity, not geometry — so it survives the row's
  // horizontal scroll) and feed it to SpectateAvCtx, which each PlayerAvatar /
  // ShareAvatars consults to force its own tooltip on.
  const hoverAvRef = useRef(null)
  const publishHoverAv = (key) => {
    if (!IS_LIVE || hoverAvRef.current === key) return
    hoverAvRef.current = key
    writeRoomPath(`${SPECTATE_PATH}/hoverAv`, key || null)
  }
  const [hoverAvNode] = useRoomNode(IS_SPECTATE ? `${SPECTATE_PATH}/hoverAv` : 'spectate/__nohav', null)
  const eHoverAv = IS_SPECTATE ? (hoverAvNode ?? null) : null

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
  const eWheelOpen = IS_SPECTATE ? !!mv.wheelOpen : wheelOpen
  const eWheelKeys = IS_SPECTATE ? (mv.wheelKeys || []) : wheelKeys

  // The live launch party — shared, so its ready-up toast reaches every page.
  const party = useLaunch()

  // The wheel lands into a party: the spinner hosts the picked game and everyone
  // on the call right then is invited. The wheel itself is personal/local (see
  // WheelModal), so this is the single synced moment.
  const startWheelParty = (game) => {
    const g = CATALOG[game.key]
    const invitees = [...new Set(room.online || [])].filter((n) => n !== SELF_NAME)
    // No-art games have no image — send null (the room DB rejects undefined).
    party.start({ key: game.key, title: game.title, image: g?.image || null }, invitees)
  }

  // A SYNCED wheel spin surfaces as a cross-page notification (below) rather than
  // yanking everyone into the full modal. Track which spin's toast was dismissed.
  const [wheelNotifDismissed, setWheelNotifDismissed] = useState(null)

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
        onMouseOver={IS_LIVE ? (e) => {
          const gEl = e.target.closest?.('[data-game]'); publishHoverGame(gEl ? gEl.getAttribute('data-game') : null)
          const aEl = e.target.closest?.('[data-av]'); publishHoverAv(aEl ? aEl.getAttribute('data-av') : null)
        } : undefined}
        onMouseLeave={IS_LIVE ? () => { publishHoverGame(null); publishHoverAv(null) } : undefined}
      >
        <SpectateHoverCtx.Provider value={eHoverGame}>
        <SpectateAvCtx.Provider value={eHoverAv}>
        <TagCtx.Provider value={handleCardTag}>
        <PartyCtx.Provider value={IS_SPECTATE ? null : startPartyForTitle}>
        <WheelCtx.Provider value={IS_SPECTATE ? null : addToWheel}>
        <NavCtx.Provider value={navCtx}>
        <TopBar />
        <div className="group/rail relative flex min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: D.rail }}>
        <ServerRail />
        {/* The menu (sidebar) + main content — flush to the window, with only the
            top-left corner rounded and a gray border on the top + left edges
            (against the server rail). */}
        <div ref={mainRef} className="flex min-h-0 flex-1 overflow-hidden rounded-tl-[10px] border-l border-t border-white/10">
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
          <BlendPage key={blend.id} blend={blend} onBack={() => setBlendId(null)} onDecide={() => setPrefsForId(blend.id)} onOpen={openGame} onPlay={setPlayKey} onShare={setShareGame} onWishlist={setWishlistGame} onHome={goHome} onLibrary={openLibrary} onMixes={openMixes} />
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
            onLibraryTag={openLibraryFiltered}
          />
        ) : eLibraryTab ? (
          <LibraryPage onHome={goHome} onMixes={openMixes} onOpen={openGame} initialFilter={libraryFilter} onWishlist={setWishlistGame} onShare={setShareGame} />
        ) : eMixesTab ? (
          <MixesPage onHome={goHome} onLibrary={openLibrary} onOpenBlend={(b) => openBlend(b.id)} onCreate={() => setCreateOpen(true)} onOpen={openGame} />
        ) : (
          <Content onOpenBlend={(b) => openBlend(b.id)} onCreateBlend={() => setCreateOpen(true)} onWishlist={setWishlistGame} onShare={setShareGame} onOpen={openGame} onWhosOn={() => setWhoOpen(true)} onHome={goHome} onMixes={openMixes} onLibrary={openLibrary} menuGame={eGameMenu?.title || null} party={party} onStartParty={() => setStartPartyOpen(true)} onAddToWheel={addToWheel} />
        )}
        </div>
        {/* Voice + user panel — a rounded card floating at the bottom-left,
            overlapping the server rail + sidebar. */}
        <div className="absolute bottom-[8px] left-[8px] z-[40] w-[298px]"><VoiceUserPanel /></div>
        </div>
        {eCreateOpen && <CreateBlendModal onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setBlendId(id) }} />}
        {startPartyOpen && !IS_SPECTATE && (
          <StartPartyModal
            initialGame={partyGameInit}
            recent={recentGames}
            onOpenGame={(k) => { setStartPartyOpen(false); setPartyGameInit(null); openGame(k, { party: true }) }}
            onClose={() => { setStartPartyOpen(false); setPartyGameInit(null) }}
            onStart={(game, invitees) => {
              if (!invitees.length) setLaunching(game.title)
              else party.start(game, invitees)
              setStartPartyOpen(false); setPartyGameInit(null)
            }}
          />
        )}
        {eWhoOpen && <WhosOnModal onClose={() => setWhoOpen(false)} onCreated={(id) => { setWhoOpen(false); setBlendId(id) }} />}
        {eWishlistGame && <WishlistModal game={eWishlistGame} onClose={() => setWishlistGame(null)} onAddToWheel={addToWheel} />}
        {eShareGame && (typeof eShareGame === 'object' && eShareGame.to
          ? <QuickShareModal game={eShareGame.title} to={eShareGame.to} hrs={eShareGame.hrs} onClose={() => setShareGame(null)} />
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
          // The game-detail / blend "Start a party" flow uses the same modal as the
          // recommended cards, with the game pre-selected.
          <StartPartyModal
            initialGame={{ key: ePlayKey, title: CATALOG[ePlayKey].title, image: CATALOG[ePlayKey].image }}
            recent={recentGames}
            onOpenGame={(k) => { setPlayKey(null); openGame(k) }}
            onClose={() => setPlayKey(null)}
            onStart={(game, invitees) => {
              // Solo (no one invited) launches straight away — no ready-up party.
              if (!invitees.length) setLaunching(game.title)
              else party.start(game, invitees)
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
              { label: 'Add to PlayList', icon: BOOKMARK_MENU_GLYPH, onClick: () => { setWishlistGame(eGameMenu.title); setGameMenu(null) } },
              { label: 'Add to Wheel', icon: WHEEL_MENU_GLYPH, onClick: () => { addToWheel(eGameMenu.title); setGameMenu(null) } },
              { label: 'Share', icon: SHARE_MENU_GLYPH, onClick: () => { setShareGame(eGameMenu.title); setGameMenu(null) } },
            ]}
          />
        )}

        {/* The spin wheel — a standalone module opened from the top bar. In
            spectate the moderator sees the participant's wheel (open state + its
            games mirrored); it renders read-only like the rest of the mirror. */}
        {eWheelOpen && (
          <WheelModal
            keys={eWheelKeys}
            setKeys={setWheelKeys}
            blends={blends}
            online={room.online}
            onParty={startWheelParty}
            autoJoin={IS_SPECTATE ? false : wheelAutoJoin}
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
        {/* Synced-wheel toast — who's spinning, then the pick + actions. Hidden
            while the full wheel modal is open (you already see it there). */}
        {!IS_SPECTATE && inJam && !wheelOpen && callWheelRoot?.spin && wheelNotifDismissed !== callWheelRoot.spin.id && (
          <WheelNotification
            spin={callWheelRoot.spin}
            onOpenWheel={() => setWheelOpen(true)}
            onStartParty={(picked) => { startWheelParty(picked); setWheelNotifDismissed(callWheelRoot.spin.id) }}
            onRestart={() => { setWheelAutoJoin(true); setWheelOpen(true) }}
            onDismiss={() => setWheelNotifDismissed(callWheelRoot.spin.id)}
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
        </WheelCtx.Provider>
        </PartyCtx.Provider>
        </TagCtx.Provider>
        </SpectateAvCtx.Provider>
        </SpectateHoverCtx.Provider>
      </div>
    </RoomProvider>
  )
}
