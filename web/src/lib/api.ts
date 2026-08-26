/**
 * Client voor de call-tracker backend (`server/`).
 *
 * Verving de Retool REST-resource `Sixth Generation Call Tracker API`, waar de
 * host in de resource-config stond in plaats van in code. Nu komt hij uit
 * `VITE_API_BASE_URL`.
 */
import type { CallPerson, RunStatus, Worker } from '@shared'
import { getToken, notifyAuthExpired, setToken } from './auth'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_API_BASE_URL is niet ingesteld')

  const token = getToken()

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  // Token verlopen of ingetrokken: opruimen en de gate laten heropenen, zodat
  // de gebruiker niet tegen onverklaarbare foutmeldingen aanloopt.
  if (response.status === 401 && path !== '/api/auth/login') {
    notifyAuthExpired()
    throw new Error('Sessie verlopen — log opnieuw in')
  }

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

/**
 * `POST /api/auth/login` — wisselt het gedeelde wachtwoord om voor een token.
 * De enige route die zonder token bereikbaar is.
 */
export async function login(password: string): Promise<void> {
  const { token } = await request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setToken(token)
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

/** `GET /api/people` — het volledige rooster. */
export function listPeople(): Promise<Worker[]> {
  return request<Worker[]>('/api/people')
}

/** `POST /api/people` — voegt een werknemer toe. */
export function createPerson(person: Omit<Worker, 'id'>): Promise<Worker> {
  return request<Worker>('/api/people', {
    method: 'POST',
    body: JSON.stringify(person),
  })
}

/** `PATCH /api/people/:id` — wijzigt alleen de meegestuurde velden. */
export function updatePerson(id: string, changes: Partial<Omit<Worker, 'id'>>): Promise<Worker> {
  return request<Worker>(`/api/people/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

/** `DELETE /api/people/:id`. Geeft 204 zonder body, dus geen JSON verwachten. */
export async function deletePerson(id: string): Promise<void> {
  if (!BASE_URL) throw new Error('VITE_API_BASE_URL is niet ingesteld')

  const token = getToken()
  const response = await fetch(`${BASE_URL}/api/people/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (response.status === 401) {
    notifyAuthExpired()
    throw new Error('Sessie verlopen — log opnieuw in')
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
}

/** Belt een hele lijst parallel. */
export function startRunCalls(
  people: CallPerson[],
  runId: string,
): Promise<OutboundCallResponse[]> {
  return Promise.all(people.map((person) => startOutboundCall(person, runId)))
}
