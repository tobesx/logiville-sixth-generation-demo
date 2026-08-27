/**
 * Seed-data voor de Smart Production Planning demo.
 *
 * Het verhaal uit de video: de planning wordt elke week met de hand in Excel
 * gemaakt, en om de lijnen te bemannen moet er informatie uit ERP, WMS en HR
 * bij elkaar gezocht worden. Dat kost uren en gaat mis. Deze demo laat het
 * omgekeerde zien — het plan staat er al, en wat overblijft is drie
 * aandachtspunten nakijken.
 *
 * Alles hier is verzonnen en deterministisch. Geen backend, net als mockPeople.
 */

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
export type Day = (typeof DAYS)[number]

/** De systemen waar het plan zijn gegevens vandaan haalt. */
export type SourceSystem = 'ERP' | 'WMS' | 'HR'

export type Severity = 'blocking' | 'attention'

export type Line = {
  id: string
  name: string
  /** Waar de lijn voor bedoeld is; verschijnt onder de naam. */
  capability: string
}

export type Order = {
  id: string
  lineId: string
  /** Eerste dag van de order. */
  day: Day
  /** Aantal dagen dat de order loopt; 1 = één dag. */
  span: number
  product: string
  customer: string
  quantity: string
  /** Wie de lijn bemant. Komt in het echte verhaal uit HR. */
  crew: string[]
  /** Verwijst naar een aandachtspunt, als er een op deze order zit. */
  flagId?: string
}

export type Flag = {
  id: string
  source: SourceSystem
  severity: Severity
  title: string
  /** Wat het systeem gezien heeft. */
  detail: string
  /** Wat het plan voorstelt. */
  suggestion: string
  orderId: string
}

export const LINES: Line[] = [
  { id: 'L1', name: 'Line 1', capability: 'Filling · 2 000 u/h' },
  { id: 'L2', name: 'Line 2', capability: 'Filling · 1 400 u/h' },
  { id: 'L3', name: 'Line 3', capability: 'Blending' },
  { id: 'L4', name: 'Line 4', capability: 'Packaging' },
  { id: 'L5', name: 'Line 5', capability: 'Labelling' },
]

/**
 * De drie aandachtspunten. De eerste twee komen letterlijk uit de video; de
 * derde is toegevoegd zodat alle drie de bronsystemen in beeld komen.
 */
export const FLAGS: Flag[] = [
  {
    id: 'F1',
    source: 'HR',
    severity: 'attention',
    title: 'Forklift certificate expires mid-week',
    detail:
      "Jens Peeters is scheduled on Line 3 through Friday, but his forklift certificate expires on Wednesday.",
    suggestion: 'Swap in Ruben Claes from Thursday — certified until March.',
    orderId: 'O7',
  },
  {
    id: 'F2',
    source: 'ERP',
    severity: 'blocking',
    title: 'Customer has overdue invoices',
    detail:
      'Vandermeulen NV has two invoices more than 60 days overdue, totalling € 84 200.',
    suggestion: 'Clear with finance before this run starts on Tuesday.',
    orderId: 'O3',
  },
  {
    id: 'F3',
    source: 'WMS',
    severity: 'blocking',
    title: 'Raw material arrives after the run',
    detail:
      'Batch of PET granulate for this order is expected Thursday; the run is planned for Tuesday.',
    suggestion: 'Move the run to Thursday, or pull stock forward from Antwerp.',
    orderId: 'O5',
  },
]

export const ORDERS: Order[] = [
  // Line 1
  { id: 'O1', lineId: 'L1', day: 'Mon', span: 2, product: 'Detergent 5L', customer: 'Delhaize', quantity: '18 000 u', crew: ['Anke Willems', 'Elias Van Damme'] },
  { id: 'O2', lineId: 'L1', day: 'Wed', span: 3, product: 'Detergent 2L', customer: 'Colruyt', quantity: '26 500 u', crew: ['Anke Willems', 'Jan Hermans'] },

  // Line 2
  { id: 'O3', lineId: 'L2', day: 'Tue', span: 2, product: 'Surface cleaner', customer: 'Vandermeulen NV', quantity: '12 000 u', crew: ['Femke Coppens'], flagId: 'F2' },
  { id: 'O4', lineId: 'L2', day: 'Thu', span: 2, product: 'Glass cleaner', customer: 'Delhaize', quantity: '9 400 u', crew: ['Femke Coppens', 'Aline Lambert'] },

  // Line 3
  { id: 'O5', lineId: 'L3', day: 'Tue', span: 1, product: 'Bottle blend A', customer: 'Internal', quantity: '4 200 kg', crew: ['Bram De Clercq'], flagId: 'F3' },
  { id: 'O7', lineId: 'L3', day: 'Wed', span: 3, product: 'Bottle blend B', customer: 'Internal', quantity: '11 800 kg', crew: ['Jens Peeters', 'Arne Janssens'], flagId: 'F1' },

  // Line 4
  { id: 'O8', lineId: 'L4', day: 'Mon', span: 3, product: 'Retail multipack', customer: 'Colruyt', quantity: '31 000 u', crew: ['Emma Segers', 'Milan Van Damme'] },
  { id: 'O9', lineId: 'L4', day: 'Thu', span: 2, product: 'Export pallets', customer: 'Carrefour FR', quantity: '14 200 u', crew: ['Emma Segers'] },

  // Line 5
  { id: 'O10', lineId: 'L5', day: 'Mon', span: 2, product: 'Private label run', customer: 'Colruyt', quantity: '22 000 u', crew: ['Nadia Timmermans'] },
  { id: 'O11', lineId: 'L5', day: 'Thu', span: 1, product: 'Relabel batch', customer: 'Delhaize', quantity: '3 100 u', crew: ['Vince Michiels'] },
]

export const flagById = (id: string | undefined): Flag | undefined =>
  id ? FLAGS.find((f) => f.id === id) : undefined

export const orderById = (id: string): Order | undefined => ORDERS.find((o) => o.id === id)

/** Hoeveel mensen er deze week ingepland staan, ongeacht op hoeveel orders. */
export const crewCount = (): number =>
  new Set(ORDERS.flatMap((o) => o.crew)).size
