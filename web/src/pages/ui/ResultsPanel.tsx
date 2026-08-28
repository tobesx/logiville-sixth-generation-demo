import { CheckCircle2, X } from 'lucide-react'
import CallCard from './CallCard'
import type { DemoPerson } from '../mockPeople'
import type { DemoResult } from '../wca'
import type { TranscriptLine } from '../transcript'

export type ResultItem = {
  person: DemoPerson
  result: DemoResult
  transcript: TranscriptLine[]
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
  const firstCallId = items.find((item) => !item.result.manual)?.result.id

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
          items.map((item) => (
            <CallCard
              key={item.result.id}
              // De rondleiding wijst naar een transcript, dus naar het eerste
              // échte gesprek. Handmatige invoer staat bovenaan zodra de planner
              // zelf iets heeft ingevuld, en die kaart heeft niets te tonen.
              dataTour={item.result.id === firstCallId ? 'card' : undefined}
              result={item.result}
              transcript={item.transcript}
              onOpen={() => onSelectWorker(item.person)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
