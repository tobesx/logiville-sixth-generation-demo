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
/** Modal "connecting to HR" overlay: three steps then dismiss. */
export const CONNECT_STEP_MS = 1000
export const CONNECT_STEPS = 3

/** In de rondleiding trager, zodat de gids elke stap kan benoemen. */
export const TOUR_CONNECT_STEP_MS = 2000
/** Total calling window — every call resolves inside this span. */
export const RUN_WINDOW_MS = 22000
/** First result never lands before this. */
export const RUN_FIRST_MS = 2600
/** Range for how long a single (simulated) call stays "calling" before resolving. */
export const CALL_MIN_MS = 2200
export const CALL_MAX_MS = 5200
/** Brief "answered" flash before the final status lands. */
export const ANSWER_FLASH_MS = 650
