/**
 * Client voor de call-tracker backend (`server/`).
 *
 * Verving de Retool REST-resource `Sixth Generation Call Tracker API`, waar de
 * host in de resource-config stond in plaats van in code. Nu komt hij uit
 * `VITE_API_BASE_URL`.
 */
import type { CallPerson, RunStatus } from '@shared'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_API_BASE_URL is niet ingesteld')

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    // De server geeft fouten als { error: string }; val terug op de status.
    const detail = await response
      .json()
      .then((body: { error?: string }) => body?.error)
      .catch(() => undefined)
    throw new Error(detail ?? `${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export type CreateRunResponse = { runId: string }
export type OutboundCallResponse = { callId: string; callSid: string }

/** `POST /api/runs` — reserveert een belronde van `total` calls. */
export function createRun(total: number): Promise<CreateRunResponse> {
  return request<CreateRunResponse>('/api/runs', {
    method: 'POST',
    body: JSON.stringify({ total }),
  })
}

/** `GET /api/runs/:runId` — de run met alle calls eronder. */
export function getRun(runId: string): Promise<RunStatus> {
  return request<RunStatus>(`/api/runs/${runId}`)
}

/** `POST /api/outbound/call` — belt één persoon binnen een run. */
export function startOutboundCall(
  person: CallPerson,
  runId: string,
): Promise<OutboundCallResponse> {
  return request<OutboundCallResponse>('/api/outbound/call', {
    method: 'POST',
    body: JSON.stringify({ person, runId }),
  })
}

/** Belt een hele lijst parallel. */
export function startRunCalls(
  people: CallPerson[],
  runId: string,
): Promise<OutboundCallResponse[]> {
  return Promise.all(people.map((person) => startOutboundCall(person, runId)))
}
