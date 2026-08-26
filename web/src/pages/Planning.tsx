import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Flag, PhoneOutgoing } from 'lucide-react'
import { Progress } from '../lib/shadcn/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../lib/shadcn/select'
import { Switch } from '../lib/shadcn/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../lib/shadcn/table'
import { createRun, getRun, startOutboundCall } from '../lib/api'
import { cn } from '../lib/shadcn/utils'
import { useTomorrowKey } from '../hooks/useTomorrowKey'
import BrandButton from './ui/BrandButton'
import StatusBadge from './ui/StatusBadge'
import type { CallClassification, LastRunSummary, RunCall, RunStatus, Worker } from './types'
import { DEFAULT_VOICE, REALTIME_VOICES } from '@shared'
import type { RealtimeVoice } from '@shared'
import { formatShiftDate, formatShiftForCall, formatShiftTimeRange } from './shift'
import { loadWorkers } from './workers'

type RunPhase = 'idle' | 'calling' | 'complete'

const voiceOptions: readonly RealtimeVoice[] = REALTIME_VOICES
const classificationOrder: CallClassification[] = ['YES', 'NO', 'OTHER', 'NO_ANSWER']

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="ico-card">
      <div className="ico-heading text-[28px] font-bold leading-none text-[var(--text-white)]">{value}</div>
      <div className="mt-3 font-['IBM_Plex_Sans'] text-[11px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="ico-heading text-[14px] font-semibold text-[var(--text-white)]">{children}</h2>
}

function makePendingCall(worker: Worker): RunCall {
  return {
    id: worker.id,
    name: worker.name,
    time_slot: formatShiftForCall(worker),
    phone: worker.phone,
    status: 'pending',
    classification: null,
    follow_up: null,
    raw_response: null,
    answered_call: null,
  }
}

function mergeDisplayCalls(snapshot: Worker[], runStatus: RunStatus | null): RunCall[] {
  if (!runStatus) return snapshot.map(makePendingCall)

  const unmatchedCalls = [...runStatus.calls]
  const merged = snapshot.map((worker) => {
    const matchIndex = unmatchedCalls.findIndex((call) => call.phone === worker.phone)
    const match = matchIndex >= 0 ? unmatchedCalls[matchIndex] : undefined
    if (match && matchIndex >= 0) {
      unmatchedCalls.splice(matchIndex, 1)
      return match
    }
    return makePendingCall(worker)
  })

  return [...merged, ...unmatchedCalls]
}

function countClassifications(calls: RunCall[]): Record<CallClassification, number> {
  return calls.reduce<Record<CallClassification, number>>(
    (accumulator, call) => {
      if (call.classification) {
        accumulator[call.classification] += 1
      }
      return accumulator
    },
    { YES: 0, NO: 0, OTHER: 0, NO_ANSWER: 0 },
  )
}

function EmptyRunState() {
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
      <PhoneOutgoing className="h-10 w-10 text-[var(--border-brand)]" />
      <div className="ico-heading mt-5 text-[16px] font-semibold text-[var(--text-white)]">No active run</div>
      <p className="mt-2 max-w-[250px] font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
        Select workers on the left and start a calling run.
      </p>
    </div>
  )
}

