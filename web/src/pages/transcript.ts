import type { DemoPerson } from './mockPeople'
import type { CallClassification } from './types'
import { formatShiftForSpeech } from './shift'

export type TranscriptLine = { speaker: 'agent' | 'worker'; text: string }

/**
 * Bouwt het gesprek dat in de resultaatkaarten en de detail-drawer getoond
 * wordt.
 *
 * De regels van de agent zijn een woordelijke Engelse vertaling van wat
 * `buildSystemPrompt` en `buildClosingInstructions` in
 * server/src/realtime-bridge.js voorschrijven. Wijkt de prompt daar, dan hoort
 * dit bestand mee te wijzigen — anders leest het publiek iets anders dan er
 * aan de telefoon gezegd wordt.
 *
 * Twee dingen die de agent bewust NIET zegt, en die hier dus ook niet staan:
 * de naam van de persoon en zijn functie. De openingszin noemt alleen de
 * shift, en de afsluiting herhaalt naam noch shift.
 */
export function buildTranscript(
  person: DemoPerson,
  quote: string | null,
  classification: CallClassification,
): TranscriptLine[] {
  const shift = formatShiftForSpeech(person)
  const lines: TranscriptLine[] = []

  // STAP 1 — de prompt schrijft deze zin letterlijk voor, groet en vraag in één.
  lines.push({
    speaker: 'agent',
    text: `Hello, you are speaking with the planning agent from Sixth Generation. Are you available for a shift ${shift}?`,
  })

  if (classification === 'NO_ANSWER' || !quote) {
    // STAP 2 — bij stilte of ruis vraagt de agent eenmalig om herhaling.
    lines.push({
      speaker: 'agent',
      text: 'Sorry, I did not catch that. Could you repeat that?',
    })
    lines.push({
      speaker: 'agent',
      text: 'No response captured — the call went unanswered. The agent will retry later or send a text message.',
    })
    return lines
  }

  lines.push({ speaker: 'worker', text: quote })

  // De afsluiting komt uit een losse response: bedanken, bevestigen dat het
  // genoteerd is, beleefd afronden. Maximaal twee korte zinnen.
  if (classification === 'YES') {
    lines.push({
      speaker: 'agent',
      text: 'Thank you for confirming, I have noted it. Have a good day!',
    })
  } else if (classification === 'NO') {
    lines.push({
      speaker: 'agent',
      text: 'Thank you for your answer, I have noted it. Have a good day!',
    })
  } else {
    lines.push({
      speaker: 'agent',
      text: 'Thank you for your answer, I have noted it. A colleague will get in touch with you about this.',
    })
  }

  return lines
}
