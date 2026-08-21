import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { meta } from '../content'

/**
 * The cold open.
 *
 * Timing follows the real thing: five lights illuminate one at a time, hold,
 * then all five extinguish together — and the title arrives on the blackout,
 * because in an actual Grand Prix the lights going OUT is the start, not the
 * lights coming on.
 */

const LIGHTS_START = 0.35
const LIGHTS_GAP = 0.28
const HOLD = 0.45

const BLACKOUT = LIGHTS_START + 5 * LIGHTS_GAP + HOLD
const TITLE = BLACKOUT + 0.12

function StartLights({ out }: { out: boolean }) {
  return (
    <div
      className="flex items-center gap-3 sm:gap-4"
      role="img"
      aria-label="Formula 1 start lights: five lights on, then out"
    >
      {[0, 1, 2, 3, 4].map((pod) => (
        <div
          key={pod}
          className="flex flex-col items-center gap-1.5 rounded-[3px] border border-edge bg-panel/80 p-1.5 sm:gap-2 sm:p-2"
        >
          {/* Each gantry pod carries two stacked lamps, as on the real gantry. */}
          {[0, 1].map((lamp) => (
            <motion.span
              key={lamp}
              className="block h-3.5 w-3.5 rounded-full sm:h-5 sm:w-5"
              initial={{ backgroundColor: '#2a0a12', boxShadow: '0 0 0 rgba(255,0,80,0)' }}
              animate={
                out
                  ? { backgroundColor: '#2a0a12', boxShadow: '0 0 0 rgba(255,0,80,0)' }
                  : {
                      backgroundColor: '#ff0050',
                      boxShadow: '0 0 18px rgba(255,0,80,0.85)',
                    }
              }
              transition={{
                duration: out ? 0.14 : 0.16,
                delay: out ? 0 : LIGHTS_START + pod * LIGHTS_GAP,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Cover() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // With reduced motion the sequence collapses to "already started".
  const t = (s: number) => (reduced ? 0 : s)

  const [lightsOut, setLightsOut] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    const id = setTimeout(() => setLightsOut(true), BLACKOUT * 1000)
    return () => clearTimeout(id)
  }, [reduced])

  return (
    <section
      id="cover"
      aria-labelledby="cover-title"
      className="relative z-10 flex min-h-svh flex-col justify-between px-6 py-10 sm:px-10 sm:py-14"
    >
      {/* Top rail — event identity */}
      <motion.div
        className="flex flex-wrap items-center justify-between gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: t(0.1) }}
      >
        <span className="eyebrow">{meta.hackathon}</span>
        <span className="eyebrow text-slate">
          {meta.problemStatement} · {meta.theme}
        </span>
      </motion.div>

      {/* Centre — lights, then the name */}
      <div className="flex flex-col items-start gap-10 py-12 md:gap-14">
        {/* The gantry fades away once it has done its job, rather than sitting
            there competing with the title for the rest of the slide. */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0.25] }}
          transition={{ duration: reduced ? 0.01 : 1.2, times: [0, 0.6, 1], delay: t(TITLE) }}
        >
          <StartLights out={lightsOut} />
        </motion.div>

        <div>
          {/* Team name at signage size. Archivo is the only face allowed to
              stretch, and this is it running wide. */}
          <motion.h1
            id="cover-title"
            className="display text-[clamp(3.6rem,15vw,11rem)] leading-[0.86] text-ice"
            initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
            transition={{
              duration: reduced ? 0.01 : 0.95,
              delay: t(TITLE),
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {meta.team}
          </motion.h1>

          <motion.div
            className="mt-6 flex flex-col gap-3 sm:mt-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: t(TITLE + 0.35), ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-4">
              <span
                className="h-[3px] w-12 shrink-0"
                style={{ background: 'linear-gradient(90deg,#e6002b 0%,#00d9ff 100%)' }}
              />
              <p className="tower text-[clamp(1.1rem,2.6vw,1.9rem)] text-brand">{meta.project}</p>
            </div>
            <p className="max-w-[54ch] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-[1.6] text-ash">
              {meta.oneLiner}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom — the team, laid out like a timing tower */}
      <motion.footer
        className="flex flex-col gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: t(TITLE + 0.7) }}
      >
        <div className="racing-divider" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 sm:gap-x-10">
            {meta.members.map((name, i) => (
              <motion.li
                key={name}
                className="flex items-baseline gap-2.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: t(TITLE + 0.8 + i * 0.09),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span className="tower text-[0.7rem] text-slate">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[0.95rem] leading-tight text-ice">{name}</span>
              </motion.li>
            ))}
          </ul>

          <div className="flex items-center gap-3 text-slate">
            <span className="eyebrow">Scroll</span>
            <motion.span
              className="block h-4 w-px bg-brand"
              style={{ transformOrigin: 'top' }}
              animate={reduced ? {} : { scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
        <p className="eyebrow text-slate">{meta.round}</p>
      </motion.footer>
    </section>
  )
}
