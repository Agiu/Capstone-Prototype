// ── Redesign: green swipe when an image loads ──────────────────────────────
// When a picture on an Xbox surface finishes loading, an accent band sweeps
// across it corner to corner — the same bottom-right → top-left diagonal as
// the Start A Party slice — and the image is uncovered behind the band's
// trailing edge. It's driven by the load event itself (captured once on the
// document, since load doesn't bubble), so it plays only when an image
// actually arrives: first paint, a lazy image scrolling in, or a new src.
//
// Each image swipes once per page load: its URL is remembered, so going back
// to a page (or the same art on another page) shows it straight away, while a
// reload swipes everything in again. Until then, cover images are held hidden by CSS (index.css)
// so a cached image can't paint for a frame before its load event arrives —
// data-rd-img releases them: "playing" while the swipe runs, "done" after (or
// at once, for images that don't swipe).
//
// Only cover-fit art takes it (game art, PlayList covers, screenshots) — not
// logos, icons or avatars, which are contain-fit or fixed-size glyphs — and
// not filtered backdrops (blurred halos, greyed-out covers). Discord pieces,
// hidden images and reduced motion are skipped. Redesign only: checked per
// load, so flipping the launcher toggle applies straight away.
import { components, ms } from './tokens.js'

const spec = components['image-reveal']
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
// URLs that have already swiped on this page load. In memory on purpose: a
// reload is a fresh visit and swipes again; moving between pages doesn't.
const seen = new Set()
const remember = (src) => seen.add(src)

const done = (img) => img.setAttribute('data-rd-img', 'done')

function canSwipe(img) {
  if (!document.documentElement.hasAttribute('data-redesign') || reducedMotion.matches) return false
  if (!img.closest('[data-xbox]') || img.closest('[data-discord]')) return false
  const cs = getComputedStyle(img)
  if (cs.objectFit !== 'cover' || cs.filter !== 'none') return false
  if (!img.offsetParent || Math.min(img.offsetWidth, img.offsetHeight) < spec.minSize) return false
  return !img.checkVisibility || img.checkVisibility({ opacityProperty: true, visibilityProperty: true })
}

// A loaded image: swipe it in the first time, otherwise just release it.
// data-rd-always (the design page's replay preview) skips the once rule.
function settle(img) {
  if (img.hasAttribute('data-rd-img')) return
  // Release the hold first, so the checks below see the image's own opacity;
  // switching to "playing" in this same task means it never paints uncovered.
  // An image with a transition class would fade up from the hold instead, so
  // that opacity transition is jumped to its end.
  done(img)
  for (const a of img.getAnimations()) if (a.transitionProperty === 'opacity') a.finish()
  const src = img.currentSrc || img.src
  if ((seen.has(src) && !img.hasAttribute('data-rd-always')) || !canSwipe(img)) return
  remember(src)

  // The band sits on top of the image as its next sibling, so it shares the
  // image's containing block and clipping. It's taken out again when the
  // sweep ends, so React's own children are only briefly shared.
  const cs = getComputedStyle(img)
  const band = document.createElement('span')
  band.className = 'rd-image-reveal-band'
  band.setAttribute('aria-hidden', 'true')
  Object.assign(band.style, {
    left: img.offsetLeft + 'px',
    top: img.offsetTop + 'px',
    width: img.offsetWidth + 'px',
    height: img.offsetHeight + 'px',
    borderRadius: cs.borderRadius,
    maskImage: cs.maskImage,
    webkitMaskImage: cs.webkitMaskImage,
  })
  img.after(band)
  img.setAttribute('data-rd-img', 'playing')
  setTimeout(() => {
    band.remove()
    if (img.getAttribute('data-rd-img') === 'playing') done(img)
  }, ms(spec.duration) + 50)
}

// An image entering the page (or switching src), before it paints: one that
// already swiped this session is released at once; one that's already
// complete (from cache, possibly before it was attached) settles now rather
// than waiting on a load event that may already have passed.
function arrive(img) {
  if (seen.has(img.currentSrc || img.src) && !img.hasAttribute('data-rd-always')) done(img)
  else if (img.complete && img.naturalWidth) settle(img)
}

document.addEventListener('load', (e) => { if (e.target instanceof HTMLImageElement) settle(e.target) }, true)
// A broken image has nothing to swipe — release it so it isn't held hidden.
document.addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) done(e.target) }, true)

new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === 'attributes') {
      r.target.removeAttribute('data-rd-img')
      arrive(r.target)
      continue
    }
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1) continue
      if (n.tagName === 'IMG') arrive(n)
      else for (const img of n.querySelectorAll('img')) arrive(img)
    }
  }
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] })
