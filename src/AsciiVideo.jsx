import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { components } from './design/tokens.js'

// ── ASCII video (redesign) ──────────────────────────────────────────────────
// Re-draws a looping background video as ASCII glyphs, keeping the footage's
// own colours (each glyph takes the hue of the video under it). Built to stay
// cheap enough for an always-on hero:
//  • each frame the video is drawn down to 2×2 pixels per character cell (a few
//    thousand pixels) on a tiny 2D canvas — that's all that gets uploaded;
//  • one WebGL quad + fragment shader turns those cells into glyphs from a
//    pre-rendered glyph atlas, so per-frame CPU work is ~zero;
//  • capped at 30fps and ≤1.5× DPR, and it skips frames while the hero is
//    off-screen or the tab is hidden.
// The ref and props behave like the <video> they replace: the parent's ref gets
// the wrapper (so parallax transforms / fade opacity apply to the ASCII), and
// onTimeUpdate receives { currentTarget: { duration, currentTime, style } }
// with `style` being the wrapper's, so existing loop-fade handlers just work.
// Without WebGL it falls back to showing the plain video.
// `tint` ([r, g, b], 0–1) recolours every glyph to one colour instead of the
// footage's own; changes ease over ~half a second. null → footage colours.
//
// AsciiImage (below) draws a still picture the same way — the game page header.

// Tuning lives in src/design/components.json → "ascii-hero".
const HERO = components['ascii-hero']
const RAMP = HERO.ramp // dark → bright; index 0 is blank so dark areas stay empty
const MAX_DPR = HERO.maxDpr
const FRAME_MS = 1000 / HERO.fps
const SUB = 2 // downsample to SUB×SUB px per cell; the shader keeps the brightest,
              // so thin wireframe lines survive instead of averaging to a smudge

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y down, matching canvas rows
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
uniform sampler2D uFrame;  // SUB×SUB texels per cell
uniform sampler2D uAtlas;  // RAMP glyphs, left to right
uniform vec2 uGrid;        // cols, rows
uniform vec2 uCanvas;      // canvas size in device px
uniform float uCell;       // cell size in device px
uniform float uN;          // glyph count
uniform float uGain;
uniform float uCutoff;
uniform vec3 uTint;        // optional single colour for every glyph
uniform float uTintOn;     // 0 = footage colours, 1 = tint (eased between)
varying vec2 vUv;
void main() {
  vec2 px = vUv * uCanvas;
  vec2 cell = floor(px / uCell);
  vec2 local = fract(px / uCell);
  // Brightest of the cell's 2×2 samples (max, not average, keeps thin lines).
  vec2 base = cell * 2.0;
  vec2 g2 = uGrid * 2.0;
  vec3 c = vec3(0.0);
  float best = -1.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(mod(float(i), 2.0), floor(float(i) / 2.0)) + 0.5;
    vec3 s = texture2D(uFrame, (base + o) / g2).rgb;
    float sl = dot(s, vec3(0.299, 0.587, 0.114));
    if (sl > best) { best = sl; c = s; }
  }
  // Below the cutoff → blank; above it, rescale so the ramp still spans 0–1.
  float l = clamp((best * uGain - uCutoff) / (1.0 - uCutoff), 0.0, 1.0);
  float idx = floor(l * (uN - 1.0) + 0.5);
  float m = texture2D(uAtlas, vec2((idx + local.x) / uN, local.y)).r;
  // Keep the footage's hue, normalised so faint lines still read, scaled by
  // brightness so the image keeps its depth.
  float mx = max(max(c.r, c.g), c.b);
  vec3 hue = mix(mx > 0.0 ? c / mx : vec3(0.0), uTint, uTintOn);
  gl_FragColor = vec4(hue * m * (0.35 + 0.65 * l), 1.0);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}

function makeTexture(gl) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}

