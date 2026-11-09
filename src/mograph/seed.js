// Determinism for the exporter: the same scene must produce the same pixels on
// every run, or every re-export churns the whole art folder in git.
//
// Imported FIRST by main.jsx, before any scene or app module is evaluated, so
// nothing has had a chance to read the real clock or a random number yet.

// mulberry32 — small, fast, and stable across runs.
let s = 0x9bf00b
Math.random = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// A fixed "now", so relative countdowns ("Respond in 60s") land on a whole
// number instead of whatever the capture happened to catch.
const FROZEN = Date.UTC(2026, 0, 1, 20, 0, 0)
Date.now = () => FROZEN
