import { Fragment, useEffect, useRef, useState } from 'react'
import { RecCard, CardRow, AVATAR } from './RecCard.jsx'
import { useRoom, RoomProvider, useRoomCtx, useRoomNode } from './room.js'
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
} from './assets/figma/index.js'

// ── Active tester profile, from the URL (?u=abby|blake|chloe|daniel) ────────
// No login: each tester opens their own link and `SELF` is their identity.
const COLOR_OF = { abby: AVATAR.green, blake: AVATAR.blue, chloe: AVATAR.purple, daniel: AVATAR.red }
const _u = new URLSearchParams(window.location.search).get('u')
const SELF_NAME = COLOR_OF[_u] ? _u : 'abby'
const SELF = COLOR_OF[SELF_NAME]

/* ── Discord dark palette (from the reference screenshot) ──────────────────
 * A darker-than-default Discord: near-black rail, very dark panel, raised
 * rows for active/hover, muted gray text, one online green accent. Kept in the
 * sidebar only — the Xbox content area keeps its own hi-fi styling. */
const D = {
  rail: '#050506',
  panel: '#0f0f12',
  raised: '#1c1d21',
  hover: '#17181b',
  inset: '#060607',
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

function ServerRail() {
  return (
    <nav
      className="flex h-full w-[72px] shrink-0 flex-col items-center gap-[8px] overflow-y-auto py-[12px] no-scrollbar"
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
const DMS = [
  { name: 'abby', color: AVATAR.green },
  { name: 'blake', color: AVATAR.blue, status: 'Playing Sea of Thieves' },
  { name: 'chloe', color: AVATAR.purple, status: 'Listening to Spotify' },
  { name: 'daniel', color: AVATAR.red, status: 'Streaming Minecraft' },
]

function NavItem({ icon, label, active }) {
  return (
    <button
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

function DmRow({ name, color, status, online }) {
  return (
    <button
      className="flex h-[44px] w-full items-center gap-[12px] rounded-[6px] px-[8px] transition-colors"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = D.hover }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <div className="relative shrink-0">
        <Avatar color={color} size={32} />
        <span
          className="absolute -bottom-[2px] -right-[2px] size-[12px] rounded-full"
          style={{ backgroundColor: online ? D.green : '#43454b', border: `3px solid ${D.panel}` }}
        />
      </div>
      <div className="flex min-w-0 flex-col items-start leading-tight">
        <span className="truncate text-[15px] font-semibold" style={{ color: online ? '#fff' : D.text }}>{name}</span>
        {online ? (
          <span className="text-[12px]" style={{ color: D.mute }}>Online</span>
        ) : status ? (
          <span className="truncate text-[12px]" style={{ color: D.mute }}>{status}</span>
        ) : null}
      </div>
    </button>
  )
}

function Sidebar({ online = [], onReset }) {
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1'
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col" style={{ backgroundColor: D.panel }}>
      {/* Search */}
      <div className="p-[8px]">
        <div className="flex h-[32px] items-center rounded-[4px] px-[8px] text-[13px]" style={{ backgroundColor: D.inset, color: D.mute }}>
          Find or start a conversation
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-[8px]">
        <div className="flex flex-col gap-[2px] pt-[2px]">
          {NAV.map((n) => <NavItem key={n.label} icon={n.icon} label={n.label} />)}
          <NavItem
            active
            label="Xbox on Discord"
            icon={<XboxLogo size={20} />}
          />
        </div>

        <div className="my-[10px] h-px" style={{ backgroundColor: '#26272b' }} />

        <div className="flex items-center justify-between px-[8px] pb-[4px]">
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>
            Direct Messages
          </span>
          <span className="text-[18px] leading-none" style={{ color: D.mute }}>+</span>
        </div>
        <div className="flex flex-col gap-[2px]">
          {DMS.filter((d) => d.name !== SELF_NAME).map((d) => (
            <DmRow key={d.name} {...d} online />
          ))}
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

      {/* Voice connected bar */}
      <div className="mx-[8px] mb-[2px] flex items-center justify-between rounded-[8px] px-[8px] py-[6px]" style={{ backgroundColor: D.inset }}>
        <div className="flex items-center gap-[8px]">
          <svg viewBox="0 0 24 24" className="size-[18px]" style={{ color: D.green }} fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4Zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" /></svg>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold" style={{ color: D.green }}>Voice Connected</div>
            <div className="text-[12px]" style={{ color: D.mute }}>General · Xbox on Discord</div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" className="size-[18px]" style={{ color: D.dim }} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1Z" /></svg>
      </div>

      {/* User bar */}
      <div className="flex h-[52px] items-center gap-[8px] px-[8px]" style={{ backgroundColor: D.inset }}>
        <div className="relative">
          <Avatar color={SELF} size={32} />
          <span className="absolute -bottom-[1px] -right-[1px] size-[11px] rounded-full" style={{ backgroundColor: D.green, border: `3px solid ${D.inset}` }} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold text-white">{SELF_NAME}</div>
          <div className="truncate text-[12px]" style={{ color: D.mute }}>Online</div>
        </div>
        <div className="flex gap-[2px]" style={{ color: D.dim }}>
          {[
            <svg key="m" viewBox="0 0 24 24" className="size-[20px]" fill="currentColor"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>,
            <svg key="h" viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" stroke="none" /><rect x="17.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" stroke="none" /></svg>,
            <svg key="c" viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>,
          ].map((el, i) => (
            <button key={i} className="flex size-[32px] items-center justify-center rounded-[4px] transition-colors hover:bg-white/5">{el}</button>
          ))}
        </div>
      </div>
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
  { avatars: [AVATAR.green], label: 'wishlisted this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol, free: true, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red] },
  { avatars: [AVATAR.red, AVATAR.purple], label: 'played this for 4 hours', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, owners: [AVATAR.green, AVATAR.blue, AVATAR.purple, AVATAR.red], shared: true },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, owners: [AVATAR.green, AVATAR.purple] },
]

const shelfFriends = [
  { avatars: [AVATAR.green], label: 'wishlisted this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, owners: [AVATAR.green, AVATAR.red] },
  { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: details.monsterHunter, owners: [AVATAR.blue, AVATAR.red], shared: true },
  { avatars: [AVATAR.red], label: 'wishlisted this game', players: '1-8', image: heroGangBeasts, video: { youTubeId: 'Lm3HDdLufmA', poster: heroGangBeasts }, details: details.gangBeasts, owners: [AVATAR.purple, AVATAR.red] },
  { avatars: [AVATAR.purple], label: 'wishlisted this game', players: '1-4', image: heroWildHearts, video: { youTubeId: '8vw9PlFrrOk', poster: heroWildHearts }, details: details.wildHearts, owners: [AVATAR.blue] },
  { avatars: [AVATAR.red], label: 'recommends this game', players: '1-4', image: heroMinecraftDungeons, video: { youTubeId: 'TxNH6bapa3A', poster: heroMinecraftDungeons }, details: details.minecraftDungeons, owners: [AVATAR.red, AVATAR.purple] },
]

const shelfMore = [
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves },
  { avatars: [AVATAR.purple], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft },
  { avatars: [AVATAR.green], label: 'wishlisted this game', players: '1-5', image: heroLol, video: { youTubeId: 'p4QG59y6FGE', poster: heroLol }, details: details.lol },
  { avatars: [AVATAR.red], label: 'wishlisted this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded },
]

// "For you" portrait tiles (landscape hero art cropped into portrait covers).
const FORYOU = [
  { title: 'Minecraft', image: heroMinecraft },
  { title: 'Sea of Thieves', image: heroSeaOfThieves },
  { title: "Assassin's Creed", image: heroAc },
  { title: 'Overcooked! 2', image: heroOvercooked },
  { title: 'Grounded', image: heroGrounded },
  { title: 'Monster Hunter Rise', image: heroMonsterHunter },
  { title: 'Human: Fall Flat', image: heroHumanFallFlat },
  { title: 'For Honor', image: heroForHonor },
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
// Social proof from the OTHER testers (never the viewer), varied per card.
function socialProof(i) {
  const others = ALL_COLORS.filter((c) => c !== SELF)
  const who = others[i % others.length]
  const name = capName(NAME[who])
  const variants = [
    { avatars: [who], label: `${name} recommends this` },
    { avatars: others.slice(0, 2), label: 'popular with your friends' },
    { avatars: [who], label: `${name} plays this a lot` },
    { avatars: [who], label: `wishlisted by ${name}` },
    { avatars: others, label: 'a hit in your groups' },
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
    foryou: ['minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'minecraftDungeons', 'gangBeasts', 'seaOfThieves'],
    rows: [
      { mode: 'expand', title: 'Made for your co-op nights', subtitle: 'Chaotic, low-stakes games you can finish in a session.', games: ['overcooked', 'humanFallFlat', 'gangBeasts', 'minecraft', 'grounded'] },
      { mode: 'overlay', title: 'Because you love to build', subtitle: 'Cozy building and survival, matched to your hours.', games: ['minecraft', 'grounded', 'minecraftDungeons', 'seaOfThieves', 'humanFallFlat'] },
      { mode: 'steam', title: 'Recommended based on what you play', subtitle: 'Hover a card for the full read.', games: ['overcooked', 'minecraft', 'grounded', 'humanFallFlat', 'gangBeasts', 'minecraftDungeons'] },
      { mode: 'expanded', title: 'More to jump into', subtitle: 'The full read, up front.', games: ['gangBeasts', 'overcooked', 'minecraft', 'grounded'] },
    ],
  },
  blake: {
    foryou: ['seaOfThieves', 'grounded', 'minecraft', 'monsterHunter', 'wildHearts', 'minecraftDungeons', 'overcooked'],
    rows: [
      { mode: 'expand', title: 'Set sail this week', subtitle: 'Big open worlds and survival crews, picked for you.', games: ['seaOfThieves', 'grounded', 'minecraft', 'monsterHunter', 'wildHearts'] },
      { mode: 'overlay', title: 'Because you can’t put down survival', subtitle: 'More craft-and-survive loops matched to your hours.', games: ['grounded', 'minecraft', 'seaOfThieves', 'monsterHunter', 'minecraftDungeons'] },
      { mode: 'steam', title: 'Recommended based on what you play', subtitle: 'Hover a card for the full read.', games: ['seaOfThieves', 'monsterHunter', 'grounded', 'wildHearts', 'minecraft', 'overcooked'] },
      { mode: 'expanded', title: 'More to jump into', subtitle: 'The full read, up front.', games: ['monsterHunter', 'seaOfThieves', 'grounded', 'wildHearts'] },
    ],
  },
  chloe: {
    foryou: ['monsterHunter', 'wildHearts', 'lol', 'seaOfThieves', 'grounded', 'minecraft', 'overcooked'],
    rows: [
      { mode: 'expand', title: 'For the hunt', subtitle: 'Action-RPGs and boss fights that reward the grind.', games: ['monsterHunter', 'wildHearts', 'seaOfThieves', 'grounded', 'lol'] },
      { mode: 'overlay', title: 'Because you love a challenge', subtitle: 'Competitive and combat-heavy picks matched to your hours.', games: ['lol', 'monsterHunter', 'wildHearts', 'seaOfThieves', 'minecraft'] },
      { mode: 'steam', title: 'Recommended based on what you play', subtitle: 'Hover a card for the full read.', games: ['monsterHunter', 'wildHearts', 'lol', 'grounded', 'seaOfThieves', 'overcooked'] },
      { mode: 'expanded', title: 'More to jump into', subtitle: 'The full read, up front.', games: ['wildHearts', 'monsterHunter', 'lol', 'grounded'] },
    ],
  },
  daniel: {
    foryou: ['gangBeasts', 'overcooked', 'humanFallFlat', 'lol', 'minecraftDungeons', 'minecraft', 'monsterHunter'],
    rows: [
      { mode: 'expand', title: 'Bring the chaos', subtitle: 'Party brawlers and pile-ups, best with a full lobby.', games: ['gangBeasts', 'overcooked', 'humanFallFlat', 'lol', 'minecraftDungeons'] },
      { mode: 'overlay', title: 'Because you love a good mess', subtitle: 'Loud, silly, competitive nights matched to your hours.', games: ['humanFallFlat', 'gangBeasts', 'overcooked', 'lol', 'minecraft'] },
      { mode: 'steam', title: 'Recommended based on what you play', subtitle: 'Hover a card for the full read.', games: ['gangBeasts', 'overcooked', 'humanFallFlat', 'lol', 'minecraftDungeons', 'monsterHunter'] },
      { mode: 'expanded', title: 'More to jump into', subtitle: 'The full read, up front.', games: ['overcooked', 'gangBeasts', 'humanFallFlat', 'minecraftDungeons'] },
    ],
  },
}

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
const SEED_BLENDS = BLENDS.map((b) => ({ ...b, id: slug(b.name), wishlist: b.games.slice(0, 4) }))

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

function PortraitTile({ title, image }) {
  return (
    <button className="group flex w-[184px] shrink-0 flex-col text-left">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-[10px] bg-[#1a1a1d]">
        <img alt="" src={image} loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
      </div>
      <p className="mt-[8px] text-[15px] font-medium leading-tight text-white">{title}</p>
    </button>
  )
}

function BlendCard({ name, color, members, onOpen }) {
  return (
    <button onClick={onOpen} className="group flex w-[160px] shrink-0 flex-col text-left">
      <div
        className="size-[160px] rounded-[20px] transition-transform duration-200 group-hover:-translate-y-[3px]"
        style={{ backgroundColor: color }}
      />
      <p className="mt-[10px] text-[16px] font-semibold text-white">{name}</p>
      <div className="mt-[7px] flex items-center gap-[5px]">
        {members.map((c, i) => (
          <span key={i} className="size-[14px] rounded-full" style={{ backgroundColor: c, boxShadow: '0 0 0 2px #0c0c0e' }} />
        ))}
      </div>
    </button>
  )
}

// The blurple "create" card that leads the Blends row (Figma 550:979).
function CreateBlendCard({ onClick }) {
  return (
    <button onClick={onClick} className="group flex w-[160px] shrink-0 flex-col text-left">
      <div className="flex size-[160px] items-center justify-center rounded-[20px] bg-[#5765f2] transition-transform duration-200 group-hover:-translate-y-[3px]">
        <svg viewBox="0 0 24 24" className="size-[40px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <p className="mt-[10px] text-[16px] font-semibold text-white">Create a new &ldquo;Blend&rdquo;</p>
    </button>
  )
}

function SectionHeading({ children, size = 34 }) {
  return <p className="font-semibold tracking-tight text-white" style={{ fontSize: size }}>{children}</p>
}

// ── Xbox content area ───────────────────────────────────────────────────────
// Steam-style row — the original game cards with a Steam detail flyout on hover.
const STEAM_ROW = [
  { avatars: [AVATAR.green], label: 'recommends this game', players: '1+', image: heroMinecraft, video: { youTubeId: '-1Sy6iz43vg', poster: heroMinecraft }, details: details.minecraft, steam: { released: 'Nov 18, 2011', desc: 'Build, explore and survive in an infinite world of blocks — solo or with friends. Mine deep, craft anything, and make the world your own.', review: 'Overwhelmingly Positive', reviews: '2.4M', tags: ['Sandbox', 'Survival', 'Building', 'Multiplayer'] } },
  { avatars: [AVATAR.blue, AVATAR.green], label: 'played this for 2.5 hours', players: '1-4', image: heroSeaOfThieves, video: { youTubeId: 'QntMfX3FkZQ', poster: heroSeaOfThieves }, details: details.seaOfThieves, steam: { released: 'Jun 3, 2020', desc: 'A shared-world pirate adventure — sail, fight and hunt treasure with your crew across an open ocean full of other real players.', review: 'Very Positive', reviews: '312K', tags: ['Adventure', 'Open World', 'Pirates', 'Co-op'] } },
  { avatars: [AVATAR.red], label: 'wishlisted this game', players: '1-4', image: heroOvercooked, video: { youTubeId: 'uKLb8D36YKk', poster: heroOvercooked }, details: details.overcooked, steam: { released: 'Aug 7, 2018', desc: 'Chaotic co-op cooking across wobbling, falling-apart kitchens. Chop, cook and serve before the timer runs out.', review: 'Very Positive', reviews: '58K', tags: ['Co-op', 'Party', 'Casual', 'Local Multiplayer'] } },
  { avatars: [AVATAR.purple], label: 'recommends this game', players: '1-8', image: heroHumanFallFlat, video: { youTubeId: 'maiYKaZNG7Y', poster: heroHumanFallFlat }, details: details.humanFallFlat, steam: { released: 'Jul 22, 2016', desc: 'Floppy physics puzzles in surreal dreamscapes. No skill floor at all, endless slapstick, and better with friends.', review: 'Overwhelmingly Positive', reviews: '180K', tags: ['Puzzle', 'Physics', 'Co-op', 'Funny'] } },
  { avatars: [AVATAR.purple, AVATAR.green], label: 'played this for 6 hours', players: '1-4', image: heroGrounded, video: { youTubeId: 'zBD-GS61Gto', poster: heroGrounded }, details: details.grounded, steam: { released: 'Sep 27, 2022', desc: 'Shrunk to the size of an ant, survive the backyard: build bases, brew gear and fight off giant bugs with friends.', review: 'Very Positive', reviews: '96K', tags: ['Survival', 'Co-op', 'Crafting', 'Adventure'] } },
  { avatars: [AVATAR.blue], label: 'recommends this game', players: '1-4', image: heroMonsterHunter, video: { youTubeId: 'O0tc1ODHma8', poster: heroMonsterHunter }, details: details.monsterHunter, steam: { released: 'Jan 12, 2022', desc: 'Hunt colossal monsters, craft mighty gear, and chain fluid aerial combat with the new Wirebug.', review: 'Very Positive', reviews: '110K', tags: ['Action RPG', 'Co-op', 'Hunting', 'Multiplayer'] } },
]

// Row display order (by hover style): overlay → expanded → steam → expand.
const ROW_ORDER = { overlay: 0, expanded: 1, steam: 2, expand: 3 }

function Content({ onOpenBlend, onCreateBlend, onWishlist, onShare }) {
  const { blends } = useRoomCtx()
  const recs = RECS[SELF_NAME] || RECS.abby
  const orderedRows = [...recs.rows].sort((a, b) => (ROW_ORDER[a.mode] ?? 9) - (ROW_ORDER[b.mode] ?? 9))
  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      {/* Top nav */}
      <header className="flex h-[56px] shrink-0 items-center gap-[32px] border-b border-[#1c1d21] px-[40px]">
        <XboxLogo size={24} />
        <button className="border-b-2 border-white pb-[2px] text-[16px] font-medium text-white">Home</button>
        <button className="pb-[2px] text-[16px] font-medium text-[#9a9ba3] hover:text-white">Library</button>
        <div className="flex flex-1 items-center justify-end gap-[20px]">
          <img alt="Search" src={searchIcon} className="size-[22px] opacity-80" />
        </div>
      </header>

      {/* Scrollable landing */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[36px]">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Hero — centered (Figma 550:979) */}
          <section className="flex flex-col items-center text-center">
            <h1 className="text-[56px] font-semibold leading-[1.05] tracking-tight text-white">Product Name</h1>
            <p className="mt-[10px] max-w-[560px] text-[18px] leading-snug text-[#e7e7e7]">
              Jump into 200+ Xbox games instantly, powered by the cloud and playable right inside Discord.
            </p>
            {/* Game Pass pill */}
            <div className="mt-[22px] flex items-center gap-[12px] rounded-full border border-white/10 bg-white/[0.06] px-[18px] py-[8px]">
              <div className="flex items-center">
                {[AVATAR.blue, AVATAR.purple, AVATAR.green].map((c, i) => (
                  <Avatar key={i} color={c} size={26} style={{ marginRight: i < 2 ? -10 : 0, boxShadow: '0 0 0 2px #0c0c0e' }} />
                ))}
              </div>
              <span className="text-[15px] font-medium text-white">Join your friends on</span>
              <span className="flex items-center gap-[6px]">
                <XboxLogo size={16} />
                <span className="text-[13px] font-bold uppercase tracking-wide text-[#95ff00]">Game Pass</span>
              </span>
            </div>
            {/* Subscribe / Gift */}
            <div className="mt-[14px] flex items-center gap-[10px]">
              <button className="rounded-[8px] bg-white px-[26px] py-[9px] text-[15px] font-semibold text-black transition hover:bg-white/90">Subscribe</button>
              <button className="rounded-[8px] bg-[#2b2d31] px-[26px] py-[9px] text-[15px] font-semibold text-white transition hover:bg-[#35373c]">Gift</button>
            </div>
            <p className="mt-[10px] text-[12px] text-[#9a9ba3]">Plans start at $XX.99/month · cancel anytime</p>
          </section>

          {/* Your Blends — centered, colored cards (Figma 550:979) */}
          <section className="mt-[48px] flex flex-col items-center">
            <SectionHeading size={24}>Your &ldquo;Blends&rdquo;</SectionHeading>
            <div className="mt-[24px] flex max-w-full flex-wrap justify-center gap-x-[16px] gap-y-[24px]">
              <CreateBlendCard onClick={onCreateBlend} />
              {blends.filter((b) => (b.members || []).includes(SELF)).map((b) => <BlendCard key={b.id} {...b} onOpen={() => onOpenBlend(b)} />)}
            </div>
          </section>

          {/* Recommendation rows — personal to this profile. The "For you"
              portrait tiles sit between "More to jump into" and "Recommended
              based on what you play" (after the 2nd row). */}
          {orderedRows.map((row, ri) => (
            <Fragment key={ri}>
              <CardRow
                title={row.title}
                subtitle={row.subtitle}
                cards={row.games.map((k, i) => mkCard(k, i, row.mode === 'steam' ? { steam: true } : undefined))}
                overlay={row.mode === 'overlay'}
                expanded={row.mode === 'expanded'}
                onWishlist={onWishlist}
                onShare={onShare}
              />
              {ri === 1 && (
                <section className="mt-[52px]">
                  <SectionHeading size={40}>For you</SectionHeading>
                  <div className="no-scrollbar mt-[24px] flex gap-[18px] overflow-x-auto pb-[8px]">
                    {recs.foryou.map((k) => <PortraitTile key={k} title={CATALOG[k].title} image={CATALOG[k].image} />)}
                  </div>
                </section>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </main>
  )
}

// ── Blend group page (Figma node 489:2783) ─────────────────────────────────
function FeedRow({ who, text, when }) {
  return (
    <div className="flex items-start gap-[10px]">
      <Avatar color={who} size={28} />
      <p className="flex-1 text-[13px] leading-snug text-[#b5bac1]">
        <span className="font-semibold text-white">{NAME[who]}</span> {text}
      </p>
      <span className="shrink-0 text-[11px]" style={{ color: when === 'live' ? '#95ff00' : '#7e7f87' }}>{when}</span>
    </div>
  )
}

// Xbox-green pill that kicks off the "decide a game" flow — sits to the right
// of a blend's title.
function XboxDecideButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group/dec flex shrink-0 items-center gap-[10px] rounded-[12px] bg-[#107C10] px-[20px] py-[12px] text-[15px] font-semibold text-white shadow-[0_4px_18px_rgba(16,124,16,0.45)] transition hover:-translate-y-[1px] hover:bg-[#0e8f0e]"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7v5l3 2" />
      </svg>
      Decide a game
    </button>
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
      className="fixed z-[70] w-[204px] overflow-hidden rounded-[10px] border border-[#1c1d21] bg-[#111214] py-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
      style={{ top: Math.max(8, topY), left: Math.max(8, left) }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="my-[6px] h-px bg-[#1c1d21]" />
        ) : (
          <button
            key={i}
            onClick={it.onClick}
            className={
              'flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left text-[14px] transition ' +
              (it.primary ? 'font-semibold text-[#3fbf3f] hover:bg-[#107C10]/15' : 'text-[#dbdee1] hover:bg-white/5')
            }
          >
            <span className="flex size-[18px] items-center justify-center">{it.icon}</span>
            {it.label}
          </button>
        )
      )}
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
    <div className="fixed bottom-[24px] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-[12px] rounded-[12px] border border-[#1c1d21] bg-[#111214] px-[20px] py-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      <span className="flex size-[24px] items-center justify-center rounded-full bg-[#107C10]">
        <svg viewBox="0 0 24 24" className="size-[12px] text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </span>
      <span className="text-[15px] text-white">Launching <span className="font-semibold">{title}</span>…</span>
    </div>
  )
}

const PLAY_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
const BOOKMARK_MENU_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
const LINK_GLYPH = <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 15l6-6M8 7h2m4 0h2a3 3 0 0 1 0 6h-1M10 17H8a3 3 0 0 1 0-6h1" /></svg>

function BlendPage({ blend, onBack, onDecide }) {
  const [menu, setMenu] = useState(null) // { x, y, title }
  const [launching, setLaunching] = useState(null)
  function openMenu(e, title) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, title })
  }
  function launch(title) {
    setMenu(null)
    setLaunching(title)
  }
  const { blends, setBlends } = useRoomCtx()
  const games = blend.games.map((k) => CATALOG[k])
  const m = blend.members
  // Activity feed — includes you (green/sauhee) alongside the other members.
  const feed = [
    { who: SELF, text: `wishlisted ${games[2].title}`, when: '1h' },
    { who: m[1] || SELF, text: `finished ${games[0].title} and left it five stars`, when: '2h' },
    { who: m[2] || m[1] || SELF, text: `is in a ${games[1].title} lobby — one seat open`, when: 'live' },
    { who: SELF, text: `added ${games[3].title} to the group list`, when: 'yest' },
    { who: m[1] || SELF, text: `pinned ${blend.when} as their free window`, when: '2d' },
  ]

  // Rankable group wishlist — shared. Dragging reorders blend.wishlist for
  // everyone in the room (writes the new order to the realtime DB).
  const wishKeys = blend.wishlist || blend.games.slice(0, 4)
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
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[28px]">
        <div className="mx-auto w-full max-w-[1200px]">
          <button
            onClick={onBack}
            className="mb-[24px] flex items-center gap-[8px] text-[15px] font-semibold text-[#9a9ba3] transition hover:text-white"
          >
            <span className="text-[18px] leading-none">←</span> Back
          </button>

          {/* Header — cover quad + name + members + refresh note */}
          <div className="flex items-center gap-[28px]">
            <div className="grid size-[184px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden rounded-[16px]">
              {games.slice(0, 4).map((g, i) => (
                <img key={i} alt="" src={g.image} className="size-full object-cover" />
              ))}
            </div>
            <div>
              <h1 className="text-[52px] font-semibold leading-none tracking-tight text-white">{blend.name}</h1>
              <div className="mt-[16px] flex items-center gap-[10px] text-[18px] text-[#e7e7e7]">
                A Blend of games for
                <span className="flex items-center">
                  {blend.members.map((c, i) => (
                    <Avatar key={i} color={c} size={30} style={{ marginRight: i < blend.members.length - 1 ? -10 : 0, boxShadow: '0 0 0 2px #0c0c0e' }} />
                  ))}
                </span>
              </div>
              <p className="mt-[10px] text-[15px] font-semibold text-white">Refreshes daily.</p>
            </div>

            {/* Decide-a-game entry point — off to the right of the title */}
            <div className="ml-auto self-start pt-[6px]">
              <XboxDecideButton onClick={onDecide} />
            </div>
          </div>

          <div className="my-[28px] h-px bg-[#1c1d21]" />

          {/* Group wishlist — numbered, drag to rank */}
          <section>
            <div className="mb-[18px] flex items-baseline gap-[14px]">
              <h2 className="text-[28px] font-semibold text-white">Your Group Wishlist</h2>
              <span className="text-[12px] font-medium text-[#7e7f87]">drag to rank</span>
              <button className="ml-auto text-[12px] font-semibold uppercase tracking-wide text-[#9a9ba3] transition hover:text-white">View entire wishlist</button>
            </div>
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
                  onContextMenu={(e) => openMenu(e, g.title)}
                  className={
                    'w-[320px] shrink-0 cursor-grab select-none rounded-[14px] p-[6px] ring-2 transition active:cursor-grabbing ' +
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
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Launch game', icon: PLAY_GLYPH, primary: true, onClick: () => launch(menu.title) },
            { divider: true },
            { label: 'Add to wishlist', icon: BOOKMARK_MENU_GLYPH, onClick: () => setMenu(null) },
            { label: 'Copy store link', icon: LINK_GLYPH, onClick: () => setMenu(null) },
          ]}
        />
      )}
      {launching && <LaunchToast title={launching} onDone={() => setLaunching(null)} />}
    </main>
  )
}

// ── Create a "Blend" modal (Figma node 531:2105) ───────────────────────────
function CreateBlendModal({ onClose, onCreated }) {
  const { blends, setBlends } = useRoomCtx()
  const friends = DMS.filter((d) => d.name !== SELF_NAME)
  const [sel, setSel] = useState({})
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const [nameOverride, setNameOverride] = useState(null)
  const selectedFriends = friends.filter((f) => sel[f.name])
  const selectedNames = selectedFriends.map((f) => cap(f.name))
  const anySelected = selectedNames.length > 0
  const blendName = nameOverride !== null ? nameOverride : selectedNames.join(', ')
  function createBlend() {
    const name = (blendName || 'New Blend').trim()
    const games = ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'monsterHunter']
    const newBlend = {
      id: slug(name) + '-' + Date.now().toString(36).slice(-4),
      name,
      color: BLEND_COLORS[blends.length % BLEND_COLORS.length],
      when: 'just now',
      members: [SELF, ...selectedFriends.map((f) => f.color)],
      games,
      wishlist: games.slice(0, 4),
    }
    setBlends([...blends, newBlend])
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
              <h3 className="text-[22px] font-bold text-white">Create a &ldquo;Blend&rdquo;</h3>
              <p className="mt-[4px] text-[15px] text-[#b5bac1]">Select who you want to create a &ldquo;Blend&rdquo; with.</p>
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
            Add friends or server members to &ldquo;Blends&rdquo;
          </p>
          <div className="no-scrollbar mt-[8px] flex max-h-[280px] flex-col overflow-y-auto">
            {friends.map((f) => {
              const on = !!sel[f.name]
              return (
                <button
                  key={f.name}
                  onClick={() => setSel((s) => ({ ...s, [f.name]: !s[f.name] }))}
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
                <label className="text-[13px] text-[#b5bac1]">Blend Name (optional)</label>
                <input
                  value={blendName}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder="Blend name"
                  className="mt-[4px] w-full rounded-[8px] bg-[#1e1f22] px-[12px] py-[9px] text-[14px] text-white outline-none placeholder:text-[#87898c]"
                />
              </div>
            </div>
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button onClick={onClose} className="rounded-[8px] bg-[#2b2d31] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:bg-[#35373c]">Cancel</button>
              <button onClick={createBlend} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Create a new &ldquo;Blend&rdquo;</button>
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
              <h3 className="text-[20px] font-bold text-white">Add to a &ldquo;Blend&rdquo;</h3>
              <p className="mt-[4px] text-[14px] text-[#b5bac1]">Add <span className="font-semibold text-white">{game}</span> to a Blend&rsquo;s wishlist.</p>
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

// ── Decision wheel — spin-to-pick a game ───────────────────────────────────
const WHEEL_COLORS = ['#5765f2', '#23a55a', '#eb459e', '#f0b232', '#9A45F7', '#5165F6', '#FF3737', '#3ba55d']

function DecisionWheel({ games, onResult }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const pending = useRef(null)

  const n = games.length
  const R = 168
  const C = 176
  const seg = 360 / n
  // Point on the wheel at `deg` measured clockwise from the top (12 o'clock).
  const pt = (deg, rad = R) => {
    const a = (deg * Math.PI) / 180
    return [C + rad * Math.sin(a), C - rad * Math.cos(a)]
  }

  function spin() {
    if (spinning || n === 0) return
    const target = Math.floor(Math.random() * n)
    pending.current = target
    const center = target * seg + seg / 2 // clockwise from top
    const rest = (360 - (center % 360)) % 360 // land the target under the top pointer
    const currentMod = ((rotation % 360) + 360) % 360
    const delta = (rest - currentMod + 360) % 360
    setWinner(null)
    setSpinning(true)
    setRotation(rotation + 5 * 360 + delta)
  }

  function onEnd() {
    setSpinning(false)
    const w = pending.current
    setWinner(w)
    if (w != null && onResult) onResult(games[w])
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: C * 2, height: C * 2 }}>
        {/* Pointer */}
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
          <svg viewBox="0 0 24 28" className="h-[28px] w-[24px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
            <path d="M12 26 L2 4 A14 14 0 0 1 22 4 Z" fill="#ffffff" />
          </svg>
        </div>

        <svg
          viewBox={`0 0 ${C * 2} ${C * 2}`}
          className="size-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4.2s cubic-bezier(0.15,0.85,0.25,1)' : 'none',
          }}
          onTransitionEnd={onEnd}
        >
          <circle cx={C} cy={C} r={R + 6} fill="#0c0c0e" stroke="#26272b" strokeWidth="2" />
          {games.map((g, i) => {
            const a0 = i * seg
            const a1 = (i + 1) * seg
            const [x0, y0] = pt(a0)
            const [x1, y1] = pt(a1)
            const large = seg > 180 ? 1 : 0
            const center = a0 + seg / 2
            const [lx, ly] = pt(center, R * 0.6)
            const flip = center > 90 && center < 270
            const title = g.title.length > 18 ? g.title.slice(0, 17) + '…' : g.title
            return (
              <g key={i}>
                <path
                  d={`M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`}
                  fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                  stroke="#0c0c0e"
                  strokeWidth="2"
                />
                <g transform={`rotate(${center} ${C} ${C})`}>
                  <text
                    x={C}
                    y={C - R * 0.6}
                    transform={flip ? `rotate(180 ${C} ${C - R * 0.6})` : undefined}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    fontSize="13"
                    fontWeight="700"
                    fill="#ffffff"
                  >
                    {title}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {/* Center hub — click to spin */}
        <button
          onClick={spin}
          disabled={spinning}
          className="absolute left-1/2 top-1/2 flex size-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#107C10] shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition hover:scale-105 disabled:opacity-70"
        >
          {spinning ? '…' : 'SPIN'}
        </button>
      </div>

      {/* Result banner */}
      <div className="mt-[22px] h-[52px]">
        {winner != null ? (
          <div className="flex items-center gap-[12px] rounded-[12px] bg-[#121214] px-[20px] py-[12px]">
            <span className="size-[14px] rounded-full" style={{ backgroundColor: WHEEL_COLORS[winner % WHEEL_COLORS.length] }} />
            <span className="text-[16px] text-[#9a9ba3]">Tonight you&rsquo;re playing</span>
            <span className="text-[20px] font-bold text-white">{games[winner].title}</span>
          </div>
        ) : (
          <p className="text-[15px]" style={{ color: D.mute }}>{spinning ? 'Spinning…' : 'Tap SPIN to let fate decide.'}</p>
        )}
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

  // The wheel spins over games that fit the group; fall back to all if none match.
  const fitting = ranked.filter((g) => g.score > 0)
  const wheelGames = fitting.length >= 2 ? fitting : ranked

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col" style={{ backgroundColor: '#0c0c0e' }}>
      <div className="no-scrollbar flex-1 overflow-y-auto px-[40px] pb-[80px] pt-[28px]">
        <div className="mx-auto w-full max-w-[1200px]">
          <button
            onClick={onBack}
            className="mb-[24px] flex items-center gap-[8px] text-[15px] font-semibold text-[#9a9ba3] transition hover:text-white"
          >
            <span className="text-[18px] leading-none">←</span> Back to {blend.name}
          </button>

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

          {/* Still stuck? Spin the wheel — secondary */}
          <section className="flex flex-col items-center">
            <h2 className="mb-[6px] text-[22px] font-semibold text-white">Still can&rsquo;t decide? Spin for it</h2>
            <p className="mb-[24px] text-[14px]" style={{ color: D.mute }}>
              {fitting.length >= 2
                ? `Spinning the ${wheelGames.length} games that fit the group.`
                : 'Add preferences to narrow the wheel — spinning all games for now.'}
            </p>
            <DecisionWheel key={wheelGames.map((g) => g.key).join()} games={wheelGames} />
          </section>
        </div>
      </div>
      {launching && <LaunchToast title={launching} onDone={() => setLaunching(null)} />}
    </main>
  )
}

// ── Forward a game to chat (opened from a card's chat button) ──────────────
function ShareModal({ game, onClose }) {
  const { blends, setBlends } = useRoomCtx()
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const friends = DMS.filter((d) => d.name !== SELF_NAME)
  const myGroups = blends.filter((b) => (b.members || []).includes(SELF))
  const [selF, setSelF] = useState({})
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
        games: ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat', 'grounded', 'monsterHunter'],
        wishlist: ['seaOfThieves', 'minecraft', 'overcooked', 'humanFallFlat'],
      }])
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

export default function Landing() {
  const room = useRoom({ self: SELF_NAME, seedBlends: SEED_BLENDS })
  const blends = room.blends || SEED_BLENDS
  const byId = (id) => blends.find((b) => b.id === id) || null

  const [blendId, setBlendId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [wishlistGame, setWishlistGame] = useState(null)
  const [shareGame, setShareGame] = useState(null)
  const [prefsForId, setPrefsForId] = useState(null)
  const [decide, setDecide] = useState(null) // { blendId, prefs }

  const blend = byId(blendId)
  const prefsFor = byId(prefsForId)
  const decideBlend = decide ? byId(decide.blendId) : null

  return (
    <RoomProvider value={room}>
      <div
        className="group/rail flex h-screen w-screen overflow-hidden bg-black text-white"
        onContextMenu={(e) => e.preventDefault()}
      >
        <ServerRail />
        <Sidebar online={room.online} onReset={room.resetRoom} />
        {decideBlend ? (
          <DecidePage key={decideBlend.id} blend={decideBlend} prefs={decide.prefs} onBack={() => setDecide(null)} />
        ) : blend ? (
          <BlendPage key={blend.id} blend={blend} onBack={() => setBlendId(null)} onDecide={() => setPrefsForId(blend.id)} />
        ) : (
          <Content onOpenBlend={(b) => setBlendId(b.id)} onCreateBlend={() => setCreateOpen(true)} onWishlist={setWishlistGame} onShare={setShareGame} />
        )}
        {createOpen && <CreateBlendModal onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setBlendId(id) }} />}
        {wishlistGame && <WishlistModal game={wishlistGame} onClose={() => setWishlistGame(null)} />}
        {shareGame && <ShareModal game={shareGame} onClose={() => setShareGame(null)} />}
        {prefsFor && (
          <PreferenceModal
            blend={prefsFor}
            onClose={() => setPrefsForId(null)}
            onContinue={(prefs) => { setDecide({ blendId: prefsFor.id, prefs }); setPrefsForId(null) }}
          />
        )}
      </div>
    </RoomProvider>
  )
}
