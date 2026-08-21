import { motion } from 'motion/react'
import { model } from '../content'
import { Counter, Divider, Panel, Reveal, Section, SectionHead } from '../components/primitives'

/** The four Hugging Face models, all public on purpose. */
function ModelList() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {model.models.map((m, i) => (
        <motion.div
          key={m.role}
          className="rounded-[2px] border border-edge bg-panel/60 p-4"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow mb-2">{m.role}</p>
          <p className="mono mb-2 text-[0.78rem] leading-[1.45] break-all text-ice">{m.id}</p>
          <p className="text-[0.78rem] text-slate">{m.note}</p>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * The real trained coefficient matrix. This is a file on disk, not a diagram,
 * which is the reason it is worth showing at all.
 */
function WeightMatrix() {
  const { features, rows } = model.weights

  return (
    <Panel className="overflow-x-auto p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <span className="eyebrow">data/labels/fusion_head.json · coefficients</span>
        <span className="mono text-[0.65rem] text-slate">3 classes × 8 features + intercept</span>
      </div>

      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className="eyebrow border-b border-edge pb-2.5 pr-4 text-left">class</th>
            {features.map((f) => (
              <th
                key={f}
                className="mono border-b border-edge pb-2.5 pl-3 text-right text-[0.62rem] font-normal tracking-wide text-slate"
              >
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const isTired = row.cls === 'Tired'
            return (
              <motion.tr
                key={row.cls}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.5, delay: r * 0.14 }}
                style={
                  isTired
                    ? { background: 'color-mix(in srgb, var(--color-tired) 6%, transparent)' }
                    : undefined
                }
              >
                <td
                  className="tower whitespace-nowrap border-b border-edge/60 py-3 pr-4 text-[0.85rem]"
                  style={{ color: `var(--color-${row.cls.toLowerCase()})` }}
                >
                  {row.cls}
                </td>
                {row.values.map((v, c) => {
                  const strong = Math.abs(v) >= 1
                  const dead = v === 0
                  return (
                    <motion.td
                      key={c}
                      className="tabular mono border-b border-edge/60 py-3 pl-3 text-right text-[0.76rem]"
                      style={{
                        color: dead
                          ? 'var(--color-slate)'
                          : v > 0
                            ? 'var(--color-brand)'
                            : 'var(--color-ash)',
                        fontWeight: strong ? 700 : 400,
                        opacity: dead ? 0.55 : 1,
                      }}
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: dead ? 0.55 : 1, y: 0 }}
                      viewport={{ once: true, margin: '-10%' }}
                      transition={{ duration: 0.35, delay: r * 0.14 + c * 0.035 }}
                    >
                      {v > 0 ? '+' : v < 0 ? '−' : ''}
                      {Math.abs(v).toFixed(3)}
                    </motion.td>
                  )
                })}
              </motion.tr>
            )
          })}
        </tbody>
      </table>

      <p className="mt-5 border-t border-edge pt-4 text-[0.78rem] leading-[1.55] text-slate">
        Positive weights in cyan, negative in grey, and the one coefficient that is exactly zero
        dimmed. The Tired row is tinted because it is the row the whole hypothesis was about.
      </p>
    </Panel>
  )
}

/** Label distribution as proportional bars. */
function LabelMix() {
  return (
    <div className="flex flex-col gap-4">
      <p className="eyebrow">Label distribution · 855 clips</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-[2px]">
        {model.data.labels.map((l, i) => (
          <motion.span
            key={l.cls}
            className="block h-full"
            style={{ background: l.colour }}
            initial={{ width: 0 }}
            whileInView={{ width: `${l.share}%` }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-7 gap-y-2">
        {model.data.labels.map((l) => (
          <li key={l.cls} className="flex items-center gap-2.5">
            <span
              className="block h-2 w-2 rounded-full"
              style={{ background: l.colour }}
              aria-hidden
            />
            <span className="text-[0.82rem] text-ice">{l.cls}</span>
            <span className="tabular mono text-[0.75rem] text-slate">
              {l.count} · {l.share}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Model() {
  return (
    <Section id="model" index="04">
      <SectionHead
        id="model"
        index="04"
        eyebrow={model.eyebrow}
        headline={model.headline}
        lead={model.modelsNote}
      />

      <ModelList />

      <Divider />

      {/* The fitted head */}
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {model.head.title}
        </h3>
        <p className="mb-4 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          {model.head.body}
        </p>
        <p className="mono mb-10 text-[0.75rem] text-brand">{model.head.config}</p>
      </Reveal>

      <Reveal>
        <WeightMatrix />
      </Reveal>

      {/* How to read it, honestly */}
      <div className="mt-14 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {model.reading.map((r, i) => (
          <motion.div
            key={r.title}
            className="border-l border-edge-bright pl-5"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <h4 className="mb-2 text-[0.95rem] font-semibold text-ice">{r.title}</h4>
            <p className="text-[0.85rem] leading-[1.6] text-ash">{r.body}</p>
          </motion.div>
        ))}
      </div>

      <Divider />

      {/* What it was trained on */}
      <Reveal>
        <h3 className="tower mb-9 text-[1.05rem] text-ice">{model.data.title}</h3>
      </Reveal>

      <div className="mb-14 grid grid-cols-2 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
        {model.data.stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="tower text-[clamp(2rem,4.5vw,3rem)] leading-none text-ice">
              <Counter value={s.value} />
            </p>
            <p className="mt-2.5 max-w-[14ch] text-[0.78rem] leading-[1.4] text-slate">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Reveal>
        <LabelMix />
      </Reveal>

      {/* The caveat. Deliberately given the same visual weight as the result. */}
      <Reveal delay={0.06}>
        <div className="mt-16 rounded-[2px] border border-tired/35 bg-tired/[0.04] p-6 sm:p-8">
          <div className="mb-3.5 flex items-center gap-3">
            <span className="label-modelled">caveat</span>
            <h4 className="tower text-[1rem] text-tired">{model.caveat.title}</h4>
          </div>
          <p className="max-w-[74ch] text-[0.92rem] leading-[1.65] text-ash">
            {model.caveat.body}
          </p>
          <p className="mt-4 max-w-[74ch] border-t border-tired/20 pt-4 text-[0.85rem] leading-[1.6] text-slate">
            {model.caveat.footer}
          </p>
        </div>
      </Reveal>
    </Section>
  )
}
