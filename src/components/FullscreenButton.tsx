import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Fullscreen control.
 *
 * A browser cannot enter fullscreen on load — the Fullscreen API demands a user
 * gesture, and there is no way around that from inside the page. So this is the
 * gesture: a button, plus `F` from anywhere. For a genuinely
 * already-fullscreen launch, use present.bat, which starts the browser that way.
 *
 * Escape exits on its own; the browser handles that and we just listen.
 */

/** Older WebKit builds shipped the prefixed names. Cheap to support. */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
}

function isFullscreen() {
  const d = document as WebkitDocument
  return Boolean(d.fullscreenElement ?? d.webkitFullscreenElement)
}

export function FullscreenButton() {
  const [active, setActive] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const el = document.documentElement as WebkitElement
    setSupported(Boolean(el.requestFullscreen ?? el.webkitRequestFullscreen))
  }, [])

  const toggle = useCallback(async () => {
    const d = document as WebkitDocument
    const el = document.documentElement as WebkitElement

    try {
      if (isFullscreen()) {
        await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())
      } else {
        await (el.requestFullscreen?.({ navigationUI: 'hide' }) ??
          el.webkitRequestFullscreen?.())
      }
    } catch {
      // A rejected request means the gesture wasn't trusted or the user said no.
      // Either way the state listener below is the source of truth, so there is
      // nothing to recover from.
    }
  }, [])

  // The browser owns fullscreen state — F11 and Escape bypass this component
  // entirely — so the event is what we trust, never our own optimism.
  useEffect(() => {
    const sync = () => setActive(isFullscreen())
    sync()
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return
      // Don't steal the key from a text field or a browser shortcut.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) return

      e.preventDefault()
      void toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  if (!supported) return null

  return (
    <motion.button
      type="button"
      onClick={() => void toggle()}
      aria-label={active ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
      title={active ? 'Exit fullscreen · F' : 'Fullscreen · F'}
      className="fixed right-5 bottom-5 z-50 flex min-h-[40px] items-center gap-2.5 rounded-[2px] border border-edge-bright bg-panel/85 px-3 backdrop-blur-md transition-colors hover:border-brand/60"
      // Once fullscreen, the control recedes rather than sitting on the deck for
      // the rest of the presentation. Hover brings it back.
      animate={{ opacity: active ? 0.25 : 1 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0" aria-hidden>
        {active ? (
          // Arrows pointing in — collapse.
          <g fill="none" stroke="var(--color-brand)" strokeWidth={1.4}>
            <path d="M5.5,1.5 L5.5,5.5 L1.5,5.5" />
            <path d="M8.5,12.5 L8.5,8.5 L12.5,8.5" />
          </g>
        ) : (
          // Corner brackets — expand.
          <g fill="none" stroke="var(--color-brand)" strokeWidth={1.4}>
            <path d="M1.5,5 L1.5,1.5 L5,1.5" />
            <path d="M9,1.5 L12.5,1.5 L12.5,5" />
            <path d="M12.5,9 L12.5,12.5 L9,12.5" />
            <path d="M5,12.5 L1.5,12.5 L1.5,9" />
          </g>
        )}
      </svg>
      <span className="mono text-[0.62rem] tracking-wider text-ash">
        {active ? 'EXIT' : 'FULLSCREEN'}
      </span>
      <kbd className="mono rounded-[2px] border border-edge px-1.5 py-0.5 text-[0.58rem] text-slate">
        F
      </kbd>
    </motion.button>
  )
}
