import { cn } from '../../lib/shadcn/utils'
import { AlertTriangle, ArrowRight, Ban } from 'lucide-react'
import { FLAGS, ORDERS, orderById, type Flag } from './data'

type FlagsPanelProps = {
  selectedOrderId: string | null
  onSelectFlag: (flag: Flag) => void
}

/**
 * De aandachtspunten die het plan zelf gevonden heeft.
 *
 * Het bronsysteem staat op elke kaart, want dat is waar de demo over gaat: de
 * planner hoeft niet meer in ERP, WMS en HR te gaan kijken — het plan heeft dat
 * al gedaan en meldt alleen wat afwijkt.
 */
export default function FlagsPanel({ selectedOrderId, onSelectFlag }: FlagsPanelProps) {
  return (
    <aside className="pp-flags">
      <div className="pp-flags-head">
        <div className="flex items-center gap-2">
          <h2 className="ico-heading text-[15px] font-bold text-[var(--text-white)]">
            Attention points
          </h2>
          <span className="wca-tabnum font-mono text-[12px] text-[var(--text-muted)]">
            {FLAGS.length} of {ORDERS.length} orders
          </span>
        </div>
        <p className="mt-1 font-['IBM_Plex_Sans'] text-[12px] text-[var(--text-muted)]">
          Found by checking ERP, WMS and HR against the plan.
        </p>
      </div>

      <div className="pp-flags-body ico-scrollbar">
        {FLAGS.map((flag) => {
          const order = orderById(flag.orderId)
          const blocking = flag.severity === 'blocking'
          return (
            <button
              key={flag.id}
              type="button"
              onClick={() => onSelectFlag(flag)}
              className={cn(
                'pp-flag',
                blocking && 'pp-flag-blocking',
                selectedOrderId === flag.orderId && 'pp-flag-selected',
              )}
            >
              <span className="pp-flag-top">
                <span className={cn('pp-source', `pp-source-${flag.source.toLowerCase()}`)}>
                  {flag.source}
                </span>
                <span className={cn('pp-sev', blocking ? 'pp-sev-blocking' : 'pp-sev-attention')}>
                  {blocking ? <Ban className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {blocking ? 'Blocking' : 'Attention'}
                </span>
              </span>

              <span className="pp-flag-title">{flag.title}</span>
              <span className="pp-flag-detail">{flag.detail}</span>

              <span className="pp-flag-suggestion">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {flag.suggestion}
              </span>

              {order ? (
                <span className="pp-flag-order">
                  {order.product} · {order.day} · {order.customer}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
