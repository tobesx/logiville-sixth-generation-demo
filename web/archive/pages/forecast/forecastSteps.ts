import type { TourStep } from '../ui/TourOverlay'

/**
 * Korte rondleiding langs de drie panelen.
 *
 * Deze demo doet niets — het is een leesbaar scherm dat laat zien wat er
 * mogelijk is. De tour licht daarom alleen toe wat je ziet en belooft geen
 * handelingen die er niet zijn.
 */
export const FORECAST_STEPS: TourStep[] = [
  {
    target: 'fc-grid',
    title: 'The numbers per SKU',
    body: 'Sixteen weeks of forecast for every product, shaded by volume so the busy weeks stand out. The red cells are the ones a planner would look at first.',
    button: 'Next',
  },
  {
    target: 'fc-chart',
    title: 'The same weeks as a curve',
    body: 'Total volume against last year and against budget, with a confidence band around the forecast. Filtering the table redraws it.',
    button: 'Next',
  },
  {
    target: 'fc-drivers',
    title: 'Why the model says so',
    body: 'What pushed the numbers up or down — seasonality, promotions, weather, holidays — and by how much. A forecast you cannot explain is one nobody acts on.',
    button: 'Done',
  },
]
