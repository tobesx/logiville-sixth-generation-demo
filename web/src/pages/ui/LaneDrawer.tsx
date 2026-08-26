import { ChevronRight, Radio, X } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import { formatShiftTimeRange } from '../shift'
import { toneMeta } from '../wca'
import type { ChipTone } from '../wca'
import type { DemoPerson } from '../mockPeople'

type LaneDrawerProps = {
  team: string
  shiftName: string
  shiftTime: string
  workers: DemoPerson[]
  getTone: (person: DemoPerson) => ChipTone
  lockClose?: boolean
  onSelectWorker: (person: DemoPerson) => void
  onClose: () => void
}

export default function LaneDrawer({
  team,
  shiftName,
  shiftTime,
  workers,
  getTone,
  lockClose = false,
  onSelectWorker,
  onClose,
}: LaneDrawerProps) {
  return (
    <div className="wca-drawer-overlay" onClick={lockClose ? undefined : onClose}>
      <aside
        className="wca-drawer ico-scrollbar"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={`${team} ${shiftName} workers`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="ico-heading text-[22px] font-bold text-[var(--text-white)]">
              {team} · {shiftName}
            </h2>
            <p className="mt-1 font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
              {shiftTime} · {workers.length} workers
            </p>
          </div>
          {lockClose ? null : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close list"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-5 space-y-1.5">
          {workers.map((worker, index) => {
            const tone = getTone(worker)
            const meta = toneMeta[tone]
            return (
              <button
                key={worker.id}
                type="button"
                onClick={() => onSelectWorker(worker)}
                data-tour={index === 0 ? 'person' : 'none'}
                className="wca-lane-row"
              >
                <span className={cn('wca-dot', `wca-dot-${tone}`)} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1.5">
                    <span className="ico-heading truncate text-[14px] font-semibold text-[var(--text-white)]">
                      {worker.name}
                    </span>
                    {worker.real ? <Radio className="h-3 w-3 shrink-0 text-[var(--accent-brand)]" /> : null}
                  </span>
                  <span className="block truncate font-['IBM_Plex_Sans'] text-[12px] text-[var(--text-muted)]">
                    {worker.role} · {formatShiftTimeRange(worker)}
                  </span>
                </span>
                <span className={cn('shrink-0 font-["IBM_Plex_Sans"] text-[12px] font-semibold', meta.textClass)}>
                  {meta.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
