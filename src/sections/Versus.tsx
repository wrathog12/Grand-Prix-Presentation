import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { versus } from '../content'
import { Counter, Divider, Panel, Reveal, Section, SectionHead } from '../components/primitives'

type Mood = 'Calm' | 'Stressed' | 'Tired'

/**
 * An illustrative session timeline.
 *
 * The marker MIX follows the real 855-clip label distribution (Calm 42.1 %,
 * Tired 32.9 %, Stressed 24.8 %). The mechanism it demonstrates is exactly
 * true: the naive path's mapping table has no route to Tired — it is pinned at
 * a fixed 0.06 residual probability — so every Tired call is forced onto the
 * nearest emotion, usually neutral (Calm) or sad (Stressed).
 *
 * Labelled as illustrative on screen. This deck does not draw fake measurements.
 */
const CALLS: { lap: number; fusion: Mood; naive: Mood; stress: number }[] = [
  { lap: 4, fusion: 'Calm', naive: 'Calm', stress: 18 },
  { lap: 8, fusion: 'Calm', naive: 'Calm', stress: 24 },
  { lap: 12, fusion: 'Stressed', naive: 'Stressed', stress: 71 },
  { lap: 15, fusion: 'Calm', naive: 'Calm', stress: 31 },
  { lap: 19, fusion: 'Tired', naive: 'Calm', stress: 58 },
  { lap: 22, fusion: 'Calm', naive: 'Calm', stress: 27 },
  { lap: 25, fusion: 'Stressed', naive: 'Stressed', stress: 78 },
  { lap: 28, fusion: 'Tired', naive: 'Calm', stress: 62 },
  { lap: 31, fusion: 'Calm', naive: 'Calm', stress: 22 },
  { lap: 34, fusion: 'Tired', naive: 'Stressed', stress: 66 },
  { lap: 37, fusion: 'Stressed', naive: 'Stressed', stress: 74 },
  { lap: 40, fusion: 'Calm', naive: 'Calm', stress: 34 },
  { lap: 43, fusion: 'Tired', naive: 'Calm', stress: 69 },
  { lap: 46, fusion: 'Stressed', naive: 'Stressed', stress: 82 },
  { lap: 49, fusion: 'Tired', naive: 'Calm', stress: 73 },
  { lap: 52, fusion: 'Calm', naive: 'Calm', stress: 29 },
  { lap: 55, fusion: 'Tired', naive: 'Stressed', stress: 76 },
  { lap: 58, fusion: 'Stressed', naive: 'Stressed', stress: 85 },
  { lap: 61, fusion: 'Calm', naive: 'Calm', stress: 33 },
  { lap: 64, fusion: 'Tired', naive: 'Calm', stress: 79 },
  { lap: 67, fusion: 'Calm', naive: 'Calm', stress: 26 },
  { lap: 70, fusion: 'Stressed', naive: 'Stressed', stress: 88 },
]

const TOTAL_LAPS = 72
const MOOD_COLOUR: Record<Mood, string> = {
  Calm: 'var(--color-calm)',
  Stressed: 'var(--color-stressed)',
  Tired: 'var(--color-tired)',
}

function Toggle({ mode, onChange }: { mode: 'naive' | 'fusion'; onChange: (m: 'naive' | 'fusion') => void }) {
  return (
    <div
      className="inline-flex rounded-[2px] border border-edge-bright bg-panel-2/70 p-1"
      role="group"
      aria-label="Scoring mode"
    >
      {(['naive', 'fusion'] as const).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={active}
            className="relative min-h-[40px] rounded-[2px] px-5 text-[0.8rem] tracking-wide transition-colors"
            style={{ color: active ? 'var(--team-ink)' : 'var(--color-ash)' }}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-[2px] bg-brand"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="tower relative z-10 uppercase">{m}</span>
          </button>
        )
      })}
    </div>
  )
}

