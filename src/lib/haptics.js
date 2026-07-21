// Vibration API is Android-only — iOS Safari/PWA never implements navigator.vibrate.
const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function vibrate(pattern = 10) {
  if (!supported) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Some browsers throw if called outside a user gesture — safe to ignore.
  }
}

// Toggle switches are a <label> wrapping a zero-size checkbox: a tap fires a
// click on the label's child (track/thumb) *and* a synthetic click on the
// input itself. Only matching the input here avoids vibrating twice per tap.
const TAP_TARGET_SELECTOR = 'button, [role="button"], input[type="checkbox"]'

// Delegated at the document root so every button/toggle gets tap feedback
// without each component wiring up its own handler.
export function initHapticTaps() {
  if (!supported) return () => {}

  const handleClick = (e) => {
    const target = e.target.closest(TAP_TARGET_SELECTOR)
    if (!target || target.disabled) return
    vibrate(10)
  }

  document.addEventListener('click', handleClick, true)
  return () => document.removeEventListener('click', handleClick, true)
}
