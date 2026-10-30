// ── Redesign colour remap generator ────────────────────────────────────────
// The prototype's markup uses hard-coded Tailwind colours (bg-[#2b2d31], …).
// Rather than touch that markup — the original must stay exactly as tested —
// the redesign re-points each of those classes at a token, but only under
// html[data-redesign]. This script finds every hard-coded colour class in
// src/, looks up the token that `replaces` it in colors.json, and writes:
//   generated/redesign-colors.css — one !important rule per class, using
//     var(--rd-<token>) so editing a token's value needs no regeneration;
//   generated/coverage.json — which classes each token covers (and any colour
//     that has no token yet), for the design-system page.
// Runs automatically from the Vite plugin (vite.config.js) on start and on
// every source save; `npm run tokens` runs it by hand.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(HERE, '..')
const OUT_DIR = path.join(HERE, 'generated')

const PROPS = { bg: 'background-color', text: 'color', border: 'border-color', ring: '--tw-ring-color' }
const PSEUDO = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active', disabled: ':disabled', enabled: ':enabled' }
// Utility classes carrying a literal colour, with any variant prefixes and an
// optional /opacity — bounded by whitespace or a quote so substrings of other
// tokens never match.
const CLASS_RE = /(?<=^|[\s'"`])((?:[a-z0-9-]+(?:\/[a-z0-9-]+)?:)*(bg|text|border|ring)-\[#([0-9a-fA-F]{3,8})\](?:\/(\[[0-9.]+\]|\d+))?)(?=$|[\s'"`])/gm

const esc = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
const norm = (h) => {
  h = h.toLowerCase()
  return h.length === 3 ? h.split('').map((c) => c + c).join('') : h
}

// Files the app never imports (old experiments) — their colours never render.
const IGNORE = new Set(['RecServer.jsx'])

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'design' && e.name !== 'mograph') walk(p, out) }
    else if (/\.(jsx|js)$/.test(e.name) && !IGNORE.has(e.name)) out.push(p)
  }
  return out
}

export function generateRemap({ quiet = false } = {}) {
  const colors = JSON.parse(fs.readFileSync(path.join(HERE, 'colors.json'), 'utf8'))
  // utility-specific mappings ("text:#0c0c0e") win over plain ones ("#0c0c0e").
  const byUtil = {}, byHex = {}, scopeOf = {}
  for (const g of Object.values(colors.groups)) {
    for (const [name, tok] of Object.entries(g.tokens)) {
      scopeOf[name] = tok.scope || 'xbox'
      for (const r of tok.replaces || []) {
        const m = r.match(/^(?:(bg|text|border|ring):)?#?([0-9a-fA-F]{3,8})$/)
        if (!m) { console.warn(`[tokens] bad replaces entry "${r}" on ${name}`); continue }
        if (m[1]) byUtil[`${m[1]}:${norm(m[2])}`] = name
        else byHex[norm(m[2])] = name
      }
    }
  }

  const found = new Map() // class → count
  for (const f of walk(SRC)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(CLASS_RE)) found.set(m[1], (found.get(m[1]) || 0) + 1)
  }

  const rules = [], coverage = {}, unmapped = {}
  for (const [cls, count] of [...found.entries()].sort()) {
    const m = cls.match(/^((?:[a-z0-9-]+(?:\/[a-z0-9-]+)?:)*)(bg|text|border|ring)-\[#([0-9a-fA-F]{3,8})\](?:\/(?:\[([0-9.]+)\]|(\d+)))?$/)
    const [, variantStr, util, rawHex, frac, pct] = m
    const hex = norm(rawHex)
    const token = byUtil[`${util}:${hex}`] || byHex[hex]
    if (!token) { unmapped[`#${hex}`] = (unmapped[`#${hex}`] || 0) + count; continue }
    ;(coverage[token] ||= []).push({ class: cls, count })

    // Variants → selector pieces.
    let group = '', pseudo = '', pseudoEl = '', ok = true
    for (const v of variantStr.split(':').filter(Boolean)) {
      const gm = v.match(/^group-(hover|focus|focus-within|focus-visible)(?:\/([\w-]+))?$/)
      if (gm) group += `.group${gm[2] ? '\\/' + gm[2] : ''}:${gm[1]} `
      else if (v === 'placeholder') pseudoEl = '::placeholder'
      else if (PSEUDO[v]) pseudo += PSEUDO[v]
      else { ok = false; console.warn(`[tokens] unsupported variant "${v}" in ${cls}`) }
    }
    if (!ok) continue
    const alpha = frac ? Math.round(parseFloat(frac) * 1000) / 10 : pct ? Number(pct) : null
    const value = alpha == null ? `var(--rd-${token})` : `color-mix(in srgb, var(--rd-${token}) ${alpha}%, transparent)`
    // Xbox-scoped tokens leave Discord pieces alone; :where keeps specificity
    // low so the hand-written redesign rules (contrast, outlines) still win.
    const scope = scopeOf[token] === 'all' ? '' : ':where([data-xbox], [data-xbox] *):not(:where([data-discord], [data-discord] *))'
    rules.push(`html[data-redesign] ${group}.${esc(cls)}${scope}${pseudo}${pseudoEl} { ${PROPS[util]}: ${value} !important; }`)
  }

  const css = `/* GENERATED by src/design/generate-remap.mjs from colors.json — do not edit.\n   Re-points every hard-coded colour class at its redesign token (redesign only). */\n${rules.join('\n')}\n`
  const report = JSON.stringify({ coverage, unmapped }, null, 2) + '\n'
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const write = (file, text) => {
    const p = path.join(OUT_DIR, file)
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) fs.writeFileSync(p, text)
  }
  write('redesign-colors.css', css)
  write('coverage.json', report)
  if (!quiet) {
    const miss = Object.keys(unmapped)
    console.log(`[tokens] ${rules.length} redesign colour rules from ${found.size} classes` + (miss.length ? ` — ${miss.length} colour(s) without a token: ${miss.join(', ')}` : ''))
  }
  return { rules: rules.length, unmapped }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) generateRemap()