// White glyphs on black, one cell each, in RAMP order.
function drawAtlas(cellPx) {
  const c = document.createElement('canvas')
  c.width = cellPx * RAMP.length
  c.height = cellPx
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#fff'
  g.font = `bold ${Math.round(cellPx * 0.95)}px ui-monospace, SFMono-Regular, Menlo, monospace`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let i = 0; i < RAMP.length; i++) g.fillText(RAMP[i], i * cellPx + cellPx / 2, cellPx / 2 + 1)
  return c
}

// The shared WebGL glyph renderer behind AsciiVideo and AsciiImage. Returns
// null when WebGL (or the shader) isn't available, so callers fall back.
//  resize(w, h)       — CSS size of the canvas; rebuilds the grid and atlas
//  setTint(rgba)      — [r, g, b, on] uniform values
//  setCutoff(v)       — blank-below threshold (animatable)
//  draw(src, sw, sh)  — object-fit: cover crop of src (w × h) into the grid
function createRenderer(canvas, { cell, gain, cutoff }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
  if (!gl) return null
  let prog
  try {
    prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  } catch {
    return null
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  const U = (n) => gl.getUniformLocation(prog, n)
  const uGrid = U('uGrid'), uCanvas = U('uCanvas'), uCell = U('uCell')
  const uTint = U('uTint'), uTintOn = U('uTintOn'), uCutoff = U('uCutoff')
  gl.uniform1i(U('uFrame'), 0)
  gl.uniform1i(U('uAtlas'), 1)
  gl.uniform1f(U('uN'), RAMP.length)
  gl.uniform1f(U('uGain'), gain)
  gl.uniform1f(uCutoff, cutoff)
  gl.uniform1f(uTintOn, 0)

  const frameTex = makeTexture(gl)
  const atlasTex = makeTexture(gl)
  // The per-frame downsample target: SUB×SUB pixels per cell.
  const small = document.createElement('canvas')
  const sctx = small.getContext('2d', { willReadFrequently: false })
  let cols = 0, rows = 0

  return {
    get ready() { return cols > 0 },
    resize(w, h) {
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const cellPx = cell * dpr
      cols = Math.ceil(canvas.width / cellPx)
      rows = Math.ceil(canvas.height / cellPx)
      small.width = cols * SUB
      small.height = rows * SUB
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uGrid, cols, rows)
      gl.uniform2f(uCanvas, canvas.width, canvas.height)
      gl.uniform1f(uCell, cellPx)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, atlasTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawAtlas(Math.round(cellPx)))
    },
    setTint([r, g, b, on]) {
      gl.uniform3f(uTint, r, g, b)
      gl.uniform1f(uTintOn, on)
    },
    setCutoff(v) { gl.uniform1f(uCutoff, v) },
    draw(src, sw, sh) {
      if (!cols) return
      const scale = Math.max(cols / sw, rows / sh)
      const cw = cols / scale, ch = rows / scale
      sctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, cols * SUB, rows * SUB)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, frameTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, small)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    // Free the GL objects but keep the context alive: a canvas hands back the
    // same context on the next getContext, so losing it here would break the
    // remount (React StrictMode runs effects twice in dev).
    destroy() {
      gl.deleteTexture(frameTex)
      gl.deleteTexture(atlasTex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    },
  }
}

