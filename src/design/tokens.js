// ── Redesign design tokens (runtime) ────────────────────────────────────────
// Reads the three token files and makes them live:
//  • every token becomes a CSS custom property scoped to html[data-redesign]
//    (so the original prototype never sees them): --rd-<colour>, --rd-font-*,
//    --rd-radius-*, --rd-motion-*, --rd-<component>-<prop>;
//  • @font-face rules for each family's files;
//  • the resolved values are exported for JS that can't use CSS (canvas, WebGL,
//    inline styles in redesign-only code).
// The class → token overrides that recolour the existing markup are generated
// from colors.json by generate-remap.mjs (see generated/redesign-colors.css).
import colorFile from './colors.json'
import typeFile from './typography.json'
import componentFile from './components.json'
import './generated/redesign-colors.css'

// Flat lookups by token name.
export const color = {}
export const colorScope = {}
for (const g of Object.values(colorFile.groups)) {
  for (const [name, tok] of Object.entries(g.tokens)) {
    color[name] = tok.value
    colorScope[name] = tok.scope || 'xbox'
  }
}
const quote = (f) => (/^[\w-]+$/.test(f) && !/\d/.test(f[0]) && !f.includes(' ') ? f : `"${f}"`)
export const font = Object.fromEntries(
  Object.entries(typeFile.families).map(([k, f]) => [k, f.stack.map(quote).join(', ')]),
)
export const radius = { ...componentFile.radius }
export const motion = { ...componentFile.motion }

// Replace {color.x} / {font.x} / {radius.x} / {motion.x} inside a string;
// a value that is exactly {style.x} resolves to that text style object.
const TABLES = { color, font, radius, motion }
export const style = {}
function resolve(v) {
  if (typeof v !== 'string') return v
  const whole = v.match(/^\{style\.([\w-]+)\}$/)
  if (whole) return style[whole[1]]
  return v.replace(/\{(color|font|radius|motion)\.([\w-]+)\}/g, (m, t, k) => {
    const val = TABLES[t][k]
    if (val == null) { console.warn(`[tokens] unknown reference ${m}`); return m }
    return val
  })
}
for (const [k, s] of Object.entries(typeFile.styles)) {
  style[k] = {
    fontFamily: font[s.family],
    fontSize: s.size,
    fontWeight: typeFile.weights[s.weight] || s.weight || 400,
    lineHeight: s.lineHeight,
    letterSpacing: s.tracking || 'normal',
    textTransform: s.transform || 'none',
  }
}
export const components = Object.fromEntries(
  Object.entries(componentFile.components).map(([k, c]) => [k, Object.fromEntries(Object.entries(c).map(([p, v]) => [p, resolve(v)]))]),
)
// CSS time string → ms number, for JS animations.
export const ms = (t) => (typeof t === 'number' ? t : parseFloat(t) * (/ms$/.test(t) ? 1 : 1000))

// ── CSS custom properties ─────────────────────────────────────────────────
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
function cssText() {
  const vars = []
  for (const [k, v] of Object.entries(color)) vars.push(`--rd-${k}: ${v};`)
  for (const [k, v] of Object.entries(font)) vars.push(`--rd-font-${k}: ${v};`)
  for (const [k, v] of Object.entries(radius)) vars.push(`--rd-radius-${k}: ${v};`)
  for (const [k, v] of Object.entries(motion)) vars.push(`--rd-motion-${k}: ${v};`)
  for (const [k, s] of Object.entries(style)) {
    vars.push(`--rd-style-${k}-size: ${s.fontSize};`, `--rd-style-${k}-weight: ${s.fontWeight};`, `--rd-style-${k}-line: ${s.lineHeight};`)
  }
  for (const [c, props] of Object.entries(components)) {
    for (const [p, v] of Object.entries(props)) {
      if (p === 'label' || v == null || typeof v === 'object') continue
      vars.push(`--rd-${c}-${kebab(p)}: ${v};`)
    }
  }
  // Older names the redesign CSS used before the token files existed.
  vars.push('--rd-green: var(--rd-accent);', '--rd-on-green: var(--rd-on-accent);')
  const faces = []
  for (const f of Object.values(typeFile.families)) {
    for (const [w, src] of Object.entries(f.files || {})) {
      faces.push(`@font-face { font-family: "${f.stack[0]}"; src: url("${src}") format("truetype"); font-weight: ${w}; font-style: normal; font-display: swap; }`)
    }
  }
  return `${faces.join('\n')}\nhtml[data-redesign] {\n  ${vars.join('\n  ')}\n}\n`
}

function inject() {
  if (typeof document === 'undefined') return
  let el = document.getElementById('rd-tokens')
  if (!el) {
    el = document.createElement('style')
    el.id = 'rd-tokens'
    document.head.appendChild(el)
  }
  el.textContent = cssText()
}
inject()

// Everything the design-system page needs, in one object.
export const tokens = { colorFile, typeFile, componentFile, color, colorScope, font, style, radius, motion, components }
