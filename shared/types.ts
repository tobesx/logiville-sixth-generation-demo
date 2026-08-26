/**
 * Vormen die `server/` en `web/` allebei kennen.
 *
 * `server/` is CommonJS JavaScript en importeert deze types (nog) niet — de
 * kolomnamen in `server/src/db.js` blijven de feitelijke bron van waarheid.
 * Wijzigt daar een kolom, dan moet dit bestand mee.
 */

/** Uitkomst van één gesprek, zoals het model die via `classify_response` geeft. */
export type CallClassification = 'YES' | 'NO' | 'OTHER' | 'NO_ANSWER'

/** Eén rij uit de `calls`-tabel, zoals `GET /api/runs/:runId` die teruggeeft. */
export type RunCall = {
  id: string
  name: string
  time_slot: string
  phone: string
  status: 'pending' | 'completed'
  classification: CallClassification | null
  follow_up: boolean | null
  /** Letterlijk citaat van de werknemer — nadrukkelijk geen samenvatting. */
  raw_response: string | null
  answered_call: boolean | null
}

/** Eén belronde met alle calls eronder. */
export type RunStatus = {
  id: string
  total: number
  status: 'in_progress' | 'completed'
  complete: boolean
  calls: RunCall[]
}

/** Werknemer met een geplande shift. Nu nog seed-data in de frontend. */
export type Worker = {
  id: string
  name: string
  phone: string
  shift_start_at: string
  shift_end_at: string
}

/** Persoon zoals `POST /api/outbound/call` die verwacht. */
export type CallPerson = {
  id: string
  name: string
  time_slot: string
  phone: string
  voice?: string
}
