/**
 * Seed-data voor de Smart Production Planning demo.
 *
 * Het verhaal uit de video: de planner maakt de weekplanning met de hand en
 * moet daarvoor ERP, WMS, HR en SharePoint apart raadplegen. Twee fouten
 * bleven daardoor onopgemerkt — iemand ingepland met een vervallen
 * heftruckcertificaat, en een order voor een klant met openstaande facturen.
 *
 * Deze demo draait het om: je plaatst iemand, en het systeem zegt meteen wat
 * er mis mee is. De regels hieronder zijn bewust klein gehouden, maar ze staan
 * op de gegevens en niet op vaste combinaties, zodat élke plaatsing die de
 * gids probeert een zinnig antwoord oplevert.
 *
 * Alles is verzonnen en deterministisch. Geen backend.
 */

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export type Day = (typeof DAYS)[number]

export const SHIFTS = ['06:00–14:00', '14:00–22:00'] as const
export type Shift = (typeof SHIFTS)[number]

/** De vier systemen in de kop; elk inzicht wijst er één aan. */
export type SourceSystem = 'ERP' | 'WMS' | 'HR' | 'SHAREPOINT'

export type Severity = 'blocking' | 'attention'

export type Availability = 'available' | 'leave' | 'sick'

export type Worker = {
  id: string
  name: string
  initials: string
  availability: Availability
  /** Vervaldatum van het heftruckcertificaat, of null als het niet verloopt. */
  forkliftExpiresOn: Day | null
  forkliftExpiryLabel?: string
}

export type Line = {
  id: string
  name: string
  capability: string
  /** Lijnen met zware handling vragen een geldig heftruckcertificaat. */
  requiresForklift: boolean
}

export type Customer = {
  name: string
  /** Gevuld zodra er iets met de kredietstatus is. */
  overdue?: { invoices: number; amount: string }
}

export type Order = {
  id: string
  code: string
  customer: Customer
  product: string
  quantity: string
  /** Dag waarop het materiaal binnenkomt; eerder produceren kan niet. */
  materialArrivesOn?: Day
}

/** Eén ingevulde cel op het bord. */
export type Placement = {
  orderId: string
  workerId: string | null
  shift: Shift
}

/** Sleutel van een slot: lijn plus dag. */
export const slotKey = (lineId: string, day: Day): string => `${lineId}|${day}`

export const LINES: Line[] = [
  { id: 'L1', name: 'Line 1', capability: 'Filling', requiresForklift: false },
  { id: 'L2', name: 'Line 2', capability: 'Heavy handling', requiresForklift: true },
  { id: 'L3', name: 'Line 3', capability: 'Packaging', requiresForklift: false },
]

export const WORKERS: Worker[] = [
  {
    id: 'W1',
    name: 'W. Janssens',
    initials: 'WJ',
    availability: 'available',
    forkliftExpiresOn: 'Wed',
    forkliftExpiryLabel: '14/03',
  },
  { id: 'W2', name: 'T. Peeters', initials: 'TP', availability: 'available', forkliftExpiresOn: null },
  { id: 'W3', name: 'K. Maes', initials: 'KM', availability: 'available', forkliftExpiresOn: null },
  { id: 'W4', name: 'J. Vos', initials: 'JV', availability: 'available', forkliftExpiresOn: null },
  { id: 'W5', name: 'B. De Smet', initials: 'BD', availability: 'leave', forkliftExpiresOn: null },
  { id: 'W6', name: 'S. Claes', initials: 'SC', availability: 'sick', forkliftExpiresOn: null },
]

const VERMEIRE: Customer = { name: 'Vermeire', overdue: { invoices: 3, amount: '€ 12 400' } }
const DOBBELS: Customer = { name: 'Dobbels' }
const NEYTS: Customer = { name: 'Neyts' }
const CARREFOUR: Customer = { name: 'Carrefour' }

export const ORDERS: Order[] = [
  { id: 'O-A129', code: 'A-129', customer: VERMEIRE, product: 'Detergent 5L', quantity: '18 000 u' },
  { id: 'O-B207', code: 'B-207', customer: DOBBELS, product: 'Surface cleaner', quantity: '12 000 u' },
  { id: 'O-C334', code: 'C-334', customer: NEYTS, product: 'Retail multipack', quantity: '9 400 u', materialArrivesOn: 'Thu' },

  // Al ingepland; vullen het bord zodat de week er echt uitziet.
  { id: 'O-A118', code: 'A-118', customer: CARREFOUR, product: 'Detergent 2L', quantity: '22 000 u' },
  { id: 'O-A121', code: 'A-121', customer: DOBBELS, product: 'Glass cleaner', quantity: '14 000 u' },
  { id: 'O-A125', code: 'A-125', customer: CARREFOUR, product: 'Detergent 5L', quantity: '17 500 u' },
  { id: 'O-B204', code: 'B-204', customer: NEYTS, product: 'Bottle blend A', quantity: '4 200 kg' },
  { id: 'O-B210', code: 'B-210', customer: DOBBELS, product: 'Bottle blend B', quantity: '6 100 kg' },
  { id: 'O-C330', code: 'C-330', customer: CARREFOUR, product: 'Private label run', quantity: '31 000 u' },
  { id: 'O-C336', code: 'C-336', customer: NEYTS, product: 'Export pallets', quantity: '8 800 u' },
]

