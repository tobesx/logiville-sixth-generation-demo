import type { Worker } from './types'
import { nextShiftDateTime } from './shift'

/**
 * De twee mensen die echt gebeld kunnen worden. `mockPeople.ts` leest hier
 * alleen id, naam en telefoonnummer uit; de shifts daar worden opnieuw gezet
 * op basis van de lane waarin ze terechtkomen.
 *
 * De rest van het rooster is seed-data in `mockPeople.ts` en wordt gesimuleerd.
 * Er komt een `people`-tabel; tot die tijd staat dit hier.
 */
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
]
