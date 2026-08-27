import { cn } from '../../lib/shadcn/utils'
import { AlertTriangle } from 'lucide-react'
import { DAYS, LINES, ORDERS, flagById, type Order } from './data'

type PlanBoardProps = {
  selectedOrderId: string | null
  onSelectOrder: (order: Order) => void
}

/**
 * Het weekbord: productielijnen als rijen, maandag tot vrijdag als kolommen.
 *
 * Opgezet als één CSS-grid in plaats van per rij een tijdlijn, omdat orders
 * over meerdere dagen lopen en `grid-column: span` dat zonder rekenwerk
 * afhandelt. De lanes uit de Call Agent doen hetzelfde met percentages, maar
 * die hebben een continue tijdas; hier zijn het vijf vaste vakken.
 */
export default function PlanBoard({ selectedOrderId, onSelectOrder }: PlanBoardProps) {
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

      {LINES.map((line) => {
        const orders = ORDERS.filter((o) => o.lineId === line.id)
        return (
          <div key={line.id} className="pp-row">
            <div className="pp-line">
              <span className="pp-line-name">{line.name}</span>
              <span className="pp-line-cap">{line.capability}</span>
            </div>

            <div className="pp-track">
              {DAYS.map((day) => (
                <span key={day} className="pp-slot" />
              ))}

              {orders.map((order) => {
                const flag = flagById(order.flagId)
                const start = DAYS.indexOf(order.day) + 1
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    style={{ gridColumn: `${start} / span ${order.span}` }}
                    className={cn(
                      'pp-order',
                      flag?.severity === 'blocking' && 'pp-order-blocking',
                      flag?.severity === 'attention' && 'pp-order-attention',
                      selectedOrderId === order.id && 'pp-order-selected',
                    )}
                  >
                    <span className="pp-order-head">
                      <span className="pp-order-product">{order.product}</span>
                      {flag ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : null}
                    </span>
                    <span className="pp-order-customer">
                      {order.customer} · {order.quantity}
                    </span>
                    <span className="pp-crew">
                      {order.crew.map((name) => (
                        <span key={name} className="pp-crew-chip">
                          {name}
                        </span>
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
