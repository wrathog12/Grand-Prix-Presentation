import { motion, useInView, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

/* ── Reveal ───────────────────────────────────────────────────────────────── */

/**
 * The deck's one entrance gesture: rise 18px and fade, on an ease-out that
 * matches the scroll easing. One gesture used everywhere reads as a system;
 * five different ones read as a demo of an animation library.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = 'div',
}: {
  children?: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'span' | 'li' | 'section' | 'p'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  )
}

/* ── Section shell ────────────────────────────────────────────────────────── */

export function Section({
  id,
  index,
  children,
  className = '',
}: {
  id: string
  index: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      data-index={index}
      aria-labelledby={`${id}-title`}
      className={`relative z-10 mx-auto w-full max-w-[1180px] px-6 py-28 sm:px-10 md:py-40 ${className}`}
    >
      {children}
    </section>
  )
}

export function SectionHead({
  id,
  eyebrow,
  headline,
  lead,
  index,
}: {
  id: string
  eyebrow: string
  headline: string
  lead?: string
  index: string
}) {
  return (
    <header className="mb-14 md:mb-20">
      <Reveal className="mb-5 flex items-center gap-4">
        <span className="tower text-[0.7rem] text-slate">{index}</span>
        <span className="h-px w-8 bg-edge-bright" />
        <span className="eyebrow">{eyebrow}</span>
      </Reveal>

      <Reveal delay={0.06}>
        <h2
          id={`${id}-title`}
          className="display text-[clamp(2.1rem,6.2vw,4.6rem)] text-ice"
        >
          {headline}
        </h2>
      </Reveal>

      {lead && (
        <Reveal delay={0.12}>
          <p className="mt-7 max-w-[62ch] text-[clamp(1rem,1.35vw,1.2rem)] leading-[1.62] text-ash">
            {lead}
          </p>
        </Reveal>
      )}
    </header>
  )
}

/* ── Panel ────────────────────────────────────────────────────────────────── */

export function Panel({
  children,
  className = '',
  accent,
}: {
  children: ReactNode
  className?: string
  accent?: string
}) {
  return (
    <div
      className={`panel relative overflow-hidden rounded-[3px] ${className}`}
      style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      {children}
    </div>
  )
}

/* ── Counter ──────────────────────────────────────────────────────────────── */

/**
 * Counts to a value once, when scrolled into view. Spring rather than a linear
 * tween so the last few digits settle instead of snapping.
 */
export function Counter({
  value,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  value: number
  decimals?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const spring = useSpring(0, { stiffness: 55, damping: 18, mass: 0.9 })
  const text = useTransform(spring, (v) =>
    v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  )

  useEffect(() => {
    if (!inView) return
    // Reduced motion still gets the number — it just arrives already counted.
    if (reduced) spring.jump(value)
    else spring.set(value)
  }, [inView, reduced, spring, value])

  return (
    <span ref={ref} className={`tabular ${className}`}>
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  )
}

/* ── Small bits ───────────────────────────────────────────────────────────── */

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'calm' | 'tired' | 'stressed' | 'brand'
}) {
  const tones: Record<string, string> = {
    neutral: 'border-edge-bright text-ash',
    calm: 'border-calm/40 text-calm',
    tired: 'border-tired/40 text-tired',
    stressed: 'border-stressed/40 text-stressed',
    brand: 'border-brand/40 text-brand',
  }
  return (
    <span
      className={`mono inline-flex items-center rounded-[2px] border px-2.5 py-1 text-[0.7rem] tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Divider() {
  return <Reveal className="racing-divider my-16 md:my-24" y={0} />
}