function CallingRunState({
  calls,
  completedCount,
  total,
  voice,
}: {
  calls: RunCall[]
  completedCount: number
  total: number
  voice: RealtimeVoice | null
}) {
  const progressValue = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionTitle>Live run</SectionTitle>
          {voice ? <p className="mt-1 font-['IBM_Plex_Sans'] text-[12px] text-[#A6A6A6]">Voice: {voice}</p> : null}
        </div>
        <span className="ico-live-dot" aria-label="Run active" />
      </div>
      <div className="mt-5 font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
        {completedCount} / {total} calls completed
      </div>
      <Progress value={progressValue} className="mt-3 h-[6px] bg-[var(--bg-input)] [&>div]:bg-[var(--accent-brand)]" />
      <div className="mt-6 space-y-3">
        {calls.map((call) => (
          <div key={`${call.id}-${call.phone}`} className="flex items-center justify-between gap-4 rounded-lg py-1">
            <div className="ico-heading truncate text-[13px] font-semibold text-[var(--text-white)]">{call.name}</div>
            {call.status === 'completed' ? <StatusBadge classification={call.classification} /> : <StatusBadge calling />}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompleteRunState({
  calls,
  voice,
  onStartNewRun,
}: {
  calls: RunCall[]
  voice: RealtimeVoice | null
  onStartNewRun: () => void
}) {
  const counts = countClassifications(calls)

  return (
    <div>
      <div>
        <div className="flex items-center gap-2">
          <SectionTitle>Run complete</SectionTitle>
          <CheckCircle2 className="h-5 w-5 text-[var(--success-brand)]" />
        </div>
        {voice ? <p className="mt-1 font-['IBM_Plex_Sans'] text-[12px] text-[#A6A6A6]">Voice: {voice}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {classificationOrder.map((classification) => (
          <span key={classification} className="inline-flex items-center gap-2 rounded-full border border-[rgba(89,89,89,0.45)] px-3 py-1">
            <StatusBadge classification={classification} />
            <span className="ico-heading text-[13px] font-semibold text-[var(--text-white)]">{counts[classification]}</span>
          </span>
        ))}
      </div>
      <div className="my-5 h-px bg-[var(--border-brand)]" />
      <div className="space-y-4">
        {calls.map((call) => (
          <div key={`${call.id}-${call.phone}`} className="rounded-lg border border-transparent py-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="ico-heading truncate text-[13px] font-semibold text-[var(--text-white)]">{call.name}</div>
                  {call.follow_up === true ? <Flag className="h-4 w-4 shrink-0 text-[var(--accent-brand)]" /> : null}
                </div>
                {call.raw_response ? (
                  <p className="ico-truncate-two mt-1 font-['IBM_Plex_Sans'] text-[13px] italic leading-5 text-[var(--text-muted)]">
                    {call.raw_response}
                  </p>
                ) : (
                  <p className="mt-1 font-['IBM_Plex_Sans'] text-[13px] italic text-[var(--border-brand)]">
                    No response captured.
                  </p>
                )}
              </div>
              <StatusBadge classification={call.classification} />
            </div>
          </div>
        ))}
      </div>
      <BrandButton brandVariant="secondary" className="mt-7" onClick={onStartNewRun}>
        Start new run
      </BrandButton>
    </div>
  )
}

export default function Planning() {
  const [workers, setWorkers] = useState<Worker[]>(() => loadWorkers())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(loadWorkers().map((worker) => worker.id)))
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [runSnapshot, setRunSnapshot] = useState<Worker[]>([])
  const [lastRunSummary, setLastRunSummary] = useState<LastRunSummary | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<RealtimeVoice>(DEFAULT_VOICE)
  const [runVoice, setRunVoice] = useState<RealtimeVoice | null>(null)
  const tomorrowKey = useTomorrowKey()
  const pollInFlightRef = useRef(false)

  const [creatingRun, setCreatingRun] = useState(false)

  useEffect(() => {
    const latestWorkers = loadWorkers()
    setWorkers(latestWorkers)
    setSelectedIds(new Set(latestWorkers.map((worker) => worker.id)))
  }, [tomorrowKey])

  const selectedWorkers = useMemo(
    () => workers.filter((worker) => selectedIds.has(worker.id)),
    [selectedIds, workers],
  )

  const displayCalls = useMemo(() => mergeDisplayCalls(runSnapshot, runStatus), [runSnapshot, runStatus])
  const completedCount = displayCalls.filter((call) => call.status === 'completed').length

  const toggleWorker = (workerId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(workerId)
      else next.delete(workerId)
      return next
    })
  }

  const updateFinalStats = useCallback((status: RunStatus) => {
    const counts = countClassifications(status.calls)
    setLastRunSummary({ confirmed: counts.YES, noAnswer: counts.NO_ANSWER })
  }, [])

  const pollRun = useCallback(async () => {
    if (!activeRunId || pollInFlightRef.current) return
    pollInFlightRef.current = true
    try {
      const status = await getRun(activeRunId)
      setRunStatus(status)
      setRunError(null)
      if (status.complete) {
        updateFinalStats(status)
        setPhase('complete')
        setActiveRunId(null)
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      pollInFlightRef.current = false
    }
  }, [activeRunId, updateFinalStats])

  useEffect(() => {
    if (phase !== 'calling' || !activeRunId) return undefined

    void pollRun()
    const intervalId = window.setInterval(() => {
      void pollRun()
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [activeRunId, phase, pollRun])

  const handleStartRun = async () => {
    if (selectedWorkers.length === 0 || creatingRun) return

    setRunError(null)
    const snapshot = selectedWorkers
    const voiceForRun = selectedVoice
    setCreatingRun(true)
    try {
      const created = await createRun(snapshot.length)
      setRunVoice(voiceForRun)
      setRunSnapshot(snapshot)
      setRunStatus({
        id: created.runId,
        total: snapshot.length,
        status: 'in_progress',
        complete: false,
        calls: snapshot.map(makePendingCall),
      })
      setActiveRunId(created.runId)
      setPhase('calling')

      void Promise.all(
        snapshot.map((worker) =>
          startOutboundCall(
            {
              id: worker.id,
              name: worker.name,
              time_slot: formatShiftForCall(worker),
              phone: worker.phone,
              voice: voiceForRun,
            },
            created.runId,
          ),
        ),
      ).catch((error: unknown) => {
        setRunError(error instanceof Error ? error.message : String(error))
      })
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      setCreatingRun(false)
    }
  }

  const handleStartNewRun = () => {
    setPhase('idle')
    setActiveRunId(null)
    setRunStatus(null)
    setRunSnapshot([])
    setRunError(null)
    setRunVoice(null)
  }

  return (
    <div className="px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="ico-heading text-[22px] font-bold leading-tight text-[var(--text-white)]">Planning</h1>
          <p className="mt-1 font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-muted)]">
            AI outbound availability checking
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="voice-select" className="font-['IBM_Plex_Sans'] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#595959]">
              VOICE
            </label>
            <Select
              value={selectedVoice}
              onValueChange={(value) => setSelectedVoice(value as RealtimeVoice)}
              disabled={phase === 'calling'}
            >
              <SelectTrigger id="voice-select" className="min-w-[150px] rounded-[8px] border border-[#595959] bg-[#0D0D0D] px-[14px] py-[10px] font-['IBM_Plex_Sans'] text-[14px] text-[#BFBFBF] shadow-none transition-colors hover:border-[#A6A6A6] focus:border-[#EDAE49] focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#595959] bg-[#0D0D0D] font-['IBM_Plex_Sans'] text-[14px] text-[#BFBFBF]">
                {voiceOptions.map((voice) => (
                  <SelectItem key={voice} value={voice} className="focus:bg-[rgba(237,174,73,0.14)] focus:text-[#EDAE49]">
                    {voice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <BrandButton disabled={selectedWorkers.length === 0 || creatingRun || phase === 'calling'} onClick={handleStartRun}>
            {creatingRun ? 'Starting run...' : `Start calling run (${selectedWorkers.length})`}
          </BrandButton>
        </div>
      </header>

      <section className="mt-7 grid grid-cols-4 gap-5">
        <StatCard label="Workers" value={workers.length} />
        <StatCard label="Selected" value={selectedWorkers.length} />
        <StatCard label="Confirmed" value={lastRunSummary ? lastRunSummary.confirmed : '—'} />
        <StatCard label="No answer" value={lastRunSummary ? lastRunSummary.noAnswer : '—'} />
      </section>

      {runError ? (
        <div className="mt-5 rounded-lg border border-[var(--danger-brand)] bg-[var(--danger-dim)] px-4 py-3 font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">
          {runError}
        </div>
      ) : null}

      <section className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] gap-5">
        <div className="ico-card overflow-hidden p-0">
          <div className="px-6 py-5">
            <SectionTitle>Workers for this run</SectionTitle>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(89,89,89,0.35)] hover:bg-transparent">
                <TableHead className="ico-table-head h-auto px-6 pb-3 pt-0">Name</TableHead>
                <TableHead className="ico-table-head h-auto px-4 pb-3 pt-0">Planned shift</TableHead>
                <TableHead className="ico-table-head h-auto px-4 pb-3 pt-0">Phone</TableHead>
                <TableHead className="ico-table-head h-auto px-6 pb-3 pt-0 text-right">Call?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => {
                const selected = selectedIds.has(worker.id)
                return (
                  <TableRow key={worker.id} className={cn('ico-worker-row border-0', !selected && 'ico-row-muted')}>
                    <TableCell className="px-6 py-4">
                      <div className="ico-heading text-[14px] font-semibold text-[var(--text-white)]">{worker.name}</div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-['IBM_Plex_Sans'] text-[13px] font-medium text-[var(--text-white)]">
                          {formatShiftDate(worker)}
                        </span>
                        <span className="ico-shift-chip">{formatShiftTimeRange(worker)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-body)]">
                      {worker.phone}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Switch
                        className="ico-switch"
                        checked={selected}
                        aria-label={`Call ${worker.name}`}
                        onCheckedChange={(checked) => toggleWorker(worker.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <aside className="ico-card min-h-[520px]">
          {phase === 'idle' ? <EmptyRunState /> : null}
          {phase === 'calling' ? (
            <CallingRunState
              calls={displayCalls}
              completedCount={completedCount}
              total={runStatus?.total ?? runSnapshot.length}
              voice={runVoice}
            />
          ) : null}
          {phase === 'complete' ? <CompleteRunState calls={displayCalls} voice={runVoice} onStartNewRun={handleStartNewRun} /> : null}
        </aside>
      </section>
    </div>
  )
}
