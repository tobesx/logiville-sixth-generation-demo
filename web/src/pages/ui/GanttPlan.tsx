import { cn } from '../../lib/shadcn/utils'
import type { CSSProperties } from 'react'
import { AXIS_START_HOUR, shiftToBar } from '../gantt'
import type { GanttLane, ShiftBlock } from '../gantt'
import type { ChipTone, Phase } from '../wca'
import type { DemoPerson } from '../mockPeople'

/** Ruler runs from the early-shift start (06:00) to 06:00 the next day. */
const HOURS = Array.from({ length: 25 }, (_, i) => AXIS_START_HOUR + i)

function axisPercent(hour: number): number {
  return ((hour - AXIS_START_HOUR) / 24) * 100
}

type GanttPlanProps = {
  lanes: GanttLane[]
  getTone: (person: DemoPerson) => ChipTone
  phase: Phase
  answersOpen: boolean
  tourStep?: number
  /** Total unfiltered rows, so lane height stays constant when filtering. */
  totalRows?: number
  onSelectBlock: (lane: GanttLane, block: ShiftBlock) => void
}

type Counts = Record<ChipTone, number>

function countTones(workers: DemoPerson[], getTone: (person: DemoPerson) => ChipTone): Counts {
  const counts: Counts = { pending: 0, calling: 0, yes: 0, no: 0, other: 0, noanswer: 0 }
  for (const worker of workers) counts[getTone(worker)] += 1
  return counts
}

function resolvedOf(counts: Counts): number {
  return counts.yes + counts.no + counts.other + counts.noanswer
}

function gapsOf(counts: Counts): number {
  return counts.no + counts.other + counts.noanswer
}

const BAR_TONES: { tone: ChipTone; color: string }[] = [
  { tone: 'yes', color: 'var(--success-brand)' },
  { tone: 'other', color: 'var(--warn-brand)' },
  { tone: 'no', color: 'var(--danger-brand)' },
  { tone: 'noanswer', color: 'var(--neutral-brand)' },
]

function LaneStatusBar({ counts, total }: { counts: Counts; total: number }) {
  const pendingWidth = total > 0 ? ((counts.pending + counts.calling) / total) * 100 : 100
  return (
    <div className="wca-statusbar">
      {BAR_TONES.map(({ tone, color }) => {
        const width = total > 0 ? (counts[tone] / total) * 100 : 0
        if (width === 0) return null
        return <span key={tone} style={{ width: `${width}%`, background: color }} />
      })}
      {pendingWidth > 0 ? (
        <span style={{ width: `${pendingWidth}%`, background: '#CDD5DF' }} />
      ) : null}
    </div>
  )
}

const LEGEND: { label: string; color: string }[] = [
  { label: 'Not called', color: '#C1C9D2' },
  { label: 'Available', color: 'var(--success-brand)' },
  { label: 'Unavailable', color: 'var(--danger-brand)' },
  { label: 'Action needed', color: 'var(--warn-brand)' },
  { label: 'No answer', color: 'var(--neutral-brand)' },
]

function ShiftCard({
  lane,
  block,
  phase,
  dataTour,
  tourHighlight,
  onSelectBlock,
  getTone,
}: {
  lane: GanttLane
  block: ShiftBlock
  phase: Phase
  dataTour: string
  tourHighlight: boolean
  onSelectBlock: (lane: GanttLane, block: ShiftBlock) => void
  getTone: (person: DemoPerson) => ChipTone
}) {
  const counts = countTones(block.workers, getTone)
  const total = block.workers.length
  const resolved = resolvedOf(counts)
  const gaps = gapsOf(counts)
  const isComplete = phase === 'complete'
  const needsReplan = isComplete && gaps > 0

  const { left, width } = shiftToBar(block.startHour, block.endHour)
  // Fixed cap in every state (pre/running/complete, drawer open or closed) so the
  // single pill row never reflows and "+N more" is always present.
  const cap = 3
  const shownWorkers = block.workers.slice(0, cap)
  const hidden = total - shownWorkers.length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectBlock(lane, block)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectBlock(lane, block)
        }
      }}
      className={cn('wca-bar', needsReplan && 'wca-bar-warn', tourHighlight && 'wca-bar-tour')}
      style={{ marginLeft: `${left}%`, width: `${width}%` }}
      data-tour={dataTour}
      title={`${lane.team} · ${block.shiftName} (${block.shiftTime})`}
    >
      <div className="wca-bar-head">
        <span className="wca-bar-title">
          {lane.team} · {block.shiftName}
        </span>
        {isComplete ? (
          <span className={cn('wca-verdict-pill', needsReplan ? 'wca-verdict-warn' : 'wca-verdict-ok')}>
            {needsReplan ? `${gaps} gaps · replanning needed` : 'Fully staffed'}
          </span>
        ) : null}
        {/* Hoeveel van deze ploeg de agent al gebeld heeft. "called" en niet
            "answered": `resolved` telt ook de mensen die niet opnamen. */}
        <span className="wca-count-pill">
          {resolved}/{total} called
        </span>
      </div>

      {phase !== 'idle' ? <LaneStatusBar counts={counts} total={total} /> : null}

      <div className="wca-bar-pills">
        {shownWorkers.map((worker) => {
          const tone = getTone(worker)
          return (
            <span key={worker.id} className={cn('wca-gchip', `wca-gchip-${tone}`)}>
              <span className="wca-gchip-name">
                {worker.name}
              </span>
              {worker.real ? <span className="wca-gchip-live" /> : null}
            </span>
          )
        })}
        {hidden > 0 ? <span className="wca-more-pill">+{hidden} more</span> : null}
      </div>
    </div>
  )
}