function SessionTimeline({ mode }: { mode: 'naive' | 'fusion' }) {
  const tiredCount = CALLS.filter((c) => c.fusion === 'Tired').length

  return (
    <Panel className="p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Session timeline · mood per radio call</span>
          <p className="mono mt-1.5 text-[0.65rem] text-slate">
            {CALLS.length} calls · {TOTAL_LAPS} laps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="eyebrow">Scoring</span>
          <span
            className="tower rounded-[2px] border px-3 py-1.5 text-[0.75rem] uppercase"
            style={{
              color: mode === 'fusion' ? 'var(--color-brand)' : 'var(--color-serious)',
              borderColor:
                mode === 'fusion'
                  ? 'color-mix(in srgb, var(--color-brand) 45%, transparent)'
                  : 'color-mix(in srgb, var(--color-serious) 45%, transparent)',
            }}
          >
            {mode}
          </span>
        </div>
      </div>

      {/* Stress track with mood markers */}
      <div className="relative h-40 w-full border-b border-l border-axis">
        {/* gridlines at 25/50/75 */}
        {[25, 50, 75].map((g) => (
          <span
            key={g}
            className="absolute left-0 w-full border-t border-gridline"
            style={{ bottom: `${g}%` }}
            aria-hidden
          />
        ))}

        {/* The elevated-stress threshold the strategy layer actually uses. */}
        <span
          className="absolute left-0 w-full border-t border-dashed border-serious/40"
          style={{ bottom: '60%' }}
          aria-hidden
        />
        <span className="mono absolute right-1 text-[0.6rem] text-serious/70" style={{ bottom: '61%' }}>
          STRESS_ELEVATED 60
        </span>

        {CALLS.map((call) => {
          const mood = mode === 'fusion' ? call.fusion : call.naive
          return (
            <motion.span
              key={call.lap}
              className="absolute block rounded-full"
              style={{
                left: `${(call.lap / TOTAL_LAPS) * 100}%`,
                bottom: `${call.stress}%`,
                width: 11,
                height: 11,
                marginLeft: -5.5,
                marginBottom: -5.5,
              }}
              animate={{
                backgroundColor: MOOD_COLOUR[mood],
                boxShadow: `0 0 12px ${MOOD_COLOUR[mood]}`,
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              title={`Lap ${call.lap} · ${mood} · stress ${call.stress}`}
            />
          )
        })}
      </div>

      {/* Legend, with the count that is the whole point */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {(['Calm', 'Tired', 'Stressed'] as Mood[]).map((m) => {
            const gone = mode === 'naive' && m === 'Tired'
            return (
              <li key={m} className="flex items-center gap-2.5">
                <motion.span
                  className="block h-2.5 w-2.5 rounded-full"
                  animate={{ backgroundColor: MOOD_COLOUR[m], opacity: gone ? 0.2 : 1 }}
                  aria-hidden
                />
                <span
                  className="text-[0.82rem] transition-colors"
                  style={{ color: gone ? 'var(--color-slate)' : 'var(--color-ice)' }}
                >
                  {m}
                </span>
                {gone && (
                  <span className="mono text-[0.65rem] text-serious">unreachable</span>
                )}
              </li>
            )
          })}
        </ul>

        <AnimatePresence mode="wait">
          <motion.p
            key={mode}
            className="mono text-[0.7rem]"
            style={{ color: mode === 'naive' ? 'var(--color-serious)' : 'var(--color-brand)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {mode === 'naive'
              ? `${tiredCount} fatigue calls reassigned — 0 Tired possible`
              : `${tiredCount} fatigue calls recovered`}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-5 border-t border-edge pt-4 text-[0.75rem] leading-[1.55] text-slate">
        <span className="label-modelled mr-2">illustrative</span>
        Marker mix follows the real 855-clip label distribution. The mechanism shown is exact: the
        naive mapping table has no route to Tired, so every fatigue call is forced onto the nearest
        emotion.
      </p>
    </Panel>
  )
}

/** 45.13 → 88.75, as two bars that grow. */
function AccuracyBars({ mode }: { mode: 'naive' | 'fusion' }) {
  const rows = [
    { label: 'Naive · acoustic argmax', value: versus.accuracy.naive, colour: 'var(--color-serious)' },
    { label: 'Fusion · three branches', value: versus.accuracy.fusion, colour: 'var(--color-brand)' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {rows.map((row, i) => {
        const dim = (mode === 'naive' && i === 1) || (mode === 'fusion' && i === 0)
        return (
          <div key={row.label}>
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <span
                className="text-[0.85rem] transition-opacity"
                style={{ color: 'var(--color-ash)', opacity: dim ? 0.45 : 1 }}
              >
                {row.label}
              </span>
              <span
                className="tower text-[1.35rem] transition-opacity"
                style={{ color: row.colour, opacity: dim ? 0.45 : 1 }}
              >
                <Counter value={row.value} decimals={2} suffix=" %" />
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
              <motion.span
                className="block h-full rounded-full"
                style={{ background: row.colour }}
                initial={{ width: 0 }}
                whileInView={{ width: `${row.value}%` }}
                viewport={{ once: true, margin: '-10%' }}
                animate={{ opacity: dim ? 0.4 : 1 }}
                transition={{ duration: 1, delay: 0.15 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-edge pt-5">
        <span className="tower text-[2rem] text-brand">
          +<Counter value={versus.accuracy.delta} decimals={1} />
        </span>
        <span className="text-[0.85rem] text-ash">points, and one extra class of driver state</span>
      </div>
      <p className="mono text-[0.68rem] text-slate">
        {versus.accuracy.method} · n = {versus.accuracy.nTrain}
      </p>
    </div>
  )
}

/** Naive vs fusion, axis by axis. */
function Comparison() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th className="eyebrow w-[9rem] border-b border-edge pb-3 pr-5">Axis</th>
            <th className="eyebrow border-b border-edge pb-3 pr-5 text-serious">
              Traditional · one model
            </th>
            <th className="eyebrow border-b border-edge pb-3 text-brand">Ours · fusion</th>
          </tr>
        </thead>
        <tbody>
          {versus.comparison.map((row, i) => (
            <motion.tr
              key={row.axis}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <td className="tower border-b border-edge/60 py-4 pr-5 align-top text-[0.78rem] text-slate">
                {row.axis}
              </td>
              <td className="border-b border-edge/60 py-4 pr-5 align-top text-[0.85rem] leading-[1.5] text-ash">
                {row.naive}
              </td>
              <td className="border-b border-edge/60 py-4 align-top text-[0.85rem] leading-[1.5] text-ice">
                {row.fusion}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The five calls. HOLD gets the spotlight, because it is the argument. */
function StrategyCalls() {
  const tone: Record<string, string> = {
    info: 'var(--color-brand)',
    warning: 'var(--color-warning)',
    critical: 'var(--color-critical)',
  }
  const glyph: Record<string, string> = { info: '●', warning: '▲', critical: '■' }

  return (
    <div className="flex flex-col gap-3">
      {versus.calls.map((call, i) => {
        const hold = call.code === 'HOLD'
        return (
          <motion.div
            key={call.code}
            className="grid gap-2 rounded-[2px] border p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6"
            style={{
              borderColor: hold
                ? 'color-mix(in srgb, var(--color-brand) 45%, transparent)'
                : 'var(--color-edge)',
              background: hold ? 'color-mix(in srgb, var(--color-brand) 5%, transparent)' : 'transparent',
            }}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start gap-3.5">
              {/* Glyph as well as colour — status never rides on hue alone. */}
              <span
                className="shrink-0 pt-[0.15rem] text-[0.7rem]"
                style={{ color: tone[call.urgency] }}
                aria-hidden
              >
                {glyph[call.urgency]}
              </span>
              <div>
                <p className="tower text-[0.95rem] leading-snug text-ice">{call.headline}</p>
                <p className="mono mt-1.5 text-[0.68rem] uppercase tracking-wider" style={{ color: tone[call.urgency] }}>
                  {call.urgency}
                </p>
              </div>
            </div>
            <p className="text-[0.8rem] leading-[1.5] text-slate md:max-w-[22ch] md:text-right">
              {call.when}
            </p>
          </motion.div>
        )
      })}

      <Reveal delay={0.1}>
        <blockquote className="mt-6 border-l-2 border-brand pl-6">
          <p className="max-w-[62ch] text-[1rem] leading-[1.6] text-ice italic">
            “{versus.holdQuote}”
          </p>
          <cite className="mono mt-3 block text-[0.68rem] not-italic text-slate">
            strategy.py · module docstring
          </cite>
        </blockquote>
      </Reveal>
    </div>
  )
}

export function Versus() {
  const [mode, setMode] = useState<'naive' | 'fusion'>('fusion')

  return (
    <Section id="versus" index="05">
      <SectionHead
        id="versus"
        index="05"
        eyebrow={versus.eyebrow}
        headline={versus.headline}
        lead={versus.lead}
      />

      <Reveal>
        <p className="mb-10 max-w-[60ch] border-l-2 border-serious pl-6 text-[clamp(1.05rem,2vw,1.45rem)] leading-[1.45] text-ice">
          {versus.punch}
        </p>
      </Reveal>

      {/* The interaction. One control, and it is a real one. */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <span className="eyebrow">Try it</span>
        <Toggle mode={mode} onChange={setMode} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <SessionTimeline mode={mode} />
        <div className="flex items-center">
          <AccuracyBars mode={mode} />
        </div>
      </div>

      <Divider />
      <Reveal>
        <h3 className="tower mb-8 text-[1.05rem] text-ice">One model against three</h3>
      </Reveal>
      <Comparison />

      <Divider />
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          The answer is an instruction
        </h3>
        <p className="mb-9 max-w-[62ch] text-[0.98rem] leading-[1.62] text-ash">
          A sentiment score tells a race engineer nothing they can act on. Five deterministic rules
          do — including the one that says do nothing.
        </p>
      </Reveal>
      <StrategyCalls />

      <Divider />

      {/* The honest turn. */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h3 className="display mb-4 text-[clamp(1.4rem,3.2vw,2.2rem)] text-ice">
            {versus.honesty.title}
          </h3>
          <p className="mb-6 text-[0.92rem] leading-[1.65] text-ash">{versus.honesty.body}</p>
          <p className="tower text-[1.05rem] text-brand">{versus.honesty.punch}</p>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel className="p-6">
            <span className="eyebrow">Lead-lag panel · as the interface writes it</span>
            <p className="tower mt-5 text-[clamp(1.1rem,2.2vw,1.6rem)] leading-snug text-tired">
              Indicative only — 11 clips in this session
            </p>
            <div className="racing-divider my-6" />
            <dl className="grid grid-cols-2 gap-y-4">
              {[
                ['Lag range', '−4 … +4 laps'],
                ['Significance floor', '25 samples'],
                ['Pairs with negative peak', 'A minority'],
                ['Pairs clearing the floor', 'None'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="mono mb-1 text-[0.62rem] uppercase tracking-wider text-slate">{k}</dt>
                  <dd className="text-[0.85rem] text-ice">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </Reveal>
      </div>

      {/* Hamilton. */}
      <Reveal delay={0.06}>
        <div className="mt-16 rounded-[2px] border border-edge bg-panel/60 p-6 sm:p-8">
          <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h4 className="tower mb-3 text-[1.05rem] text-ice">{versus.hamilton.title}</h4>
              <p className="max-w-[62ch] text-[0.9rem] leading-[1.62] text-ash">
                {versus.hamilton.body}
              </p>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <p className="tower text-[clamp(2.4rem,6vw,3.6rem)] leading-none text-stressed">
                97.6
              </p>
              <p className="mono mt-2 text-[0.68rem] uppercase tracking-wider text-stressed">
                Stressed · lap 52
              </p>
            </div>
          </div>
          <p className="mt-6 border-t border-edge pt-5 text-[0.88rem] leading-[1.6] text-brand">
            {versus.hamilton.fix}
          </p>
        </div>
      </Reveal>

      <Divider />

      {/* Honesty by construction. */}
      <Reveal>
        <h3 className="display mb-4 text-[clamp(1.5rem,3.6vw,2.5rem)] text-ice">
          {versus.construction.title}
        </h3>
        <p className="mb-10 max-w-[64ch] text-[0.98rem] leading-[1.62] text-ash">
          {versus.construction.body}
        </p>
      </Reveal>

      <div className="flex flex-col">
        {versus.construction.items.map((item, i) => (
          <motion.div
            key={item.mechanism}
            className="grid gap-1.5 border-t border-edge py-4 md:grid-cols-2 md:gap-8"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-6%' }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mono text-[0.78rem] leading-[1.5] text-ice">{item.mechanism}</p>
            <p className="text-[0.82rem] leading-[1.5] text-slate">{item.reason}</p>
          </motion.div>
        ))}
      </div>

      <Reveal delay={0.1}>
        <p className="display mt-14 max-w-[24ch] text-[clamp(1.5rem,4vw,2.8rem)] leading-[1.05] text-brand">
          {versus.construction.quote}
        </p>
      </Reveal>
    </Section>
  )
}
