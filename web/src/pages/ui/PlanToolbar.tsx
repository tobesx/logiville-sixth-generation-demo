import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, MessagesSquare, PhoneOutgoing, RotateCcw, Search } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import type { ChipTone, Phase } from '../wca'

export type StatusFilter = 'all' | ChipTone

type PlanToolbarProps = {
  phase: Phase
  planDate: string
  tourStep?: number
  search: string
  onSearch: (value: string) => void
  teams: string[]
  teamFilter: string
  onTeamFilter: (value: string) => void
  shiftFilter: string
  onShiftFilter: (value: string) => void
  callingCount: number
  resolvedCount: number
  answersOpen: boolean
  onToggleAnswers: () => void
  onStart: () => void
  onReset: () => void
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = value !== 'all'
  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn('wca-tool', active && 'wca-tool-active')}
      >
        {active ? value : label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="wca-menu">
          <button type="button" className="wca-menu-item" onClick={() => { onChange('all'); setOpen(false) }}>
            {label}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="wca-menu-item"
              onClick={() => { onChange(option); setOpen(false) }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function PlanToolbar({
  phase,
  planDate,
  tourStep = 0,
  search,
  onSearch,
  teams,
  teamFilter,
  onTeamFilter,
  shiftFilter,
  onShiftFilter,
  callingCount,
  resolvedCount,
  answersOpen,
  onToggleAnswers,
  onStart,
  onReset,
}: PlanToolbarProps) {
  const isRunning = phase === 'running'
  const isComplete = phase === 'complete'

  return (
    <div className="wca-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <div className="wca-pillgroup">
          <button type="button" className="wca-pillbtn" aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-['IBM_Plex_Sans'] text-[13.5px] font-medium text-[var(--text-white)]">
            {planDate}
          </span>
          <button type="button" className="wca-pillbtn" aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="wca-search">
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search worker..."
            className="wca-search-input"
          />
        </div>

        <Dropdown label="All teams" value={teamFilter} options={teams} onChange={onTeamFilter} />
        <Dropdown
          label="All shifts"
          value={shiftFilter}
          options={['Early', 'Late', 'Night']}
          onChange={onShiftFilter}
        />

        {isRunning ? (
          <span className="wca-tool wca-tool-active">Calling now · {callingCount}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {phase !== 'idle' ? (
          <button
            type="button"
            onClick={onToggleAnswers}
            className={cn('wca-tool', answersOpen && 'wca-tool-active')}
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            Recent answers
            <span className="wca-badge">{resolvedCount}</span>
          </button>
        ) : null}

        {isComplete ? (
          <>
            <button type="button" className="wca-tool">
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onReset} className="wca-primary">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset demo
            </button>
          </>
        ) : isRunning ? (
          <button type="button" disabled className="wca-primary wca-primary-ghost">
            Calling workforce…
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            data-tour="call"
            className={cn('wca-primary', tourStep === 5 && 'wca-tour-callpulse')}
          >
            <PhoneOutgoing className="h-4 w-4" />
            Call workforce
          </button>
        )}
      </div>
    </div>
  )
}
