#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Exports every scene in src/mograph/scenes.jsx as motion-graphics source art:
// a flat reference, a transparent composite, one transparent PNG per visual
// layer (all sharing the composite's canvas, so they stack at 0,0), and real
// .svg for every vector in the scene.
//
//   node tools/export-mograph.mjs [--scene id] [--group 04] [--scale 3]
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'motion-graphics')
const PORT = 5199
const BASE = `http://localhost:${PORT}/mograph.html`

const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1] }
const SCALE = Number(arg('scale', 3))
const ONLY_SCENE = arg('scene')
const ONLY_GROUP = arg('group')
const STAGE_BG = '#0c0c0e' // the app's page black, for the flat reference only

const log = (...a) => console.log(...a)

async function startVite() {
  // `detached` so the whole npx → vite tree can be torn down as one group;
  // killing the npx wrapper alone leaves the real server holding the port.
  const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('vite did not start in 60s')), 60000)
    proc.stdout.on('data', (d) => { if (/Local:|ready in/.test(String(d))) { clearTimeout(t); resolve() } })
    proc.stderr.on('data', (d) => process.stderr.write(String(d)))
    proc.on('exit', (c) => { clearTimeout(t); reject(new Error('vite exited with ' + c)) })
  })
  // Give the first module graph a moment to settle before the first navigation.
  await new Promise((r) => setTimeout(r, 800))
  return proc
}

function stopVite(proc) {
  try { process.kill(-proc.pid, 'SIGTERM') } catch { proc.kill('SIGTERM') }
}

const FILTERED = !!(ONLY_SCENE || ONLY_GROUP)

