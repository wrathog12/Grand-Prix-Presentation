import { motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'cover', label: 'Cover' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'technical', label: 'Technical' },
  { id: 'model', label: 'Model' },
  { id: 'versus', label: 'Why fusion' },
  { id: 'impact', label: 'Impact' },
]

/**
 * A timing-tower rail: seven marks, one per page, plus a scroll-progress line.
 * It doubles as the deck's navigation — during a presentation you want to be
 * able to jump straight to a section rather than scroll past four of them.
 */
export function ProgressRail() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 })
  const [active, setActive] = useState('cover')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      // A band across the middle of the viewport: whatever is centred wins.
      { rootMargin: '-45% 0px -45% 0px' },
    )

    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Top progress line — the only fixed element wide enough to notice. */}
      <motion.div
        className="fixed top-0 left-0 z-50 h-[2px] w-full origin-left"
        style={{ scaleX: progress, background: 'linear-gradient(90deg,#e6002b 0%,#00d9ff 100%)' }}
        aria-hidden
      />

      {/* Side rail — hidden on small screens, where it would crowd the content. */}
      <nav
        aria-label="Sections"
        className="fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex"
      >
        {SECTIONS.map((s, i) => {
          const isActive = active === s.id
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="group flex min-h-[24px] items-center gap-3"
              aria-current={isActive ? 'true' : undefined}
            >
              <span
                className="mono text-[0.62rem] tracking-wider transition-all duration-200"
                style={{
                  color: isActive ? 'var(--color-brand)' : 'var(--color-slate)',
                  opacity: isActive ? 1 : 0,
                }}
              >
                <span className="opacity-100 group-hover:opacity-100">{s.label}</span>
              </span>
              <span className="mono text-[0.58rem] text-slate opacity-0 transition-opacity group-hover:opacity-100">
                {String(i).padStart(2, '0')}
              </span>
              <motion.span
                className="block rounded-full"
                animate={{
                  width: isActive ? 18 : 8,
                  backgroundColor: isActive ? 'var(--color-brand)' : 'var(--color-edge-bright)',
                }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: 2 }}
              />
            </a>
          )
        })}
      </nav>
    </>
  )
}
