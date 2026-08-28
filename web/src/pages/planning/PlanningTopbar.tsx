import { Link } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import '../workforce.css'

type PlanningTopbarProps = {
  tourRunning: boolean
  tourCompleted: boolean
  onStartTour: () => void
}

// Zelfde topbar als de Call Agent en Forecast Detail — alleen de breadcrumb
// is van deze pagina.
export default function PlanningTopbar({
  tourRunning,
  tourCompleted,
  onStartTour,
}: PlanningTopbarProps) {
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
          <span className="wca-topbar-crumb-current">Production plan</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onStartTour} className="wca-tour-btn">
          <span className="wca-tour-btn-dot" />
          {tourRunning ? 'Tour active · Esc to stop' : tourCompleted ? 'Tour again' : 'Start tour'}
        </button>
        <button type="button" className="wca-topbar-pill">
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
