type Counts = {
  available: number
  unavailable: number
  action: number
  noAnswer: number
}

type RunStripProps = {
  processed: number
  runCount: number
  counts: Counts
}

const STATS: { key: keyof Counts | 'workers'; label: string; color: string }[] = [
  { key: 'workers', label: 'Workers', color: 'var(--text-white)' },
  { key: 'available', label: 'Available', color: 'var(--success-brand)' },
  { key: 'unavailable', label: 'Unavailable', color: 'var(--danger-brand)' },
  { key: 'action', label: 'Action needed', color: 'var(--warn-brand)' },
  { key: 'noAnswer', label: 'No answer', color: 'var(--text-muted)' },
]

export default function RunStrip({ processed, runCount, counts }: RunStripProps) {
  const progress = runCount > 0 ? Math.round((processed / runCount) * 100) : 0

  const valueOf = (key: keyof Counts | 'workers'): number =>
    key === 'workers' ? runCount : counts[key]

  return (
    <div className="wca-runstrip">
      <div className="flex items-center gap-2">
        <span className="ico-live-dot" aria-hidden="true" />
        <span className="ico-heading text-[15px] font-semibold text-[var(--text-white)]">
          Live call run
        </span>
      </div>

      <div className="wca-runstrip-progress">
        <div
          className="wca-runstrip-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="wca-tabnum font-mono text-[12px] text-[var(--text-muted)]">
        {processed} / {runCount} processed
      </span>

      <div className="flex items-center gap-5">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col leading-none">
            <span
              className="wca-tabnum ico-heading text-[20px] font-bold"
              style={{ color: stat.color }}
            >
              {valueOf(stat.key)}
            </span>
            <span className="mt-1 font-['IBM_Plex_Sans'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
