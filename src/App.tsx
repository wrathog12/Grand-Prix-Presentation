import { ProgressRail } from './components/ProgressRail'
import { useSmoothScroll } from './lib/useSmoothScroll'
import { Cover } from './sections/Cover'
import { Problem } from './sections/Problem'
import { Solution } from './sections/Solution'
import { Technical } from './sections/Technical'
import { Model } from './sections/Model'
import { Versus } from './sections/Versus'
import { Impact } from './sections/Impact'

export default function App() {
  useSmoothScroll()

  return (
    <>
      <ProgressRail />
      <main>
        <Cover />
        <Problem />
        <Solution />
        <Technical />
        <Model />
        <Versus />
        <Impact />
      </main>
    </>
  )
}
