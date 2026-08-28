import { cn } from '../../lib/shadcn/utils'
import { Check } from 'lucide-react'
import { PLAN_SEQUENCE, WORKERS, orderById, type Worker } from './data'

type SidePaneProps = {
  placedOrderIds: Set<string>
}

/** De orders die het systeem deze week inplant, in de volgorde van het plan. */
const PLANNED_ORDER_IDS = PLAN_SEQUENCE.map((step) => step.placement.orderId)

/**
 * Wat er de planning in gaat: de orders van deze week en het team.
 *
 * Puur ter referentie — hier valt niets te plaatsen. De applicatie doet de
 * planning; wie hier zelf mensen zou moeten neerzetten, doet precies het werk
 * dat overgenomen wordt.
 */
export default function SidePane({ placedOrderIds }: SidePaneProps) {
  return (
    <aside className="pp-side">
      <section className="pp-side-block">
        <h2 className="pp-side-title">
          Orders · week 12
          <span className="pp-side-count">
            {placedOrderIds.size}/{PLANNED_ORDER_IDS.length}
          </span>
        </h2>

        {PLANNED_ORDER_IDS.map((id) => {
          const order = orderById(id)
          if (!order) return null
          const placed = placedOrderIds.has(id)
          return (
            <div key={id} className={cn('pp-card', placed && 'pp-card-placed')}>
              <span className="pp-card-code">{order.code}</span>
              <span className="pp-card-sub">{order.customer.name}</span>
              {placed ? <Check className="pp-card-check h-3.5 w-3.5" /> : null}
            </div>
          )
        })}
      </section>

      <section className="pp-side-block">
        <h2 className="pp-side-title">Team</h2>

        {WORKERS.map((worker) => {
          const off = worker.availability !== 'available'
          return (
            <div key={worker.id} className={cn('pp-person', off && 'pp-person-off')}>
              <Avatar worker={worker} />
              <span className="pp-person-name">{worker.name}</span>
              {off ? (
                <span className="pp-person-state">
                  {worker.availability === 'sick' ? 'Sick' : 'Leave'}
                </span>
              ) : null}
            </div>
          )
        })}
      </section>
    </aside>
  )
}

export function Avatar({ worker }: { worker: Worker }) {
  return <span className="pp-avatar">{worker.initials}</span>
}
