# Getting these into After Effects

## Which files to use

**Use the PNGs.** After Effects does not import SVG — it takes `.ai`, `.eps`
and `.pdf` for vector, and SVG has never been on the list. The PNGs are exported
at 3× the design size, so there's plenty of headroom for a 1080p or 4K comp.

The SVGs are there for when you need to go bigger than 3×, or want editable
paths. To use one: open it in Illustrator → **Save As `.ai`** → import that into
AE (optionally *Layer > Create Shapes from Vector Layer*). Worth knowing:

- The 84 icon SVGs are pure vector paths.
- `wheel-idle/vectors/02-wheel.svg` and `wheel-landed/…` are **hybrid** — the
  wedges and rim are vector, but the game cover art inside them is embedded
  bitmap. Converting to `.ai` won't make the covers vector.
- `wheel-twelve/vectors/02-wheel.svg` **is** fully vector, because at twelve
  slices the app has already faded the cover art out.

## 1 · Import

`File > Import > File` (⌘I), point at a scene's `layers/` folder, and hit
**Import Folder** — or open the folder and select every PNG.

If the **PNG Sequence** checkbox is ticked in the import dialog, untick it. The
files are numbered `01-`, `02-`, … and you want them as separate stills, not
collapsed into one animating sequence.

If you see dark fringing on the edges afterwards, right-click the footage →
*Interpret Footage > Main* and set Alpha to **Straight (Unmatted)**.

## 2 · Make the comp the canvas size

Every scene has its own canvas. Build the comp at exactly that size, animate,
then nest it into your delivery comp and scale it there.

| scene | comp size |
|---|---|
| `wheel-idle` / `wheel-landed` / `wheel-twelve` | 1608 × 1608 |
| `ready-up-invite` / `-confirmed` / `-party-ready` | 1296 × 693 |
| `ready-up-host-waiting` | 1296 × 783 |
| `wheel-jam-toast` | 1536 × 249 |
| `wheel-result-toast` | 1296 × 678 |
| `rank-modal` | 1848 × 1482 |
| `create-modal-selected` | 1488 × 1860 |
| `trending-row` | 2868 × 1668 |

Every other scene's size is the `canvas` block in its `layers.json`, or the
per-feature `README.md`.

## 3 · Drop them in — they self-register

Select all the footage in the Project panel and drag it into the comp.

Because **every layer PNG is the full canvas size**, AE centres each one and
they all line up perfectly. No positioning, no eyeballing. The frame reassembles
exactly as `composite.png`.

Check the stacking order once: the numbering is paint order with `01-` at the
**bottom**. If AE loaded them upside down, select all and reverse.

Compare against `reference.png` to confirm you've got the whole frame.

## 4 · Anchor points

Layers arrive with their anchor at the *canvas* centre, which is fine for fades
and slides. Anything that rotates or scales needs its anchor moved onto its own
ink — `layers.json` gives every layer's `rect` for this.

**The wheel is the one that matters.** In the 1608 × 1608 comp, `02-icon-wheel.png`
has its default Anchor Point *and* Position at 804, 804 — but the wheel actually
centres on **702, 702**. Set **both** Anchor Point and Position to `702, 702`:
changing both together leaves the image exactly where it is, and rotation now
happens about the true centre instead of wobbling.

(Or skip this by using the wheel `.ai` on its own — it's already centred.)

## 5 · The spin expression

Option-click the stopwatch next to the wheel layer's **Rotation**, and paste the
expression from [`04-spin-the-wheel/wheel-spin.md`](04-spin-the-wheel/wheel-spin.md).
That file also covers the landing maths, the easing curve, and how to chain a
re-roll.
