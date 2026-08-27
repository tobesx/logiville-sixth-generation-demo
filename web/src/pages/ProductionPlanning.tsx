import { useState } from 'react'
import { CheckCircle2, Database, Factory, Users } from 'lucide-react'
import PlanningTopbar from './planning/PlanningTopbar'
import PlanBoard from './planning/PlanBoard'
import FlagsPanel from './planning/FlagsPanel'
import { FLAGS, LINES, ORDERS, crewCount, type Flag, type Order } from './planning/data'
import './ico.css'
import './planning/planning.css'

/**
 * Smart Production Planning.
 *
 * De demo laat niet zien dát er een planning is, maar dat hij al gemaakt is.
 * Vandaar dat het scherm opent op een afgerond plan met drie aandachtspunten
 * ernaast — uren plannen wordt een kwartier nakijken.
 */
export default function ProductionPlanning() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const select = (id: string) => setSelectedOrderId((current) => (current === id ? null : id))

  return (
    <div className="ico-app pp-root">
      <div className="flex h-full flex-col">
        <PlanningTopbar />

        <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6 pt-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <PlanStrip />

            <div className="wca-panel mt-3 min-h-0 flex-1 overflow-auto p-4">
              <PlanBoard
                selectedOrderId={selectedOrderId}
                onSelectOrder={(order: Order) => select(order.id)}
              />
            </div>
          </div>

          <FlagsPanel
            selectedOrderId={selectedOrderId}
            onSelectFlag={(flag: Flag) => select(flag.orderId)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Statusregel in dezelfde vorm als de RunStrip van de Call Agent, zodat de twee
 * demo's op het eerste gezicht bij elkaar horen.
 */
function PlanStrip() {
  const blocking = FLAGS.filter((f) => f.severity === 'blocking').length

  const stats = [
    { icon: Factory, label: 'Lines', value: String(LINES.length) },
    { icon: Database, label: 'Orders', value: String(ORDERS.length) },
    { icon: Users, label: 'People assigned', value: String(crewCount()) },
  ]

  return (
    <div className="wca-runstrip shrink-0">
      <div className="flex shrink-0 items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[var(--success-brand)]" />
        <span className="ico-heading whitespace-nowrap text-[15px] font-semibold text-[var(--text-white)]">
          Plan proposed
        </span>
      </div>

      <span className="flex-1 font-['IBM_Plex_Sans'] text-[12px] italic text-[var(--text-muted)]">
        Built from ERP, WMS and HR — no spreadsheet involved.
      </span>

      <div className="flex shrink-0 items-center gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col px-2 py-1 leading-none">
            <span className="wca-tabnum ico-heading text-[20px] font-bold text-[var(--text-white)]">
              {stat.value}
            </span>
            <span className="mt-1 whitespace-nowrap font-['IBM_Plex_Sans'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {stat.label}
            </span>
          </div>
        ))}

        <div className="flex flex-col px-2 py-1 leading-none">
          <span
            className="wca-tabnum ico-heading text-[20px] font-bold"
            style={{ color: blocking > 0 ? 'var(--danger-brand)' : 'var(--accent-brand)' }}
          >
            {FLAGS.length}
          </span>
          <span className="mt-1 whitespace-nowrap font-['IBM_Plex_Sans'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Attention points
          </span>
        </div>
      </div>
    </div>
  )
}
