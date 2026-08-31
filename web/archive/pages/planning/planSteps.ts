import type { TourStep } from '../ui/TourOverlay'
import type { Phase } from './data'

/**
 * De vier haltes van de rondleiding: wat er klaarligt, één druk op de knop,
 * wat er dan gebeurt, en wat er voor de planner overblijft. Geen enkele stap
 * legt uit hoe het bord in elkaar zit — dat is decor.
 */
export function planSteps(
  phase: Phase,
  orderCount: number,
  insightCount: number,
): TourStep[] {
  return [
    {
      target: 'inputs',
      title: 'Everything the plan needs',
      body: `${orderCount} orders for next week, and the people who could run them. Today a planner pulls this together by hand from four different systems, and it takes an afternoon.`,
      button: 'Next',
    },
    {
      target: 'generate',
      title: 'One button does the pulling',
      body: 'ERP for orders and invoices, WMS for material, HR for absence, SharePoint for certificates. Nobody copies anything into a spreadsheet.',
      // De gids drukt zelf; de volgende stap komt vanzelf zodra de run loopt.
      hint: '↑ Press the button',
    },
    {
      target: 'board',
      title: 'The plan builds itself',
      body: 'Every order gets a line, a day and someone qualified to run it — checked against all four systems as it lands.',
      hint: 'Planning…',
      ready: phase !== 'idle',
    },
    {
      target: 'insights',
      title: 'What is left for the planner',
      body: `${insightCount} things worth a look, each with the system that raised it and a way to settle it. That is the job now: not building the plan, but checking the exceptions.`,
      button: 'Done',
      ready: phase === 'complete',
    },
  ]
}
