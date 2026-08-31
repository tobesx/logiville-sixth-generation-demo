import {
  Search,
  Database,
  LineChart,
  Boxes,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Settings,
} from 'lucide-react'

const SUB_ITEMS = ['Model Overview', 'Backtests', 'Forecast Explorer', 'Forecast Detail', 'Validation']

export default function ForecastSidebar() {
  return (
    <aside className="fc-sidebar">
      <div className="fc-search">
        <Search className="h-3.5 w-3.5" style={{ color: '#8792A2' }} />
        <input placeholder="Search" aria-label="Search" />
        <span className="fc-key">Ctrl K</span>
      </div>

      <nav className="fc-nav">
        <div className="fc-nav-item">
          <Database className="h-4 w-4" style={{ color: '#697386' }} />
          <span>Data Center</span>
          <ChevronRight className="fc-chev h-4 w-4" />
        </div>

        <div className="fc-nav-item fc-nav-forecasting">
          <LineChart className="h-4 w-4" style={{ color: '#4F46C9' }} />
          <span>Forecasting</span>
          <ChevronDown className="fc-chev h-4 w-4" style={{ color: '#4F46C9' }} />
        </div>
        <div>
          {SUB_ITEMS.map((item) => (
            <div
              key={item}
              className={item === 'Forecast Detail' ? 'fc-sub fc-sub-active' : 'fc-sub'}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="fc-nav-item">
          <Boxes className="h-4 w-4" style={{ color: '#697386' }} />
          <span>Inventory Management</span>
          <ChevronRight className="fc-chev h-4 w-4" />
        </div>
      </nav>

      <div className="fc-side-footer">
        <p className="fc-quick-label">Quick Actions</p>
        <div className="fc-quick-row">
          <Upload className="h-4 w-4" style={{ color: '#697386' }} />
          <span>Import Data</span>
        </div>
        <div className="fc-quick-row">
          <Download className="h-4 w-4" style={{ color: '#697386' }} />
          <span>Export Models</span>
        </div>
        <div className="fc-quick-row">
          <Settings className="h-4 w-4" style={{ color: '#697386' }} />
          <span>Configuration</span>
        </div>
      </div>
    </aside>
  )
}
