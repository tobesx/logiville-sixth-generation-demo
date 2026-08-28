import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import PlanningTopbar from './planning/PlanningTopbar'
import PlanBoard from './planning/PlanBoard'
import SidePane from './planning/SidePane'
import InsightsPanel from './planning/InsightsPanel'
import {
  PLAN_SEQUENCE,
  SYSTEMS,
  inspectAll,
  type Insight,
  type Phase,
  type Placement,
  type Worker,
} from './planning/data'
import './ico.css'
import './planning/planning.css'

/** Eén systeem per stap aansluiten, dan één order per stap inplannen. */
const SYNC_STEP_MS = 550
const PLACE_STEP_MS = 260

/**
 * Smart Production Planning.
 *
 * De kern uit de video: het programma haalt de gegevens uit alle systemen en
 * maakt de planning. De planner kijkt alleen nog na en lost aandachtspunten op.
 *
 * Vandaar één knop en geen plansurface. Wie hier zelf mensen moet neerzetten,
 * doet precies het werk dat de applicatie zou moeten overnemen.
 */
export default function ProductionPlanning() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [connected, setConnected] = useState(0)
  const [placements, setPlacements] = useState<Record<string, Placement>>({})
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const insights = useMemo(() => inspectAll(placements), [placements])
  const openInsights = insights.filter((i) => !resolved.has(i.id))

  const placedOrderIds = useMemo(
    () => new Set(Object.values(placements).map((p) => p.orderId)),
    [placements],
  )

  const reset = () => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    setPhase('idle')
    setConnected(0)
    setPlacements({})
    setResolved(new Set())
    setHighlightedSlot(null)
  }

  const generate = () => {
    if (phase !== 'idle') return
    setPhase('syncing')

    // Eerst de systemen aansluiten — dat is het werk dat de planner nu met de
    // hand doet, en het is de reden dat de planning klopt.
    SYSTEMS.forEach((_, index) => {
      timers.current.push(
        window.setTimeout(() => setConnected(index + 1), SYNC_STEP_MS * (index + 1)),
      )
    })

    const afterSync = SYNC_STEP_MS * (SYSTEMS.length + 1)
    timers.current.push(window.setTimeout(() => setPhase('planning'), afterSync))

    // Daarna landt de planning order voor order, zodat je ziet dat er iets
    // gebeurt in plaats van dat het bord in één klap vol staat.
    PLAN_SEQUENCE.forEach((step, index) => {
      timers.current.push(
        window.setTimeout(
          () => setPlacements((current) => ({ ...current, [step.slot]: step.placement })),
          afterSync + PLACE_STEP_MS * (index + 1),
        ),
      )
    })

    timers.current.push(
      window.setTimeout(
        () => setPhase('complete'),
        afterSync + PLACE_STEP_MS * (PLAN_SEQUENCE.length + 1),
      ),
    )
  }

  /** Een voorgestelde vervanger overnemen; het inzicht verdwijnt daardoor vanzelf. */
  const replace = (insight: Insight, worker: Worker) => {
    const existing = placements[insight.slot]
    if (!existing) return
    setPlacements((current) => ({
      ...current,
      [insight.slot]: { ...existing, workerId: worker.id },
    }))
  }

  const resolve = (insight: Insight) => setResolved((current) => new Set(current).add(insight.id))

  const running = phase === 'syncing' || phase === 'planning'
  const placedCount = Object.keys(placements).length

  return (
    <div className="ico-app pp-root">
      <div className="flex h-full flex-col">
        <PlanningTopbar />

        <div className="pp-systems">
          <span className="pp-systems-label">
            {phase === 'idle' ? 'Not connected' : 'Connected'}
          </span>
          {SYSTEMS.map((system, index) => (
            <span key={system} className={index < connected ? 'pp-system pp-system-on' : 'pp-system'}>
              <span className="pp-system-dot" />
              {system}
            </span>
          ))}

          <span className="pp-systems-spacer" />

          <span className="pp-time">
            {phase === 'complete' ? (
              <>
                Planning time <s>2h 40</s> <strong>15 min</strong>
              </>
            ) : (
              <>By hand this takes 2h 40</>
            )}
          </span>

          {phase === 'complete' ? (
            <button type="button" className="pp-primary pp-primary-ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset demo
            </button>
          ) : (
            <button
              type="button"
              className="pp-primary"
              onClick={generate}
              disabled={running}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {phase === 'idle'
                ? 'Generate plan'
                : phase === 'syncing'
                  ? 'Reading systems…'
                  : 'Building the plan…'}
            </button>
          )}
        </div>

        <div className="pp-layout">
          <SidePane placedOrderIds={placedOrderIds} />

          <div className="pp-main">
            <div className="pp-main-head">
              <span className="pp-side-title">Plan board · week 12</span>
              <span className={phase === 'idle' ? 'pp-hint pp-hint-idle' : 'pp-hint'}>
                {phase === 'idle'
                  ? 'Nothing planned yet'
                  : phase === 'syncing'
                    ? 'Reading ERP, WMS, HR and SharePoint'
                    : phase === 'planning'
                      ? `${placedCount} of ${PLAN_SEQUENCE.length} orders placed`
                      : 'Review the attention points on the right'}
              </span>
            </div>

            <PlanBoard
              placements={placements}
              insights={openInsights}
              highlightedSlot={highlightedSlot}
            />
          </div>

          <InsightsPanel
            insights={insights}
            resolved={resolved}
            phase={phase}
            onHover={setHighlightedSlot}
            onResolve={resolve}
            onReplace={replace}
          />
        </div>
      </div>
    </div>
  )
}
