import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import type { Phase } from './data'
import '../workforce.css'

type Rect = { top: number; left: number; w: number; h: number }

type PlanTourProps = {
  step: number
  phase: Phase
  orderCount: number
  insightCount: number
  onNext: () => void
  onFinish: () => void
  onSkip: () => void
}

/**
 * Rondleiding voor Smart Production Planning.
 *
 * Vier haltes langs wat de applicatie doet, niet langs hoe het bord in elkaar
 * zit: wat er klaarligt, één druk op de knop, wat er dan gebeurt, en wat er
 * voor de planner overblijft.
 *
 * De Call Agent heeft een eigen tour in ui/PlanningTour.tsx — verwarrend
 * genoeg net zo genoemd. Die is complexer (zoom, drawer, vasthoudende stap),
 * dus dit is geen kopie. Komt er een vierde demo met een rondleiding bij, dan
 * is het tijd om de meetlogica één keer te delen in plaats van een derde keer
 * te schrijven.
 */
const TARGET_BY_STEP: Record<number, string> = {
  1: 'inputs',
  2: 'generate',
  3: 'board',
  4: 'insights',
}

const TOTAL_STEPS = 4

function measure(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, w: r.width, h: r.height }
}

function differs(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a !== b
  return (
    Math.abs(a.top - b.top) > 1 ||
    Math.abs(a.left - b.left) > 1 ||
    Math.abs(a.w - b.w) > 1 ||
    Math.abs(a.h - b.h) > 1
  )
}

export default function PlanTour({
  step,
  phase,
  orderCount,
  insightCount,
  onNext,
  onFinish,
  onSkip,
}: PlanTourProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(180)

  const selector = TARGET_BY_STEP[step] ?? 'inputs'

  // Blijven meten: de panelen groeien terwijl de run loopt.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setRect((prev) => {
        const next = measure(selector)
        return differs(prev, next) ? next : prev
      })
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [selector])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  // Stap 3 hoort bij de lopende run, stap 4 bij het resultaat.
  if (step === 3 && phase === 'idle') return null
  if (step === 4 && phase !== 'complete') return null
  if (!rect) return null

  const cardW = 380
  const vw = window.innerWidth
  const vh = window.innerHeight

  const spotStyle: CSSProperties = {
    top: rect.top - 8,
    left: rect.left - 8,
    width: rect.w + 16,
    height: rect.h + 16,
  }

  // Onder het doel als het past, anders erboven, anders ernaast. Die laatste
  // is niet theoretisch: de zijpanelen zijn bijna schermhoog, en zonder deze
  // tak belandt de kaart onder de onderrand.
  const fitsBelow = rect.top + rect.h + 16 + cardH <= vh - 18
  const fitsAbove = rect.top - 16 - cardH >= 18

  let cardTop: number
  let cardLeft: number

  if (fitsBelow || fitsAbove) {
    cardTop = fitsBelow ? rect.top + rect.h + 16 : rect.top - 16 - cardH
    const centred = rect.left + rect.w / 2 - cardW / 2
    cardLeft = Math.min(Math.max(18, centred), vw - cardW - 18)
  } else {
    // Naast het doel, aan de kant met de meeste ruimte.
    const roomRight = vw - (rect.left + rect.w) - 16
    const toRight = roomRight >= cardW + 18
    cardLeft = toRight ? rect.left + rect.w + 16 : Math.max(18, rect.left - 16 - cardW)
    cardTop = Math.min(Math.max(18, rect.top + rect.h / 2 - cardH / 2), vh - cardH - 18)
  }

  const content = stepContent(step, { orderCount, insightCount })

  return (
    <div className="wca-tour-layer">
      <div className="wca-tour-spot" style={spotStyle} />

      <div ref={cardRef} className="wca-tour-card" style={{ top: cardTop, left: cardLeft }}>
        <div className="wca-tour-eyebrow">
          <span className="wca-tour-step">
            Step {step} of {TOTAL_STEPS}
          </span>
          <button type="button" className="wca-tour-skip" onClick={onSkip}>
            Skip <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="wca-tour-title">{content.title}</h3>
        <p className="wca-tour-body">{content.body}</p>

        <div className="wca-tour-foot">
          <div className="wca-tour-dots">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={i + 1 === step ? 'wca-tour-pdot wca-tour-pdot-on' : 'wca-tour-pdot'}
              />
            ))}
          </div>

          {step === 2 ? (
            // De gids drukt zelf; stap 3 komt vanzelf zodra de run loopt.
            <span className="wca-tour-hint">↑ Press the button</span>
          ) : step === 3 ? (
            <span className="wca-tour-hint">Planning…</span>
          ) : (
            <button
              type="button"
              className="wca-tour-next"
              onClick={step === 4 ? onFinish : onNext}
            >
              {content.button}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function stepContent(
  step: number,
  data: { orderCount: number; insightCount: number },
): { title: string; body: string; button: string } {
  switch (step) {
    case 1:
      return {
        title: 'Everything the plan needs',
        body: `${data.orderCount} orders for next week, and the people who could run them. Today a planner pulls this together by hand from four different systems, and it takes an afternoon.`,
        button: 'Next',
      }
    case 2:
      return {
        title: 'One button does the pulling',
        body: 'ERP for orders and invoices, WMS for material, HR for absence, SharePoint for certificates. Nobody copies anything into a spreadsheet.',
        button: 'Next',
      }
    case 3:
      return {
        title: 'The plan builds itself',
        body: 'Every order gets a line, a day and someone qualified to run it — checked against all four systems as it lands.',
        button: 'Next',
      }
    default:
      return {
        title: 'What is left for the planner',
        body: `${data.insightCount} things worth a look, each with the system that raised it and a way to settle it. That is the job now: not building the plan, but checking the exceptions.`,
        button: 'Done',
      }
  }
}
