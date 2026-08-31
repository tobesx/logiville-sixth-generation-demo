import type { CallClassification } from './types'
import type { StructuredField } from './demoScript'

/** Per-worker call state used by the simulation engine. */
export type CallState = 'ready' | 'calling' | 'answered' | 'no_answer' | 'action' | 'completed'

/** Overall screen phase. */
export type Phase = 'idle' | 'running' | 'complete'

/** Visual status tone for name chips, lanes and cards. */
export type ChipTone = 'pending' | 'calling' | 'yes' | 'no' | 'other' | 'noanswer'

/** Result payload rendered in the live results panel and drawer. */
export type DemoResult = {
  id: string
  name: string
  real: boolean
  classification: CallClassification
  quote: string | null
  structured: StructuredField[]
  /**
   * Door de planner zelf gezet, niet uit een gesprek. Zonder dit onderscheid
   * zou een handmatige invoer het mock-citaat van die persoon tonen — een
   * uitspraak die nooit gedaan is.
   */
  manual?: boolean
}

export const toneMeta: Record<ChipTone, { label: string; chipClass: string; textClass: string }> = {
  pending: { label: 'Pending', chipClass: 'wca-chip-pending', textClass: 'text-[var(--text-muted)]' },
  calling: { label: 'Calling…', chipClass: 'wca-chip-calling', textClass: 'text-[var(--accent-brand)]' },
  yes: { label: 'Available', chipClass: 'wca-chip-yes', textClass: 'text-[var(--success-brand)]' },
  no: { label: 'Unavailable', chipClass: 'wca-chip-no', textClass: 'text-[var(--danger-brand)]' },
  other: { label: 'Action needed', chipClass: 'wca-chip-other', textClass: 'text-[#fb923c]' },
  noanswer: { label: 'No answer', chipClass: 'wca-chip-noanswer', textClass: 'text-[var(--text-muted)]' },
}

/** Map a live call state (+ final classification) to a visual tone. */
export function toneFromState(state: CallState, classification?: CallClassification | null): ChipTone {
  if (state === 'ready') return 'pending'
  if (state === 'calling' || state === 'answered') return 'calling'
  if (state === 'no_answer') return 'noanswer'
  if (state === 'action') return 'other'
  return toneFromClassification(classification)
}

export function toneFromClassification(classification?: CallClassification | null): ChipTone {
  if (classification === 'YES') return 'yes'
  if (classification === 'NO') return 'no'
  if (classification === 'OTHER') return 'other'
  return 'noanswer'
}

/** True once a worker's call has reached a final state. */
export function isFinalState(state: CallState): boolean {
  return state === 'completed' || state === 'action' || state === 'no_answer'
}

/* ---------- timing (all in ms) ---------- */
/**
 * Modal "connecting to HR" overlay: drie stappen, dan weg.
 *
 * Stond op 1000 ms per stap. De laatste regel — die met het aantal gevonden
 * nummers erin, het enige getal dat er iets toe doet — stond dan één seconde
 * in beeld voor de overlay verdween. Nu duurt het geheel tien seconden, en
 * blijft die laatste regel het langst staan.
 */
export const CONNECT_STEP_MS = 3000
export const CONNECT_STEPS = 3
/** Extra tijd nadat de laatste regel is afgevinkt, voor het bellen begint. */
export const CONNECT_HOLD_MS = 1000
/**
 * De vastgezette kop van het paneel — de eerste plek van Warehouse · Early —
 * antwoordt op een vast moment in plaats van in de willekeurige spreiding. Hij
 * staat meteen op 'calling'; dit is wanneer zijn antwoord verwerkt is.
 */
export const PINNED_ANSWER_MS = 5000

/** Total calling window — every call resolves inside this span. */
export const RUN_WINDOW_MS = 22000
/**
 * Wanneer het eerste resultaat op zijn vroegst binnenkomt, gerekend vanaf het
 * moment dat het bellen begint. Stond op 2600, en samen met de drie seconden
 * HR-sync duurde het bijna zes seconden voor er iets te zien was — de
 * rondleiding bleef al die tijd naar de knop wijzen die je al ingedrukt had.
 */
export const RUN_FIRST_MS = 400
/** Range for how long a single (simulated) call stays "calling" before resolving. */
export const CALL_MIN_MS = 2200
export const CALL_MAX_MS = 5200
/** Brief "answered" flash before the final status lands. */
export const ANSWER_FLASH_MS = 650
