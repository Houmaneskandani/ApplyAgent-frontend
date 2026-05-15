import { useEffect, useRef } from 'react'

/**
 * Modal accessibility hook. Pass the modal's outer container ref and an
 * `onClose` callback.
 *
 * Behavior:
 *  - Escape key closes the modal.
 *  - Tab and Shift+Tab are trapped inside the modal — focus can't leak to
 *    the background page.
 *  - On open, the first focusable element gets keyboard focus.
 *  - On close, focus is restored to whatever element opened the modal.
 *
 * The caller is responsible for setting `role="dialog"` and `aria-modal="true"`
 * on the modal container itself; this hook handles the keyboard wiring.
 */
export default function useModalA11y(ref, { open = true, onClose } = {}) {
  // Remember the element that had focus before the modal opened so we can
  // restore focus to it on close. (Screen-reader users rely on this.)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement

    const node = ref.current
    if (!node) return

    // Auto-focus the first focusable child so keyboard users land inside.
    const focusables = getFocusables(node)
    if (focusables.length > 0) {
      // Small tick lets React paint the modal before we grab focus.
      requestAnimationFrame(() => {
        focusables[0].focus({ preventScroll: true })
      })
    } else {
      // No focusable child? Make the container itself focusable.
      node.setAttribute('tabindex', '-1')
      node.focus({ preventScroll: true })
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      // Trap Tab cycling inside the modal.
      const f = getFocusables(node)
      if (f.length === 0) {
        e.preventDefault()
        return
      }
      const first = f[0]
      const last = f[f.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      // Restore focus on close.
      const prev = previouslyFocused.current
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus({ preventScroll: true }) } catch { /* no-op */ }
      }
    }
  }, [open, onClose, ref])
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null || el === document.activeElement)
}
