import type { CallClassification } from './types'

export type StructuredField = {
  label: string
  value: string
}

export type DemoOutcome = {
  /** Whether the worker picked up the phone. */
  answered: boolean
  classification: CallClassification
  /** Natural-language transcript snippet from the conversation. */
  quote: string | null
  /** Structured operational data extracted from the conversation. */
  structured: StructuredField[]
}

/** Job function shown next to each worker (demo-only enrichment). */
export const demoRoles: Record<string, string> = {
  '1': 'Forklift Operator',
  '2': 'Warehouse Operator',
  '3': 'Team Lead · Afternoon',
  '4': 'Order Picker',
  '5': 'Night Shift Operator',
}

/**
 * Scripted, deterministic call outcomes so the trade-show demo is reliable and
 * tells a clear story: two available, one needs follow-up, one unavailable,
 * one no-answer.
 */
export const demoOutcomes: Record<string, DemoOutcome> = {
  '1': {
    answered: true,
    classification: 'YES',
    quote: "Yes, I'm free tomorrow morning — I'll be there for the six o'clock start.",
    structured: [
      { label: 'Availability', value: 'Available' },
      { label: 'Shift', value: 'Early · 06:00–14:00' },
    ],
  },
  '2': {
    answered: true,
    classification: 'YES',
    quote: 'Sure, count me in for the early shift. No problem at all.',
    structured: [
      { label: 'Availability', value: 'Available' },
      { label: 'Shift', value: 'Early · 06:00–14:00' },
    ],
  },
  '3': {
    answered: true,
    classification: 'NO',
    quote: "I can't make it — I've got a doctor's appointment in the afternoon.",
    structured: [
      { label: 'Availability', value: 'Unavailable' },
      { label: 'Reason', value: 'Personal appointment' },
    ],
  },
  '4': {
    answered: true,
    classification: 'OTHER',
    quote: "I can come in, but I'll need to leave around 8pm for a pickup.",
    structured: [
      { label: 'Availability', value: 'Partial' },
      { label: 'Follow-up', value: 'Confirm early leave' },
    ],
  },
  '5': {
    answered: false,
    classification: 'NO_ANSWER',
    quote: null,
    structured: [{ label: 'Availability', value: 'No response' }],
  },
}

export const fallbackOutcome: DemoOutcome = {
  answered: false,
  classification: 'NO_ANSWER',
  quote: null,
  structured: [{ label: 'Availability', value: 'No response' }],
}
