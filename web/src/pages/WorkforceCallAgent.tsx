import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/shadcn/utils'
import { createRun, getRun, startOutboundCall } from '../lib/api'
import { DEFAULT_VOICE } from '@shared'
import type { RealtimeVoice } from '@shared'
import { formatShiftForCall } from './shift'
import { buildDemoPeople, roleForLiveCaller, withAvailableOutcome } from './mockPeople'
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
  CONNECT_HOLD_MS,
  PINNED_ANSWER_MS,
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
  /**
   * Het rooster, plus de vastgezette kop van het antwoordenpaneel: de bovenste
   * regel van Warehouse · Early zoals die op het scherm staat. `buildLanes`
   * sorteert echte bellers eerst en daarna op naam, dus dat is niet zomaar de
   * eerste persoon uit `buildDemoPeople`. Met live bellen aan is het de eerste
   * live beller; anders de mock die alfabetisch bovenaan staat. Die mock
   * antwoordt beschikbaar, zodat de demo altijd met een ja opent.
   */
  const { people, pinnedId } = useMemo(() => {
    const base = buildDemoPeople(liveCallers)
    const head = buildLanes(base)
      .find((lane) => lane.team === 'Warehouse')
      ?.shifts.find((shift) => shift.shiftKey === 'early')?.workers[0]

    if (!head) return { people: base, pinnedId: null }
    return {
      people: base.map((person) => (person.id === head.id ? withAvailableOutcome(person) : person)),
      pinnedId: head.id,
    }
  }, [liveCallers])
  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const lanes = useMemo<GanttLane[]>(() => buildLanes(people), [people])

  const [phase, setPhase] = useState<Phase>('idle')
  const [states, setStates] = useState<Record<string, CallState>>(() => makeReadyStates(people))
  /**
   * Beschikbaarheid die de planner zelf heeft ingevuld, buiten een gesprek om.
   * De agent slaat deze mensen over: wat je al weet hoef je niet te bellen.
   */
  const [manual, setManual] = useState<Record<string, 'YES' | 'NO'>>({})
  /** Ids waarvan een handmatige invoer een echte gespreksuitkomst overschrijft. */
  const manualOverrodeRef = useRef<Set<string>>(new Set())
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const [realCalls, setRealCalls] = useState<Record<string, RunCall>>({})
  const [runCount, setRunCount] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [overlayStep, setOverlayStep] = useState<number | null>(null)
  // Tijdens de rondleiding wacht het bellen op een klik in plaats van op een timer.
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
      const spread = Math.max(
        RUN_FIRST_MS,
        RUN_FIRST_MS + frac * (RUN_WINDOW_MS - RUN_FIRST_MS) + jitter,
      )
      const callDur = CALL_MIN_MS + rng() * (CALL_MAX_MS - CALL_MIN_MS)
      // De kop valt buiten de spreiding: meteen aan de lijn, antwoord op een
      // vast moment. Zonder live beller is dit degene die de demo draagt.
      const isPinned = person.id === pinnedId
      const resolveAt = isPinned ? PINNED_ANSWER_MS : spread
      const callingAt = isPinned ? 0 : Math.max(0, resolveAt - callDur)

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

  const beginCalls = (active: DemoPerson[]) => {
    const realActive = active.filter((person) => person.real)
    const mockActive = active.filter((person) => !person.real)
    if (ENABLE_LIVE_CALLS) {
      runRealIdsRef.current = realActive.map((person) => person.id)
      if (realActive.length > 0) void startRealCalls(realActive)
      scheduleMocks(mockActive)
    } else {
      runRealIdsRef.current = []
      scheduleMocks(active)
    }
  }

  const startRun = () => {
    if (phase === 'running') return
    // Wie de planner zelf al heeft ingevuld wordt niet gebeld, en houdt zijn
    // status door de run heen.
    const manualIds = Object.keys(manual)
    const active = activePeople.filter((person) => !manual[person.id])
    if (active.length === 0) return

    clearAll()
    runIdRef.current = null
    resolvedRealRef.current = new Set()
    runTotalRef.current = active.length
    setRunCount(active.length)
    setResolvedIds(manualIds)
    setRealCalls({})
    setRunError(null)
    setStates({
      ...makeReadyStates(people),
      ...Object.fromEntries(manualIds.map((id) => [id, 'completed' as CallState])),
    })
    setPhase('running')

    // Modal "connecting to HR" overlay, three sequential steps, then dial.
    // Hield eerder de laatste stap vast zodat de rondleiding hem kon toelichten;
    // die stap bestaat niet meer, en zonder iets dat hem weer losliet bleef de
    // overlay hangen.
    const stepMs = CONNECT_STEP_MS

    setOverlayStep(0)
    for (let step = 1; step < CONNECT_STEPS; step += 1) {
      timersRef.current.push(window.setTimeout(() => setOverlayStep(step), stepMs * step))
    }

    timersRef.current.push(
      window.setTimeout(() => {
        setOverlayStep(null)
        beginCalls(active)
      }, stepMs * CONNECT_STEPS + CONNECT_HOLD_MS),
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
    setManual({})
    manualOverrodeRef.current = new Set()
    setStates(makeReadyStates(people))
  }

  /** Nogmaals dezelfde knop wist de invoer; anders is een misklik onherstelbaar. */
  const setManualStatus = (id: string, value: 'YES' | 'NO') => {
    const clearing = manual[id] === value

    // De boekhouding staat bewust hier en niet in een state-updater: React roept
    // updaters meer dan eens aan, en dan wist de tweede aanroep wat de eerste
    // net had onthouden.
    const hadCall = manualOverrodeRef.current.has(id)
    if (clearing) manualOverrodeRef.current.delete(id)
    // Onthouden dat deze invoer een echte gespreksuitkomst overschrijft; wie
    // hem daarna weer vrijgeeft moet dat gesprek terugkrijgen in plaats van uit
    // de telling te vallen.
    else if (!manual[id] && resolvedIds.includes(id)) manualOverrodeRef.current.add(id)

    setManual((current) => {
      const next = { ...current }
      if (clearing) delete next[id]
      else next[id] = value
      return next
    })
    setStates((prev) => ({ ...prev, [id]: clearing && !hadCall ? 'ready' : 'completed' }))
    setResolvedIds((prev) =>
      clearing && hadCall
        ? prev
        : clearing
          ? prev.filter((x) => x !== id)
          : prev.includes(id)
            ? prev
            : [...prev, id],
    )
  }

  const toggleReal = (id: string) => {
    if (phase !== 'idle') return
    setRealToggles((current) => ({ ...current, [id]: !(current[id] ?? true) }))
  }

  /* ---------- guided tour ---------- */
  // De rondleiding belt net zo hard als een gewone ronde. Stond eerder op
  // mockOnly zolang de tour liep: Dennis en Michiel droegen dan wél het
  // 'Live call'-label, maar hun antwoord kwam uit de mock-data.
  const handleStart = () => startRun()

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

  /** Een afgerond gesprek, niet iets wat de planner zelf heeft ingevuld. */
  const hasCalledAnswer = resolvedIds.some((id) => !manual[id])
  /** De vastgezette kop is aan de lijn: er staat een kaart om naar te wijzen. */
  const pinnedCalling = pinnedId !== null && overlayStep === null && phase !== 'idle'
  const pinnedAnswered = pinnedId !== null && resolvedIds.includes(pinnedId)

  useEffect(() => {
    // Stap 4 zodra de kop aan de lijn is — niet pas bij zijn antwoord. De kaart
    // staat er dan al, leeg, en de Next-knop blijft dicht tot het antwoord
    // verwerkt is. Wachten tot na de HR-overlay, anders wijst de kaart naar iets
    // wat achter een schermvullende modal staat.
    if (tourStep > 0 && tourStep < 4 && pinnedCalling) setTourStep(4)
    if (tourStep === 4 && phase === 'complete') setTourStep(5)
    // Stap 3 en 4 horen bij een lopende run, stap 5 bij het resultaat. Een
    // reset zet de fase terug en die stappen tekenen dan niets, terwijl de
    // topbar "Tour active" bleef melden — zonder toetsenbord kwam je daar niet
    // meer uit. Ongeldige stap betekent nu: rondleiding afgelopen.
    if (tourStep === 4 && phase === 'idle') setTourStep(0)
    // Stap 5 mag ook tijdens een lopende run, sinds je vanaf stap 4 zelf mag
    // doorklikken. Alleen een reset beëindigt hem nog.
    if (tourStep === 5 && phase === 'idle') setTourStep(0)
    // Drawer dicht, maar het antwoordenpaneel blijft open: stap 4 wijst naar
    // de bovenste resultaatkaart, en die staat daarin.
    if (tourStep > 0 && phase === 'complete') setSelectedBlockKey(null)
    // Stap 5 wijst naar de balk en naar het plan eronder; het antwoordenpaneel
    // dekt daar een derde van af en heeft zijn werk gedaan bij stap 4.
    if (tourStep === 5) setAnswersOpen(false)
    // pinnedCalling en pinnedAnswered horen erbij: zonder die dependencies
    // draait dit effect niet op het moment dat de kaart verschijnt of het
    // antwoord binnenkomt.
  }, [tourStep, phase, hasCalledAnswer, pinnedCalling, pinnedAnswered])

  /* ---------- derived data ---------- */
  const resultFor = (person: DemoPerson): DemoResult => {
    const own = manual[person.id]
    if (own) {
      // Geen citaat en geen gestructureerde velden: er is geen gesprek geweest.
      return {
        id: person.id,
        name: person.name,
        real: false,
        classification: own,
        quote: null,
        structured: [],
        manual: true,
      }
    }
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
    const own = manual[person.id]
    if (own) return own
    const realCall = realCalls[person.id]
    if (person.real && realCall) return realCall.classification ?? 'NO_ANSWER'
    return person.outcome.classification
  }

  const getTone = (person: DemoPerson) =>
    toneFromState(states[person.id] ?? 'ready', classificationFor(person))

  /**
   * Het antwoordenpaneel toont meer dan alleen afgeronde gesprekken: wie aan de
   * lijn is staat er al, met een lege kaart. Volgorde:
   *
   *   1. de vastgezette kop, altijd bovenaan
   *   2. de overige live bellers, wie het eerst antwoordde het hoogst
   *   3. de rest, nieuwste antwoord bovenaan
   */
  const panelItems = useMemo<ResultItem[]>(() => {
    const rank = new Map(resolvedIds.map((id, index) => [id, index]))

    const build = (person: DemoPerson): ResultItem => {
      if (!rank.has(person.id)) return { person, result: null, transcript: [] }
      const result = resultFor(person)
      return {
        person,
        result,
        transcript: result.manual
          ? []
          : buildTranscript(person, result.quote, result.classification),
      }
    }

    // Pas als de HR-overlay weg is. Daarvoor staat er nog geen nummer tegenover
    // een naam, en een kaart die "Calling…" meldt zou liegen.
    const dialling = phase !== 'idle' && overlayStep === null
    const seen = new Set<string>()
    const take = (person: DemoPerson | undefined) => {
      if (!person || seen.has(person.id)) return null
      seen.add(person.id)
      return build(person)
    }

    const head = pinnedId && dialling ? take(byId.get(pinnedId)) : null

    // Live bellers op volgorde van binnenkomst; wie nog wacht sluit aan.
    const live = dialling
      ? people
          .filter((person) => person.real && !seen.has(person.id))
          .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
          .map(take)
          .filter((item): item is ResultItem => item !== null)
      : []

    const rest = [...resolvedIds]
      .reverse()
      .map((id) => byId.get(id))
      .filter((person): person is DemoPerson => Boolean(person) && !seen.has(person!.id))
      .map(take)
      .filter((item): item is ResultItem => item !== null)

    return [...(head ? [head] : []), ...live, ...rest]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedIds, realCalls, byId, manual, people, phase, pinnedId, overlayStep])

  const resolvedItems = useMemo<ResultItem[]>(() => {
    const items = resolvedIds
      .map((id) => byId.get(id))
      .filter((person): person is DemoPerson => Boolean(person))
      .map((person) => {
        const result = resultFor(person)
        return {
          person,
          result,
          // Geen gesprek, dus geen transcript om te tonen.
          transcript: result.manual
            ? []
            : buildTranscript(person, result.quote, result.classification),
        }
      })
    return items.sort((a, b) => Number(b.result.real) - Number(a.result.real))
    // `manual` hoort erbij: resultFor leest eruit. Zonder deze dependency
    // herrekende dit niets wanneer je ná een run iemand met de hand aanpaste —
    // die stond al in resolvedIds, dus er veranderde niets aan de deps en de
    // cijfers in de balk bleven staan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedIds, realCalls, byId, manual])

  const counts = useMemo(() => {
    // Alleen afgeronde gesprekken tellen mee; wie aan de lijn is heeft nog geen
    // uitkomst.
    const done = resolvedItems.flatMap((i) => (i.result ? [i.result] : []))
    return {
      available: done.filter((r) => r.classification === 'YES').length,
      unavailable: done.filter((r) => r.classification === 'NO').length,
      action: done.filter((r) => r.classification === 'OTHER').length,
      noAnswer: done.filter((r) => r.classification === 'NO_ANSWER').length,
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
  const stillToCall = Math.max(activePeople.length - resolvedIds.length, 0)
  const hasManual = Object.keys(manual).length > 0

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
          // Stond op startTour, ook tijdens een lopende rondleiding: dan
          // herstartte hij hem terwijl het label "stop" beloofde. Op een
          // touchscreen was dat de enige knop en dus de enige uitweg.
          onStartTour={tourStep > 0 ? skipTour : startTour}
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
              hasManual={hasManual}
            />

            {runError ? (
              <div className="mt-3 shrink-0 rounded-lg border border-[var(--danger-brand)] bg-[var(--danger-dim)] px-4 py-2.5 font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">
                Live call issue: {runError}
              </div>
            ) : null}

            <div className="mt-3 shrink-0" data-tour={isComplete ? 'result' : 'runstrip'}>
              <RunStrip
                state={isComplete ? 'complete' : isRunning ? 'running' : 'idle'}
                // Het rooster van morgen; dat verandert niet doordat er gebeld
                // wordt. Wat wél verandert is hoeveel daarvan al een status
                // hebben — gebeld of met de hand gezet.
                scheduled={activePeople.length}
                resolved={resolvedIds.length}
                counts={counts}
                statusFilter={statusFilter}
                onFilter={(key) => setStatusFilter(statusFilter === key ? 'all' : key)}
              />
            </div>

            <div className="wca-panel mt-3 mb-6 min-h-0 flex-1 overflow-y-auto p-4" data-tour="plan">
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
              items={panelItems}
              // Het hele rooster, niet alleen wie gebeld is: `resolvedIds` telt
              // ook de handmatige invoer mee, en dan las de teller "100 / 97".
              runCount={activePeople.length}
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
          manualValue={manual[selectedPerson.id] ?? null}
          // Niet terwijl deze persoon aan de lijn is: dan komt het antwoord uit
          // het gesprek en zou een knop daaroverheen schrijven.
          canSetManual={
            (states[selectedPerson.id] ?? 'ready') !== 'calling' &&
            (states[selectedPerson.id] ?? 'ready') !== 'answered'
          }
          onSetManual={(value) => setManualStatus(selectedPerson.id, value)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
      {tourStep > 0 ? (
        <PlanningTour
          step={tourStep}
          phase={phase}
          scheduled={activePeople.length}
          stillToCall={stillToCall}
          confirmed={counts.available}
          gaps={gaps}
          overlayOpen={overlayStep !== null}
          hasCalledAnswer={hasCalledAnswer}
          pinnedAnswered={pinnedAnswered}
          onNext={() => setTourStep((s) => s + 1)}
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
