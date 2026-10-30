// Motion-graphics harness entry. Mounts ONE scene from ?scene=<id> on a
// transparent stage and exposes window.__mg for the Playwright exporter.
// Never loaded by the app — see mograph.html.
import './seed.js' // must come first — freezes Math.random and Date.now
import { createRoot } from 'react-dom/client'
import '../index.css'
import './stage.css'
import { SCENES } from './scenes.jsx'

const params = new URLSearchParams(location.search)
const id = params.get('scene')
const scene = SCENES.find((s) => s.id === id)

const root = createRoot(document.getElementById('stage'))

if (!scene) {
  // No scene asked for → an index, so the harness is browsable by hand.
  root.render(
    <div className="mg-index">
      <h1>Motion-graphics scenes</h1>
      {[...new Set(SCENES.map((s) => s.group))].sort().map((g) => (
        <section key={g}>
          <h2>{g}</h2>
          <ul>
            {SCENES.filter((s) => s.group === g).map((s) => (
              <li key={s.id}><a href={`?scene=${s.id}`}>{s.id}</a> <span>{s.note}</span></li>
            ))}
          </ul>
        </section>
      ))}
    </div>,
  )
} else {
  const stage = document.getElementById('stage')
  if (scene.frame !== 'fixed') {
    // Free-standing components get a stage sized to the scene's hint, with a
    // little breathing room so shadows and glows aren't clipped.
    stage.style.width = scene.w ? scene.w + 'px' : 'max-content'
    if (scene.h) stage.style.height = scene.h + 'px'
    stage.classList.add('mg-pad')
  }
  root.render(scene.render())
}

// ── Exporter API ────────────────────────────────────────────────────────────
const VW = () => window.innerWidth
const VH = () => window.innerHeight

const isFullBleed = (r) => r.width >= VW() * 0.95 && r.height >= VH() * 0.95

function visibleEls() {
  const out = []
  document.querySelectorAll('#stage, #stage *').forEach((el) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.02) return
    out.push({ el, r, cs })
  })
  return out
}

const kebab = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28)

// What kind of layer an element is, or null if it carries no ink of its own.
function classify(el, cs) {
  const tag = el.tagName.toLowerCase()
  if (tag === 'img' || tag === 'video' || tag === 'canvas') return 'img'
  if (tag === 'svg') return el.closest('svg') === el ? 'icon' : null
  if (el.closest('svg')) return null // inner svg nodes ship inside the parent icon
  const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const a = /rgba?\([^)]*?(?:,\s*([\d.]+))?\)/.exec(cs.backgroundColor)
  const hasBg = !!a && (a[1] === undefined || parseFloat(a[1]) > 0.02)
  const hasImg = cs.backgroundImage && cs.backgroundImage !== 'none'
  // Tailwind's ring-* is a box-shadow, so this covers rings too.
  const hasShadow = cs.boxShadow && cs.boxShadow !== 'none'
  // A width alone means nothing: every element computes outline-width: 3px
  // (`medium`) whether or not an outline is actually drawn.
  const side = (s) => (cs[`border${s}Style`] !== 'none' && cs[`border${s}Style`] !== 'hidden' ? parseFloat(cs[`border${s}Width`]) : 0)
  const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((s) => side(s) > 0)
  const hasOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  const surface = hasBg || hasImg || hasShadow || hasBorder || hasOutline
  // Text sitting on its own fill is one moving piece (a pill, a chip, a button),
  // so it stays one layer — but say so in the name rather than calling it text.
  if (ownText) return surface ? (tag === 'button' || tag === 'a' ? 'button' : 'block') : 'text'
  if (surface) return 'shape'
  return null
}

function labelFor(el, kind) {
  const attr = el.getAttribute('data-mg-name') || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title')
  if (attr) return kebab(attr)
  if (kind === 'text' || kind === 'block' || kind === 'button') {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')
    return kebab(own) || kebab(el.textContent)
  }
  if (kind === 'img') return kebab((el.getAttribute('src') || '').split('/').pop().replace(/\.\w+$/, '')) || 'image'
  if (kind === 'icon') return el.getBoundingClientRect().width > 120 ? 'graphic' : 'icon'
  const role = el.getAttribute('role')
  if (role) return kebab(role)
  // An unnamed box: the big one is the panel everything sits on, the rest are
  // fills, dividers and rings.
  const r = el.getBoundingClientRect()
  return r.width * r.height > VW() * VH() * 0.04 ? 'panel' : 'box'
}

// Scenes can name the layers that matter; everything else is named from its
// own text, alt or aria-label.
function applyLabels() {
  for (const [sel, name] of scene?.labels || []) {
    document.querySelectorAll(sel).forEach((e) => e.setAttribute('data-mg-name', name))
  }
}

