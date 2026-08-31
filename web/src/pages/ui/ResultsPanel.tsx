import { CheckCircle2, Radio, X } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import CallCard from './CallCard'
import type { DemoPerson } from '../mockPeople'
import type { DemoResult } from '../wca'
import type { TranscriptLine } from '../transcript'

export type ResultItem = {
  person: DemoPerson
  /** Null zolang deze persoon aan de lijn is; er valt dan nog niets te tonen. */
  result: DemoResult | null
  transcript: TranscriptLine[]
}

/**
 * Iemand die gebeld wordt maar nog niet geantwoord heeft. Geen uitkomst, geen
 * citaat, geen transcript — die zijn er pas als het gesprek verwerkt is.
 */
function PendingCard({
  person,
  onOpen,
  dataTour,
  pinned,
}: {
  person: DemoPerson
  onOpen: () => void
  dataTour?: string
  pinned?: boolean
}) {
  return (
    <div className={cn('wca-result p-5', pinned && 'wca-result-pinned')} data-tour={dataTour}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="ico-heading text-[18px] font-bold text-[var(--text-white)] hover:text-[var(--accent-brand)]"
          >
            {person.name}
          </button>
          {person.real ? (
            <span className="wca-live-tag">
              <Radio className="h-3 w-3" />
              Live call
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 font-['IBM_Plex_Sans'] text-[14px] font-semibold text-[var(--accent-brand)]">
          <span className="wca-dot wca-dot-calling" />
          Calling…
        </div>
      </div>

      <p className="mt-3 font-['IBM_Plex_Sans'] text-[14px] italic text-[var(--text-muted)]">
        Waiting for an answer.
      </p>
    </div>
  )
}

type ResultsPanelProps = {
  items: ResultItem[]
  runCount: number
  processed: number
  isComplete: boolean
  onSelectWorker: (person: DemoPerson) => void
  onClose: () => void
}

export default function ResultsPanel({
  items,
  runCount,
  processed,
  isComplete,
  onSelectWorker,
  onClose,
}: ResultsPanelProps) {
  return (
    <aside className="wca-answers-panel ico-scrollbar" data-tour="answers">
      <div className="wca-answers-header">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-[var(--success-brand)]" />
          ) : (
            <span className="ico-live-dot" aria-hidden="true" />
          )}
          <h2 className="ico-heading text-[15px] font-bold text-[var(--text-white)]">
            Recent answers
          </h2>
          <span className="wca-tabnum font-mono text-[12px] text-[var(--text-muted)]">
            {processed} / {runCount} processed
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close answers"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="wca-answers-body ico-scrollbar">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
            Waiting for the first response…
          </div>
        ) : (
          items.map((item, index) =>
            item.result === null ? (
              <PendingCard
                key={item.person.id}
                dataTour={index === 0 ? 'card' : undefined}
                pinned={index === 0}
                person={item.person}
                onOpen={() => onSelectWorker(item.person)}
              />
            ) : (
              <CallCard
                key={item.person.id}
                // De rondleiding wijst naar de vastgezette kop, en die staat
                // altijd vooraan — of hij nu al geantwoord heeft of niet.
                dataTour={index === 0 ? 'card' : undefined}
                pinned={index === 0}
                result={item.result}
                transcript={item.transcript}
                onOpen={() => onSelectWorker(item.person)}
              />
            ),
          )
        )}
      </div>
    </aside>
  )
}