function BlockRow({
  lane,
  block,
  phase,
  tourStep,
  getTone,
  onSelectBlock,
}: {
  lane: GanttLane
  block: ShiftBlock
  phase: Phase
  tourStep: number
  getTone: (person: DemoPerson) => ChipTone
  onSelectBlock: (lane: GanttLane, block: ShiftBlock) => void
}) {
  const isTourTarget = lane.team === 'Warehouse' && block.shiftKey === 'early'
  return (
    <div className="wca-lane">
      <div
        className={cn('wca-lane-label', isTourTarget && tourStep === 2 && 'wca-lane-label-tour')}
        data-tour={isTourTarget ? 'lane' : 'none'}
      >
        <div className="wca-lane-title">{lane.team}</div>
        <span className="wca-shift-pill">
          {block.shiftName} · {block.shiftTime}
        </span>
      </div>

      <div className="wca-lane-timeline">
        <ShiftCard
          lane={lane}
          block={block}
          phase={phase}
          dataTour={isTourTarget ? 'block' : 'none'}
          tourHighlight={isTourTarget && tourStep === 3}
          getTone={getTone}
          onSelectBlock={onSelectBlock}
        />
      </div>
    </div>
  )
}

export default function GanttPlan({ lanes = [], getTone, phase, tourStep = 0, totalRows, onSelectBlock }: GanttPlanProps) {
  const rows = lanes.flatMap((lane) => lane.shifts.map((block) => ({ lane, block })))
  // Height per lane is derived from the full (unfiltered) row count so filtering
  // to fewer lanes keeps each lane the same height instead of stretching it.
  const laneCount = Math.max(totalRows ?? rows.length, rows.length, 1)

  return (
    <div className="wca-gantt">
      <div className="wca-legend">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LEGEND.map((item) => (
            <span key={item.label} className="wca-legend-item">
              <span className="wca-legend-dot" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        {phase === 'idle' ? (
          <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">
            No calls placed yet
          </span>
        ) : null}
      </div>

      <div className="wca-gantt-head">
        <div className="wca-ruler-spacer" />
        <div className="wca-ruler">
          {HOURS.map((hour) => (
            <span
              key={hour}
              className={cn('wca-tick', hour % 6 === 0 && 'wca-tick-strong')}
              style={{ left: `${axisPercent(hour)}%` }}
            />
          ))}
          {HOURS.filter((hour) => hour % 2 === 0).map((hour) => (
            <span
              key={`label-${hour}`}
              className="wca-ruler-label"
              style={{
                left: `${axisPercent(hour)}%`,
                transform:
                  hour === AXIS_START_HOUR
                    ? 'translateX(0)'
                    : hour === AXIS_START_HOUR + 24
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {String(hour % 24).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      <div className="wca-lanes" style={{ ['--wca-rows']: laneCount } as CSSProperties}>
        {rows.map((row) => (
          <BlockRow
            key={row.block.key}
            lane={row.lane}
            block={row.block}
            phase={phase}
            tourStep={tourStep}
            getTone={getTone}
            onSelectBlock={onSelectBlock}
          />
        ))}
      </div>
    </div>
  )
}
