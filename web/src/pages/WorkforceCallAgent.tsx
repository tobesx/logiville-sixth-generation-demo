import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/shadcn/utils'
import { createRun, getRun, startOutboundCall } from '../lib/api'
import { DEFAULT_VOICE } from '@shared'
import type { RealtimeVoice } from '@shared'
import { formatShiftForCall } from './shift'
import { buildDemoPeople, roleForLiveCaller } from './mockPeople'
import { DEFAULT_WORKERS } from './workers'
import { listPeople } from '../lib/api'
import type { Worker } from '@shared'
import type { DemoPerson } from './mockPeople'
import type { DemoOutcome } from './demoScript'
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
  TOUR_CONNECT_STEP_MS,
  RUN_FIRST_MS,
  RUN_WINDOW_MS,
  isFinalState,
  toneFromState,
} from './wca'
import type { CallState, DemoResult, Phase } from './wca'
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

/** Kandidaten hebben geen gescripte uitkomst: hun antwoord komt echt binnen. */
const PLACEHOLDER_OUTCOME: DemoOutcome = {
  answered: true,
  classification: 'YES',
  quote: null,
  structured: [],
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
  // Het rooster komt uit de `people`-tabel; tot het binnen is draait de demo
  // op DEFAULT_WORKERS, zodat de pagina niet leeg staat te wachten.
  const [roster, setRoster] = useState<Worker[]>(DEFAULT_WORKERS)

  useEffect(() => {
    listPeople()
      .then((rows) => rows.length > 0 && setRoster(rows))
      .catch((err) => console.error('[people] ophalen mislukt:', err))
  }, [])
  // Kandidaten uit de `people`-tabel. Ze staan in de settings-modal met een
  // schakelaar; pas als die aan staat vervangen ze een plek in het rooster.
  const candidates = useMemo<DemoPerson[]>(
    () =>
      roster.map((worker, index) => ({
        ...worker,
        role: roleForLiveCaller(index),
        real: true,
        defaultEnabled: false,
        outcome: PLACEHOLDER_OUTCOME,
      })),
    [roster],
  )
  const realDefaults = useMemo(
    () => Object.fromEntries(candidates.map((p) => [p.id, false])),
    [candidates],
  )
  const [realToggles, setRealToggles] = useState<Record<string, boolean>>(realDefaults)

  // Aangevinkte kandidaten vervangen plekken in Warehouse · Early, dus het
  // rooster telt altijd MOCK_COUNT en de lanes hoeven niets bij te plakken.
  const liveCallers = useMemo(
    () => candidates.filter((p) => realToggles[p.id]),
    [candidates, realToggles],
  )
  const people = useMemo(() => buildDemoPeople(liveCallers), [liveCallers])
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const lanes = useMemo<GanttLane[]>(() => buildLanes(people), [people])

  const [phase, setPhase] = useState<Phase>('idle')
  const [states, setStates] = useState<Record<string, CallState>>(() => makeReadyStates(people))
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const [realCalls, setRealCalls] = useState<Record<string, RunCall>>({})
  const [runCount, setRunCount] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [overlayStep, setOverlayStep] = useState<number | null>(null)
  // Tijdens de rondleiding wacht het bellen op een klik in plaats van op een timer.
  const pendingCallsRef = useRef<(() => void) | null>(null)
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

  // Alles in het rooster wordt gebeld; wie niet aangevinkt is, staat er niet in.
  const activePeople = people

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
    // Tijdens de rondleiding trager, en de laatste stap blijft staan: de
    // gids leest hem voor en klikt zelf door naar het bellen.
    const guided = tourStep > 0
    const stepMs = guided ? TOUR_CONNECT_STEP_MS : CONNECT_STEP_MS
    const mockOnly = opts?.mockOnly ?? false

    setOverlayStep(0)
    for (let step = 1; step < CONNECT_STEPS; step += 1) {
      timersRef.current.push(window.setTimeout(() => setOverlayStep(step), stepMs * step))
    }

    if (guided) {
      // Alle drie de regels afvinken en blijven staan; het bellen wacht op
      // een klik in de rondleiding.
      timersRef.current.push(
        window.setTimeout(() => setOverlayStep(CONNECT_STEPS), stepMs * CONNECT_STEPS),
      )
      pendingCallsRef.current = () => beginCalls(active, mockOnly)
      return
    }

    timersRef.current.push(
      window.setTimeout(() => {
        setOverlayStep(null)
        beginCalls(active, mockOnly)
      }, stepMs * CONNECT_STEPS),
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
    // Ook vanaf stap 1: wie meteen op de knop drukt hoort niet te blijven
    // lezen dat er nog niemand gebeld is.
    if (tourStep > 0 && tourStep < 3 && phase === 'running') setTourStep(3)
    if (tourStep === 4 && phase === 'complete') setTourStep(5)
    // Drawer dicht, maar het antwoordenpaneel blijft open: stap 4 wijst naar
    // de bovenste resultaatkaart, en die staat daarin.
    if (tourStep > 0 && phase === 'complete') setSelectedBlockKey(null)
  }, [tourStep, phase])

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

  return (
    <div className="ico-app wca-root">
      <div className="flex h-full flex-col">
        <AppTopBar
          tourRunning={tourStep > 0}
          tourCompleted={tourCompleted}
          onStartTour={startTour}
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
              onStart={handleStart}
              onReset={resetDemo}
            />

            {runError ? (
              <div className="mt-3 shrink-0 rounded-lg border border-[var(--danger-brand)] bg-[var(--danger-dim)] px-4 py-2.5 font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">
                Live call issue: {runError}
              </div>
            ) : null}

            <div className="mt-3 shrink-0" data-tour={isComplete ? 'result' : 'runstrip'}>
              <RunStrip
                state={isComplete ? 'complete' : isRunning ? 'running' : 'idle'}
                processed={resolvedIds.length}
                // Voor de run: precies de mensen die straks gebeld worden, dus
                // zonder de echte nummers waarvan de live-toggle uit staat.
                runCount={isRunning || isComplete ? runCount : activePeople.length}
                counts={counts}
                statusFilter={statusFilter}
                onFilter={(key) => setStatusFilter(statusFilter === key ? 'all' : key)}
              />
            </div>

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

      {overlayStep !== null ? (
        <ConnectingOverlay step={overlayStep} total={rosterTotal} dataTour="hr" />
      ) : null}

      {passwordOpen ? (
        <PasswordGateModal
          expected="6666"
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
          realPeople={candidates}
          toggles={realToggles}
          disabled={phase !== 'idle'}
          onToggle={toggleReal}
          onClose={() => {
            setSettingsOpen(false)
            setSettingsUnlocked(false)
          }}
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
          queuedCount={activePeople.length}
          runCount={runCount}
          gaps={gaps}
          onNext={() => setTourStep((s) => s + 1)}
          canStartCalls={overlayStep !== null && overlayStep >= CONNECT_STEPS}
          onStartCalls={() => {
            setOverlayStep(null)
            pendingCallsRef.current?.()
            pendingCallsRef.current = null
            setTourStep(4)
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
