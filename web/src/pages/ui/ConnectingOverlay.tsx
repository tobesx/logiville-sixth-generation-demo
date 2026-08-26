import { Check, Loader2, Server } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'

type ConnectingOverlayProps = {
  /** Current active step index (0-based). */
  step: number
  /** Total workers in the run, used for the final step copy. */
  total: number
  /** Anker voor de rondleiding. */
  dataTour?: string
}

export default function ConnectingOverlay({ step, total, dataTour }: ConnectingOverlayProps) {
  const steps = [
    'Connecting to HR system',
    'Retrieving phone numbers from HR system',
    `${total} workers · ${Math.max(total - 2, 0)} phone numbers found`,
  ]

  return (
    <div className="wca-overlay">
      <div className="wca-overlay-card" data-tour={dataTour}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--accent-brand)]">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h2 className="ico-heading text-[20px] font-bold text-[var(--text-white)]">
              Preparing call run
            </h2>
            <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
              Syncing the shift plan with the HR system
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {steps.map((label, index) => {
            const done = index < step
            const active = index === step
            return (
              <div
                key={label}
                className={cn(
                  'wca-step',
                  done && 'wca-step-done',
                  active && 'wca-step-active',
                  !done && !active && 'wca-step-pending',
                )}
              >
                <span className="wca-step-icon">
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="wca-step-dot" />
                  )}
                </span>
                <span className="font-['IBM_Plex_Sans'] text-[15px]">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
