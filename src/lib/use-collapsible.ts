import { useEffect, useRef } from "react"

const DURATION_MS = 250

/**
 * Animates an element's height between collapsed (display:none) and expanded
 * (height:auto) states. Returns a ref to attach to the collapsible element.
 *
 * Why JS-driven instead of pure CSS: a CSS max-height animation can't fully
 * hide flex content — the children keep rendering at their min-content size and
 * read as "visible" to Playwright's isVisible() and to assistive tech. By
 * animating real height and landing on display:none when closed, the collapsed
 * state is genuinely hidden.
 *
 * The element must start with a CSS rule that hides it when closed (e.g.
 * `display: none` without an `.is-active` class); this hook only runs the
 * transition between the two states and sets the terminal `display` value.
 */
export const useCollapsible = (isOpen: boolean) => {
  const ref = useRef<HTMLElement | null>(null)
  // Skip the animation on the initial render so a menu that starts open
  // doesn't play an expand animation on first paint.
  const isFirstRender = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (isOpen) {
      // Initial open: CSS alone renders the menu; nothing to animate.
      if (isFirstRender.current) {
        isFirstRender.current = false
        return
      }
      isFirstRender.current = false
    } else {
      isFirstRender.current = false
    }

    // Cancel any in-flight transition so rapid toggles don't fight each other.
    if (el.getAnimations) {
      el.getAnimations().forEach(a => a.cancel())
    }

    if (isOpen) {
      // Expanding: display:flex first so layout has a measurable height, then
      // animate from 0 → scrollHeight, then release to height:auto.
      el.style.display = "flex"
      const targetHeight = el.scrollHeight
      el.style.height = "0px"
      // Force a reflow so the browser registers the 0px start before transitioning.
      void el.offsetHeight
      el.style.transition = `height ${DURATION_MS}ms ease`
      el.style.height = `${targetHeight}px`

      const onEnd = () => {
        el.style.transition = ""
        el.style.height = ""
        el.style.overflow = ""
        el.removeEventListener("transitionend", onEnd)
      }
      el.addEventListener("transitionend", onEnd, { once: true })
    } else {
      // Collapsing: fix the current height first (so we have a concrete start
      // value to animate from), then transition to 0, then display:none.
      el.style.height = `${el.scrollHeight}px`
      el.style.overflow = "hidden"
      void el.offsetHeight
      el.style.transition = `height ${DURATION_MS}ms ease`
      el.style.height = "0px"

      const onEnd = () => {
        el.style.display = "none"
        el.style.transition = ""
        el.style.height = ""
        el.style.overflow = ""
        el.removeEventListener("transitionend", onEnd)
      }
      el.addEventListener("transitionend", onEnd, { once: true })
    }
  }, [isOpen])

  return ref
}
