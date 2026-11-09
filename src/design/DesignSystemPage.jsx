import { useState } from 'react'
import { tokens, ms } from './tokens.js'
import coverageFile from './generated/coverage.json'
import sampleArt from '../assets/figma/duo_thumbnail_1.jpg'

// ── Redesign design system page (/design.html) ─────────────────────────────
// Everything here is read from colors.json / typography.json / components.json
// (through tokens.js) and coverage.json, and styled with the same --rd-*
// variables the app uses — so editing a token updates this page too.
const { colorFile, typeFile, componentFile, color, colorScope, font, style, radius, motion, components } = tokens
const { coverage, unmapped } = coverageFile

const v = (name) => `var(--rd-${name})`
const SECTIONS = [
  ['colors', 'Colours'],
  ['type', 'Typography'],
  ['components', 'Components'],
  ['foundations', 'Radius & Motion'],
  ['data', 'Data Colours'],
]

// Light swatches get dark labels so the hex stays readable on the chip.
function isLight(hex) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55
}

function copy(text, set) {
  try { navigator.clipboard?.writeText(text) } catch { /* clipboard blocked */ }
  set(text)
  setTimeout(() => set((cur) => (cur === text ? null : cur)), 1200)
}

export default function DesignSystemPage() {
  const [copied, setCopied] = useState(null)
  const tokenCount = Object.keys(color).length
  const classCount = Object.values(coverage).reduce((n, list) => n + list.length, 0)
  return (
    <div data-xbox className="min-h-screen text-white" style={{ background: v('page'), fontFamily: v('font-body') }}>
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: v('surface'), background: 'color-mix(in srgb, var(--rd-page) 85%, transparent)' }}>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-[24px] gap-y-[8px] px-[16px] py-[14px] sm:px-[32px]">
          <a href="/" className="text-[14px] font-semibold transition hover:opacity-80" style={{ color: v('accent') }}>← Launcher</a>
          <nav className="flex flex-wrap gap-x-[20px] gap-y-[6px]">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={'#' + id} className="text-[14px] font-medium transition hover:text-white" style={{ color: v('text-nav') }}>{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-[16px] pb-[120px] sm:px-[32px]">
        <section className="pt-[56px] pb-[24px]">
          <p style={{ ...style.eyebrow, color: v('accent') }}>Xbox Arcade × Discord · Redesign</p>
          <h1 className="mt-[10px]" style={{ ...style.hero }}>Design System</h1>
          <p className="mt-[16px] max-w-[640px]" style={{ ...style.body, fontSize: 16, color: v('text-secondary') }}>
            Every colour, type style and component spec the redesign uses, read live from the token files.
            Edit a value in <Code>src/design/*.json</Code> and the app and this page both update.
            It only applies with the Redesign toggle on; the original prototype never reads these tokens.
          </p>
          <div className="mt-[24px] flex flex-wrap gap-[10px]">
            <Stat n={tokenCount} label="colour tokens" />
            <Stat n={classCount} label="hard-coded classes remapped" />
            <Stat n={Object.keys(typeFile.styles).length} label="text styles" />
            <Stat n={Object.keys(components).length} label="component specs" />
            {Object.keys(unmapped).length > 0 && <Stat n={Object.keys(unmapped).length} label={'unmapped: ' + Object.keys(unmapped).join(', ')} warn />}
          </div>
        </section>

        {/* ── Colours ───────────────────────────────────────────── */}
        <Section id="colors" title="Colours" file="colors.json" about="Each token's value is what the redesign renders. `replaces` lists the old hard-coded colours it takes over; the generator turns those into overrides. Xbox-scoped tokens leave the Discord chrome alone.">
          {Object.entries(colorFile.groups).map(([gk, g]) => (
            <div key={gk} className="mt-[40px] first:mt-0">
              <h3 style={{ ...style['section-title'], fontSize: 20 }}>{g.label}</h3>
              <p className="mt-[4px] max-w-[720px]" style={{ ...style.caption, fontSize: 13, color: v('text-dim') }}>{g.description}</p>
              <div className="mt-[16px] grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                {Object.entries(g.tokens).map(([name, tok]) => (
                  <Swatch key={name} name={name} tok={tok} scope={colorScope[name]} classes={coverage[name] || []} copied={copied} onCopy={(t) => copy(t, setCopied)} />
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ── Typography ────────────────────────────────────────── */}
        <Section id="type" title="Typography" file="typography.json" about="Families are wired: changing a stack re-fonts every redesign surface that uses it. Styles are the named sizes the redesign uses.">
          <h3 style={{ ...style['section-title'], fontSize: 20 }}>Families</h3>
          <div className="mt-[16px] grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {Object.entries(typeFile.families).map(([k, f]) => (
              <div key={k} className="flex flex-col gap-[10px] p-[18px]" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
                <p className="truncate text-[56px] leading-none" style={{ fontFamily: font[k] }}>Aa Gg 07</p>
                <div>
                  <p className="text-[15px] font-semibold">{f.label}</p>
                  <p className="mt-[2px]" style={{ ...style.caption, color: v('text-dim') }}>{f.usage}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-[6px]">
                  <Tag mono>--rd-font-{k}</Tag>
                  {Object.keys(f.files || {}).map((w) => <Tag key={w}>{w}</Tag>)}
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-[40px]" style={{ ...style['section-title'], fontSize: 20 }}>Styles</h3>
          <div className="mt-[12px] divide-y" style={{ borderColor: v('surface') }}>
            {Object.entries(typeFile.styles).map(([k, s]) => (
              <div key={k} className="grid gap-[10px] py-[20px] md:grid-cols-[220px_1fr]" style={{ borderColor: v('surface') }}>
                <div>
                  <p className="text-[14px] font-semibold">{k}</p>
                  <p className="mt-[4px] font-mono text-[12px] leading-[1.6]" style={{ color: v('text-muted') }}>
                    {s.family} · {s.size}<br />
                    weight {style[k].fontWeight} · line {s.lineHeight}{s.tracking ? ` · ${s.tracking}` : ''}{s.transform ? ` · ${s.transform}` : ''}
                  </p>
                </div>
                <p className="min-w-0 break-words" style={style[k]}>{s.usage}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Components ────────────────────────────────────────── */}
        <Section id="components" title="Components" file="components.json" about="Live previews built from the component tokens, with every resolved value below each one. References like {color.accent} resolve to the colour token.">
          <div className="grid gap-[16px] lg:grid-cols-2">
            {Object.entries(components).map(([k, c]) => (
              <ComponentCard key={k} id={k} c={c} raw={componentFile.components[k]} />
            ))}
          </div>
        </Section>

        {/* ── Radius & motion ───────────────────────────────────── */}
        <Section id="foundations" title="Radius & Motion" file="components.json">
          <div className="grid gap-[16px] md:grid-cols-[1fr_2fr]">
            <div className="p-[20px]" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
              <h3 style={{ ...style['section-title'], fontSize: 18 }}>Radius</h3>
              <div className="mt-[16px] flex gap-[20px]">
                {Object.entries(radius).map(([k, r]) => (
                  <div key={k} className="flex flex-col items-center gap-[8px]">
                    {/* rounded-full: the redesign's square-corner rule overrides inline radii, and lets circles through by class */}
                    <div className={'size-[72px]' + (k === 'round' ? ' rounded-full' : '')} style={{ background: v('accent'), borderRadius: r }} />
                    <p className="text-[13px] font-semibold">{k}</p>
                    <Tag mono>{r}</Tag>
                  </div>
                ))}
              </div>
              <p className="mt-[16px]" style={{ ...style.caption, color: v('text-dim') }}>The redesign squares every rounded corner to <b>corner</b>; true circles (avatars, dots) stay <b>round</b>.</p>
            </div>
            <MotionCard />
          </div>
        </Section>

        {/* ── Data colours ──────────────────────────────────────── */}
        <Section id="data" title={colorFile.reference.label} file="colors.json → reference" about={colorFile.reference.description}>
          <div className="flex flex-col gap-[20px]">
            {Object.entries(colorFile.reference.sets).map(([k, list]) => (
              <div key={k}>
                <p className="text-[14px] font-semibold">{k}</p>
                <div className="mt-[10px] flex flex-wrap gap-[8px]">
                  {list.map((hex, i) => (
                    <button key={i} onClick={() => copy(hex, setCopied)} title="Copy" className="flex flex-col items-center gap-[6px]">
                      <span className="size-[48px] rounded-full" style={{ background: hex }} />
                      <span className="font-mono text-[11px]" style={{ color: copied === hex ? v('accent') : v('text-muted') }}>{copied === hex ? 'copied' : hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ id, title, file, about, children }) {
  return (
    <section id={id} className="scroll-mt-[72px] border-t pt-[48px] mt-[48px]" style={{ borderColor: v('surface') }}>
      <div className="mb-[28px] flex flex-wrap items-end justify-between gap-[12px]">
        <h2 style={style['page-title']}>{title}</h2>
        <Tag mono>src/design/{file}</Tag>
      </div>
      {about && <p className="-mt-[12px] mb-[28px] max-w-[720px]" style={{ ...style.body, color: v('text-secondary') }}>{about}</p>}
      {children}
    </section>
  )
}

function Stat({ n, label, warn }) {
  return (
    <div className="flex items-baseline gap-[8px] px-[14px] py-[10px]" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
      <span className="text-[22px] font-bold" style={{ color: warn ? v('warning') : v('accent') }}>{n}</span>
      <span className="text-[13px]" style={{ color: v('text-dim') }}>{label}</span>
    </div>
  )
}

function Tag({ children, mono }) {
  return (
    <span className={'inline-block px-[7px] py-[3px] text-[11px] ' + (mono ? 'font-mono' : 'font-semibold')} style={{ background: v('inset'), color: v('text-dim'), borderRadius: v('radius-corner') }}>
      {children}
    </span>
  )
}

function Code({ children }) {
  return <code className="px-[5px] py-[1px] font-mono text-[0.9em]" style={{ background: v('inset'), borderRadius: v('radius-corner') }}>{children}</code>
}

function Swatch({ name, tok, scope, classes, copied, onCopy }) {
  const [open, setOpen] = useState(false)
  const uses = classes.reduce((n, c) => n + c.count, 0)
  const varName = `--rd-${name}`
  return (
    <div className="flex flex-col overflow-hidden" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
      <button onClick={() => onCopy(tok.value)} title="Copy hex" className="relative flex h-[88px] items-end justify-between px-[12px] pb-[10px] text-left" style={{ background: tok.value, boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.06)' }}>
        <span className="font-mono text-[12px] font-semibold" style={{ color: isLight(tok.value) ? '#0c0c0e' : '#ffffff' }}>{copied === tok.value ? 'copied' : tok.value}</span>
        {scope === 'all' && <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isLight(tok.value) ? '#0c0c0e' : 'rgb(255 255 255 / 0.7)' }}>all surfaces</span>}
      </button>
      <div className="flex flex-1 flex-col gap-[6px] p-[12px]">
        <p className="text-[14px] font-semibold">{name}</p>
        <button onClick={() => onCopy(`var(${varName})`)} title="Copy CSS variable" className="w-fit font-mono text-[11px] transition hover:text-white" style={{ color: copied === `var(${varName})` ? v('accent') : v('text-muted') }}>
          {copied === `var(${varName})` ? 'copied' : varName}
        </button>
        {tok.usage && <p style={{ ...style.caption, color: v('text-dim') }}>{tok.usage}</p>}
        {classes.length > 0 && (
          <div className="mt-auto pt-[4px]">
            <button onClick={() => setOpen((o) => !o)} className="text-[12px] font-semibold transition hover:brightness-125" style={{ color: v('accent') }}>
              {open ? 'Hide' : 'Remaps'} {classes.length} class{classes.length === 1 ? '' : 'es'} · {uses} use{uses === 1 ? '' : 's'}
            </button>
            {open && (
              <ul className="mt-[6px] flex flex-col gap-[2px]">
                {classes.map((c) => (
                  <li key={c.class} className="flex justify-between gap-[8px] font-mono text-[11px]" style={{ color: v('text-muted') }}>
                    <span className="truncate">{c.class}</span><span>×{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Component previews ───────────────────────────────────────────────────
const PREVIEW = {
  'button-primary': (c) => (
    <button className="px-[22px] py-[12px] transition hover:[filter:var(--rd-button-primary-hover)]" style={{ ...c.typography, background: c.background, color: c.text, boxShadow: c.glow, borderRadius: c.radius }}>Launch Game</button>
  ),
  'button-secondary': (c) => (
    <button className="rd-ds-secondary px-[22px] py-[12px]" style={{ ...c.typography, color: c.text, borderRadius: c.radius, borderWidth: c.borderWidth, borderStyle: 'solid' }}>Cancel</button>
  ),
  modal: (c) => (
    <div className="w-full max-w-[380px] overflow-hidden" style={{ background: c.surface, boxShadow: c.shadow, borderRadius: c.radius }}>
      <div className="flex items-center justify-between gap-[12px]" style={{ background: c.headerBackground, padding: c.headerPadding }}>
        <div className="min-w-0">
          <p style={{ ...c.title, color: c.headerText }}>Spin the Wheel</p>
          <p className="mt-[2px]" style={{ ...c.subtitle, color: c.headerSubtitle }}>Pick a PlayList to load.</p>
        </div>
        <svg viewBox="0 0 24 24" style={{ width: c.closeIconSize, height: c.closeIconSize, color: c.headerText }} fill="none" stroke="currentColor" strokeWidth={c.closeIconStroke} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </div>
      <div className="flex flex-col gap-[8px] p-[20px]">
        <div className="h-[10px] w-3/4" style={{ background: v('control-alt'), borderRadius: v('radius-corner') }} />
        <div className="h-[10px] w-1/2" style={{ background: v('control-alt'), borderRadius: v('radius-corner') }} />
      </div>
    </div>
  ),
  nav: (c) => <NavPreview c={c} />,
  shelf: (c) => (
    <div className="relative w-full overflow-hidden">
      <p style={{ ...c.title, fontSize: 18 }}>Trending Amongst Your Friends</p>
      <div className="mt-[10px] flex gap-[10px]">
        {['#2980b9', '#c0392b', '#16a085', '#8e44ad', '#e67e22', '#27ae60'].map((bg, i) => <div key={i} className="h-[90px] w-[70px] shrink-0" style={{ background: bg, borderRadius: v('radius-corner') }} />)}
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 top-[30px]" style={{ width: c.edgeFadeWidth, background: `linear-gradient(to right, transparent, ${c.edgeFadeColor})` }} />
      <span className="absolute bottom-[25px] right-[8px] flex size-[40px] items-center justify-center rounded-full" style={{ background: c.arrowBackground }}>
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </span>
    </div>
  ),
  'party-card': (c) => (
    <div className="group relative flex w-full max-w-[340px] cursor-pointer items-center gap-[14px] overflow-hidden border-2 px-[22px] py-[18px]" style={{ borderColor: c.border, borderRadius: v('radius-corner') }}>
      <span className="party-slice pointer-events-none absolute inset-0" style={{ background: c.sliceFill }} />
      {/* Colours go through classes, not inline style — an inline colour would beat the hover class. */}
      <span className="relative [color:var(--pc-text)] transition-colors duration-300 group-hover:[color:var(--pc-hover)]" style={{ ...style['card-title'], '--pc-text': c.border, '--pc-hover': c.textOnFill }}>Start A Party</span>
      <span className="relative ml-auto text-[12px] [color:var(--rd-text-dim)] transition-colors duration-300 group-hover:[color:var(--pc-hover)]" style={{ '--pc-hover': c.textOnFill }}>hover me</span>
    </div>
  ),
  'image-reveal': () => <ImageRevealPreview />,
  'rank-change': (c) => <RankPreview c={c} />,
  'ascii-hero': (c) => (
    <div className="flex w-full flex-col gap-[8px] overflow-hidden px-[14px] py-[12px]" style={{ background: '#000', borderRadius: v('radius-corner') }}>
      <p className="whitespace-pre text-[20px] leading-none tracking-[0.2em]" style={{ fontFamily: c.font, color: v('accent') }}>{c.ramp}</p>
      <p style={{ ...style.caption, color: v('text-dim') }}>Glyph ramp, dark → bright. Brightness below <b>cutoff</b> stays blank for negative space.</p>
    </div>
  ),
  wheel: (c) => (
    <div className="flex w-full flex-col items-center gap-[14px] py-[6px]">
      <svg viewBox="0 0 20 14" className="w-[22px]" style={{ filter: c.notchGlow }}><path d="M10 14L0 0h20z" fill={c.rim} /></svg>
      <div className="size-[110px] rounded-full border-[3px]" style={{ borderColor: c.rim, boxShadow: c.glow, background: 'conic-gradient(#5765f2 0 25%, #23a55a 0 50%, #eb459e 0 75%, #f0b232 0)' }} />
      <div className="h-[2px] w-full" style={{ background: c.line }} />
    </div>
  ),
}

function NavPreview({ c }) {
  const [tab, setTab] = useState('home')
  const tabs = [['home', null], ['library', 'Library'], ['playlists', 'PlayLists']]
  return (
    <div className="flex w-full items-center gap-[24px] border-b px-[8px]" style={{ height: c.height, borderColor: v('surface') }}>
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)} className="flex h-full items-center border-b-2 transition" style={{ ...style['nav-tab'], color: tab === k ? '#fff' : c.tabText, borderColor: tab === k ? (k === 'home' ? c.homeUnderline : c.tabUnderline) : 'transparent', transitionDuration: c.duration, transitionTimingFunction: c.easing }}>
          {label || <span className="size-[22px] rounded-full" style={{ background: v('accent') }} />}
        </button>
      ))}
    </div>
  )
}

function RankPreview({ c }) {
  const [order, setOrder] = useState(['Halo Infinite', 'Celeste', 'DayZ'])
  const [moved, setMoved] = useState(null)
  const shuffle = () => {
    const next = [order[1], order[0], order[2]]
    setMoved({ [order[1]]: 'up', [order[0]]: 'down' })
    setOrder(next)
    setTimeout(() => setMoved(null), ms(c.arrowHold))
  }
  return (
    <div className="flex w-full flex-col gap-[6px]">
      {order.map((g, i) => (
        <div key={g} className="flex items-center gap-[12px] px-[10px] py-[8px]" style={{ background: v('inset'), borderRadius: v('radius-corner') }}>
          <span className="w-[18px] text-[13px] font-bold" style={{ color: v('text-dim') }}>{i + 1}</span>
          <span className="flex-1 text-[14px] font-semibold">{g}</span>
          {moved?.[g] && (
            <span key={moved[g] + i} className="flex size-[20px] items-center justify-center rounded-full" style={{ background: moved[g] === 'up' ? c.up : c.down, color: moved[g] === 'up' ? v('on-accent') : '#fff', animation: `rankMove ${c.arrowHold} ${c.easing} both`, '--rank-from': moved[g] === 'up' ? '6px' : '-6px' }}>
              <svg viewBox="0 0 24 24" className={'size-[12px] ' + (moved[g] === 'up' ? '' : 'rotate-180')} fill="currentColor"><path d="M12 5l8 11H4z" /></svg>
            </span>
          )}
        </div>
      ))}
      <button onClick={shuffle} className="mt-[4px] w-fit text-[12px] font-semibold" style={{ color: v('accent') }}>Vote #2 up →</button>
    </div>
  )
}

// Remounting the <img> makes it load again, which is what triggers the swipe
// (imageReveal.js) — the same path the app's images take. data-rd-always lets
// it replay past the once-per-session rule.
function ImageRevealPreview() {
  const [n, setN] = useState(0)
  return (
    <div data-xbox className="flex w-full flex-col items-center gap-[10px]">
      <div className="relative aspect-video w-full max-w-[260px] overflow-hidden" style={{ background: v('surface'), borderRadius: v('radius-corner') }}>
        <img key={n} alt="" src={sampleArt} data-rd-always="" className="absolute inset-0 size-full object-cover" />
      </div>
      <button onClick={() => setN(n + 1)} className="text-[12px] font-semibold" style={{ color: v('accent') }}>Load again →</button>
    </div>
  )
}

function ComponentCard({ id, c, raw }) {
  const preview = PREVIEW[id]
  return (
    <div className="flex flex-col overflow-hidden" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
      <div className="flex items-center justify-between gap-[8px] px-[18px] pt-[16px]">
        <p className="text-[16px] font-semibold">{c.label}</p>
        <Tag mono>{id}</Tag>
      </div>
      {preview && <div className="m-[18px] flex min-h-[120px] items-center justify-center p-[20px]" style={{ background: v('page'), borderRadius: v('radius-corner') }}>{preview(c)}</div>}
      <dl className="mt-auto grid grid-cols-[minmax(110px,auto)_1fr] gap-x-[14px] gap-y-[6px] px-[18px] pb-[18px]">
        {Object.entries(raw).filter(([p]) => p !== 'label').map(([p, val]) => (
          <PropRow key={p} name={p} raw={val} resolved={c[p]} />
        ))}
      </dl>
    </div>
  )
}

function PropRow({ name, raw, resolved }) {
  const ref = typeof raw === 'string' && /\{[\w.-]+\}/.test(raw)
  const swatch = typeof resolved === 'string' && /^(#|rgb|color-mix)/.test(resolved) ? resolved : null
  const shown = resolved && typeof resolved === 'object' ? `${resolved.fontSize} / ${resolved.fontWeight}` : String(resolved)
  return (
    <>
      <dt className="font-mono text-[11px] leading-[18px]" style={{ color: v('text-muted') }}>{name}</dt>
      <dd className="flex min-w-0 items-center gap-[6px] font-mono text-[11px] leading-[18px]">
        {swatch && <span className="size-[12px] shrink-0 rounded-full" style={{ background: swatch, boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.15)' }} />}
        <span className="truncate" title={shown}>{ref ? <><span style={{ color: v('accent') }}>{raw}</span><span style={{ color: v('text-faint') }}> → {shown}</span></> : shown}</span>
      </dd>
    </>
  )
}

function MotionCard() {
  const [run, setRun] = useState(0)
  const curves = Object.entries(motion).filter(([, val]) => val.startsWith('cubic'))
  const times = Object.entries(motion).filter(([, val]) => !val.startsWith('cubic'))
  return (
    <div className="p-[20px]" style={{ background: v('raised'), borderRadius: v('radius-corner') }}>
      <div className="flex items-center justify-between">
        <h3 style={{ ...style['section-title'], fontSize: 18 }}>Motion</h3>
        <button onClick={() => setRun((r) => r + 1)} className="rd-ds-secondary px-[14px] py-[7px] text-[13px] font-bold" style={{ borderRadius: v('radius-corner'), borderWidth: v('button-secondary-border-width'), borderStyle: 'solid' }}>Play</button>
      </div>
      <div className="mt-[16px] flex flex-col gap-[14px]">
        {curves.flatMap(([ck, curve]) => times.map(([tk, dur]) => (
          <div key={ck + tk} className="grid grid-cols-[minmax(0,200px)_1fr] items-center gap-[12px]">
            <p className="font-mono text-[11px]" style={{ color: v('text-muted') }}>{ck} · {tk} {dur}</p>
            <div className="relative h-[14px]" style={{ background: v('inset'), borderRadius: v('radius-corner') }}>
              <span key={run} className="absolute top-0 size-[14px]" style={{ background: v('accent'), borderRadius: v('radius-corner'), animation: run ? `rdDsSlide ${dur} ${curve} both` : 'none' }} />
            </div>
          </div>
        )))}
      </div>
      <div className="mt-[16px] flex flex-wrap gap-[6px]">
        {Object.entries(motion).map(([k, val]) => <Tag key={k} mono>--rd-motion-{k}: {val}</Tag>)}
      </div>
    </div>
  )
}