async function main() {
  // A full run starts from a clean folder; a filtered one must leave the scenes
  // it isn't rebuilding alone, and merge its results into the existing manifest.
  if (!FILTERED) await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(OUT, { recursive: true })

  log('· starting vite…')
  const vite = await startVite()
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: SCALE })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.warn('  ! page error:', e.message))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  let scenes = await page.evaluate(() => window.__mg.scenes)
  if (ONLY_SCENE) scenes = scenes.filter((s) => s.id === ONLY_SCENE)
  if (ONLY_GROUP) scenes = scenes.filter((s) => s.group.startsWith(ONLY_GROUP))
  log(`· ${scenes.length} scenes @${SCALE}x\n`)

  const manifest = []
  for (const scene of scenes) {
    const dir = path.join(OUT, scene.group, scene.id)
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(path.join(dir, 'layers'), { recursive: true })
    await fs.mkdir(path.join(dir, 'vectors'), { recursive: true })

    await page.goto(`${BASE}?scene=${scene.id}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.__mg.ready())

    for (const step of scene.steps || []) {
      if (step.click) await page.locator(step.click).first().click()
      if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1])
    }
    if (scene.steps?.length) {
      // Park the cursor off-stage, or the last thing clicked keeps its :hover fill.
      await page.mouse.move(1590, 990)
      await page.evaluate(() => window.__mg.ready())
    }

    // Park every looping animation on frame 0 so runs are reproducible.
    await page.evaluate(() => document.documentElement.classList.add('mg-still'))

    const clip = await page.evaluate(() => window.__mg.contentRect(8))
    if (!clip || clip.width < 2) { console.warn(`  ! ${scene.id}: nothing to capture`); continue }

    // 1 · flat reference, on the app's page black — what the frame should look like.
    // Injected by hand rather than via addStyleTag, which has no way to tag the
    // node it adds: leave the sheet behind and every later shot bakes in an
    // opaque background and loses its alpha channel.
    await page.evaluate((bg) => {
      const st = document.createElement('style')
      st.id = 'mg-ref'
      st.textContent = `html,body{background:${bg} !important}`
      document.head.append(st)
    }, STAGE_BG)
    await page.screenshot({ path: path.join(dir, 'reference.png'), clip })
    await page.evaluate(() => document.getElementById('mg-ref')?.remove())

    // 2 · transparent composite — every layer, alpha preserved.
    await page.screenshot({ path: path.join(dir, 'composite.png'), clip, omitBackground: true })

    // 3 · one transparent PNG per layer, all on the composite's canvas.
    const layers = await page.evaluate(() => window.__mg.layers())
    for (const l of layers) {
      const ok = await page.evaluate((i) => window.__mg.isolate(i), l.index)
      if (!ok) continue
      await page.screenshot({ path: path.join(dir, 'layers', l.name + '.png'), clip, omitBackground: true })
    }
    await page.evaluate(() => window.__mg.showAll())

    // 4 · real vectors.
    const svgs = await page.evaluate(() => window.__mg.svgs())
    for (const s of svgs) await fs.writeFile(path.join(dir, 'vectors', s.name + '.svg'), s.markup)

    const meta = {
      scene: scene.id,
      group: scene.group,
      note: scene.note,
      capturedAt: new Date().toISOString(),
      scale: SCALE,
      canvas: { width: clip.width * SCALE, height: clip.height * SCALE, cssWidth: clip.width, cssHeight: clip.height },
      // Every layer PNG is the full canvas; `rect` is where its ink sits inside
      // it (CSS px, canvas-relative) — use it to set anchor points.
      layers: layers.map((l) => ({
        file: `layers/${l.name}.png`,
        kind: l.kind, tag: l.tag, text: l.text,
        rect: { x: l.rect.x - clip.x, y: l.rect.y - clip.y, width: l.rect.width, height: l.rect.height },
      })),
      vectors: svgs.map((s) => ({ file: `vectors/${s.name}.svg`, width: s.width, height: s.height })),
    }
    await fs.writeFile(path.join(dir, 'layers.json'), JSON.stringify(meta, null, 2))
    manifest.push(meta)
    log(`  ✓ ${scene.group}/${scene.id} — ${layers.length} layers, ${svgs.length} vectors, ${clip.width}×${clip.height}css`)
  }

  await writeDocs(await mergeManifest(manifest))
  await browser.close()
  stopVite(vite)
  log(`\n· done → ${path.relative(process.cwd(), OUT)}`)
}

// Fold this run's scenes over whatever the last full run left behind, so the
// READMEs stay complete after `--scene` / `--group`.
async function mergeManifest(fresh) {
  if (!FILTERED) return fresh
  let prior = []
  try { prior = JSON.parse(await fs.readFile(path.join(OUT, 'manifest.json'), 'utf8')) } catch {}
  const byId = new Map(prior.map((m) => [m.scene, m]))
  for (const m of fresh) byId.set(m.scene, m)
  return [...byId.values()].sort((a, b) => (a.group + a.scene).localeCompare(b.group + b.scene))
}

const GROUP_TITLES = {
  '01-create-playlist': 'Creating a new PlayList',
  '02-mix-add-and-rank': 'Adding & ranking games in a Mix',
  '03-friend-activity': 'Friend activity / social proof',
  '04-spin-the-wheel': 'Spinning the wheel',
  '05-ready-up': 'Ready-up notification',
}

async function writeDocs(manifest) {
  const groups = [...new Set(manifest.map((m) => m.group))].sort()

  for (const g of groups) {
    const inGroup = manifest.filter((m) => m.group === g)
    const body = [
      `# ${GROUP_TITLES[g] || g}`,
      '',
      ...inGroup.flatMap((m) => [
        `## \`${m.scene}\``,
        '',
        m.note,
        '',
        `Canvas **${m.canvas.width}×${m.canvas.height}px** (${m.canvas.cssWidth}×${m.canvas.cssHeight} @${m.scale}x) · ${m.layers.length} layers · ${m.vectors.length} vectors`,
        '',
        '| # | layer | kind | at (x, y) | size |',
        '|---|---|---|---|---|',
        ...m.layers.map((l, i) => `| ${i + 1} | \`${path.basename(l.file)}\` | ${l.kind} | ${l.rect.x}, ${l.rect.y} | ${l.rect.width}×${l.rect.height} |`),
        '',
      ]),
    ].join('\n')
    await fs.writeFile(path.join(OUT, g, 'README.md'), body)
  }

  const index = [
    '# Motion-graphics source art',
    '',
    `Generated by \`node tools/export-mograph.mjs\` on ${new Date().toISOString().slice(0, 10)}. Do not hand-edit — re-run instead.`,
    '',
    '## What is in each scene folder',
    '',
    '| file | what it is |',
    '|---|---|',
    '| `reference.png` | the frame flattened on the app background — what it should look like |',
    '| `composite.png` | the same frame with a real alpha channel |',
    '| `layers/*.png` | one transparent PNG per visual element, **each the full canvas size** |',
    '| `vectors/*.svg` | every vector in the scene as standalone SVG (icons, the wheel) |',
    '| `layers.json` | canvas size + each layer\'s kind, text and ink rect |',
    '',
    'Because every layer PNG is the full canvas, importing a `layers/` folder into',
    'After Effects and placing all of them at position 0,0 reassembles the frame',
    'exactly. File order (`01-`, `02-`, …) is paint order, bottom to top. Use the',
    '`rect` in `layers.json` to move each layer\'s anchor point onto its own ink.',
    '',
    'Step-by-step import instructions live in `AFTER-EFFECTS.md`, which this',
    'generator does not touch.',
    '',
    '## Scenes',
    '',
    ...groups.flatMap((g) => [
      `### ${GROUP_TITLES[g] || g}  ·  \`${g}/\``,
      '',
      ...manifest.filter((m) => m.group === g).map((m) => `- **\`${m.scene}\`** — ${m.note}  \n  ${m.canvas.width}×${m.canvas.height}px · ${m.layers.length} layers · ${m.vectors.length} vectors`),
      '',
    ]),
    '## Re-exporting',
    '',
    '```bash',
    'node tools/export-mograph.mjs                 # everything, @3x',
    'node tools/export-mograph.mjs --group 04      # one feature',
    'node tools/export-mograph.mjs --scene wheel-idle',
    'node tools/export-mograph.mjs --scale 4       # bigger canvas',
    '```',
    '',
    'Scenes live in `src/mograph/scenes.jsx` — each one mounts the real app',
    'component with fixed props, so the art never drifts from the product. Browse',
    'them by hand with `npm run dev` and opening `/mograph.html`.',
    '',
  ].join('\n')
  await fs.writeFile(path.join(OUT, 'README.md'), index)
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
