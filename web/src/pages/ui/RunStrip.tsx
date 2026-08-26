import { cn } from '../../lib/shadcn/utils'
import type { ChipTone } from '../wca'

type Counts = {
  available: number
  unavailable: number
  action: number
  noAnswer: number
}

type RunStripProps = {
  state: 'idle' | 'running' | 'complete'
  processed: number
  runCount: number
  counts: Counts
  /** Actief filter na afloop; alleen dan zijn de uitkomsten aanklikbaar. */
  statusFilter?: ChipTone | 'all'
  onFilter?: (key: ChipTone) => void
}

const STATS: {
  key: keyof Counts | 'workers'
  filterKey?: ChipTone
  label: string
  color: string
}[] = [
  { key: 'workers', label: 'Calls queued', color: 'var(--text-white)' },
  { key: 'available', filterKey: 'yes', label: 'Available', color: 'var(--success-brand)' },
  { key: 'unavailable', filterKey: 'no', label: 'Unavailable', color: 'var(--danger-brand)' },
  { key: 'action', filterKey: 'other', label: 'Action needed', color: 'var(--warn-brand)' },
  { key: 'noAnswer', filterKey: 'noanswer', label: 'No answer', color: 'var(--text-muted)' },
]

/**
 * Eén statusregel voor de hele belronde: ervoor, tijdens en erna. Dezelfde
 * hoogte en dezelfde slots in alle drie de toestanden, zodat er niets
 * verspringt op het moment dat de agent begint of klaar is.
 *
 * Na afloop worden de vier uitkomstkolommen filters op het plan. Dat zat
 * eerder in een aparte samenvattingsbalk; die verdween hier in op.
 */
export default function RunStrip({
  state,
  processed,
  runCount,
  counts,
  statusFilter = 'all',
  onFilter,
}: RunStripProps) {
  const isIdle = state === 'idle'
  const isComplete = state === 'complete'
  const progress = isComplete ? 100 : runCount > 0 && !isIdle ? Math.round((processed / runCount) * 100) : 0

  // Uitkomsten zijn voor de run onbekend. Een nul zou lezen als "niemand
  // beschikbaar" in plaats van "nog niet gebeld".
  const valueOf = (key: keyof Counts | 'workers'): string => {
    if (key === 'workers') return String(runCount)
    return isIdle ? '—' : String(counts[key])
  }

  const title = isIdle ? 'Ready to call' : isComplete ? 'Call run completed' : 'Live call run'

  return (
    <div className="wca-runstrip">
      <div className="flex shrink-0 items-center gap-2">
        {state === 'running' ? (
          <span className="ico-live-dot" aria-hidden="true" />
        ) : (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: isComplete ? 'var(--success-brand)' : 'var(--text-muted)' }}
            aria-hidden="true"
          />
        )}
        <span className="ico-heading whitespace-nowrap text-[15px] font-semibold text-[var(--text-white)]">
          {title}
        </span>
      </div>

      {/* Een volle balk zegt niets meer zodra de run klaar is; de uitkomst wel. */}
      {isComplete ? (
        <span className="flex-1 text-right font-['IBM_Plex_Sans'] text-[12px] italic leading-[1.35] text-[var(--text-muted)]">
          A manual calling process has been transformed into structured workforce information.
        </span>
      ) : (
        <div className="wca-runstrip-progress">
          <div className="wca-runstrip-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <span className="wca-tabnum shrink-0 whitespace-nowrap font-mono text-[12px] text-[var(--text-muted)]">
        {isIdle ? `${runCount} calls placed in parallel` : `${processed} / ${runCount} processed`}
      </span>

      <div className="flex shrink-0 items-center gap-5">
        {STATS.map((stat) => {
          const active = isComplete && stat.filterKey === statusFilter
          const clickable = isComplete && stat.filterKey !== undefined && onFilter !== undefined

          const body = (
            <>
              <span
                className="wca-tabnum ico-heading text-[20px] font-bold"
                style={{ color: isIdle && stat.key !== 'workers' ? 'var(--text-muted)' : stat.color }}
              >
                {valueOf(stat.key)}
              </span>
              <span className="mt-1 whitespace-nowrap font-['IBM_Plex_Sans'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {stat.label}
              </span>
            </>
          )

          if (!clickable) {
            return (
              // Zelfde padding als de klikbare variant, anders verspringt de
              // balk bij het afronden van de run.
              <div key={stat.label} className="flex flex-col rounded-lg px-2 py-1 leading-none">
                {body}
              </div>
            )
          }

          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onFilter(stat.filterKey as ChipTone)}
              aria-pressed={active}
              className={cn(
                'flex flex-col rounded-lg px-2 py-1 leading-none transition-colors',
                'hover:bg-[color-mix(in_srgb,var(--text-white)_8%,transparent)]',
                active && 'bg-[color-mix(in_srgb,var(--text-white)_12%,transparent)]',
              )}
            >
              {body}
            </button>
          )
        })}
      </div>
    </div>
  )
}
