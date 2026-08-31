import type { Worker } from './types'
import type { DemoOutcome } from './demoScript'
import { nextShiftDateTime } from './shift'

export type DemoPerson = Worker & {
  role: string
  /** When true, this person is placed through the real Call Tracker backend. */
  real: boolean
  /** Whether this person is selected for the call run by default. */
  defaultEnabled: boolean
  /** Scripted outcome used only for simulated (mock) people. */
  outcome: DemoOutcome
}

/* Deterministic PRNG so the roster and outcomes are identical every run. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T
}

const FIRST_NAMES = [
  'Jan', 'Pieter', 'Lars', 'Kevin', 'Sander', 'Bram', 'Wout', 'Nils', 'Ruben', 'Thomas',
  'Elias', 'Matthias', 'Jonas', 'Robbe', 'Seppe', 'Milan', 'Arne', 'Vince', 'Kobe', 'Senne',
  'Sofie', 'Elke', 'Lien', 'Marie', 'Fien', 'Hanne', 'Julie', 'Lotte', 'Emma', 'Nele',
  'Kaat', 'Britt', 'Silke', 'Aline', 'Femke', 'Ilse', 'Karen', 'Nadia', 'Sara', 'Anke',
]

const LAST_NAMES = [
  'Peeters', 'Janssens', 'Maes', 'Jacobs', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Aerts',
  'Mertens', 'Hermans', 'Van Damme', 'Dubois', 'Lambert', 'Michiels', 'De Clercq', 'Segers', 'Verhoeven', 'Coppens',
  'Van den Broeck', 'De Wilde', 'Vermeulen', 'Simons', 'Cools', 'Verlinden', 'Van Hoof', 'Timmermans', 'Lemmens', 'Pauwels',
]

type TeamKey = 'Warehouse' | 'Dock' | 'Production' | 'Inventory' | 'Planning'
type ShiftKey = 'early' | 'late' | 'night'

/** Roles that belong to each operational team. */
const TEAM_ROLES: Record<TeamKey, string[]> = {
  Warehouse: ['Forklift Operator', 'Warehouse Operator', 'Order Picker', 'Reach Truck Driver'],
  Dock: ['Dock Worker'],
  Production: ['Machine Operator', 'Line Operator'],
  Inventory: ['Quality Inspector', 'Inventory Clerk'],
  Planning: ['Logistics Planner', 'Shift Coordinator', 'Team Lead'],
}

type ShiftPattern = { key: ShiftKey; label: string; start: number; end: number; overnight: boolean }
const SHIFTS: Record<ShiftKey, ShiftPattern> = {
  early: { key: 'early', label: 'Early · 06:00–14:00', start: 6, end: 14, overnight: false },
  late: { key: 'late', label: 'Late · 14:00–22:00', start: 14, end: 22, overnight: false },
  night: { key: 'night', label: 'Night · 22:00–06:00', start: 22, end: 6, overnight: true },
}

/**
 * Logical, deliberately incomplete shift plan — this is what creates the gaps
 * on the Gantt. Kept to a small number of larger blocks so each shift is easy
 * to read. The distribution reflects how a real logistics/manufacturing site
 * staffs its day:
 *  - Warehouse: busy on Early + Late for picking and shipping; no night crew.
 *  - Dock: Early inbound truck wave; quiet the rest of the day.
 *  - Production: one large Late run.
 *  - Inventory: counts and quality checks run at Night when the floor is quiet.
 *  - Planning: an office function that only works during the day (Early).
 */
const PLAN: { team: TeamKey; shift: ShiftKey; count: number; fill: 'full' | 'mixed' }[] = [
  { team: 'Warehouse', shift: 'early', count: 22, fill: 'mixed' },
  { team: 'Warehouse', shift: 'late', count: 18, fill: 'full' },
  { team: 'Dock', shift: 'early', count: 14, fill: 'full' },
  { team: 'Production', shift: 'late', count: 20, fill: 'mixed' },
  { team: 'Inventory', shift: 'night', count: 16, fill: 'full' },
  { team: 'Planning', shift: 'early', count: 10, fill: 'full' },
]

export const MOCK_COUNT = PLAN.reduce((sum, entry) => sum + entry.count, 0)

/**
 * Live bellers staan altijd in Warehouse · Early, dus krijgen ze een rol uit
 * dat team. Op positie in het rooster, zodat dezelfde persoon altijd dezelfde
 * rol houdt — ook nadat er iemand voor hem is bijgekomen.
 */
export function roleForLiveCaller(index: number): string {
  const roles = TEAM_ROLES.Warehouse
  return roles[index % roles.length] as string
}

const AVAILABLE_QUOTES = [
  'Yes, I can take the shift, no problem.',
  "Sure, count me in — I'll be there on time.",
  'That works for me, put me down for it.',
  "Yep, I'm available for that one.",
  "No problem at all, I'll cover it.",
  'Absolutely, works with my schedule.',
]

const UNAVAILABLE_QUOTES = [
  "Sorry, I can't make it that day.",
  "I'm already booked, I won't be able to come in.",
  "No, I've got a family commitment then.",
  "I'm on holiday that week, can't do it.",
  'Afraid not, I have an appointment.',
]

const REASONS = ['Personal appointment', 'Family commitment', 'On holiday', 'Already scheduled', 'Medical appointment']

