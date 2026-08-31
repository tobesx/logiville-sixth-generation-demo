import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import type { Phase } from '../wca'

type Rect = { top: number; left: number; w: number; h: number }

type PlanningTourProps = {
  step: number
  phase: Phase
  /** Iedereen die voor morgen ingepland staat. */
  scheduled: number
  /** Wie nog geen antwoord heeft, met de hand gezet of gebeld. */
  stillToCall: number
  /** Bevestigd beschikbaar. */
  confirmed: number
  /** Alles wat na de run nog aandacht vraagt. */
  gaps: number
  /** De HR-overlay staat in beeld; dan heeft een kaart ernaast geen zin. */
  overlayOpen: boolean
  /** Er is minstens één gesprek afgerond, dus er staat een transcript. */
  hasCalledAnswer: boolean
  /** Het antwoord van de vastgezette kop is verwerkt. */
  pinnedAnswered: boolean
  onNext: () => void
  onFinish: () => void
  onSkip: () => void
}

/**
 * Vijf haltes: het plan, wat er nog te doen staat, waarvoor de agent dient,
 * hoe één antwoord eruitziet, en wat de planner eraan overhoudt.
 */
const TARGET_BY_STEP: Record<number, string | null> = {
  1: 'plan',
  2: 'runstrip',
  3: 'call',
  4: 'card',
  5: 'result',
}

const TOTAL_STEPS = 5

/**
 * Hoe vaak de spotlight zijn doel opmeet. Stond op elke frame, en elke meting
 * is een getBoundingClientRect() — een geforceerde layout over de hele DOM, op
 * Forecast Detail een grid van zestien kolommen. Tien keer per seconde volgt
 * een schuivend paneel nog steeds vloeiend genoeg, en de main thread mag
 * tussendoor slapen.
 */
const MEASURE_INTERVAL_MS = 100

function measure(selector: string | null): Rect | null {
  if (!selector) return null
  const el = document.querySelector(`[data-tour="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, w: r.width, h: r.height }
}

function rectsDiffer(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a !== b
  return (
    Math.abs(a.top - b.top) > 1 ||
    Math.abs(a.left - b.left) > 1 ||
    Math.abs(a.w - b.w) > 1 ||
    Math.abs(a.h - b.h) > 1
  )
}

export default function PlanningTour({
  step,
  phase,
  scheduled,
  stillToCall,
  confirmed,
  gaps,
  overlayOpen,
  hasCalledAnswer,
  pinnedAnswered,
  onNext,
  onFinish,
  onSkip,
}: PlanningTourProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(180)

  const selector = TARGET_BY_STEP[step] ?? null

  // Continuously measure the target so the spotlight tracks slide-ins, scroll and resize.
  useEffect(() => {
    const sample = () =>
      setRect((prev) => {
        const next = measure(selector)
        return rectsDiffer(prev, next) ? next : prev
      })
    sample()
    const timer = window.setInterval(sample, MEASURE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [selector])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  })

  // Escape always exits.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  // De HR-overlay dekt het scherm; een kaart die naar de knop eronder wijst
  // slaat dan nergens op.
  if (step === 3 && overlayOpen) return null
  // Stap 4 wijst naar het eerste transcript, dus die moet er zijn.
  if (step === 4 && !hasCalledAnswer) return null
  if (step === 5 && phase === 'idle') return null
  // Wachten tot het anker er is; panelen schuiven in.
  if (!rect) return null

  const cardW = 380
  const vw = window.innerWidth
  const vh = window.innerHeight

  let cardTop = 0
  let cardLeft = 0
  let spotStyle: CSSProperties | null = null

  if (!rect) {
    cardTop = Math.max(18, (vh - cardH) / 2)
    cardLeft = Math.max(18, (vw - cardW) / 2)
  } else {
    spotStyle = {
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.w + 16,
      height: rect.h + 16,
    }
    const below = rect.top + rect.h + 16
    const above = rect.top - 16 - cardH
    let beside = false

    if (below + cardH <= vh - 18) {
      cardTop = below
    } else if (above > 18) {
      cardTop = above
    } else {
      // Doel te hoog voor onder of boven — bijvoorbeeld een paneel over de
      // volle schermhoogte. Dan ernaast, verticaal gecentreerd.
      beside = true
      cardTop = Math.max(18, Math.min((vh - cardH) / 2, vh - cardH - 18))
    }

    if (beside) {
      const leftOfTarget = rect.left - cardW - 16
      cardLeft =
        leftOfTarget > 18 ? leftOfTarget : Math.min(rect.left + rect.w + 16, vw - cardW - 18)
    } else {
      const center = rect.left + rect.w / 2 - cardW / 2
      cardLeft = Math.min(Math.max(18, center), vw - cardW - 18)
    }
  }

  const content = stepContent(step, { scheduled, stillToCall, confirmed, gaps })

  return (
    <div className="wca-tour-layer">
      {spotStyle ? <div className="wca-tour-spot" style={spotStyle} /> : null}

      <div
        ref={cardRef}
        className="wca-tour-card"
        style={{ top: cardTop, left: cardLeft }}
      >
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

          {step === 3 ? (
            // De gebruiker drukt zelf op de knop; stap 4 komt zodra het eerste
            // gesprek is afgerond.
            <span className="wca-tour-hint">↑ Press the button</span>
          ) : (
            <button
              type="button"
              className="wca-tour-next disabled:cursor-not-allowed disabled:opacity-40"
              // Stap 4 wijst naar de kaart van de persoon die aan de lijn is.
              // Doorgaan mag pas als diens antwoord verwerkt is; Skip blijft
              // wel werken, anders zit je vast als het gesprek strandt.
              disabled={step === 4 && !pinnedAnswered}
              onClick={step === 5 ? onFinish : onNext}
            >
              {step === 4 && !pinnedAnswered ? 'Waiting for the answer…' : content.button}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function stepContent(
  step: number,
  data: { scheduled: number; stillToCall: number; confirmed: number; gaps: number },
): { title: string; body: string; button: string } {
  switch (step) {
    case 1:
      return {
        title: 'Tomorrow’s shift plan',
        body: `Six teams across the early, late and night shifts, ${data.scheduled} people in total. On paper every seat is filled. In practice none of them has confirmed that they are coming.`,
        button: 'Next',
      }
    case 2:
      return {
        title: `${data.stillToCall} still to reach`,
        body: 'This row is the work, not the progress of anything. Every worker needs a yes or a no before the plan is worth acting on — recorded by hand or heard on the phone, it counts down either way.',
        button: 'Next',
      }
    case 3:
      return {
        title: 'What the agent is for',
        body: `Reaching ${data.stillToCall} people costs a planner an afternoon on the phone. The agent places every call at once, holds the conversation in Dutch, and turns each answer into availability.`,
        button: 'Next',
      }
    case 4:
      return {
        title: 'The answer, in their own words',
        body: 'A finished call lands here with the spoken reply kept word for word, and the availability read out of it. Nothing is summarised away — the planner can always check what was actually said.',
        button: 'Next',
      }
    default:
      return {
        title: 'What the planner is left with',
        body: `${data.confirmed} of ${data.scheduled} confirmed available and ${data.gaps} to follow up, each with the conversation behind it. An afternoon of phone calls became a plan you can act on.`,
        button: 'Done',
      }
  }
}
