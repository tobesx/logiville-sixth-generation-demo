import { useEffect, useMemo, useState } from 'react'
import { Search, MoreHorizontal } from 'lucide-react'
import ForecastTopbar from './forecast/ForecastTopbar'
import TourOverlay from './ui/TourOverlay'
import { FORECAST_STEPS } from './forecast/forecastSteps'
import ForecastSidebar from './forecast/ForecastSidebar'
import ForecastGrid from './forecast/ForecastGrid'
import ForecastChart from './forecast/ForecastChart'
import ForecastDrivers from './forecast/ForecastDrivers'
import {
  CATEGORIES,
  SKU_COUNT,
  WEEK_LABELS,
  buildSkus,
  cellValue,
  fmt,
  fmtPct,
  isAlert,
  type Category,
  type Sku,
} from './forecast/data'
import './forecast/forecast.css'

/** Vaste lege bewerkingen — de grid is read-only, zie de opmerking hieronder. */
const NO_EDITS: Record<string, number> = Object.freeze({})

export default function ForecastDetail() {
  const allSkus = useMemo(() => buildSkus(), [])

  const [search, setSearch] = useState('')
  const [activeCats, setActiveCats] = useState<Set<Category>>(new Set())
  const [alertsOnly, setAlertsOnly] = useState(false)
  // De cellen zijn read-only: de demo draait op een touchscreen waar iemand
  // per ongeluk een cel opent en er een cijfer in achterlaat dat de volgende
  // bezoeker als echt leest. `edits` blijft bestaan omdat cellValue, isAlert
  // en de grafiek het als parameter nemen — hij is alleen altijd leeg.
  const edits: Record<string, number> = NO_EDITS
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [confidenceOn, setConfidenceOn] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [tourStep, setTourStep] = useState(0)
  const [tourCompleted, setTourCompleted] = useState(false)

  const rowHasAlert = (sku: Sku) => WEEK_LABELS.some((_, w) => isAlert(sku, w, edits))

  // search + alertsOnly filtered (used for category counts)
  const preCatFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allSkus.filter((s) => {
      if (q && !s.code.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false
      if (alertsOnly && !rowHasAlert(s)) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSkus, search, alertsOnly, edits])

  const filtered = useMemo(() => {
    if (activeCats.size === 0) return preCatFiltered
    return preCatFiltered.filter((s) => activeCats.has(s.category))
  }, [preCatFiltered, activeCats])

  const catCounts = useMemo(() => {
    const map = new Map<Category, number>()
    for (const c of CATEGORIES) map.set(c, 0)
    for (const s of preCatFiltered) map.set(s.category, (map.get(s.category) ?? 0) + 1)
    return map
  }, [preCatFiltered])

  // series across visible rows
  const { forecast, adjusted, prevYear, budget } = useMemo(() => {
    const f = new Array(16).fill(0)
    const a = new Array(16).fill(0)
    const p = new Array(16).fill(0)
    const b = new Array(16).fill(0)
    for (const s of filtered) {
      for (let w = 0; w < 16; w++) {
        f[w] += s.values[w] as number
        a[w] += cellValue(s, w, edits)
        p[w] += s.prevYear[w] as number
        b[w] += s.budget[w] as number
      }
    }
    return { forecast: f, adjusted: a, prevYear: p, budget: b }
  }, [filtered, edits])

  const colTotals = adjusted
  const grandTotal = useMemo(() => colTotals.reduce((x, y) => x + y, 0), [colTotals])
  const prevYearTotal = useMemo(() => prevYear.reduce((x, y) => x + y, 0), [prevYear])
  const budgetTotal = useMemo(() => budget.reduce((x, y) => x + y, 0), [budget])

  const vsLastYear = prevYearTotal > 0 ? ((grandTotal - prevYearTotal) / prevYearTotal) * 100 : 0
  const vsBudget = budgetTotal > 0 ? ((grandTotal - budgetTotal) / budgetTotal) * 100 : 0

  const statusText =
    selectedWeek !== null
      ? `Week ${WEEK_LABELS[selectedWeek]} selected · ${fmt(colTotals[selectedWeek] ?? 0)} units`
      : 'No selection'

  const subtitle = useMemo(() => {
    const cats = activeCats.size === 0 ? 'All categories' : Array.from(activeCats).join(', ')
    return `${cats} · ${filtered.length} SKUs · 16 weeks`
  }, [activeCats, filtered.length])

  const insight = useMemo(() => {
    if (filtered.length === 0) return 'No SKUs match the current filters.'
    const avgWeek = grandTotal / 16
    let minWeek = 0
    for (let w = 1; w < 16; w++) if ((colTotals[w] ?? 0) < (colTotals[minWeek] ?? 0)) minWeek = w
    const dropPct = avgWeek > 0 ? ((avgWeek - (colTotals[minWeek] ?? 0)) / avgWeek) * 100 : 0
    const pyWeek = prevYear[minWeek] ?? 0
    const vsPy = pyWeek > 0 ? (((colTotals[minWeek] ?? 0) - pyWeek) / pyWeek) * 100 : 0
    return `Week ${WEEK_LABELS[minWeek]} drops ${Math.round(dropPct)} % below the horizon average across ${filtered.length} SKUs. Against last year the same week sits at ${fmtPct(vsPy)}.`
  }, [filtered.length, grandTotal, colTotals, prevYear])

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // handlers
  const toggleCategory = (c: Category) =>
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectWeek = (w: number) => setSelectedWeek((prev) => (prev === w ? null : w))



  return (
    <div className="fc-app">
      <ForecastTopbar
        tourRunning={tourStep > 0}
        tourCompleted={tourCompleted}
        onStartTour={() => setTourStep(1)}
      />

      <div className="fc-body">
        <ForecastSidebar />

        <div className="fc-content">
          {/* page header */}
          <div style={{ padding: '26px 0 0', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="fc-badge">FORECAST DATA · AUTUMN-PLAN-W35</span>
              <h1
                className="fc-sat"
                style={{
                  fontSize: 33,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                  margin: '10px 0 8px',
                  color: '#0A2540',
                }}
              >
                Weekly quantities per SKU
              </h1>
              <div className="fc-meta" style={{ fontSize: 12.5, color: '#697386' }}>
                <Meta label="Model" value="Northbay Retail v4" />
                <Sep /> <Meta label="Algorithm" value="LightGBM" />
                <Sep /> <Meta label="Horizon" value="16w" />
                <Sep /> <Meta label="Accuracy" value="93.4 %" />
                <Sep /> <Meta label="Status" value="Completed" />
                <Sep /> <Meta label="Inputs" value="7 drivers" />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span className="fc-counter">Read-only</span>
              <button type="button" className="fc-icon-btn" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* filter bar */}
          <div
            style={{
              padding: '20px 0 0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div className="fc-filter-input">
              <Search className="h-3.5 w-3.5" style={{ color: '#8792A2' }} />
              <input
                placeholder="Search SKU code or product name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {CATEGORIES.map((c) => {
              const on = activeCats.has(c)
              return (
                <button
                  key={c}
                  type="button"
                  className={on ? 'fc-chip fc-chip-on' : 'fc-chip'}
                  onClick={() => toggleCategory(c)}
                >
                  {c}
                  <span className="fc-chip-count">{catCounts.get(c) ?? 0}</span>
                </button>
              )
            })}

            <span className="fc-vdiv" />
            <button
              type="button"
              className={alertsOnly ? 'fc-chip fc-chip-alert-on' : 'fc-chip'}
              onClick={() => setAlertsOnly((v) => !v)}
            >
              Alerts only
            </button>

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontSize: 12,
                color: '#697386',
              }}
            >
              <span className="fc-num">
                Showing {filtered.length} of {SKU_COUNT} SKUs × 16 weeks
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="fc-legend-sw" style={{ background: '#635BFF' }} /> edited
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="fc-legend-sw" style={{ background: '#DF1B41' }} /> alert
              </span>
            </div>
          </div>

          {/* grid */}
          <div style={{ padding: '20px 0 0' }}>
            <ForecastGrid
              skus={filtered}
              edits={edits}
              checked={checked}
              selectedWeek={selectedWeek}
              statusText={statusText}
              colTotals={colTotals}
              grandTotal={grandTotal}
              onToggleCheck={toggleCheck}
              onSelectWeek={selectWeek}
            />
          </div>

          {/* bottom row */}
          <div className="fc-bottom" style={{ padding: '20px 0 32px' }}>
            <ForecastChart
              forecast={forecast}
              adjusted={adjusted}
              prevYear={prevYear}
              budget={budget}
              confidenceOn={confidenceOn}
              onToggleConfidence={() => setConfidenceOn((v) => !v)}
              selectedWeek={selectedWeek}
              subtitle={subtitle}
              totalForecast={grandTotal}
              vsLastYear={vsLastYear}
              vsBudget={vsBudget}
            />
            <ForecastDrivers insight={insight} />
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fc-toast">
          <span className="fc-toast-dot" />
          {toast}
        </div>
      ) : null}

      {tourStep > 0 ? (
        <TourOverlay
          step={tourStep}
          steps={FORECAST_STEPS}
          onNext={() => setTourStep((step) => step + 1)}
          onFinish={() => {
            setTourStep(0)
            setTourCompleted(true)
          }}
          onSkip={() => setTourStep(0)}
        />
      ) : null}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <strong style={{ color: '#0A2540', fontWeight: 700 }}>{value}</strong>
    </span>
  )
}

function Sep() {
  return <span style={{ color: '#CFD7E0', margin: '0 8px' }}>|</span>
}
