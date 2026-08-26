import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import type { Phase } from '../wca'

type Rect = { top: number; left: number; w: number; h: number }

type PlanningTourProps = {
  step: number
  phase: Phase
  /** Aantal calls dat klaarstaat voor de run begint. */
  queuedCount: number
  runCount: number
  gaps: number
  onNext: () => void
  /** Sluit de HR-overlay en zet het bellen in gang. */
  onStartCalls: () => void
  onFinish: () => void
  onSkip: () => void
}

/**
 * De rondleiding volgt wat de agent doet, niet hoe het planbord in elkaar zit.
 * Vier haltes: wat staat er klaar, zet het in gang, kijk hoe de antwoorden
 * binnenkomen, en wat hou je eraan over.
 */
const TARGET_BY_STEP: Record<number, string | null> = {
  1: 'runstrip',
  2: 'call',
  3: 'hr',
  4: 'answers',
  5: 'card',
}

const TOTAL_STEPS = 5

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
  queuedCount,
  runCount,
  gaps,
  onNext,
  onStartCalls,
  onFinish,
  onSkip,
}: PlanningTourProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(180)

  const selector = TARGET_BY_STEP[step] ?? null

  // Continuously measure the target so the spotlight tracks slide-ins, scroll and resize.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setRect((prev) => {
        const next = measure(selector)
        return rectsDiffer(prev, next) ? next : prev
      })
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
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

  // Stap 3 en 4 horen bij de lopende run, stap 5 bij het resultaat.
  if ((step === 3 || step === 4) && phase === 'idle') return null
  if (step === 5 && phase !== 'complete') return null
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

  const content = stepContent(step, { queuedCount, runCount, gaps })

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

          {step === 2 ? (
            // De gebruiker drukt zelf; stap 3 komt vanzelf zodra de HR-sync loopt.
            <span className="wca-tour-hint">↑ Click the button</span>
          ) : step === 4 ? (
            <span className="wca-tour-hint">Calling…</span>
          ) : (
            <button
              type="button"
              className="wca-tour-next"
              onClick={step === 3 ? onStartCalls : step === 5 ? onFinish : onNext}
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
  data: { queuedCount: number; runCount: number; gaps: number },
): { title: string; body: string; button: string } {
  switch (step) {
    case 1:
      return {
        title: `${data.queuedCount} calls, one agent`,
        body: `Nobody has been called yet. This is the workload waiting: ${data.queuedCount} people who each need a phone call about tomorrow's shift. The agent places them all at once.`,
        button: 'Next',
      }
    case 2:
      return {
        title: 'One click starts them all',
        body: 'No call list, no queue, no planner on the phone for an hour. Press the button and every conversation starts in parallel.',
        button: 'Next',
      }
    case 3:
      return {
        title: 'It pulls the numbers itself',
        body: 'The agent syncs with the HR system first, so nobody copies a phone list into a spreadsheet. Anyone without a number on file is left out — they never get dialled.',
        button: 'Start calling',
      }
    case 4:
      return {
        title: 'Answers come back while it runs',
        body: 'Every finished call lands here in the worker’s own words, and the counters at the top move with them. Nobody is waiting for a callback.',
        button: 'Next',
      }
    default:
      return {
        title: 'A conversation becomes structured data',
        body: `Each answer is classified as available, unavailable or needs follow-up, with the spoken reply kept verbatim underneath. That is what reaches the planner — ${data.runCount} conversations, and ${data.gaps} gaps to act on.`,
        button: 'Done',
      }
  }
}