export const AsciiVideo = forwardRef(function AsciiVideo({ src, className, style, onTimeUpdate, tint = null }, ref) {
  const tintRef = useRef(tint)
  tintRef.current = tint
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [fallback, setFallback] = useState(false)
  useImperativeHandle(ref, () => wrapRef.current)

  useEffect(() => {
    const wrap = wrapRef.current
    const video = videoRef.current
    const r = createRenderer(canvasRef.current, HERO)
    if (!r) { setFallback(true); return }
    // Eased tint state — starts at the target so the first frame is right.
    const cur = tintRef.current ? [...tintRef.current, 1] : [0, 0, 0, 0]

    const resize = () => r.resize(wrap.clientWidth, wrap.clientHeight)
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // Only draw while visible on screen and the tab is in front.
    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting })
    io.observe(wrap)

    let raf = 0, last = 0
    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      if (!onScreen || document.hidden || now - last < FRAME_MS) return
      if (video.readyState < 2 || !r.ready || !video.videoWidth) return
      last = now
      // Ease toward the current tint (or back to footage colours).
      const t = tintRef.current
      const target = t ? [t[0], t[1], t[2], 1] : [cur[0], cur[1], cur[2], 0]
      for (let i = 0; i < 4; i++) cur[i] += (target[i] - cur[i]) * 0.12
      r.setTint(cur)
      r.draw(video, video.videoWidth, video.videoHeight)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      r.destroy()
    }
  }, [])

  // Hand the parent's loop-fade handler the wrapper's style, so its opacity
  // flips land on what's actually visible.
  const handleTime = (e) => {
    if (!onTimeUpdate) return
    const v = e.currentTarget
    onTimeUpdate({ currentTarget: { duration: v.duration, currentTime: v.currentTime, style: wrapRef.current.style } })
  }

  return (
    <div ref={wrapRef} className={className} style={style} aria-hidden>
      {/* The source: still decoding, but invisible unless WebGL is missing. */}
      <video
        ref={videoRef}
        className={'absolute inset-0 size-full object-cover' + (fallback ? '' : ' opacity-0')}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        onTimeUpdate={handleTime}
      />
      {!fallback && <canvas ref={canvasRef} className="absolute inset-0 size-full" />}
    </div>
  )
})

// ── ASCII image (redesign) ──────────────────────────────────────────────────
// A still picture as ASCII, each glyph in the colour of the art under it — the
// game page header. Tried in order through `srcs` (e.g. the wide hero art, then
// the cover), loaded cross-origin so its pixels can be read; if none can be,
// or WebGL is missing, it renders nothing and the page's colour wash stands in.
// On first draw the glyphs "develop": the blank-below cutoff eases from blank down
// to its resting value, so the art resolves out of the dark (skipped under
// reduced motion). Redraws only on resize — there's no frame loop.
// Tuning: `spec` — { cell, gain, cutoff, developDuration } from components.json.
const START = 0.999 // "all blank" — not 1, which would divide by zero in the shader
export function AsciiImage({ srcs, spec, className, style, onReady }) {
  const wrapRef = useRef(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  const canvasRef = useRef(null)
  const [ok, setOk] = useState(true)
  const key = srcs.filter(Boolean).join('|')

  useEffect(() => {
    const list = key ? key.split('|') : []
    const wrap = wrapRef.current
    const r = createRenderer(canvasRef.current, spec)
    if (!r || !list.length) { setOk(false); readyRef.current?.(); return }
    setOk(true)
    let img = null, raf = 0, live = true

    const paint = () => { if (img) r.draw(img, img.naturalWidth, img.naturalHeight) }
    const resize = () => { r.resize(wrap.clientWidth, wrap.clientHeight); paint() }
    const ro = new ResizeObserver(resize)

    const develop = () => {
      readyRef.current?.()
      const dur = parseFloat(spec.developDuration) || 0
      if (!dur || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { r.setCutoff(spec.cutoff); paint(); return }
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur)
        const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
        r.setCutoff(START - (START - spec.cutoff) * e)
        paint()
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const load = (i) => {
      if (i >= list.length) { if (live) { setOk(false); readyRef.current?.() } return }
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => {
        if (!live) return
        try {
          img = im
          r.resize(wrap.clientWidth, wrap.clientHeight)
          r.setCutoff(START)
          paint() // throws here if the pixels can't be read (no CORS)
          ro.observe(wrap)
          develop()
        } catch { img = null; load(i + 1) }
      }
      im.onerror = () => { if (live) load(i + 1) }
      im.src = list[i]
    }
    load(0)

    return () => {
      live = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      r.destroy()
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className={className} style={style} aria-hidden>
      {/* Always mounted (a new src reuses it); hidden when nothing could be drawn. */}
      <canvas ref={canvasRef} className={'absolute inset-0 size-full' + (ok ? '' : ' hidden')} />
    </div>
  )
}
