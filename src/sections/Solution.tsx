import { motion } from 'motion/react'
import { solution } from '../content'
import { Divider, Panel, Reveal, Section, SectionHead } from '../components/primitives'

/** The label space of every off-the-shelf model, and the slot that is missing. */
function LabelSpace() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {solution.emotionLabels.map((label, i) => (
        <motion.span
          key={label}
          className="mono rounded-[2px] border border-edge-bright px-3 py-1.5 text-[0.75rem] text-ash"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {label}
        </motion.span>
      ))}

      {/* The empty slot. It arrives last, after a beat, and stays empty. */}
      <motion.span
        className="mono relative rounded-[2px] border border-dashed border-stressed/60 px-3 py-1.5 text-[0.75rem] text-stressed/70"
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-12%' }}
        transition={{
          duration: 0.5,
          delay: solution.emotionLabels.length * 0.06 + 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <span className="line-through decoration-stressed/70">{solution.missingLabel}</span>
        <span className="ml-2 text-[0.65rem] text-stressed">not in any label space</span>
      </motion.span>
    </div>
  )
}

/** Six measurable signals, each with the direction fatigue moves it. */
function SignalCard({
  signal,
  index,
}: {
  signal: (typeof solution.insight.signals)[number]
  index: number
}) {
  const up = signal.dir === 'up'
  return (
    <motion.div
      className="flex items-start gap-3.5 rounded-[2px] border border-edge bg-panel/60 p-4"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Arrow direction is the information, so it also gets a word — colour
          never carries meaning alone. */}
      <span
        className="tower shrink-0 text-[1.1rem] leading-none"
        style={{ color: up ? 'var(--color-tired)' : 'var(--color-brand)' }}
        aria-hidden
      >
        {up ? '↑' : '↓'}
      </span>
      <div>
        <p className="mb-1 text-[0.9rem] font-semibold text-ice">
          {signal.name}{' '}
          <span
            className="mono text-[0.65rem] font-normal"
            style={{ color: up ? 'var(--color-tired)' : 'var(--color-brand)' }}
          >
            {up ? 'RISES' : 'FALLS'}
          </span>
        </p>
        <p className="text-[0.8rem] leading-[1.5] text-slate">{signal.detail}</p>
      </div>
    </motion.div>
  )
}

/** The three branches, and the head they feed. */
function Branches() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {solution.branches.map((branch, i) => (
          <motion.div
            key={branch.key}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <Panel className="h-full p-5" accent={branch.colour}>
              <p className="tower mb-1 text-[1rem]" style={{ color: branch.colour }}>
                {branch.name}
              </p>
              <p className="mono mb-3 text-[0.65rem] tracking-wider text-slate">{branch.kind}</p>
              <p className="text-[0.85rem] leading-[1.55] text-ash">{branch.body}</p>
            </Panel>
          </motion.div>
        ))}
      </div>

      {/* The three feeds converging. Drawn rather than described. */}
      <motion.svg
        viewBox="0 0 300 46"
        className="h-12 w-full"
        aria-hidden
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: '-10%' }}
      >
        {[50, 150, 250].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x},0 C${x},26 150,20 150,44`}
            fill="none"
            stroke={solution.branches[i].colour}
            strokeWidth={1}
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
            variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
            transition={{ duration: 0.9, delay: 0.35 + i * 0.1, ease: 'easeOut' }}
          />
        ))}
      </motion.svg>

      <motion.div
        className="flex flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="rounded-[2px] border border-brand/40 bg-brand/[0.06] px-6 py-3">
          <p className="tower text-[0.95rem] text-brand">Logistic regression · 8 inputs</p>
        </div>
        <div className="flex items-center gap-3">
          {['Calm', 'Stressed', 'Tired'].map((cls) => (
            <span
              key={cls}
              className="mono rounded-[2px] border px-3 py-1.5 text-[0.75rem]"
              style={{
                color: `var(--color-${cls.toLowerCase()})`,
                borderColor: `color-mix(in srgb, var(--color-${cls.toLowerCase()}) 40%, transparent)`,
              }}
            >
              {cls}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export function Solution() {
  return (
    <Section id="solution" index="02">
      <SectionHead
        id="solution"
        index="02"
        eyebrow={solution.eyebrow}
        headline={solution.headline}
        lead={solution.lead}
      />

      <Reveal>
        <Panel className="p-6 sm:p-8">
          <p className="eyebrow mb-5">What the models can say</p>
          <LabelSpace />
          <p className="mt-6 max-w-[68ch] border-t border-edge pt-5 text-[0.9rem] leading-[1.6] text-ash">
            {solution.consequence}
          </p>
        </Panel>
      </Reveal>

      <Divider />

      {/* The insight */}
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {solution.insight.title}
        </h3>
        <p className="mb-9 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          {solution.insight.body}
        </p>
      </Reveal>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {solution.insight.signals.map((signal, i) => (
          <SignalCard key={signal.name} signal={signal} index={i} />
        ))}
      </div>

      <Divider />

      {/* The architecture that follows from it */}
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          So we built the branch that can see it
        </h3>
        <p className="mb-10 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          Let the neural models do what they are good at, and hand-engineer the branch that can see
          fatigue.
        </p>
      </Reveal>

      <Branches />

      <Reveal delay={0.1}>
        <div className="mt-14 border-l-2 border-brand pl-6">
          <h4 className="tower mb-2 text-[1.05rem] text-ice">{solution.outcome.title}</h4>
          <p className="max-w-[60ch] text-[0.92rem] leading-[1.6] text-ash">
            {solution.outcome.body}
          </p>
        </div>
      </Reveal>
    </Section>
  )
}
