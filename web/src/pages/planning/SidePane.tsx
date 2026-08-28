import { cn } from '../../lib/shadcn/utils'
import { WORKERS, orderById, type Worker } from './data'

export type Selection = { kind: 'order' | 'worker'; id: string } | null

type SidePaneProps = {
  backlogOrderIds: string[]
  selection: Selection
  onSelect: (selection: Selection) => void
}

/**
 * Werkvoorraad en team. Alles wat op het bord kan belanden staat hier.
 *
 * Tikken selecteert; de volgende tik op het bord plaatst. Slepen zou de
 * metafoor beter volgen, maar op een aanraakscherm wordt een sleep al snel
 * een veeg, en dan scrollt de pagina in plaats van dat er iets verplaatst.
 */
export default function SidePane({ backlogOrderIds, selection, onSelect }: SidePaneProps) {
  const toggle = (kind: 'order' | 'worker', id: string) =>
    onSelect(selection?.kind === kind && selection.id === id ? null : { kind, id })

  return (
    <aside className="pp-side">
      <section className="pp-side-block">
        <h2 className="pp-side-title">Orders · week 12</h2>

        {backlogOrderIds.length === 0 ? (
          <p className="pp-side-empty">All orders placed.</p>
        ) : (
          backlogOrderIds.map((id) => {
            const order = orderById(id)
            if (!order) return null
            const active = selection?.kind === 'order' && selection.id === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle('order', id)}
                className={cn('pp-card', active && 'pp-card-active')}
              >
                <span className="pp-card-code">{order.code}</span>
                <span className="pp-card-sub">{order.customer.name}</span>
              </button>
            )
          })
        )}
      </section>

      <section className="pp-side-block">
        <h2 className="pp-side-title">Team</h2>

        {WORKERS.map((worker) => {
          const off = worker.availability !== 'available'
          const active = selection?.kind === 'worker' && selection.id === worker.id
          return (
            <button
              key={worker.id}
              type="button"
              // Wie met verlof of ziek is, is niet in te plannen. Dat afvangen
              // bij de bron leest duidelijker dan er achteraf een inzicht over
              // tonen.
              disabled={off}
              onClick={() => toggle('worker', worker.id)}
              className={cn('pp-person', active && 'pp-person-active', off && 'pp-person-off')}
            >
              <Avatar worker={worker} />
              <span className="pp-person-name">{worker.name}</span>
              {off ? (
                <span className="pp-person-state">
                  {worker.availability === 'sick' ? 'Sick' : 'Leave'}
                </span>
              ) : null}
            </button>
          )
        })}
      </section>
    </aside>
  )
}

export function Avatar({ worker }: { worker: Worker }) {
  return <span className="pp-avatar">{worker.initials}</span>
}
