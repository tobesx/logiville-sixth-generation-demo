import type { DemoPerson } from './mockPeople'
import type { CallClassification } from './types'
import { formatShiftTimeRange } from './shift'

export type TranscriptLine = { speaker: 'agent' | 'worker'; text: string }

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first ?? name
}

/**
 * Builds a believable, deterministic call transcript from the worker and their
 * captured response. Purely presentational — used in the results cards and the
 * detail drawer so the audience can read the conversation.
 */
export function buildTranscript(
  person: DemoPerson,
  quote: string | null,
  classification: CallClassification,
): TranscriptLine[] {
  const shift = formatShiftTimeRange(person)
  const lines: TranscriptLine[] = []

  lines.push({
    speaker: 'agent',
    text: `Hi ${firstName(person.name)}, this is the Logiville planning assistant calling about your ${person.role} shift tomorrow, ${shift}.`,
  })

  if (classification === 'NO_ANSWER' || !quote) {
    lines.push({ speaker: 'agent', text: 'Are you available to work this shift?' })
    lines.push({
      speaker: 'agent',
      text: 'No response captured — the call went unanswered. The agent will retry later or send a text message.',
    })
    return lines
  }

  lines.push({ speaker: 'agent', text: 'Are you available to work this shift?' })
  lines.push({ speaker: 'worker', text: quote })

  if (classification === 'YES') {
    lines.push({
      speaker: 'agent',
      text: 'Great, you are confirmed for the shift. Thanks, see you there!',
    })
  } else if (classification === 'NO') {
    lines.push({
      speaker: 'agent',
      text: 'Understood, I have marked you as unavailable and flagged this shift for replanning.',
    })
  } else {
    lines.push({
      speaker: 'agent',
      text: 'Thanks — I have logged this for a human planner to follow up with you.',
    })
  }

  return lines
}