/** Wat er al op het bord staat als de demo opent. */
export const INITIAL_PLACEMENTS: Record<string, Placement> = {
  [slotKey('L1', 'Mon')]: { orderId: 'O-A118', workerId: 'W3', shift: SHIFTS[0] },
  [slotKey('L1', 'Tue')]: { orderId: 'O-A121', workerId: 'W4', shift: SHIFTS[1] },
  [slotKey('L1', 'Wed')]: { orderId: 'O-A125', workerId: 'W4', shift: SHIFTS[0] },
  [slotKey('L2', 'Mon')]: { orderId: 'O-B204', workerId: 'W4', shift: SHIFTS[0] },
  [slotKey('L2', 'Thu')]: { orderId: 'O-B210', workerId: 'W2', shift: SHIFTS[1] },
  [slotKey('L3', 'Mon')]: { orderId: 'O-C330', workerId: 'W2', shift: SHIFTS[1] },
  [slotKey('L3', 'Wed')]: { orderId: 'O-C336', workerId: 'W1', shift: SHIFTS[0] },
}

/** De drie orders die nog geplaatst moeten worden, in deze volgorde. */
export const BACKLOG_ORDER_IDS = ['O-A129', 'O-B207', 'O-C334']

export const orderById = (id: string): Order | undefined => ORDERS.find((o) => o.id === id)
export const workerById = (id: string | null): Worker | undefined =>
  id ? WORKERS.find((w) => w.id === id) : undefined
export const lineById = (id: string): Line | undefined => LINES.find((l) => l.id === id)

const dayIndex = (day: Day): number => DAYS.indexOf(day)

export type Insight = {
  id: string
  source: SourceSystem
  severity: Severity
  title: string
  detail: string
  /** Slot waar het over gaat, zodat het bord kan oplichten. */
  slot: string
  /** Vervangers die het probleem oplossen; leeg als er niets te kiezen valt. */
  replacements: Worker[]
  /** Label op de actieknop, als er een handeling bij hoort. */
  action?: string
}

/**
 * Toetst één plaatsing aan de vier regels. Bewust klein: één regel per
 * systeem uit de kop, zodat de gids kan neerzetten wat hij wil en er altijd
 * iets zinnigs verschijnt in plaats van niets.
 */
function inspect(slot: string, placement: Placement): Insight[] {
  const [lineId, day] = slot.split('|') as [string, Day]
  const line = lineById(lineId)
  const order = orderById(placement.orderId)
  const worker = workerById(placement.workerId)
  if (!line || !order) return []

  const found: Insight[] = []

  // SHAREPOINT — bevoegdheden. Het voorbeeld uit de video.
  if (
    worker &&
    line.requiresForklift &&
    worker.forkliftExpiresOn !== null &&
    dayIndex(day) >= dayIndex(worker.forkliftExpiresOn)
  ) {
    found.push({
      id: `${slot}-cert`,
      source: 'SHAREPOINT',
      severity: 'attention',
      title: `Forklift certificate expires on ${worker.forkliftExpiryLabel ?? worker.forkliftExpiresOn}`,
      detail: `${worker.name} is no longer allowed to operate ${line.name} from ${worker.forkliftExpiresOn}.`,
      slot,
      replacements: WORKERS.filter(
        (w) => w.availability === 'available' && w.forkliftExpiresOn === null && w.id !== worker.id,
      ).slice(0, 2),
      action: undefined,
    })
  }

  // ERP — orders, klanten en facturen. Het tweede voorbeeld uit de video.
  if (order.customer.overdue) {
    found.push({
      id: `${slot}-credit`,
      source: 'ERP',
      severity: 'blocking',
      title: `Customer ${order.customer.name} — ${order.customer.overdue.invoices} overdue invoices`,
      detail: `${order.customer.overdue.amount} outstanding — credit limit reached.`,
      slot,
      replacements: [],
      action: 'Request release',
    })
  }

  // WMS — voorraad en materiaal.
  if (order.materialArrivesOn && dayIndex(day) < dayIndex(order.materialArrivesOn)) {
    found.push({
      id: `${slot}-material`,
      source: 'WMS',
      severity: 'blocking',
      title: 'Raw material arrives after the run',
      detail: `Material for ${order.code} is expected ${order.materialArrivesOn}; this run is planned ${day}.`,
      slot,
      replacements: [],
      action: 'Move to ' + order.materialArrivesOn,
    })
  }

  // HR — verlof en ziekte. Zulke mensen zijn links niet aantikbaar, maar wie
  // er toch belandt moet niet stil doorglippen.
  if (worker && worker.availability !== 'available') {
    found.push({
      id: `${slot}-availability`,
      source: 'HR',
      severity: 'blocking',
      title: `${worker.name} is not available`,
      detail: worker.availability === 'sick' ? 'Reported sick this week.' : 'On leave this week.',
      slot,
      replacements: WORKERS.filter((w) => w.availability === 'available').slice(0, 2),
    })
  }

  return found
}

/** Alle inzichten voor de huidige stand van het bord. */
export function inspectAll(placements: Record<string, Placement>): Insight[] {
  return Object.entries(placements).flatMap(([slot, placement]) => inspect(slot, placement))
}
