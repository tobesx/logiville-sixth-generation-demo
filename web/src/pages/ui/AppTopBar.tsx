import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Settings } from 'lucide-react'
import type { Phase } from '../wca'

type AppTopBarProps = {
  phase: Phase
  tourRunning: boolean
  tourCompleted: boolean
  onStartTour: () => void
  onReset: () => void
  onSettings: () => void
}

export default function AppTopBar({
  phase,
  tourRunning,
  tourCompleted,
  onStartTour,
  onReset,
  onSettings,
}: AppTopBarProps) {
  const tourLabel = tourRunning
    ? 'Tour active · Esc to stop'
    : tourCompleted
      ? 'Tour again'
      : 'Start tour'
  return (
    <div className="wca-topbar">
      <div className="wca-topbar-glow" />

      <div className="flex items-center gap-3">
        <Link to="/" className="wca-topbar-pill">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to demos
        </Link>
        <span className="wca-topbar-divider" />
        <div className="font-['IBM_Plex_Sans'] text-[13px]">
          <span style={{ color: '#8A8A90' }}>Planning</span>
          <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.24)' }}>
            /
          </span>
          <span className="wca-topbar-crumb-current">Shift plan</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {phase !== 'idle' ? (
          <button type="button" onClick={onReset} className="wca-topbar-pill">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        ) : null}
        <button type="button" onClick={onStartTour} className="wca-tour-btn">
          <span className="wca-tour-btn-dot" />
          {tourLabel}
        </button>
        <button type="button" onClick={onSettings} className="wca-topbar-pill">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
        <img
          src="/sixth-generation-logo.png"
          alt="Sixth Generation"
          className="h-6 w-auto object-contain ml-2"
        />
      </div>
    </div>
  )
}
