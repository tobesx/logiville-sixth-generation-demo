import { Briefcase, Check, Clock, Phone, X } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import { formatShiftTimeRange } from '../shift'
import { toneMeta } from '../wca'
import type { ChipTone, DemoResult } from '../wca'
import type { DemoPerson } from '../mockPeople'
import type { TranscriptLine } from '../transcript'

type WorkerDrawerProps = {
  person: DemoPerson
  tone: ChipTone
  resolved: boolean
  /** Phone numbers are only known once retrieved from the HR system at run start. */
  phoneKnown: boolean
  result: DemoResult | null
  transcript: TranscriptLine[]
  /** Wat de planner zelf heeft ingevuld, buiten een gesprek om. */
  manualValue: 'YES' | 'NO' | null
  /** Uit terwijl deze persoon aan de lijn is; dan is bellen aan zet. */
  canSetManual: boolean
  onSetManual: (value: 'YES' | 'NO') => void
  onClose: () => void
}

function InfoRow({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: typeof Phone
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-['IBM_Plex_Sans'] text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
          {label}
        </div>
        <div
          className={cn(
            "font-['IBM_Plex_Sans'] text-[15px]",
            muted ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-white)]',
          )}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

export default function WorkerDrawer({
  person,
  tone,
  resolved,
  phoneKnown,
  result,
  transcript,
  manualValue,
  canSetManual,
  onSetManual,
  onClose,
}: WorkerDrawerProps) {
  const meta = toneMeta[tone]

  return (
    <div className="wca-drawer-overlay" onClick={onClose}>
      <aside
        className="wca-drawer ico-scrollbar"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={`${person.name} details`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="ico-heading text-[24px] font-bold text-[var(--text-white)]">
                {person.name}
              </h2>
              {person.real ? <span className="wca-live-tag">Live call</span> : null}
            </div>
            <span
              className={cn(
                'mt-2 inline-flex rounded-full px-3 py-1 font-["IBM_Plex_Sans"] text-[13px] font-semibold',
                meta.chipClass,
              )}
            >
              {resolved ? meta.label : 'Not called yet'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <InfoRow icon={Briefcase} label="Role" value={person.role} />
          <InfoRow icon={Clock} label="Shift" value={formatShiftTimeRange(person)} />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={phoneKnown ? person.phone : 'Retrieved from the HR system during the call run'}
            muted={!phoneKnown}
          />
        </div>

        {canSetManual ? (
          <div className="mt-7">
            <h3 className="ico-section-label">Set availability yourself</h3>
            <p className="mt-2 font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
              {manualValue
                ? 'Set by you, so the agent skips this worker. Press again to undo.'
                : 'If you already know, record it here and the agent will not call this worker.'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onSetManual('YES')}
                aria-pressed={manualValue === 'YES'}
                className="wca-manual-btn wca-manual-btn-yes"
              >
                <Check className="h-4 w-4" strokeWidth={2.4} />
                Available
              </button>
              <button
                type="button"
                onClick={() => onSetManual('NO')}
                aria-pressed={manualValue === 'NO'}
                className="wca-manual-btn wca-manual-btn-no"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
                Unavailable
              </button>
            </div>
          </div>
        ) : null}

        {resolved && result?.manual ? (
          <div className="mt-7 rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] px-5 py-4">
            <p className="font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-muted)]">
              Recorded by you — there is no call and no transcript for this worker.
            </p>
          </div>
        ) : resolved && result ? (
          <>
            <div className="mt-7">
              <h3 className="ico-section-label">Structured result</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.structured.map((field) => (
                  <span key={field.label} className="wca-structured-chip">
                    {field.label}: <strong>{field.value}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <h3 className="ico-section-label">Transcript</h3>
              <div className="wca-transcript mt-3">
                {transcript.map((line, index) => (
                  <div
                    key={index}
                    className={cn('wca-transcript-line', `wca-transcript-${line.speaker}`)}
                  >
                    <span className="wca-transcript-speaker">
                      {line.speaker === 'agent' ? 'Agent' : person.name.split(' ')[0]}
                    </span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-[var(--border-brand)] bg-[var(--bg-deep)] px-5 py-6 text-center">
            <p className="font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-muted)]">
              This worker has not been called yet. Their planned shift details are shown above.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
