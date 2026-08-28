import { cn } from '../../lib/shadcn/utils'
import { Plus } from 'lucide-react'
import { Avatar } from './SidePane'
import type { Selection } from './SidePane'
import {
  DAYS,
  LINES,
  orderById,
  slotKey,
  workerById,
  type Day,
  type Insight,
  type Placement,
} from './data'

type PlanBoardProps = {
  placements: Record<string, Placement>
  insights: Insight[]
  selection: Selection
  highlightedSlot: string | null
  onSlotTap: (lineId: string, day: Day) => void
}

/**
 * Het planbord: lijnen als rijen, maandag tot vrijdag als kolommen.
 *
 * Een leeg slot neemt een order aan, een gevuld slot een medewerker. Welke van
 * de twee er gebeurt hangt af van wat er links geselecteerd staat; het slot
 * laat dat zien in plaats van het te raden.
 */
export default function PlanBoard({
  placements,
  insights,
  selection,
  highlightedSlot,
  onSlotTap,
}: PlanBoardProps) {
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

              // Alleen slots waar de huidige selectie iets kan doen lichten op.
              const canDrop =
                selection !== null &&
                (selection.kind === 'order' ? !placement : Boolean(placement))

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSlotTap(line.id, day)}
                  // Een leeg slot bevat alleen een plus-icoon en zou anders
                  // naamloos zijn voor schermlezers en voor testgereedschap.
                  aria-label={
                    order
                      ? `${line.name}, ${day}: ${order.code}, ${worker ? worker.name : 'unstaffed'}`
                      : `${line.name}, ${day}: empty slot`
                  }
                  className={cn(
                    'pp-slot',
                    placement && 'pp-slot-filled',
                    severity === 'attention' && 'pp-slot-attention',
                    severity === 'blocking' && 'pp-slot-blocking',
                    canDrop && 'pp-slot-target',
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
                  ) : (
                    <span className="pp-slot-plus">
                      <Plus className="h-4 w-4" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