window.__mg = {
  scenes: SCENES.map(({ id, group, note, frame, w, h, steps }) => ({ id, group, note, frame, w, h, steps })),
  scene: scene ? { id: scene.id, group: scene.group, note: scene.note, frame: scene.frame } : null,

  // The box the exporter clips every PNG to: everything the scene draws, minus
  // full-viewport scrims (which would otherwise stretch the frame to the window).
  contentRect(pad = 0) {
    const els = visibleEls().filter(({ r }) => !isFullBleed(r))
    if (!els.length) return null
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const { r } of els) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom) }
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad))
    x1 = Math.min(VW(), Math.ceil(x1 + pad)); y1 = Math.min(VH(), Math.ceil(y1 + pad))
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
  },

  // Tag every ink-bearing element with an index and describe it. DOM order is
  // paint order, so the returned order is the layer stack bottom-to-top.
  layers(max = 90) {
    applyLabels()
    const seen = []
    for (const { el, r, cs } of visibleEls()) {
      const kind = classify(el, cs)
      if (!kind) continue
      // Drop a shape that exactly re-traces the shape directly under it.
      const prev = seen[seen.length - 1]
      if (kind === 'shape' && prev && prev.kind === 'shape' && prev.el.contains(el)
        && Math.abs(prev.r.width - r.width) < 2 && Math.abs(prev.r.height - r.height) < 2) continue
      seen.push({ el, r, cs, kind })
      if (seen.length >= max) break
    }
    return seen.map(({ el, r, kind }, i) => {
      el.setAttribute('data-mg', String(i))
      el.setAttribute('data-mg-kind', kind)
      const n = String(i + 1).padStart(2, '0')
      return {
        index: i,
        name: `${n}-${kind}-${labelFor(el, kind) || 'el'}`,
        kind,
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 80),
        rect: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      }
    })
  },

  // Show only layer `i` (and its subtree). Layout is untouched — visibility,
  // not display — so every layer lands on the same canvas at the same spot.
  isolate(i) {
    document.querySelectorAll('.mg-on').forEach((e) => e.classList.remove('mg-on', 'mg-deep'))
    document.documentElement.classList.add('mg-iso')
    const el = document.querySelector(`[data-mg="${i}"]`)
    if (!el) return false
    el.classList.add('mg-on')
    // Graphics keep their subtree; boxes and text render their own ink alone.
    if (el.dataset.mgKind === 'icon' || el.dataset.mgKind === 'img') el.classList.add('mg-deep')
    return true
  },
  showAll() {
    document.documentElement.classList.remove('mg-iso')
    document.querySelectorAll('.mg-on').forEach((e) => e.classList.remove('mg-on', 'mg-deep'))
  },

  // Real vector output: every top-level <svg>, made standalone (explicit size,
  // xmlns, and any <image> href baked in as a data URI so it opens anywhere).
  async svgs() {
    applyLabels()
    const out = []
    const nodes = [...document.querySelectorAll('#stage svg')].filter((s) => s.closest('svg') === s)
    for (let i = 0; i < nodes.length; i++) {
      const src = nodes[i]
      const r = src.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const svg = src.cloneNode(true)
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      svg.setAttribute('width', Math.round(r.width))
      svg.setAttribute('height', Math.round(r.height))
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`)
      svg.removeAttribute('class'); svg.removeAttribute('style')
      // Drop the harness's own bookkeeping attributes from the shipped file.
      for (const n of [svg, ...svg.querySelectorAll('*')]) {
        for (const a of [...n.attributes]) if (a.name.startsWith('data-mg')) n.removeAttribute(a.name)
      }
      // Currentcolor only resolves against the live DOM, so freeze it now.
      const color = getComputedStyle(src).color
      svg.querySelectorAll('*').forEach((n) => {
        for (const a of ['fill', 'stroke']) if (n.getAttribute(a) === 'currentColor') n.setAttribute(a, color)
      })
      if (svg.getAttribute('fill') === 'currentColor') svg.setAttribute('fill', color)
      if (svg.getAttribute('stroke') === 'currentColor') svg.setAttribute('stroke', color)
      for (const im of svg.querySelectorAll('image')) {
        const href = im.getAttribute('href') || im.getAttribute('xlink:href')
        if (!href || href.startsWith('data:')) continue
        try {
          const blob = await (await fetch(href)).blob()
          const dataUri = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob) })
          im.setAttribute('href', dataUri); im.removeAttribute('xlink:href')
        } catch { im.remove() }
      }
      const label = kebab(src.getAttribute('data-mg-name') || src.getAttribute('aria-label') || '') || (r.width > 120 ? 'graphic' : 'icon')
      out.push({
        name: `${String(i + 1).padStart(2, '0')}-${label}`,
        width: Math.round(r.width), height: Math.round(r.height),
        markup: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg),
      })
    }
    return out
  },

  // Resolved once the scene has actually painted: fonts loaded, images decoded.
  async ready() {
    await document.fonts.ready
    const imgs = [...document.querySelectorAll('#stage img')]
    await Promise.all(imgs.map((im) => im.complete ? null : new Promise((r) => { im.onload = im.onerror = r })))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  },
}
