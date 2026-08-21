import { motion } from 'motion/react'
import { technical } from '../content'
import { Divider, Panel, Reveal, Section, SectionHead } from '../components/primitives'

/** The pipeline, as a chain that draws itself left to right. */
function Pipeline() {
  return (
    <Panel className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <span className="eyebrow">Per-clip pipeline</span>
        <span className="mono text-[0.65rem] text-slate">~13 s · CPU</span>
      </div>

      <ol className="flex flex-wrap items-center gap-y-3">
        {technical.stages.map((stage, i) => (
          <motion.li
            key={stage}
            className="flex items-center"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="mono rounded-[2px] border px-2.5 py-1.5 text-[0.68rem] tracking-wider"
              style={
                stage === 'FUSION'
                  ? {
                      color: 'var(--color-brand)',
                      borderColor: 'color-mix(in srgb, var(--color-brand) 45%, transparent)',
                      background: 'color-mix(in srgb, var(--color-brand) 7%, transparent)',
                    }
                  : { color: 'var(--color-ash)', borderColor: 'var(--color-edge-bright)' }
              }
            >
              {stage}
            </span>
            {i < technical.stages.length - 1 && (
              <span className="mx-1.5 h-px w-3 bg-edge-bright sm:w-4" aria-hidden />
            )}
          </motion.li>
        ))}
      </ol>

      <p className="mt-6 max-w-[70ch] border-t border-edge pt-5 text-[0.85rem] leading-[1.6] text-ash">
        {technical.stageNote}
      </p>
    </Panel>
  )
}

/** The engineering decisions, as a numbered read-down. */
function Details() {
  return (
    <div className="flex flex-col">
      {technical.details.map((detail, i) => (
        <motion.article
          key={detail.title}
          className="grid gap-3 border-t border-edge py-7 md:grid-cols-[3.5rem_1fr] md:gap-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-8%' }}
          transition={{ duration: 0.6, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="tower text-[0.8rem] text-brand">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <h4 className="mb-2.5 text-[1.02rem] font-semibold leading-snug text-ice">
              {detail.title}
            </h4>
            <p className="max-w-[72ch] text-[0.9rem] leading-[1.65] text-ash">{detail.body}</p>
          </div>
        </motion.article>
      ))}
    </div>
  )
}

/** Six bugs that threw no error. The reason this section exists. */
function SilentBugs() {
  return (
    <>
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {technical.silentBugs.title}
        </h3>
        <p className="mb-9 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          {technical.silentBugs.body}
        </p>
      </Reveal>

      <div className="grid gap-3.5 md:grid-cols-2">
        {technical.silentBugs.items.map((bug, i) => (
          <motion.div
            key={bug.cause}
            className="rounded-[2px] border border-edge bg-panel/60 p-4"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mono mb-2.5 text-[0.78rem] leading-[1.5] text-ash">{bug.cause}</p>
            <div className="flex items-start gap-2.5">
              <span className="tower shrink-0 text-[0.7rem] text-serious" aria-hidden>
                →
              </span>
              <p className="text-[0.82rem] leading-[1.5] text-serious">{bug.effect}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  )
}

/** The stack. A grid, because a paragraph of version numbers is unreadable. */
function Stack() {
  const groups: [string, readonly string[]][] = [
    ['Frontend', technical.stack.frontend],
    ['Backend', technical.stack.backend],
    ['ML', technical.stack.ml],
    ['Data', technical.stack.data],
  ]

  return (
    <div className="grid gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {groups.map(([label, items], i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow mb-3.5">{label}</p>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item} className="mono text-[0.75rem] leading-[1.5] text-ash">
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  )
}

export function Technical() {
  return (
    <Section id="technical" index="03">
      <SectionHead
        id="technical"
        index="03"
        eyebrow={technical.eyebrow}
        headline={technical.headline}
      />

      <Reveal>
        <Pipeline />
      </Reveal>

      <div className="mt-16">
        <Details />
      </div>

      <Divider />
      <SilentBugs />

      <Divider />
      <Reveal>
        <h3 className="tower mb-8 text-[1.05rem] text-ice">The stack</h3>
      </Reveal>
      <Stack />
    </Section>
  )
}
