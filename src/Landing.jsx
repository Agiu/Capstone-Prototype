import { useEffect, useRef, useState } from 'react'
import { RecCard, CardRow, AVATAR } from './RecCard.jsx'
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

const DMS = [
  { name: 'sauhee', color: AVATAR.green, call: true },
  { name: 'clarisse', color: AVATAR.blue, status: 'Playing Sea of Thieves' },
  { name: 'caleb', color: AVATAR.purple, status: 'Listening to Spotify' },
  { name: 'meera', color: AVATAR.red, status: 'Streaming Minecraft' },
  { name: 'wumpus', color: '#57a0ee' },
  { name: 'clyde', color: '#faa61a', status: 'Playing Among Us' },
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

function DmRow({ name, color, status, call }) {
  return (
    <button
      className="flex h-[44px] w-full items-center gap-[12px] rounded-[6px] px-[8px] transition-colors"
      style={{ backgroundColor: call ? D.raised : 'transparent' }}
      onMouseEnter={(e) => { if (!call) e.currentTarget.style.backgroundColor = D.hover }}
      onMouseLeave={(e) => { if (!call) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <div className="relative shrink-0">
        <Avatar color={color} size={32} />
        <span
          className="absolute -bottom-[2px] -right-[2px] size-[12px] rounded-full"
          style={{ backgroundColor: call ? D.green : '#43454b', border: `3px solid ${call ? D.raised : D.panel}` }}
        />
      </div>
      <div className="flex min-w-0 flex-col items-start leading-tight">
        <span className="truncate text-[15px] font-semibold" style={{ color: call ? '#fff' : D.text }}>{name}</span>
        {call ? (
          <span className="flex items-center gap-[4px] text-[12px]" style={{ color: D.green }}>
            <svg viewBox="0 0 24 24" className="size-[12px]" fill="currentColor"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1l-2.2 2.3Z" /></svg>
            In a call
          </span>
        ) : status ? (
          <span className="truncate text-[12px]" style={{ color: D.mute }}>{status}</span>
        ) : null}
      </div>
    </button>
  )
}

function Sidebar() {
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
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: D.mute }}>Direct Messages</span>
          <span className="text-[18px] leading-none" style={{ color: D.mute }}>+</span>
        </div>
        <div className="flex flex-col gap-[2px]">
          {DMS.map((d) => <DmRow key={d.name} {...d} />)}
        </div>
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
          <Avatar color={AVATAR.green} size={32} />
          <span className="absolute -bottom-[1px] -right-[1px] size-[11px] rounded-full" style={{ backgroundColor: D.green, border: `3px solid ${D.inset}` }} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold text-white">sauhee</div>
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
const NAME = { [AVATAR.green]: 'sauhee', [AVATAR.blue]: 'clarisse', [AVATAR.purple]: 'caleb', [AVATAR.red]: 'meera' }

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

// "Your Blends" — colored playlist cards (palette from the Figma landing frame).
// Green (the user, sauhee) is a member of every blend.
const BLENDS = [
  { name: 'Overwatch fridays', color: '#ab8e8e', when: 'Fri 8pm', members: [AVATAR.green, AVATAR.blue, AVATAR.red],
    games: ['seaOfThieves', 'overcooked', 'humanFallFlat', 'gangBeasts', 'grounded', 'monsterHunter'] },
  { name: 'Sunday cozy club', color: '#34a172', when: 'Sun 3pm', members: [AVATAR.green, AVATAR.purple, AVATAR.blue],
    games: ['minecraft', 'grounded', 'humanFallFlat', 'minecraftDungeons', 'seaOfThieves', 'overcooked'] },
  { name: 'Late shift', color: '#a40c67', when: 'Wed 11pm', members: [AVATAR.green, AVATAR.red, AVATAR.purple],
    games: ['gangBeasts', 'monsterHunter', 'forHonor', 'wildHearts', 'lol', 'humanFallFlat'] },
  { name: 'Weekend raid', color: '#b3d176', when: 'Sat 2pm', members: [AVATAR.green, AVATAR.blue, AVATAR.red],
    games: ['monsterHunter', 'forHonor', 'wildHearts', 'seaOfThieves', 'grounded', 'ac'] },
  { name: 'Just us two', color: '#d64b7e', when: 'whenever', members: [AVATAR.green, AVATAR.purple],
    games: ['humanFallFlat', 'overcooked', 'minecraft', 'minecraftDungeons', 'grounded', 'seaOfThieves'] },
]

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

function Content({ onOpenBlend, onCreateBlend, onWishlist }) {
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
              {BLENDS.map((b) => <BlendCard key={b.name} {...b} onOpen={() => onOpenBlend(b)} />)}
            </div>
          </section>

          {/* For you */}
          <section className="mt-[52px]">
            <SectionHeading size={40}>For you</SectionHeading>
            <div className="no-scrollbar mt-[24px] flex gap-[18px] overflow-x-auto pb-[8px]">
              {FORYOU.map((g) => <PortraitTile key={g.title} {...g} />)}
            </div>
          </section>

          {/* Recommendation rows — personal to you (group-curated lists live on
              each blend's page). */}
          <CardRow title="Your Friday-night taste" subtitle="Short, loud co-op — the kind of session you actually finish." cards={shelfToday} onWishlist={onWishlist} />
          <CardRow title="Because you can't put down Monster Hunter" subtitle="More action-RPG and survival picks matched to the hours you play." cards={shelfFriends} overlay onWishlist={onWishlist} />

          {/* Steam-style horizontal row — detail flyout on hover */}
          <CardRow title="Recommended based on what you play" subtitle="Hover a card for the full read." cards={STEAM_ROW} onWishlist={onWishlist} />

          {/* Always-expanded cards */}
          <CardRow title="More to jump into" subtitle="The full read, up front." cards={shelfMore} expanded onWishlist={onWishlist} />
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

function BlendPage({ blend, onBack }) {
  const games = blend.games.map((k) => CATALOG[k])
  const m = blend.members
  // Activity feed — includes you (green/sauhee) alongside the other members.
  const feed = [
    { who: AVATAR.green, text: `wishlisted ${games[2].title}`, when: '1h' },
    { who: m[1] || AVATAR.green, text: `finished ${games[0].title} and left it five stars`, when: '2h' },
    { who: m[2] || m[1] || AVATAR.green, text: `is in a ${games[1].title} lobby — one seat open`, when: 'live' },
    { who: AVATAR.green, text: `added ${games[3].title} to the group list`, when: 'yest' },
    { who: m[1] || AVATAR.green, text: `pinned ${blend.when} as their free window`, when: '2d' },
  ]

  // Rankable group wishlist — drag a card to reorder; the number is its rank.
  const [wish, setWish] = useState(games.slice(0, 4))
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  function dropAt(i) {
    if (dragIdx !== null && dragIdx !== i) {
      setWish((prev) => {
        const next = prev.slice()
        const [moved] = next.splice(dragIdx, 1)
        next.splice(i, 0, moved)
        return next
      })
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
                  <button key={i} className="group flex items-center gap-[20px] rounded-[14px] p-[10px] text-left transition hover:bg-[#151517]">
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
    </main>
  )
}

// ── Create a "Blend" modal (Figma node 531:2105) ───────────────────────────
function CreateBlendModal({ onClose }) {
  const friends = DMS.filter((d) => d.name !== 'sauhee')
  const [sel, setSel] = useState({})
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const [nameOverride, setNameOverride] = useState(null)
  const selectedNames = friends.filter((f) => sel[f.name]).map((f) => cap(f.name))
  const anySelected = selectedNames.length > 0
  const blendName = nameOverride !== null ? nameOverride : selectedNames.join(', ')
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
              <button onClick={onClose} className="rounded-[8px] bg-[#5765f2] px-[18px] py-[9px] text-[14px] font-semibold text-white transition hover:brightness-110">Create a new &ldquo;Blend&rdquo;</button>
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
  const [added, setAdded] = useState({})
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
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
            {BLENDS.map((b) => {
              const on = !!added[b.name]
              return (
                <button
                  key={b.name}
                  onClick={() => setAdded((s) => ({ ...s, [b.name]: !s[b.name] }))}
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

export default function Landing() {
  const [blend, setBlend] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [wishlistGame, setWishlistGame] = useState(null)
  return (
    <div className="group/rail flex h-screen w-screen overflow-hidden bg-black text-white">
      <ServerRail />
      <Sidebar />
      {blend ? (
        <BlendPage key={blend.name} blend={blend} onBack={() => setBlend(null)} />
      ) : (
        <Content onOpenBlend={setBlend} onCreateBlend={() => setCreateOpen(true)} onWishlist={setWishlistGame} />
      )}
      {createOpen && <CreateBlendModal onClose={() => setCreateOpen(false)} />}
      {wishlistGame && <WishlistModal game={wishlistGame} onClose={() => setWishlistGame(null)} />}
    </div>
  )
}
