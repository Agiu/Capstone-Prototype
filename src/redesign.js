// ── Redesign toggle ─────────────────────────────────────────────────────────
// Gates the post-test redesign pass. Off = the prototype exactly as tested; on =
// the redesigned elements. Every redesigned element branches on REDESIGN (or
// rd()) so both versions stay live side by side for before/after captures —
// and each change is written up in REDESIGN_LOG.md.
//
// Set from the launcher switch and remembered in localStorage, so it carries
// into every view (the multi view's same-origin iframes included). A
// ?redesign=1|0 in the URL overrides it and is remembered too, so a shared link
// opens in the intended version.
const KEY = 'redesign'
const _q = new URLSearchParams(window.location.search).get('redesign')

function read() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

// Expose the flag to CSS — scoped style overrides key off html[data-redesign],
// so flipping it restyles the current page (the launcher) immediately.
function applyAttr(on) {
  document.documentElement.toggleAttribute('data-redesign', on)
}

export function setRedesign(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* storage blocked */ }
  applyAttr(on)
}

if (_q === '1' || _q === '0') setRedesign(_q === '1')

// Read once per page load — views are full navigations, so a flip on the
// launcher reaches rd() values on the next view opened (CSS-only changes, via
// the html attribute, apply live).
export const REDESIGN = _q === '1' || _q === '0' ? _q === '1' : read()
applyAttr(REDESIGN)

// Pick the original or the redesigned value: rd('text-[13px]', 'text-[14px]').
export const rd = (before, after) => (REDESIGN ? after : before)
