import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import type { Phase } from '../wca'

type Rect = { top: number; left: number; w: number; h: number }

type PlanningTourProps = {
  step: number
  phase: Phase
  plannedCount: number
  laneCount: number
  runCount: number
  gaps: number
  onNext: () => void
  onOpenShift: () => void
  onCloseDrawer: () => void
  onFinish: () => void
  onSkip: () => void
}

const TARGET_BY_STEP: Record<number, string | null> = {
  1: null,
  2: 'lane',
  3: 'block',
  4: 'person',
  5: 'call',
  6: 'result',
}

const TOTAL_STEPS = 6

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
  plannedCount,
  laneCount,
  runCount,
  gaps,
  onNext,
  onOpenShift,
  onCloseDrawer,
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

  const isIntro = step === 1
  // Step 6 only shows a card once the run has completed; during running the
  // user watches the real progress strip with no popup.
  if (step === 6 && phase !== 'complete') return null
  // For anchored steps we need the target; if it isn't there yet, wait.
  if (!isIntro && !rect) return null

  const cardW = isIntro ? 440 : 360
  const vw = window.innerWidth
  const vh = window.innerHeight

  let cardTop = 0
  let cardLeft = 0
  let spotStyle: CSSProperties | null = null

  if (isIntro || !rect) {
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
    const flipAbove = below + cardH > vh - 18 && rect.top - 16 - cardH > 18
    cardTop = flipAbove ? rect.top - 16 - cardH : below
    const center = rect.left + rect.w / 2 - cardW / 2
    cardLeft = Math.min(Math.max(18, center), vw - cardW - 18)
  }

  const content = stepContent(step, { plannedCount, laneCount, runCount, gaps })

  return (
    <div className="wca-tour-layer">
      {isIntro ? <div className="wca-tour-backdrop" /> : null}
      {spotStyle ? <div className="wca-tour-spot" style={spotStyle} /> : null}

      <div
        ref={cardRef}
        className={isIntro ? 'wca-tour-card wca-tour-card-intro' : 'wca-tour-card'}
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

          {step === 5 ? (
            <span className="wca-tour-hint">↑ Click the button</span>
          ) : (
            <button
              type="button"
              className="wca-tour-next"
              onClick={
                step === 1 || step === 2
                  ? onNext
                  : step === 3
                    ? onOpenShift
                    : step === 4
                      ? onCloseDrawer
                      : onFinish
              }
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
  data: { plannedCount: number; laneCount: number; runCount: number; gaps: number },
): { title: string; body: string; button: string } {
  switch (step) {
    case 1:
      return {
        title: 'Shift plan',
        body: `Each row is a team and each bar a planned shift. Today ${data.plannedCount} workers are scheduled across ${data.laneCount} lanes. In five steps we'll show how the call agent works.`,
        button: 'Start',
      }
    case 2:
      return {
        title: 'Team and shift window',
        body: 'On the left you see the team and its shift window. Warehouse Early runs from 06:00 to 14:00.',
        button: 'Next',
      }
    case 3:
      return {
        title: 'Shift block',
        body: 'The bar shows the staffing and how many spots are still open. Click it for the full list.',
        button: 'Open shift',
      }
    case 4:
      return {
        title: 'Team member',
        body: 'Per member you see status, phone number and the latest call result. Open spots are called by the agent.',
        button: 'Next',
      }
    case 5:
      return {
        title: 'Start the call agent',
        body: 'This button starts the call run: the agent calls every member, asks about their availability and processes the answer into the plan.',
        button: '',
      }
    default:
      return {
        title: 'Call run result',
        body: `All ${data.runCount} workers have been called. The status bar summarizes the result: who is available, who is not, and where planning needs to adjust. You can replan the ${data.gaps} open gaps right away.`,
        button: 'Done',
      }
  }
}
