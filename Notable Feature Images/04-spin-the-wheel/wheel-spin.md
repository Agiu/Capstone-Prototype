# Rebuilding the wheel spin in After Effects

The spin is one animated value: the wheel's **rotation**. Everything else — the
pointer, the hub, the SPIN ME text — is static. So it rebuilds exactly in AE
with a single expression on Rotation.

Two things have to match the app: **where it stops**, and **how it brakes**.

## Setup

| layer | file | animates |
|---|---|---|
| pointer | `vectors/01-pointer.svg` | no |
| **wheel** | `vectors/02-wheel.svg` | **rotation** |
| hub + SPIN ME | `layers/03-shape-hub.png`, `layers/04-text-spin-me.png` | no |

Use the SVGs where you can — they're real vector, so they hold up at any scale
(turn on Continuously Rasterize).

**Anchor point.** If you use `vectors/02-wheel.svg` on its own, the anchor is
already dead centre. If you use the full-canvas layer PNGs instead, the wheel is
*not* at the canvas centre — the canvas is 1608×1608 but the wheel centres on
**702, 702**. Set the anchor point there or it will wobble. (Every layer's rect
is in `wheel-idle/layers.json`.)

## The expression

Drop this on the wheel layer's **Rotation**:

```js
// ── Wheel spin ──────────────────────────────────────────────────────────
var N      = 6;    // slices on the wheel
var TARGET = 3;    // 0-based winning slice (0 = the one starting at 12 o'clock)
var TURNS  = 12;   // whole turns before braking — the app rolls 9..16
var JITTER = 0.18; // where inside the slice it stops, -0.35..0.35 (0 = centre)
var START  = 0;    // rotation the wheel sits at when this spin begins
var T0     = 0;    // spin start, in seconds
var DUR    = 4;    // SPIN_MS = 4000

// Landing angle — bring the target slice under the 12 o'clock pointer.
var seg   = 360 / N;
var stop  = (TARGET + 0.5 + JITTER) * seg;
var rest  = (360 - (stop % 360) + 360) % 360;
var delta = (rest - (((START % 360) + 360) % 360) + 360) % 360;
var END   = START + TURNS * 360 + delta;

// CSS cubic-bezier(x1,y1,x2,y2): solve x(t) = p, return y(t).
function bez(p, x1, y1, x2, y2) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  var cx = 3*x1, bx = 3*(x2-x1) - cx, ax = 1 - cx - bx;
  var cy = 3*y1, by = 3*(y2-y1) - cy, ay = 1 - cy - by;
  var t = p;
  for (var i = 0; i < 8; i++) {              // Newton-Raphson
    var e = ((ax*t + bx)*t + cx)*t - p;
    if (Math.abs(e) < 1e-6) break;
    var d = (3*ax*t + 2*bx)*t + cx;
    if (Math.abs(d) < 1e-6) break;
    t -= e / d;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay*t + by)*t + cy)*t;
}

START + (END - START) * bez((time - T0) / DUR, 0.06, 0.86, 0.18, 1);
```

## What the numbers mean

All of these come straight out of `DecisionWheel` in `src/Landing.jsx`:

- **`DUR = 4`** — `SPIN_MS = 4000`.
- **`TURNS`** — `MIN_TURNS = 9`, `MAX_TURNS = 16`, rolled per spin. More turns
  means a faster whip, not a longer spin: the duration is fixed, so the turns
  are what set the speed.
- **`JITTER`** — the app rolls `(random - 0.5) * 0.7`, so ±0.35 of a slice. It
  stops the pointer landing dead centre every time. Leave it non-zero.
- **`0.06, 0.86, 0.18, 1`** — the CSS easing the wheel transitions on.

That curve is far more aggressive than it looks written down:

| time elapsed | rotation done |
|---|---|
| 10% (0.4s) | 63% |
| 25% (1.0s) | 85% |
| 50% (2.0s) | 96% |
| 75% (3.0s) | 99.4% |

So it's off the line at full speed and spends the back half of the shot almost
stationary, creeping onto the winning slice. If your version reads as "spins
evenly then stops", the easing is wrong, not the timing.

## Chaining a re-roll

The app carries rotation over between spins so a second spin picks up speed from
where the first stopped rather than snapping back to zero. To do the same, set
the next spin's `START` to the previous spin's `END`, and push `T0` forward.

## Doing it with keyframes instead

Possible, and simpler for a one-off: two Rotation keyframes, `START` → `END`
(work `END` out with the landing math above), then shape the curve in the Graph
Editor. The influence values map directly — **6% out**, **82% in** (`1 - 0.18`)
— but AE's ease handles are influence/speed rather than raw control points, so
the vertical half has to be matched by eye. If it needs to be exact, use the
expression.
