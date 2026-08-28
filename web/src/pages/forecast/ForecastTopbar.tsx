import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import '../workforce.css'

type ForecastTopbarProps = {
  tourRunning: boolean
  tourCompleted: boolean
  onStartTour: () => void
}

// Reuses the exact Workforce Call Agent topbar (glow, pills, tour button, logo).
// Only the breadcrumb is specific to the Forecast Detail page.
export default function ForecastTopbar({
  tourRunning,
  tourCompleted,
  onStartTour,
}: ForecastTopbarProps) {
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
          <span style={{ color: '#8A8A90' }}>Forecasting</span>
          <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.24)' }}>
            /
          </span>
          <span className="wca-topbar-crumb-current">Forecast Detail</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onStartTour} className="wca-tour-btn">
          <span className="wca-tour-btn-dot" />
          {tourRunning ? 'Tour active · Esc to stop' : tourCompleted ? 'Tour again' : 'Start tour'}
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
