import type { Worker } from './types'

const compactDateFormatter = new Intl.DateTimeFormat('nl-BE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('nl-BE', {
  hour: '2-digit',
  minute: '2-digit',
})

type ShiftInterval = Pick<Worker, 'shift_start_at' | 'shift_end_at'>

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function coerceValidDate(value: string, fallbackHour: number): Date {
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date

  const fallback = new Date()
  fallback.setHours(fallbackHour, 0, 0, 0)
  return fallback
}

function setTomorrowWithTime(source: Date): Date {
  const tomorrow = addDays(new Date(), 1)
  tomorrow.setHours(source.getHours(), source.getMinutes(), 0, 0)
  return tomorrow
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDatetimeLocalValue(date: Date): string {
  return `${toDateInputValue(date)}T${toTimeInputValue(date)}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function nextShiftDateTime(hour: number, minute = 0, dayOffset = 1): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return toDatetimeLocalValue(addDays(date, dayOffset))
}

function getPlannedShiftForTomorrow(worker: ShiftInterval): ShiftInterval {
  const storedStart = coerceValidDate(worker.shift_start_at, 6)
  const storedEnd = coerceValidDate(worker.shift_end_at, 14)
  const start = setTomorrowWithTime(storedStart)
  const end = setTomorrowWithTime(storedEnd)

  if (minutesSinceMidnight(storedEnd) <= minutesSinceMidnight(storedStart)) {
    end.setDate(end.getDate() + 1)
  }

  return {
    shift_start_at: toDatetimeLocalValue(start),
    shift_end_at: toDatetimeLocalValue(end),
  }
}

export function formatShiftTimeRange(worker: Worker): string {
  const plannedShift = getPlannedShiftForTomorrow(worker)
  const start = new Date(plannedShift.shift_start_at)
  const end = new Date(plannedShift.shift_end_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Invalid time'

  const sameDate = start.toDateString() === end.toDateString()
  const startTime = timeFormatter.format(start)
  const endTime = timeFormatter.format(end)
  if (sameDate) return `${startTime} - ${endTime}`

  return `${startTime} - ${compactDateFormatter.format(end)} ${endTime}`
}

export function formatShiftForCall(worker: Worker): string {
  const plannedShift = getPlannedShiftForTomorrow(worker)
  const start = new Date(plannedShift.shift_start_at)
  const end = new Date(plannedShift.shift_end_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'shift time unknown'

  const sameDate = start.toDateString() === end.toDateString()
  const startDate = compactDateFormatter.format(start)
  const startTime = timeFormatter.format(start)
  const endTime = timeFormatter.format(end)

  if (sameDate) return `${startDate} ${startTime} - ${endTime}`
  return `${startDate} ${startTime} - ${compactDateFormatter.format(end)} ${endTime}`
}
