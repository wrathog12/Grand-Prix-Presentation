import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Lenis drives the scroll so the whole deck shares one easing curve. Without
 * it, native scroll on Windows moves in ~100px jumps and every scroll-linked
 * animation inherits the stutter.
 *
 * Honours prefers-reduced-motion by not mounting at all — the app does the
 * same, and a deck that ignores the setting while presenting an accessibility
 * slide would be its own counterargument.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      // Exponential ease-out: fast pickup, long settle. Reads as weight.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])
}
