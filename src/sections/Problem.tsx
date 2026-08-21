import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { problem } from '../content'
import { Panel, Reveal, Section, SectionHead } from '../components/primitives'

/**
 * The visual argument for the whole project: a wall of car channels that are
 * all alive, and one channel for the driver that is flat.
 */

const CAR_CHANNELS = [
  'THROTTLE',
  'BRAKE',
  'GEAR',
  'RPM',
  'SPEED',
  'DRS',
  'TYRE TEMP',
  'FUEL FLOW',
  'ERS DEPLOY',
  'OIL PRESS',
  'STEERING',
  'RIDE HEIGHT',
]

/** A deterministic pseudo-trace. Same seed, same shape, every render. */
function trace(seed: number, points = 40) {
  return Array.from({ length: points }, (_, i) => {
    const a = Math.sin((i + seed * 7) * 0.55) * 0.5
    const b = Math.sin((i + seed * 3) * 1.7) * 0.28
    const c = Math.cos((i + seed * 11) * 0.31) * 0.22
    return 0.5 + (a + b + c) * 0.42
  })
}

function toPath(values: number[], w = 100, h = 20) {
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - Math.min(1, Math.max(0, v)) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function ChannelRow({ name, index, live }: { name: string; index: number; live: boolean }) {
  const path = toPath(trace(index + 1))
  return (
    <motion.div
      className="grid grid-cols-[7.5rem_1fr] items-center gap-4 border-b border-edge/60 py-2 last:border-0"
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="mono text-[0.65rem] tracking-wider text-slate">{name}</span>
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full" aria-hidden>
        <motion.path
          d={path}
          fill="none"
          stroke="var(--color-series-1)"
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0.35 }}
          animate={live ? { pathLength: 1, opacity: 0.75 } : {}}
          transition={{ duration: 1.1, delay: 0.15 + index * 0.05, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}

function DriverChannel() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })

  return (
    <motion.div
      ref={ref}
      className="mt-3 grid grid-cols-[7.5rem_1fr] items-center gap-4 rounded-[2px] border border-stressed/30 bg-stressed/[0.04] px-0 py-3"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay: CAR_CHANNELS.length * 0.05 + 0.3 }}
    >
      <span className="mono pl-3 text-[0.65rem] tracking-wider text-stressed">DRIVER</span>
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full pr-3" aria-hidden>
        {/* Flat. Not because the channel is quiet — because nobody is listening. */}
        <motion.line
          x1="0"
          y1="10"
          x2="100"
          y2="10"
          stroke="var(--color-stressed)"
          strokeWidth={0.8}
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.4, delay: CAR_CHANNELS.length * 0.05 + 0.45 }}
        />
      </svg>
    </motion.div>
  )
}

export function Problem() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })

  return (
    <Section id="problem" index="01">
      <SectionHead
        id="problem"
        index="01"
        eyebrow={problem.eyebrow}
        headline={problem.headline}
        lead={problem.lead}
      />

      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* The telemetry wall */}
        <Reveal>
          <Panel className="p-5 sm:p-7">
            <div className="mb-5 flex items-baseline justify-between">
              <span className="eyebrow">Pit wall channels</span>
              <span className="mono text-[0.65rem] text-slate">LIVE</span>
            </div>
            <div ref={ref}>
              {CAR_CHANNELS.map((name, i) => (
                <ChannelRow key={name} name={name} index={i} live={inView} />
              ))}
              <DriverChannel />
            </div>
            <p className="mt-5 text-[0.8rem] leading-relaxed text-slate">
              Illustrative channel list. The point is the last row.
            </p>
          </Panel>
        </Reveal>

        {/* The brief */}
        <div className="flex flex-col gap-10">
          <Reveal delay={0.08}>
            <h3 className="tower mb-5 text-[1.05rem] text-ice">{problem.brief.title}</h3>
            <ol className="flex flex-col gap-3">
              {problem.brief.items.map((item, i) => (
                <li key={i} className="flex gap-4 text-[0.92rem] leading-[1.55] text-ash">
                  <span className="tower shrink-0 pt-[0.15rem] text-[0.7rem] text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="racing-divider mb-8" />
            <h3 className="tower mb-5 text-[1.05rem] text-ice">{problem.hard.title}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {problem.hard.items.map((item, i) => (
                <motion.div
                  key={item.title}
                  className="border-l border-edge-bright pl-4"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="mb-1.5 text-[0.88rem] font-semibold text-ice">{item.title}</p>
                  <p className="text-[0.82rem] leading-[1.55] text-slate">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
