import { useState } from 'react'
import { AlertTriangle, Check, ChevronDown, PhoneOff, Radio, X } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import type { CallClassification } from '../types'
import type { DemoResult } from '../wca'
import type { TranscriptLine } from '../transcript'

const outcomeMeta: Record<
  CallClassification,
  { label: string; icon: typeof Check; className: string }
> = {
  YES: { label: 'Available', icon: Check, className: 'text-[var(--success-brand)]' },
  NO: { label: 'Unavailable', icon: X, className: 'text-[var(--danger-brand)]' },
  OTHER: { label: 'Action needed', icon: AlertTriangle, className: 'text-[var(--warn-brand)]' },
  NO_ANSWER: { label: 'No answer', icon: PhoneOff, className: 'text-[var(--text-muted)]' },
}

type CallCardProps = {
  result: DemoResult
  transcript: TranscriptLine[]
  onOpen?: () => void
  /** Anker voor de rondleiding; alleen de bovenste kaart zet dit. */
  dataTour?: string
  /** De vastgezette kop van het paneel; die houdt de witte achtergrond. */
  pinned?: boolean
}

export default function CallCard({ result, transcript, onOpen, dataTour, pinned }: CallCardProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const meta = outcomeMeta[result.classification]
  const Icon = meta.icon

  return (
    <div
      className={cn(
        'wca-result p-5',
        pinned && 'wca-result-pinned',
        result.real && 'wca-result-real',
        result.classification === 'OTHER' && 'wca-result-action',
      )}
      data-tour={dataTour}
    >
      <div className="flex items-center justify-between gap-3">
        {/* min-w-0 zodat deze groep mag krimpen in plaats van de statuskolom
            weg te duwen, en text-left omdat een <button> zijn tekst centreert —
            met de Live call-pill erbij past een lange naam niet op één regel, en
            stond hij daardoor gecentreerd tussen de andere kaarten. */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="ico-heading min-w-0 text-left text-[18px] font-bold text-[var(--text-white)] hover:text-[var(--accent-brand)]"
          >
            {result.name}
          </button>
          {result.real ? (
            <span className="wca-live-tag shrink-0">
              <Radio className="h-3 w-3" />
              Live call
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 font-["IBM_Plex_Sans"] text-[14px] font-semibold',
            meta.className,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.4} />
          {meta.label}
        </div>
      </div>

      {/* Nooit het mock-citaat van een handmatige invoer tonen: die persoon
          heeft niets gezegd, er is geen gesprek geweest. */}
      {result.manual ? (
        <p className="mt-3 font-['IBM_Plex_Sans'] text-[14px] italic text-[var(--text-muted)]">
          Recorded by the planner — no call was made.
        </p>
      ) : result.quote ? (
        <p className="mt-3 font-['IBM_Plex_Sans'] text-[14px] italic leading-6 text-[var(--text-body)]">
          “{result.quote}”
        </p>
      ) : (
        <p className="mt-3 font-['IBM_Plex_Sans'] text-[14px] italic text-[var(--border-brand)]">
          No response captured — worker did not pick up.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {result.structured.map((field) => (
          <span key={field.label} className="wca-structured-chip">
            {field.label}: <strong>{field.value}</strong>
          </span>
        ))}
      </div>

      {result.manual ? null : (
      <button
        type="button"
        onClick={() => setShowTranscript((value) => !value)}
        className="mt-4 inline-flex items-center gap-1.5 font-['IBM_Plex_Sans'] text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--accent-brand)]"
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', showTranscript && 'rotate-180')}
        />
        {showTranscript ? 'Hide transcript' : 'Show transcript'}
      </button>
      )}

      {showTranscript ? (
        <div className="wca-transcript mt-3">
          {transcript.map((line, index) => (
            <div key={index} className={cn('wca-transcript-line', `wca-transcript-${line.speaker}`)}>
              <span className="wca-transcript-speaker">
                {line.speaker === 'agent' ? 'Agent' : result.name.split(' ')[0]}
              </span>
              <span>{line.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
