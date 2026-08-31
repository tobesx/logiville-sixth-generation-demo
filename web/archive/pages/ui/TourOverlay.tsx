import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import '../workforce.css'

export type TourStep = {
  /** Waarde van het `data-tour`-attribuut op het element dat oplicht. */
  target: string
  title: string
  body: string
  /** Knoptekst. Ontbreekt hij, dan komt er een hint in plaats van een knop. */
  button?: string
  /** Tekst als de stap op iets buiten de tour wacht, zoals een lopende run. */
  hint?: string
  /** Op false blijft de stap onzichtbaar tot hij aan de beurt is. */
  ready?: boolean
}

type TourOverlayProps = {
  /** 1-gebaseerd; 0 betekent geen rondleiding. */
  step: number
  steps: TourStep[]
  onNext: () => void
  onFinish: () => void
  onSkip: () => void
}

type Rect = { top: number; left: number; w: number; h: number }

/**
 * De spotlight, de kaart en het uitmeten daarvan — het deel dat elke
 * rondleiding hetzelfde doet.
 *
 * Geschreven na twee keer bijna dezelfde code. De Call Agent houdt zijn eigen
 * `PlanningTour`, want die doet meer: inzoomen, een drawer openen en een stap
 * die op een klik wacht. Wie die ooit hierheen haalt, moet die drie dingen
 * eerst een plek geven.
 */
/**
 * Hoe vaak de spotlight zijn doel opmeet. Stond op elke frame, en elke meting
 * is een getBoundingClientRect() — een geforceerde layout over de hele DOM, op
 * Forecast Detail een grid van zestien kolommen. Tien keer per seconde volgt
 * een schuivend paneel nog steeds vloeiend genoeg, en de main thread mag
 * tussendoor slapen.
 */
const MEASURE_INTERVAL_MS = 100

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

export default function TourOverlay({ step, steps, onNext, onFinish, onSkip }: TourOverlayProps) {
  const current = steps[step - 1]
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(180)

  const target = current?.target ?? ''

  // Het doel in beeld brengen. De Call Agent en het planbord passen op één
  // scherm, maar Forecast Detail scrollt — daar staat de grafiek onder de
  // vouw en zou de kaart naar een leeg stuk scherm wijzen.
  //
  // Staat bewust vóór de meting hieronder, en springt zonder animatie. Met
  // `behavior: 'smooth'` mat de eerste meting de positie van vóór de scroll,
  // en jaagde de kaart een halve seconde lang het anker achterna — op een
  // Raspberry Pi lang genoeg om ernaast te tikken.
  useEffect(() => {
    if (!target) return
    const el = document.querySelector(`[data-tour="${target}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [target])

  // Blijven meten: panelen groeien en schuiven terwijl een demo loopt.
  useEffect(() => {
    if (!target) return
    const sample = () =>
      setRect((prev) => {
        const next = measure(target)
        return differs(prev, next) ? next : prev
      })
    sample()
    const timer = window.setInterval(sample, MEASURE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [target])

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

  if (!current) return null
  if (current.ready === false) return null
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
  // is niet de uitzondering: veel ankers zijn panelen van bijna schermhoogte,
  // en zonder deze tak belandt de kaart onder de onderrand.
  const fitsBelow = rect.top + rect.h + 16 + cardH <= vh - 18
  const fitsAbove = rect.top - 16 - cardH >= 18

  let cardTop: number
  let cardLeft: number

  // De 18px-ondergrens komt als laatste. Andersom won de bovengrens zodra het
  // venster korter of smaller was dan de kaart, en dan zette die berekening de
  // kaart buiten beeld in plaats van tegen de rand.
  if (fitsBelow || fitsAbove) {
    cardTop = fitsBelow ? rect.top + rect.h + 16 : rect.top - 16 - cardH
    const centred = rect.left + rect.w / 2 - cardW / 2
    cardLeft = Math.max(18, Math.min(centred, vw - cardW - 18))
  } else {
    const roomRight = vw - (rect.left + rect.w) - 16
    const toRight = roomRight >= cardW + 18
    cardLeft = toRight ? rect.left + rect.w + 16 : Math.max(18, rect.left - 16 - cardW)
    cardTop = Math.max(18, Math.min(rect.top + rect.h / 2 - cardH / 2, vh - cardH - 18))
  }

  const isLast = step === steps.length

  return (
    <div className="wca-tour-layer">
      <div className="wca-tour-spot" style={spotStyle} />

      <div ref={cardRef} className="wca-tour-card" style={{ top: cardTop, left: cardLeft }}>
        <div className="wca-tour-eyebrow">
          <span className="wca-tour-step">
            Step {step} of {steps.length}
          </span>
          <button type="button" className="wca-tour-skip" onClick={onSkip}>
            Skip <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="wca-tour-title">{current.title}</h3>
        <p className="wca-tour-body">{current.body}</p>

        <div className="wca-tour-foot">
          <div className="wca-tour-dots">
            {steps.map((_, i) => (
              <span
                key={i}
                className={i + 1 === step ? 'wca-tour-pdot wca-tour-pdot-on' : 'wca-tour-pdot'}
              />
            ))}
          </div>

          {current.button ? (
            <button
              type="button"
              className="wca-tour-next"
              onClick={isLast ? onFinish : onNext}
            >
              {current.button}
            </button>
          ) : (
            <span className="wca-tour-hint">{current.hint}</span>
          )}
        </div>
      </div>
    </div>
  )
}
