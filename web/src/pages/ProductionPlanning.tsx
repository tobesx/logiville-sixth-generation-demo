import { useMemo, useState } from 'react'
import PlanningTopbar from './planning/PlanningTopbar'
import PlanBoard from './planning/PlanBoard'
import SidePane, { type Selection } from './planning/SidePane'
import InsightsPanel from './planning/InsightsPanel'
import {
  BACKLOG_ORDER_IDS,
  INITIAL_PLACEMENTS,
  SHIFTS,
  inspectAll,
  slotKey,
  type Day,
  type Insight,
  type Placement,
  type Worker,
} from './planning/data'
import './ico.css'
import './planning/planning.css'

const SYSTEMS = ['ERP', 'WMS', 'HR', 'SHAREPOINT'] as const

/**
 * Smart Production Planning.
 *
 * De video laat zien hoe de planner met de hand een weekplanning maakt en
 * daarvoor vier systemen apart moet raadplegen — waardoor twee fouten
 * wekenlang onopgemerkt bleven. Deze demo draait dat om: je zet iemand neer en
 * hoort meteen wat eraan schort.
 *
 * Tikken in plaats van slepen: op een aanraakscherm wordt een sleep te vaak
 * een veeg, en dan scrollt de pagina in plaats van dat er iets verplaatst.
 */
export default function ProductionPlanning() {
  const [placements, setPlacements] = useState<Record<string, Placement>>(INITIAL_PLACEMENTS)
  const [backlog, setBacklog] = useState<string[]>(BACKLOG_ORDER_IDS)
  const [selection, setSelection] = useState<Selection>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null)

  const insights = useMemo(() => inspectAll(placements), [placements])
  const openInsights = insights.filter((i) => !resolved.has(i.id))

  const tapSlot = (lineId: string, day: Day) => {
    if (!selection) return
    const slot = slotKey(lineId, day)
    const existing = placements[slot]

    if (selection.kind === 'order') {
      // Een order gaat alleen op een leeg slot; een bezet slot overschrijven
      // zou stilletjes werk weggooien.
      if (existing) return
      setPlacements((current) => ({
        ...current,
        [slot]: { orderId: selection.id, workerId: null, shift: SHIFTS[0] },
      }))
      setBacklog((current) => current.filter((id) => id !== selection.id))
      setSelection(null)
      return
    }

    // Een medewerker heeft een order nodig om aan te werken.
    if (!existing) return
    setPlacements((current) => ({
      ...current,
      [slot]: { ...existing, workerId: selection.id },
    }))
    setSelection(null)
  }

  /**
   * Een voorgestelde vervanger overnemen. Het inzicht verdwijnt daarna vanzelf,
   * want het wordt opnieuw afgeleid uit het bord — niet apart bijgehouden.
   */
  const replace = (insight: Insight, worker: Worker) => {
    const existing = placements[insight.slot]
    if (!existing) return
    setPlacements((current) => ({
      ...current,
      [insight.slot]: { ...existing, workerId: worker.id },
    }))
  }

  const resolve = (insight: Insight) =>
    setResolved((current) => new Set(current).add(insight.id))

  return (
    <div className="ico-app pp-root">
      <div className="flex h-full flex-col">
        <PlanningTopbar />

        <div className="pp-systems">
          <span className="pp-systems-label">Connected</span>
          {SYSTEMS.map((system) => (
            <span key={system} className="pp-system">
              <span className="pp-system-dot" />
              {system}
            </span>
          ))}
          <span className="pp-systems-spacer" />
          <span className="pp-time">
            Planning time <s>2h 40</s> <strong>15 min</strong>
          </span>
        </div>

        <div className="pp-layout">
          <SidePane backlogOrderIds={backlog} selection={selection} onSelect={setSelection} />

          <div className="pp-main">
            <div className="pp-main-head">
              <span className="pp-side-title">Plan board · week 12</span>
              {selection ? (
                <span className="pp-hint">
                  {selection.kind === 'order'
                    ? 'Tap an empty slot to place this order'
                    : 'Tap a slot with an order to assign this person'}
                </span>
              ) : (
                <span className="pp-hint pp-hint-idle">Tap an order or a team member to start</span>
              )}
            </div>

            <PlanBoard
              placements={placements}
              insights={openInsights}
              selection={selection}
              highlightedSlot={highlightedSlot}
              onSlotTap={tapSlot}
            />
          </div>

          <InsightsPanel
            insights={insights}
            resolved={resolved}
            onHover={setHighlightedSlot}
            onResolve={resolve}
            onReplace={replace}
          />
        </div>
      </div>
    </div>
  )
}
