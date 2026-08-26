import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/shadcn/utils'
import { createRun, getRun, startOutboundCall } from '../lib/api'
import { DEFAULT_VOICE } from '@shared'
import type { RealtimeVoice } from '@shared'
import { formatShiftForCall } from './shift'
import { buildDemoPeople, createAddedPerson } from './mockPeople'
import type { DemoPerson } from './mockPeople'
import { buildLanes } from './gantt'
import type { GanttLane } from './gantt'
import { buildTranscript } from './transcript'
import type { RunCall } from './types'
import type { StructuredField } from './demoScript'
import {
  ANSWER_FLASH_MS,
  CALL_MAX_MS,
  CALL_MIN_MS,
  CONNECT_STEPS,
  CONNECT_STEP_MS,
  RUN_FIRST_MS,
  RUN_WINDOW_MS,
  isFinalState,
  toneFromState,
} from './wca'
import type { CallState, ChipTone, DemoResult, Phase } from './wca'
import GanttPlan from './ui/GanttPlan'
import ResultsPanel from './ui/ResultsPanel'
import type { ResultItem } from './ui/ResultsPanel'
import ConnectingOverlay from './ui/ConnectingOverlay'
import WorkerDrawer from './ui/WorkerDrawer'
import LaneDrawer from './ui/LaneDrawer'
import DemoSettingsModal from './ui/DemoSettingsModal'
import PasswordGateModal from './ui/PasswordGateModal'
import AppTopBar from './ui/AppTopBar'
import PlanToolbar from './ui/PlanToolbar'
import PlanningTour from './ui/PlanningTour'
import type { StatusFilter } from './ui/PlanToolbar'
import RunStrip from './ui/RunStrip'
import './ico.css'
import './workforce.css'

/**
 * Toggle real telephony. While the flag is false, pressing "Start Call Run"
 * simulates every worker (including Dennis and Michiel) deterministically and
 * never dials the backend. Flip to true for the live demo: Dennis and Michiel
 * are placed through the real Call Tracker backend while the other 98 stay
 * simulated.
 * Testing editor
 */
const ENABLE_LIVE_CALLS = true

const POLL_MS = 3000
const VOICE: RealtimeVoice = DEFAULT_VOICE

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeReadyStates(people: DemoPerson[]): Record<string, CallState> {
  return Object.fromEntries(people.map((person) => [person.id, 'ready' as CallState]))
}

function realStructured(call: RunCall): StructuredField[] {
  const fields: StructuredField[] = []
  const availabilityValue =
    call.classification === 'YES'
      ? 'Available'
      : call.classification === 'NO'
        ? 'Unavailable'
        : call.classification === 'OTHER'
          ? 'Needs follow-up'
          : 'No response'
  fields.push({ label: 'Availability', value: availabilityValue })
  if (call.follow_up) fields.push({ label: 'Follow-up', value: 'Required' })
  return fields
}

