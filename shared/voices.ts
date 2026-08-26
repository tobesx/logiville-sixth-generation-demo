/**
 * De stemmen die de OpenAI Realtime-brug accepteert. Spiegelt `VALID_VOICES`
 * in `server/src/realtime-bridge.js`; een onbekende waarde valt daar terug op
 * `DEFAULT_VOICE`.
 */
export const REALTIME_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const

export type RealtimeVoice = (typeof REALTIME_VOICES)[number]

export const DEFAULT_VOICE: RealtimeVoice = 'alloy'
