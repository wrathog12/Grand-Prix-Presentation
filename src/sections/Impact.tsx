import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { closing, impact, meta } from '../content'
import { Divider, Panel, Reveal, Section, SectionHead } from '../components/primitives'

/** What it costs to run. Every row is a property of the shipped system. */
function CostTable() {
  return (
    <div className="grid gap-x-10 gap-y-0 md:grid-cols-2">
      {impact.cost.items.map((item, i) => (
        <motion.div
          key={item.label}
          className="border-t border-edge py-5"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8%' }}
          transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <span className="mono text-[0.68rem] uppercase tracking-wider text-slate">
              {item.label}
            </span>
            <span className="tower text-[1.05rem] text-brand">{item.value}</span>
          </div>
          <p className="text-[0.8rem] leading-[1.55] text-ash">{item.note}</p>
        </motion.div>
      ))}
    </div>
  )
}

/** The offline checklist, ticking itself off as it scrolls into view. */
function OfflineChecklist() {
  const ref = useRef<HTMLUListElement>(null)
  const inView = useInView(ref, { once: true, margin: '-12%' })

  return (
    <Panel className="p-6 sm:p-8">
      <span className="eyebrow">{impact.offline.title}</span>
      <ul ref={ref} className="mt-6 flex flex-col gap-3.5">
        {impact.offline.items.map((item, i) => (
          <li key={item} className="flex items-start gap-3.5">
            <motion.svg
              viewBox="0 0 14 14"
              className="mt-[0.2rem] h-3.5 w-3.5 shrink-0"
              aria-hidden
            >
              <motion.path
                d="M2,7.5 L5.5,11 L12,3.5"
                fill="none"
                stroke="var(--color-good)"
                strokeWidth={2}
                strokeLinecap="square"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.14, ease: 'easeOut' }}
              />
            </motion.svg>
            <span className="text-[0.85rem] leading-[1.55] text-ash">{item}</span>
          </li>
        ))}
      </ul>
      <motion.p
        className="mono mt-7 border-t border-edge pt-5 text-[0.8rem] text-good"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.25 + impact.offline.items.length * 0.14 }}
      >
        offline_ready: true
      </motion.p>
    </Panel>
  )
}

/** The honest ledger: what is proven, and what is not yet. */
function Ledger() {
  const columns = [
    { title: 'Built and verified', items: impact.ledger.proven, colour: 'var(--color-good)', glyph: '✓' },
    { title: 'Not yet proven', items: impact.ledger.notYet, colour: 'var(--color-warning)', glyph: '○' },
  ]

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      {columns.map((col, ci) => (
        <motion.div
          key={col.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8%' }}
          transition={{ duration: 0.6, delay: ci * 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[0.8rem]" style={{ color: col.colour }} aria-hidden>
              {col.glyph}
            </span>
            <h4 className="tower text-[1rem]" style={{ color: col.colour }}>
              {col.title}
            </h4>
          </div>
          <ul className="flex flex-col gap-4">
            {col.items.map((item) => (
              <li
                key={item}
                className="border-l pl-4 text-[0.85rem] leading-[1.6] text-ash"
                style={{ borderColor: `color-mix(in srgb, ${col.colour} 30%, transparent)` }}
              >
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  )
}

export function Impact() {
  return (
    <Section id="impact" index="06">
      <SectionHead
        id="impact"
        index="06"
        eyebrow={impact.eyebrow}
        headline={impact.headline}
        lead={impact.cost.lead}
      />

      <CostTable />

      <div className="mt-16">
        <Reveal>
          <OfflineChecklist />
        </Reveal>
      </div>

      <Divider />

      {/* Business */}
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {impact.business.title}
        </h3>
        <p className="mb-10 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          {impact.business.lead}
        </p>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        {impact.business.items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <Panel className="h-full p-5 sm:p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="text-[0.95rem] font-semibold leading-snug text-ice">{item.title}</h4>
                {'flag' in item && item.flag === 'extrapolation' && (
                  <span className="label-modelled shrink-0">extrapolation</span>
                )}
              </div>
              <p className="text-[0.85rem] leading-[1.6] text-ash">{item.body}</p>
            </Panel>
          </motion.div>
        ))}
      </div>

      <Reveal delay={0.08}>
        <p className="mt-6 max-w-[70ch] border-l-2 border-tired pl-5 text-[0.85rem] leading-[1.6] text-slate">
          {impact.business.caveat}
        </p>
      </Reveal>

      <Divider />

      {/* Social impact */}
      <Reveal>
        <h3 className="display mb-10 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {impact.social.title}
        </h3>
      </Reveal>

      <div className="flex flex-col">
        {impact.social.items.map((item, i) => (
          <motion.article
            key={item.title}
            className="grid gap-3 border-t border-edge py-8 md:grid-cols-[3.5rem_1fr] md:gap-8"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="tower text-[0.8rem] text-brand">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h4 className="mb-2.5 text-[1.02rem] font-semibold leading-snug text-ice">
                {item.title}
              </h4>
              <p className="max-w-[70ch] text-[0.9rem] leading-[1.65] text-ash">{item.body}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <Divider />

      {/* Ledger */}
      <Reveal>
        <h3 className="display mb-10 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {impact.ledger.title}
        </h3>
      </Reveal>
      <Ledger />

      <Divider />

      {/* Roadmap */}
      <Reveal>
        <h3 className="tower mb-8 text-[1.05rem] text-ice">What comes next, in order</h3>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-3">
        {impact.roadmap.map((step, i) => (
          <motion.div
            key={step.step}
            className="border-t-2 border-brand pt-5"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="tower text-[0.7rem] text-brand">{step.step}</span>
            <h4 className="mt-2 mb-2.5 text-[0.98rem] font-semibold text-ice">{step.title}</h4>
            <p className="text-[0.83rem] leading-[1.6] text-ash">{step.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Close */}
      <div className="mt-32 flex flex-col items-start gap-8">
        <Reveal>
          <p className="display max-w-[22ch] text-[clamp(2rem,7vw,5rem)] leading-[0.95] text-ice">
            {closing.headline}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-[52ch] text-[clamp(1rem,1.5vw,1.2rem)] leading-[1.6] text-ash">
            {closing.body}
          </p>
        </Reveal>

        <Reveal delay={0.16} className="w-full">
          <div className="racing-divider mt-6 mb-8" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="display text-[1.6rem] text-ice">{meta.team}</p>
              <p className="mono mt-1.5 text-[0.7rem] text-slate">
                {meta.project} · {meta.hackathon}
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
              {meta.members.map((name) => (
                <li key={name} className="text-[0.82rem] text-ash">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
