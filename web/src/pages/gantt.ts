import type { DemoPerson } from './mockPeople'

export type LaneSegment = { start: number; end: number; main: boolean }

type ShiftKey = 'early' | 'late' | 'night'

/** One shift (early/late/night) inside a department lane. */
export type ShiftBlock = {
  /** `${team}::${shiftKey}` */
  key: string
  shiftKey: ShiftKey
  /** e.g. "Early" */
  shiftName: string
  /** e.g. "06:00–14:00" */
  shiftTime: string
  startHour: number
  endHour: number
  overnight: boolean
  segments: LaneSegment[]
  workers: DemoPerson[]
}

/** One department lane, holding its shift blocks on a single row. */
export type GanttLane = {
  /** the team name */
  key: string
  team: string
  shifts: ShiftBlock[]
  workers: DemoPerson[]
}

type ShiftInfo = {
  key: ShiftKey
  name: string
  time: string
  start: number
  end: number
  overnight: boolean
}

/** Roster roles collapse into a handful of readable operational teams. */
const TEAM_BY_ROLE: Record<string, string> = {
  'Forklift Operator': 'Warehouse',
  'Warehouse Operator': 'Warehouse',
  'Order Picker': 'Warehouse',
  'Reach Truck Driver': 'Warehouse',
  'Dock Worker': 'Dock',
  'Machine Operator': 'Production',
  'Line Operator': 'Production',
  'Quality Inspector': 'Inventory',
  'Inventory Clerk': 'Inventory',
  'Logistics Planner': 'Planning',
  'Shift Coordinator': 'Planning',
  'Team Lead': 'Planning',
}

const TEAM_ORDER = ['Warehouse', 'Dock', 'Production', 'Inventory', 'Planning']
const SHIFT_ORDER: ShiftKey[] = ['early', 'late', 'night']

const SHIFT_INFO: Record<ShiftKey, ShiftInfo> = {
  early: { key: 'early', name: 'Early', time: '06:00–14:00', start: 6, end: 14, overnight: false },
  late: { key: 'late', name: 'Late', time: '14:00–22:00', start: 14, end: 22, overnight: false },
  night: { key: 'night', name: 'Night', time: '22:00–06:00', start: 22, end: 6, overnight: true },
}

function teamForRole(role: string): string {
  return TEAM_BY_ROLE[role] ?? 'Warehouse'
}

function shiftForHour(startHour: number): ShiftInfo {
  if (startHour < 12) return SHIFT_INFO.early
  if (startHour < 20) return SHIFT_INFO.late
  return SHIFT_INFO.night
}

function makeSegments(info: ShiftInfo): LaneSegment[] {
  if (!info.overnight) return [{ start: info.start, end: info.end, main: true }]
  const evening = { start: info.start, end: 24 }
  const morning = { start: 0, end: info.end }
  const eveningWidth = evening.end - evening.start
  const morningWidth = morning.end - morning.start
  return [
    { ...evening, main: eveningWidth >= morningWidth },
    { ...morning, main: morningWidth > eveningWidth },
  ]
}

function sortWorkers(workers: DemoPerson[]): DemoPerson[] {
  return [...workers].sort(
    (a, b) => Number(b.real) - Number(a.real) || a.name.localeCompare(b.name),
  )
}

function teamRank(team: string): number {
  const index = TEAM_ORDER.indexOf(team)
  return index === -1 ? TEAM_ORDER.length : index
}

/** Group the roster into one lane per department, with early/late/night blocks. */
export function buildLanes(people: DemoPerson[]): GanttLane[] {
  const teamMap = new Map<string, DemoPerson[]>()
  for (const person of people) {
    const team = teamForRole(person.role)
    const existing = teamMap.get(team)
    if (existing) existing.push(person)
    else teamMap.set(team, [person])
  }

  const lanes: GanttLane[] = []
  for (const [team, teamWorkers] of teamMap) {
    const shiftMap = new Map<ShiftKey, DemoPerson[]>()
    for (const person of teamWorkers) {
      const startHour = new Date(person.shift_start_at).getHours()
      const info = shiftForHour(Number.isNaN(startHour) ? 6 : startHour)
      const existing = shiftMap.get(info.key)
      if (existing) existing.push(person)
      else shiftMap.set(info.key, [person])
    }

    const shifts: ShiftBlock[] = SHIFT_ORDER.filter((key) => shiftMap.has(key)).map((key) => {
      const info = SHIFT_INFO[key]
      return {
        key: `${team}::${key}`,
        shiftKey: key,
        shiftName: info.name,
        shiftTime: info.time,
        startHour: info.start,
        endHour: info.end,
        overnight: info.overnight,
        segments: makeSegments(info),
        workers: sortWorkers(shiftMap.get(key) ?? []),
      }
    })

    lanes.push({ key: team, team, shifts, workers: sortWorkers(teamWorkers) })
  }

  lanes.sort((a, b) => teamRank(a.team) - teamRank(b.team))
  return lanes
}

/** Convert an hour (0–24) to a left/width percentage on the 24h ruler. */
export function hourToPercent(hour: number): number {
  return (hour / 24) * 100
}

/** The day starts with the early shift at 06:00 and runs to 06:00 the next day. */
export const AXIS_START_HOUR = 6

/** Position a shift on the 06:00→06:00 axis as left/width percentages. */
export function shiftToBar(startHour: number, endHour: number): { left: number; width: number } {
  const start = (((startHour - AXIS_START_HOUR) % 24) + 24) % 24
  const raw = (((endHour - startHour) % 24) + 24) % 24
  const duration = raw === 0 ? 24 : raw
  return { left: (start / 24) * 100, width: (duration / 24) * 100 }
}
