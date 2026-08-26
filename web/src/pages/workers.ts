import type { Worker } from './types'
import { addDays, getPlannedShiftForTomorrow, nextShiftDateTime, toDatetimeLocalValue } from './shift'

const STORAGE_KEY = 'ico_workers'

export function makeDefaultShiftInterval(): Pick<Worker, 'shift_start_at' | 'shift_end_at'> {
  return {
    shift_start_at: nextShiftDateTime(6),
    shift_end_at: nextShiftDateTime(14),
  }
}

export const DEFAULT_WORKERS: Worker[] = [
  {
    id: '1',
    name: 'Dennis De Reyer',
    phone: '+32474311413',
    shift_start_at: nextShiftDateTime(6),
    shift_end_at: nextShiftDateTime(14),
  },
  {
    id: '2',
    name: 'Michiel Schepers',
    phone: '+32493197138',
    shift_start_at: nextShiftDateTime(6),
    shift_end_at: nextShiftDateTime(14),
  },
  {
    id: '3',
    name: 'Tom Goos',
    phone: '+32478682680',
    shift_start_at: nextShiftDateTime(14),
    shift_end_at: nextShiftDateTime(22),
  },
  {
    id: '4',
    name: 'Keyan Aslamian',
    phone: '+32478760317',
    shift_start_at: nextShiftDateTime(14),
    shift_end_at: nextShiftDateTime(22),
  },
  {
    id: '5',
    name: 'Stefan Verte',
    phone: '+32477846535',
    shift_start_at: nextShiftDateTime(22),
    shift_end_at: nextShiftDateTime(6, 0, 2),
  },
]

function isWorker(value: unknown): value is Worker {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['name'] === 'string' &&
    typeof candidate['phone'] === 'string' &&
    typeof candidate['shift_start_at'] === 'string' &&
    typeof candidate['shift_end_at'] === 'string'
  )
}

type LegacyWorker = {
  id: string
  name: string
  phone: string
  time_slot: string
}

function isLegacyWorker(value: unknown): value is LegacyWorker {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['name'] === 'string' &&
    typeof candidate['phone'] === 'string' &&
    typeof candidate['time_slot'] === 'string'
  )
}

function legacySlotToInterval(timeSlot: string): Pick<Worker, 'shift_start_at' | 'shift_end_at'> {
  const tomorrow = addDays(new Date(), 1)
  const start = new Date(tomorrow)
  const end = new Date(tomorrow)

  if (timeSlot.toLowerCase().includes('nacht')) {
    start.setHours(22, 0, 0, 0)
    end.setDate(end.getDate() + 1)
    end.setHours(6, 0, 0, 0)
  } else if (timeSlot.toLowerCase().includes('namiddag')) {
    start.setHours(14, 0, 0, 0)
    end.setHours(22, 0, 0, 0)
  } else {
    start.setHours(6, 0, 0, 0)
    end.setHours(14, 0, 0, 0)
  }

  return {
    shift_start_at: toDatetimeLocalValue(start),
    shift_end_at: toDatetimeLocalValue(end),
  }
}

function migrateLegacyWorkers(workers: LegacyWorker[]): Worker[] {
  return workers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    phone: worker.phone,
    ...legacySlotToInterval(worker.time_slot),
  }))
}

function normalizeWorkersForTomorrow(workers: Worker[]): Worker[] {
  return workers.map((worker) => ({
    ...worker,
    ...getPlannedShiftForTomorrow(worker),
  }))
}

function loadDefaultWorkers(): Worker[] {
  return normalizeWorkersForTomorrow(DEFAULT_WORKERS)
}

export function loadWorkers(): Worker[] {
  if (typeof window === 'undefined') return loadDefaultWorkers()

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const defaultWorkers = loadDefaultWorkers()
    saveWorkers(defaultWorkers)
    return defaultWorkers
  }

  try {
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.every(isWorker)) {
      if (parsed.length === 0) {
        const defaultWorkers = loadDefaultWorkers()
        saveWorkers(defaultWorkers)
        return defaultWorkers
      }
      const normalizedWorkers = normalizeWorkersForTomorrow(parsed)
      saveWorkers(normalizedWorkers)
      return normalizedWorkers
    }

    if (Array.isArray(parsed) && parsed.every(isLegacyWorker)) {
      const migratedWorkers = normalizeWorkersForTomorrow(migrateLegacyWorkers(parsed))
      saveWorkers(migratedWorkers)
      return migratedWorkers
    }
  } catch {
    // Invalid persisted data falls back to the known-good roster.
  }

  const defaultWorkers = loadDefaultWorkers()
  saveWorkers(defaultWorkers)
  return defaultWorkers
}

export function saveWorkers(workers: Worker[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeWorkersForTomorrow(workers)))
}

export function makeWorkerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