/** Answered calls that still need a human to act (call back / unclear answer). */
type ActionCase = { quote: string; note: string }
const ACTION_CASES: ActionCase[] = [
  { quote: "Can you call me back later? I'm driving right now.", note: 'Call back requested' },
  { quote: 'Ask me again tomorrow, I need to check my agenda first.', note: 'Call back requested' },
  { quote: "Sorry, the line is bad — I didn't catch the question.", note: 'Answer unclear' },
  { quote: 'Hmm, maybe... I’m really not sure yet.', note: 'Answer unclear' },
  { quote: 'I could, but only if the shift starts an hour later.', note: 'Needs confirmation' },
]

/** A worker who is confirmed available — used to fully staff a shift block. */
function fullyAvailableOutcome(rng: () => number, shiftLabel: string): DemoOutcome {
  return {
    answered: true,
    classification: 'YES',
    quote: pick(rng, AVAILABLE_QUOTES),
    structured: [
      { label: 'Availability', value: 'Available' },
      { label: 'Shift', value: shiftLabel },
    ],
  }
}

function buildOutcome(rng: () => number, shiftLabel: string): DemoOutcome {
  const roll = rng()
  if (roll < 0.68) {
    return {
      answered: true,
      classification: 'YES',
      quote: pick(rng, AVAILABLE_QUOTES),
      structured: [
        { label: 'Availability', value: 'Available' },
        { label: 'Shift', value: shiftLabel },
      ],
    }
  }
  if (roll < 0.81) {
    return {
      answered: true,
      classification: 'NO',
      quote: pick(rng, UNAVAILABLE_QUOTES),
      structured: [
        { label: 'Availability', value: 'Unavailable' },
        { label: 'Reason', value: pick(rng, REASONS) },
      ],
    }
  }
  if (roll < 0.89) {
    const actionCase = pick(rng, ACTION_CASES)
    return {
      answered: true,
      classification: 'OTHER',
      quote: actionCase.quote,
      structured: [
        { label: 'Availability', value: 'Needs follow-up' },
        { label: 'Action', value: actionCase.note },
      ],
    }
  }
  return {
    answered: false,
    classification: 'NO_ANSWER',
    quote: null,
    structured: [{ label: 'Availability', value: 'No response' }],
  }
}

/**
 * Builds the demo roster: Dennis De Reyer and Michiel Schepers first (both
 * placed through the real backend when live calls are enabled) followed by the
 * simulated workers, distributed across the logical {@link PLAN}.
 */
/**
 * Bouwt het rooster: altijd exact MOCK_COUNT personen.
 *
 * Aangevinkte live bellers *vervangen* de eerste plekken in Warehouse · Early
 * in plaats van erbij te komen. Zo blijft het totaal gelijk, blijven de
 * blokgroottes kloppen, en staan de echte nummers altijd in dezelfde lane.
 */
/**
 * De vaste kop van het antwoordenpaneel moet beschikbaar antwoorden. Welke
 * persoon dat is bepaalt `buildLanes` — die sorteert echte bellers eerst en
 * daarna op naam — dus dat kan hier niet, en gebeurt in de pagina zelf. Eigen
 * rng, zodat de rest van het rooster niet verschuift.
 */
export function withAvailableOutcome(person: DemoPerson): DemoPerson {
  return { ...person, outcome: fullyAvailableOutcome(makeRng(7), SHIFTS.early.label) }
}

export function buildDemoPeople(liveCallers: Worker[] = []): DemoPerson[] {
  const rng = makeRng(20260601)

  const mocks: DemoPerson[] = []
  let index = 0
  for (const entry of PLAN) {
    const shift = SHIFTS[entry.shift]
    const roles = TEAM_ROLES[entry.team]
    for (let i = 0; i < entry.count; i += 1) {
      const first = pick(rng, FIRST_NAMES)
      const last = pick(rng, LAST_NAMES)
      const phoneDigits = Math.floor(rng() * 9000000 + 1000000)
      mocks.push({
        id: `mock-${index}`,
        name: `${first} ${last}`,
        phone: `+3247${phoneDigits.toString().padStart(7, '0')}`,
        shift_start_at: nextShiftDateTime(shift.start, 0, 1),
        shift_end_at: nextShiftDateTime(shift.end, 0, shift.overnight ? 2 : 1),
        role: pick(rng, roles),
        real: false,
        defaultEnabled: true,
        outcome:
          entry.fill === 'full'
            ? fullyAvailableOutcome(rng, shift.label)
            : buildOutcome(rng, shift.label),
      })
      index += 1
    }
  }

  if (liveCallers.length === 0) return mocks

  // Alleen plekken in Warehouse · Early worden overschreven; de rest van het
  // plan blijft ongemoeid.
  let taken = 0
  return mocks.map((mock) => {
    if (taken >= liveCallers.length) return mock
    if (teamOfRole(mock.role) !== 'Warehouse') return mock
    if (new Date(mock.shift_start_at).getHours() !== SHIFTS.early.start) return mock

    const live = liveCallers[taken]
    if (!live) return mock
    const role = roleForLiveCaller(taken)
    taken += 1
    return {
      ...mock,
      id: live.id,
      name: live.name,
      phone: live.phone,
      role,
      real: true,
      defaultEnabled: true,
    }
  })
}

function teamOfRole(role: string): TeamKey | null {
  for (const [team, roles] of Object.entries(TEAM_ROLES)) {
    if (roles.includes(role)) return team as TeamKey
  }
  return null
}
