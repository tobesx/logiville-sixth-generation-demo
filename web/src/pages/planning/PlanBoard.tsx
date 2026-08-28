import { cn } from '../../lib/shadcn/utils'
import { Avatar } from './SidePane'
import {
  DAYS,
  LINES,
  orderById,
  slotKey,
  workerById,
  type Insight,
  type Placement,
} from './data'

type PlanBoardProps = {
  placements: Record<string, Placement>
  insights: Insight[]
  highlightedSlot: string | null
}

/**
 * Het planbord: lijnen als rijen, maandag tot vrijdag als kolommen.
 *
 * Alleen om te lezen. De applicatie vult het bord; de planner kijkt na en
 * lost op wat rechts verschijnt.
 */
export default function PlanBoard({ placements, insights, highlightedSlot }: PlanBoardProps) {
  const worstFor = (slot: string): Insight['severity'] | null => {
    const own = insights.filter((i) => i.slot === slot)
    if (own.length === 0) return null
    return own.some((i) => i.severity === 'blocking') ? 'blocking' : 'attention'
  }

  return (
    <div className="pp-board">
      <div className="pp-board-head">
        <span className="pp-board-corner" />
        <div className="pp-days">
          {DAYS.map((day) => (
            <span key={day} className="pp-day">
              {day}
            </span>
          ))}
        </div>
      </div>

      {LINES.map((line) => (
        <div key={line.id} className="pp-row">
          <div className="pp-line">
            <span className="pp-line-name">{line.name}</span>
            <span className="pp-line-cap">{line.capability}</span>
          </div>

          <div className="pp-track">
            {DAYS.map((day) => {
              const slot = slotKey(line.id, day)
              const placement = placements[slot]
              const order = placement ? orderById(placement.orderId) : undefined
              const worker = placement ? workerById(placement.workerId) : undefined
              const severity = worstFor(slot)

              return (
                <div
                  key={day}
                  aria-label={
                    order
                      ? `${line.name}, ${day}: ${order.code}, ${worker ? worker.name : 'unstaffed'}`
                      : `${line.name}, ${day}: empty`
                  }
                  className={cn(
                    'pp-slot',
                    placement && 'pp-slot-filled',
                    severity === 'attention' && 'pp-slot-attention',
                    severity === 'blocking' && 'pp-slot-blocking',
                    highlightedSlot === slot && 'pp-slot-highlight',
                  )}
                >
                  {order ? (
                    <>
                      <span className="pp-slot-code">{order.code}</span>
                      {worker ? (
                        <span className="pp-slot-worker">
                          <Avatar worker={worker} />
                          {worker.name}
                        </span>
                      ) : (
                        <span className="pp-slot-unstaffed">Unstaffed</span>
                      )}
                      <span className="pp-slot-shift">{placement?.shift}</span>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