export default function WorkforceCallAgent() {
  const [addedPeople, setAddedPeople] = useState<DemoPerson[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const people = useMemo(
    () => [...buildDemoPeople(), ...addedPeople].filter((p) => !removedIds.includes(p.id)),
    [addedPeople, removedIds],
  )
  const mocks = useMemo(() => people.filter((p) => !p.real), [people])
  const realPeople = useMemo(() => people.filter((p) => p.real), [people])
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const realDefaults = useMemo(
    () => Object.fromEntries(realPeople.map((p) => [p.id, false])),
    [realPeople],
  )
  const baseLanes = useMemo(() => buildLanes(mocks), [mocks])

  const [phase, setPhase] = useState<Phase>('idle')
  const [states, setStates] = useState<Record<string, CallState>>(() => makeReadyStates(people))
  const [realToggles, setRealToggles] = useState<Record<string, boolean>>(realDefaults)
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const [realCalls, setRealCalls] = useState<Record<string, RunCall>>({})
  const [runCount, setRunCount] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [overlayStep, setOverlayStep] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [settingsUnlocked, setSettingsUnlocked] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [tourCompleted, setTourCompleted] = useState(false)
  const [tourToast, setTourToast] = useState(false)
  const [answersOpen, setAnswersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const timersRef = useRef<number[]>([])
  const pollRef = useRef<number | null>(null)
  const runIdRef = useRef<string | null>(null)
  const pollInFlightRef = useRef(false)
  const resolvedRealRef = useRef<Set<string>>(new Set())
  const runRealIdsRef = useRef<string[]>([])
  const runTotalRef = useRef(0)

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const clearAll = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    stopPolling()
  }

  useEffect(() => () => clearAll(), [])

  const resolveOne = (id: string) => {
    setResolvedIds((previous) => {
      if (previous.includes(id)) return previous
      const next = [...previous, id]
      if (next.length >= runTotalRef.current) {
        const finishTimer = window.setTimeout(() => setPhase('complete'), ANSWER_FLASH_MS + 250)
        timersRef.current.push(finishTimer)
      }
      return next
    })
  }

  /* ---------- real (backend) calls ---------- */
  const pollRun = async () => {
    const runId = runIdRef.current
    if (!runId || pollInFlightRef.current) return
    pollInFlightRef.current = true
    try {
      const status = await getRun(runId)
      runRealIdsRef.current.forEach((id) => {
        const person = byId.get(id)
        if (!person) return
        const call = status.calls.find((entry) => entry.phone === person.phone)
        if (!call) return
        setRealCalls((current) => ({ ...current, [id]: call }))
        if (call.status === 'completed' && !resolvedRealRef.current.has(id)) {
          resolvedRealRef.current.add(id)
          setStates((current) => ({
            ...current,
            [id]:
              call.classification === 'NO_ANSWER'
                ? 'no_answer'
                : call.classification === 'OTHER'
                  ? 'action'
                  : 'completed',
          }))
          resolveOne(id)
        } else if (call.status !== 'completed') {
          setStates((current) => ({ ...current, [id]: 'calling' }))
        }
      })
      if (runRealIdsRef.current.every((id) => resolvedRealRef.current.has(id))) stopPolling()
      setRunError(null)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      pollInFlightRef.current = false
    }
  }

  const failReal = (ids: string[]) => {
    ids.forEach((id) => {
      if (resolvedRealRef.current.has(id)) return
      const person = byId.get(id)
      if (!person) return
      resolvedRealRef.current.add(id)
      setRealCalls((current) => ({
        ...current,
        [id]: {
          id: person.id,
          name: person.name,
          time_slot: formatShiftForCall(person),
          phone: person.phone,
          status: 'completed',
          classification: 'NO_ANSWER',
          follow_up: null,
          raw_response: null,
          answered_call: false,
        },
      }))
      setStates((current) => ({ ...current, [id]: 'no_answer' }))
      resolveOne(id)
    })
    if (runRealIdsRef.current.every((id) => resolvedRealRef.current.has(id))) stopPolling()
  }

  const startRealCalls = async (realPeople: DemoPerson[]) => {
    realPeople.forEach((person) => setStates((current) => ({ ...current, [person.id]: 'calling' })))
    try {
      const created = await createRun(realPeople.length)
      runIdRef.current = created.runId
      realPeople.forEach((person) => {
        void startOutboundCall(
          {
            id: person.id,
            name: person.name,
            time_slot: formatShiftForCall(person),
            phone: person.phone,
            voice: VOICE,
          },
          created.runId,
        ).catch((error: unknown) => {
          setRunError(error instanceof Error ? error.message : String(error))
          failReal([person.id])
        })
      })
      void pollRun()
      pollRef.current = window.setInterval(() => void pollRun(), POLL_MS)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
      failReal(realPeople.map((person) => person.id))
    }
  }

  /* ---------- simulated calls (parallel, staggered across the run window) ---------- */
  const scheduleMocks = (list: DemoPerson[]) => {
    const rng = mulberry32(0x5f3759df)
    const order = [...list]
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      const a = order[i]!
      const b = order[j]!
      order[i] = b
      order[j] = a
    }
    const n = order.length
    order.forEach((person, index) => {
      const frac = n > 1 ? index / (n - 1) : 0
      const jitter = (rng() - 0.5) * 1000
      const resolveAt = Math.max(
        RUN_FIRST_MS,
        RUN_FIRST_MS + frac * (RUN_WINDOW_MS - RUN_FIRST_MS) + jitter,
      )
      const callDur = CALL_MIN_MS + rng() * (CALL_MAX_MS - CALL_MIN_MS)
      const callingAt = Math.max(0, resolveAt - callDur)

      timersRef.current.push(
        window.setTimeout(
          () => setStates((current) => ({ ...current, [person.id]: 'calling' })),
          callingAt,
        ),
      )
      timersRef.current.push(
        window.setTimeout(() => {
          if (person.outcome.answered) {
            setStates((current) => ({ ...current, [person.id]: 'answered' }))
            const finalState: CallState =
              person.outcome.classification === 'OTHER' ? 'action' : 'completed'
            timersRef.current.push(
              window.setTimeout(
                () => setStates((current) => ({ ...current, [person.id]: finalState })),
                ANSWER_FLASH_MS,
              ),
            )
          } else {
            setStates((current) => ({ ...current, [person.id]: 'no_answer' }))
          }
          resolveOne(person.id)
        }, resolveAt),
      )
    })
  }

  const activePeople = useMemo(
    () => people.filter((person) => !person.real || (realToggles[person.id] ?? false)),
    [people, realToggles],
  )

  const lanes = useMemo<GanttLane[]>(() => {
    const enabledReal = realPeople.filter((p) => realToggles[p.id])
    if (enabledReal.length === 0 || baseLanes.length === 0) return baseLanes
    return baseLanes.map((lane, index) => {
      if (index !== 0) return lane
      const shifts =
        lane.shifts.length > 0
          ? lane.shifts.map((block, blockIndex) =>
              blockIndex === 0
                ? { ...block, workers: [...enabledReal, ...block.workers] }
                : block,
            )
          : lane.shifts
      return { ...lane, shifts, workers: [...enabledReal, ...lane.workers] }
    })
  }, [baseLanes, realPeople, realToggles])

  const liveEnabledCount = useMemo(
    () => realPeople.filter((p) => realToggles[p.id]).length,
    [realPeople, realToggles],
  )
  void liveEnabledCount

  const beginCalls = (active: DemoPerson[], mockOnly = false) => {
    const realActive = active.filter((person) => person.real)
    const mockActive = active.filter((person) => !person.real)
    if (ENABLE_LIVE_CALLS && !mockOnly) {
      runRealIdsRef.current = realActive.map((person) => person.id)
      if (realActive.length > 0) void startRealCalls(realActive)
      scheduleMocks(mockActive)
    } else {
      runRealIdsRef.current = []
      scheduleMocks(active)
    }
  }

  const startRun = (opts?: { mockOnly?: boolean }) => {
    if (phase === 'running') return
    const active = activePeople
    if (active.length === 0) return

    clearAll()
    runIdRef.current = null
    resolvedRealRef.current = new Set()
    runTotalRef.current = active.length
    setRunCount(active.length)
    setResolvedIds([])
    setRealCalls({})
    setRunError(null)
    setStates(makeReadyStates(people))
    setPhase('running')

    // Modal "connecting to HR" overlay, three sequential steps, then dial.
    setOverlayStep(0)
    for (let step = 1; step < CONNECT_STEPS; step += 1) {
      timersRef.current.push(
        window.setTimeout(() => setOverlayStep(step), CONNECT_STEP_MS * step),
      )
    }
    timersRef.current.push(
      window.setTimeout(() => {
        setOverlayStep(null)
        beginCalls(active, opts?.mockOnly ?? false)
      }, CONNECT_STEP_MS * CONNECT_STEPS),
    )
  }

  const resetDemo = () => {
    clearAll()
    runIdRef.current = null
    resolvedRealRef.current = new Set()
    runTotalRef.current = 0
    setRunCount(0)
    setPhase('idle')
    setResolvedIds([])
    setRealCalls({})
    setRunError(null)
    setOverlayStep(null)
    setSelectedId(null)
    setSelectedBlockKey(null)
    setAnswersOpen(false)
    setSearch('')
    setTeamFilter('all')
    setShiftFilter('all')
    setStatusFilter('all')
    setRealToggles(realDefaults)
    setStates(makeReadyStates(people))
  }

  const toggleReal = (id: string) => {
    if (phase !== 'idle') return
    setRealToggles((current) => ({ ...current, [id]: !(current[id] ?? true) }))
  }

  /* ---------- guided tour ---------- */
  const handleStart = () => startRun({ mockOnly: tourStep !== 0 })

  const startTour = () => {
    resetDemo()
    setTourStep(1)
  }

  const skipTour = () => setTourStep(0)

  const finishTour = () => {
    setTourStep(0)
    setTourCompleted(true)
    setTourToast(true)
    window.setTimeout(() => setTourToast(false), 5200)
  }

  useEffect(() => {
    if (tourStep === 5 && phase === 'running') setTourStep(6)
    if (tourStep > 0 && phase === 'complete') {
      setSelectedBlockKey(null)
      setAnswersOpen(false)
    }
  }, [tourStep, phase])

  const addPerson = (name: string, phone: string) => {
    if (phase !== 'idle') return
    const person = createAddedPerson(name.trim(), phone.trim())
    setAddedPeople((current) => [...current, person])
    setStates((current) => ({ ...current, [person.id]: 'ready' }))
    setRealToggles((current) => ({ ...current, [person.id]: false }))
  }

  const removePerson = (id: string) => {
    if (phase !== 'idle') return
    setRemovedIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  /* ---------- derived data ---------- */
  const resultFor = (person: DemoPerson): DemoResult => {
    const realCall = realCalls[person.id]
    if (person.real && realCall) {
      return {
        id: person.id,
        name: person.name,
        real: true,
        classification: realCall.classification ?? 'NO_ANSWER',
        quote: realCall.raw_response,
        structured: realStructured(realCall),
      }
    }
    return {
      id: person.id,
      name: person.name,
      real: person.real,
      classification: person.outcome.classification,
      quote: person.outcome.quote,
      structured: person.outcome.structured,
    }
  }

  const classificationFor = (person: DemoPerson) => {
    const realCall = realCalls[person.id]
    if (person.real && realCall) return realCall.classification ?? 'NO_ANSWER'
    return person.outcome.classification
  }

  const getTone = (person: DemoPerson) =>
    toneFromState(states[person.id] ?? 'ready', classificationFor(person))

  const resolvedItems = useMemo<ResultItem[]>(() => {
    const items = resolvedIds
      .map((id) => byId.get(id))
      .filter((person): person is DemoPerson => Boolean(person))
      .map((person) => {
        const result = resultFor(person)
        return {
          person,
          result,
          transcript: buildTranscript(person, result.quote, result.classification),
        }
      })
    return items.sort((a, b) => Number(b.result.real) - Number(a.result.real))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedIds, realCalls, byId])

  const counts = useMemo(() => {
    return {
      available: resolvedItems.filter((i) => i.result.classification === 'YES').length,
      unavailable: resolvedItems.filter((i) => i.result.classification === 'NO').length,
      action: resolvedItems.filter((i) => i.result.classification === 'OTHER').length,
      noAnswer: resolvedItems.filter((i) => i.result.classification === 'NO_ANSWER').length,
    }
  }, [resolvedItems])

  const isRunning = phase === 'running'
  const isComplete = phase === 'complete'

  useEffect(() => {
    if (phase === 'running') setAnswersOpen(true)
  }, [phase])

  const planDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(date)
  }, [])
  const rosterTotal = people.length

  const teams = useMemo(() => Array.from(new Set(lanes.map((lane) => lane.team))), [lanes])
  const callingCount = useMemo(
    () =>
      activePeople.filter((person) => {
        const state = states[person.id] ?? 'ready'
        return state === 'calling' || state === 'answered'
      }).length,
    [activePeople, states],
  )
  const gaps = counts.unavailable + counts.action + counts.noAnswer

  const viewLanes = useMemo<GanttLane[]>(() => {
    const query = search.trim().toLowerCase()
    return lanes
      .filter((lane) => teamFilter === 'all' || lane.team === teamFilter)
      .map((lane) => {
        const shifts = lane.shifts
          .filter((block) => shiftFilter === 'all' || block.shiftName === shiftFilter)
          .map((block) => {
            let workers = block.workers
            if (query) {
              workers = workers.filter((worker) =>
                worker.name.toLowerCase().includes(query),
              )
            }
            if (isComplete && statusFilter !== 'all') {
              workers = workers.filter((worker) => getTone(worker) === statusFilter)
            }
            return { ...block, workers }
          })
          .filter((block) => block.workers.length > 0)
        return { ...lane, shifts }
      })
      .filter((lane) => lane.shifts.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, teamFilter, shiftFilter, statusFilter, search, isComplete, states, realCalls])

  const selectedPerson = selectedId ? byId.get(selectedId) : undefined
  const selectedResolved = selectedPerson ? isFinalState(states[selectedPerson.id] ?? 'ready') : false
  const selectedBlock = useMemo(() => {
    if (!selectedBlockKey) return undefined
    for (const lane of lanes) {
      const block = lane.shifts.find((shift) => shift.key === selectedBlockKey)
      if (block) return { team: lane.team, block }
    }
    return undefined
  }, [selectedBlockKey, lanes])

  const statusFilters: { key: ChipTone; label: string; value: number; color: string }[] = [
    { key: 'yes', label: 'Available', value: counts.available, color: 'var(--success-brand)' },
    { key: 'no', label: 'Unavailable', value: counts.unavailable, color: 'var(--danger-brand)' },
    { key: 'other', label: 'Action needed', value: counts.action, color: 'var(--warn-brand)' },
    { key: 'noanswer', label: 'No answer', value: counts.noAnswer, color: 'var(--neutral-brand)' },
  ]

  return (
    <div className="ico-app wca-root">
      <div className="flex h-full flex-col">
        <AppTopBar
          phase={phase}
          tourRunning={tourStep > 0}
          tourCompleted={tourCompleted}
          onStartTour={startTour}
          onReset={resetDemo}
          onSettings={() => (settingsUnlocked ? setSettingsOpen(true) : setPasswordOpen(true))}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col px-8 xl:px-12',
              answersOpen && phase !== 'idle' && 'pr-[440px]',
            )}
          >
            <PlanToolbar
              phase={phase}
              planDate={planDate}
              tourStep={tourStep}
              search={search}
              onSearch={setSearch}
              teams={teams}
              teamFilter={teamFilter}
              onTeamFilter={setTeamFilter}
              shiftFilter={shiftFilter}
              onShiftFilter={setShiftFilter}
              callingCount={callingCount}
              resolvedCount={resolvedIds.length}
              answersOpen={answersOpen}
              onToggleAnswers={() => setAnswersOpen((prev) => !prev)}
              gaps={gaps}
              onStart={handleStart}
              onReplan={resetDemo}
            />

            {runError ? (
              <div className="mt-3 shrink-0 rounded-lg border border-[var(--danger-brand)] bg-[var(--danger-dim)] px-4 py-2.5 font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">
                Live call issue: {runError}
              </div>
            ) : null}

            {isRunning ? (
              <div className="mt-3 shrink-0">
                <RunStrip processed={resolvedIds.length} runCount={runCount} counts={counts} />
              </div>
            ) : null}

            {isComplete ? (
              <div className="wca-summary-strip mt-3 shrink-0" data-tour="result">
                <span className="ico-heading text-[15px] font-bold text-[var(--text-white)]">
                  Call run completed
                </span>
                <span className="wca-summary-item text-[var(--text-body)]">
                  {runCount} workers contacted
                </span>
                {statusFilters.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === pill.key ? 'all' : pill.key)}
                    className={cn('wca-statpill', statusFilter === pill.key && 'wca-statpill-on')}
                    style={{
                      borderColor: `color-mix(in srgb, ${pill.color} 30%, transparent)`,
                      background: `color-mix(in srgb, ${pill.color} 7%, transparent)`,
                    }}
                  >
                    <span className="wca-statpill-dot" style={{ background: pill.color }} />
                    {pill.label}
                    <span className="wca-badge">{pill.value}</span>
                  </button>
                ))}
                <span className="ml-auto max-w-[320px] text-right font-['IBM_Plex_Sans'] text-[12px] italic text-[var(--text-muted)]">
                  A manual calling process has been transformed into structured workforce information.
                </span>
              </div>
            ) : null}

            <div className="wca-panel mt-3 mb-6 min-h-0 flex-1 overflow-hidden p-4">
              <GanttPlan
                lanes={viewLanes}
                getTone={getTone}
                phase={phase}
                answersOpen={answersOpen}
                tourStep={tourStep}
                totalRows={lanes.reduce((n, lane) => n + lane.shifts.length, 0)}
                onSelectBlock={(_lane, block) => setSelectedBlockKey(block.key)}
              />
            </div>
          </div>

          {answersOpen && phase !== 'idle' ? (
            <ResultsPanel
              items={resolvedItems}
              runCount={runCount}
              processed={resolvedIds.length}
              isComplete={isComplete}
              onSelectWorker={(person) => setSelectedId(person.id)}
              onClose={() => setAnswersOpen(false)}
            />
          ) : null}
        </div>
      </div>

      {overlayStep !== null ? <ConnectingOverlay step={overlayStep} total={rosterTotal} /> : null}

      {passwordOpen ? (
        <PasswordGateModal
          expected="admin"
          onUnlock={() => {
            setSettingsUnlocked(true)
            setPasswordOpen(false)
            setSettingsOpen(true)
          }}
          onClose={() => setPasswordOpen(false)}
        />
      ) : null}

      {settingsOpen ? (
        <DemoSettingsModal
          realPeople={realPeople}
          toggles={realToggles}
          disabled={phase !== 'idle'}
          onToggle={toggleReal}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {selectedBlock ? (
        <LaneDrawer
          team={selectedBlock.team}
          shiftName={selectedBlock.block.shiftName}
          shiftTime={selectedBlock.block.shiftTime}
          workers={selectedBlock.block.workers}
          getTone={getTone}
          lockClose={tourStep === 4}
          onSelectWorker={(person) => setSelectedId(person.id)}
          onClose={() => setSelectedBlockKey(null)}
        />
      ) : null}

      {selectedPerson ? (
        <WorkerDrawer
          person={selectedPerson}
          tone={getTone(selectedPerson)}
          resolved={selectedResolved}
          phoneKnown={phase !== 'idle'}
          result={selectedResolved ? resultFor(selectedPerson) : null}
          transcript={
            selectedResolved
              ? buildTranscript(
                  selectedPerson,
                  resultFor(selectedPerson).quote,
                  resultFor(selectedPerson).classification,
                )
              : []
          }
          onClose={() => setSelectedId(null)}
        />
      ) : null}
      {tourStep > 0 ? (
        <PlanningTour
          step={tourStep}
          phase={phase}
          plannedCount={activePeople.length}
          laneCount={teams.length}
          runCount={runCount}
          gaps={gaps}
          onNext={() => setTourStep((s) => s + 1)}
          onOpenShift={() => {
            setSelectedBlockKey('Warehouse::early')
            setTourStep(4)
          }}
          onCloseDrawer={() => {
            setSelectedBlockKey(null)
            setTourStep(5)
          }}
          onFinish={finishTour}
          onSkip={skipTour}
        />
      ) : null}

      {tourToast ? (
        <div className="wca-tour-toast">
          <span className="wca-tour-toast-dot" />
          Tour completed · the call agent called {runCount} workers
        </div>
      ) : null}
    </div>
  )
}
