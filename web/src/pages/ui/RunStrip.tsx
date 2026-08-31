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
  /** Iedereen die voor morgen ingepland staat. Verandert niet tijdens een run. */
  scheduled: number
  /** Hoeveel daarvan al een status hebben, gebeld of met de hand gezet. */
  resolved: number
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
  { key: 'workers', label: 'Still to call', color: 'var(--text-white)' },
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
  scheduled,
  resolved,
  counts,
  statusFilter = 'all',
  onFilter,
}: RunStripProps) {
  const isIdle = state === 'idle'
  const isComplete = state === 'complete'

  // Eén paarse balk die meegroeide werd gelezen als "de agent is zover" — een
  // voortgangsmeter. Het is er nu een van uitkomsten: elk segment draagt de
  // kleur van de kolom eronder, en samen vullen ze het rooster. Wat overblijft
  // is de lege baan: iedereen die nog geen antwoord heeft.
  const share = (value: number) => (scheduled > 0 ? (value / scheduled) * 100 : 0)

  const valueOf = (key: keyof Counts | 'workers'): string => {
    if (key === 'workers') return String(Math.max(scheduled - resolved, 0))
    return String(counts[key])
  }

  const title = isComplete ? 'Call run completed' : 'Live call run'

  return (
    <div className="wca-runstrip">
      {/* Zolang de agent niet gelopen heeft staat hier geen stip, geen kop en
          geen balk: dat zou werk suggereren dat nog niet gedaan is. De regel
          zegt alleen wat er nog te bevestigen valt. */}
      {isIdle ? null : (
        <div className="flex shrink-0 items-center gap-2">
          {state === 'running' ? (
            <span className="ico-live-dot" aria-hidden="true" />
          ) : (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: 'var(--success-brand)' }}
              aria-hidden="true"
            />
          )}
          <span className="ico-heading whitespace-nowrap text-[15px] font-semibold text-[var(--text-white)]">
            {title}
          </span>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-5">
        {STATS.map((stat) => {
          const active = isComplete && stat.filterKey === statusFilter
          const clickable = isComplete && stat.filterKey !== undefined && onFilter !== undefined

          const body = (
            <>
              <span
                className="wca-tabnum ico-heading text-[20px] font-bold"
                style={{ color: valueOf(stat.key) === '0' ? 'var(--text-muted)' : stat.color }}
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

      {/* Pas als de agent loopt, en dan rechts van de cijfers: het is de enige
          plek waar voortgang iets betekent. */}
      {isIdle ? null : (
        <div
          className="wca-runstrip-progress"
          role="img"
          aria-label={`${counts.available} available, ${counts.unavailable} unavailable, ${counts.action} need action, ${counts.noAnswer} no answer, out of ${scheduled}`}
        >
          {STATS.filter((stat) => stat.key !== 'workers').map((stat) => (
            <span
              key={stat.key}
              className="wca-runstrip-seg"
              style={{
                width: `${share(counts[stat.key as keyof Counts])}%`,
                background: stat.color,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
