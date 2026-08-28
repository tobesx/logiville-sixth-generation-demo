import { cn } from '../../lib/shadcn/utils'
import { AlertTriangle, Ban, Check } from 'lucide-react'
import type { Insight, Phase, Worker } from './data'

type InsightsPanelProps = {
  insights: Insight[]
  resolved: Set<string>
  phase: Phase
  onHover: (slot: string | null) => void
  onResolve: (insight: Insight) => void
  onReplace: (insight: Insight, worker: Worker) => void
}

/**
 * Wat er mis is met de huidige stand van het bord.
 *
 * Elk inzicht draagt het systeem waar het vandaan komt. Dat is de kern van de
 * demo: de planner hoeft ERP, WMS, HR en SharePoint niet meer één voor één te
 * openen — die zijn al geraadpleegd op het moment dat hij iemand neerzet.
 */
export default function InsightsPanel({
  insights,
  resolved,
  phase,
  onHover,
  onResolve,
  onReplace,
}: InsightsPanelProps) {
  const open = insights.filter((i) => !resolved.has(i.id))

  return (
    <aside className="pp-flags">
      <div className="pp-flags-head">
        <h2 className="ico-heading text-[15px] font-bold text-[var(--text-white)]">Insights</h2>
        <span className={cn('pp-badge', open.length === 0 && 'pp-badge-clear')}>
          {open.length === 0
            ? 'All clear'
            : `${open.length} attention point${open.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="pp-flags-body ico-scrollbar">
        {open.length === 0 ? (
          <p className="pp-side-empty">
            {phase === 'idle'
              ? 'Nothing planned yet. Generate a plan to see what needs checking.'
              : phase === 'complete'
                ? 'Nothing left to check. Every order passed ERP, WMS, HR and SharePoint.'
                : 'Checking each order against the connected systems…'}
          </p>
        ) : (
          open.map((insight) => {
            const blocking = insight.severity === 'blocking'
            return (
              <div
                key={insight.id}
                className={cn('pp-flag', blocking && 'pp-flag-blocking')}
                onMouseEnter={() => onHover(insight.slot)}
                onMouseLeave={() => onHover(null)}
              >
                <div className="pp-flag-top">
                  <span className={cn('pp-sev', blocking ? 'pp-sev-blocking' : 'pp-sev-attention')}>
                    {blocking ? <Ban className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  </span>
                  <span className="pp-flag-title">{insight.title}</span>
                  <button
                    type="button"
                    aria-label="Mark as handled"
                    className="pp-resolve"
                    onClick={() => onResolve(insight)}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>

                <span className="pp-source">{insight.source}</span>
                <p className="pp-flag-detail">{insight.detail}</p>

                {insight.replacements.length > 0 ? (
                  <div className="pp-replacements">
                    {insight.replacements.map((worker) => (
                      <button
                        key={worker.id}
                        type="button"
                        className="pp-replace"
                        onClick={() => onReplace(insight, worker)}
                      >
                        {worker.name}
                      </button>
                    ))}
                  </div>
                ) : null}

                {insight.action ? (
                  <button type="button" className="pp-action" onClick={() => onResolve(insight)}>
                    {insight.action}
                  </button>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
