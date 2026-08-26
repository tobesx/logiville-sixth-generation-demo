import { WEEK_LABELS, fmt, fmtPct } from './data'

type ChartProps = {
  forecast: number[]
  adjusted: number[]
  prevYear: number[]
  budget: number[]
  hasEdits: boolean
  confidenceOn: boolean
  onToggleConfidence: () => void
  selectedWeek: number | null
  subtitle: string
  totalForecast: number
  vsLastYear: number
  vsBudget: number
}

const L = 42
const R = 14
const T = 8
const B = 26
const W = 700
const H = 208
const PLOT_W = W - L - R
const PLOT_TOP = T
const PLOT_BOTTOM = H - B
const PLOT_H = PLOT_BOTTOM - PLOT_TOP

const xAt = (i: number) => L + (i / 15) * PLOT_W

function line(arr: number[], yFn: (v: number) => number): string {
  return arr.map((v, i) => `${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ')
}

export default function ForecastChart({
  forecast,
  adjusted,
  prevYear,
  budget,
  hasEdits,
  confidenceOn,
  onToggleConfidence,
  selectedWeek,
  subtitle,
  totalForecast,
  vsLastYear,
  vsBudget,
}: ChartProps) {
  const band = forecast.map((v, i) => {
    const pct = 0.07 + 0.16 * (i / 15)
    return { upper: v * (1 + pct), lower: v * (1 - pct) }
  })

  const rawMax = Math.max(
    ...forecast,
    ...adjusted,
    ...prevYear,
    ...budget,
    ...(confidenceOn ? band.map((b) => b.upper) : [0]),
    1,
  )
  const maxVal = rawMax * 1.08
  const yAt = (v: number) => PLOT_BOTTOM - (v / maxVal) * PLOT_H

  const gridFracs = [0, 0.25, 0.5, 0.75, 1]
  const bandPath =
    'M ' +
    band.map((b, i) => `${xAt(i).toFixed(1)},${yAt(b.upper).toFixed(1)}`).join(' L ') +
    ' L ' +
    band
      .map((_b, i) => `${xAt(15 - i).toFixed(1)},${yAt(band[15 - i]!.lower).toFixed(1)}`)
      .join(' L ') +
    ' Z'

  const vsBudgetPositive = vsBudget >= 0

  return (
    <section className="fc-card" style={{ overflow: 'hidden' }}>
      <div className="fc-card-head" style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="fc-card-title">Total volume — forecast vs. adjusted vs. last year</div>
          <div className="fc-card-sub">{subtitle}</div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#3C4257' }}>Confidence interval</span>
            <div
              className={confidenceOn ? 'fc-toggle fc-toggle-on' : 'fc-toggle'}
              onClick={onToggleConfidence}
              role="switch"
              aria-checked={confidenceOn}
              aria-label="Confidence interval"
            >
              <div className="fc-toggle-knob" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#697386' }}>
            <LegendItem color="#635BFF" label="Model forecast" />
            <LegendItem color="#0A2540" label="Adjusted" />
            <LegendItem color="#8792A2" label="Previous year" />
            <LegendItem color="#4F46C9" label="Budget" dotted />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        {/* Het `height`-attribuut accepteert geen `auto`; via CSS wel, en dan
            leidt de browser de hoogte af uit de aspect ratio van de viewBox. */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto' }}
        >
          {gridFracs.map((f) => {
            const y = PLOT_BOTTOM - f * PLOT_H
            return (
              <g key={f}>
                <line
                  x1={L}
                  x2={W - R}
                  y1={y}
                  y2={y}
                  stroke={f === 0 ? '#DCE3EB' : '#E6EBF1'}
                  strokeWidth={1}
                />
                <text
                  x={L - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="#8792A2"
                  fontFamily="IBM Plex Sans"
                >
                  {fmt(maxVal * f)}
                </text>
              </g>
            )
          })}

          {[0, 3, 6, 9, 12, 15].map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#8792A2"
              fontFamily="IBM Plex Sans"
            >
              {WEEK_LABELS[i]}
            </text>
          ))}

          {confidenceOn ? <path d={bandPath} fill="rgba(99,91,255,0.1)" stroke="none" /> : null}

          {selectedWeek !== null ? (
            <line
              x1={xAt(selectedWeek)}
              x2={xAt(selectedWeek)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="#635BFF"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {/* previous year */}
          <polyline
            points={line(prevYear, yAt)}
            fill="none"
            stroke="#8792A2"
            strokeWidth={1.8}
          />
          {/* budget */}
          <polyline
            points={line(budget, yAt)}
            fill="none"
            stroke="#4F46C9"
            strokeWidth={1.8}
            strokeDasharray="2 4"
          />
          {/* model forecast */}
          <polyline
            points={line(forecast, yAt)}
            fill="none"
            stroke="#635BFF"
            strokeWidth={2.4}
          />
          {/* adjusted */}
          <polyline
            points={line(adjusted, yAt)}
            fill="none"
            stroke="#0A2540"
            strokeWidth={2.4}
            strokeDasharray={hasEdits ? undefined : '2 4'}
            opacity={hasEdits ? 1 : 0.55}
          />

          {selectedWeek !== null ? (
            <>
              <circle
                cx={xAt(selectedWeek)}
                cy={yAt(adjusted[selectedWeek]!)}
                r={5}
                fill="#FFFFFF"
              />
              <circle
                cx={xAt(selectedWeek)}
                cy={yAt(adjusted[selectedWeek]!)}
                r={3.5}
                fill="#635BFF"
              />
            </>
          ) : null}
        </svg>
      </div>

      <div className="fc-kpi-strip">
        <div className="fc-kpi">
          <div className="fc-kpi-label">Total forecast</div>
          <div className="fc-kpi-val">{fmt(totalForecast)}</div>
        </div>
        <div className="fc-kpi">
          <div className="fc-kpi-label">vs. last year</div>
          <div className="fc-kpi-val" style={{ color: '#0E6245' }}>
            {fmtPct(vsLastYear)}
          </div>
        </div>
        <div className="fc-kpi">
          <div className="fc-kpi-label">vs. budget</div>
          <div className="fc-kpi-val" style={{ color: vsBudgetPositive ? '#0E6245' : '#A41C4E' }}>
            {fmtPct(vsBudget)}
          </div>
        </div>
      </div>
    </section>
  )
}

function LegendItem({ color, label, dotted }: { color: string; label: string; dotted?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <svg width={16} height={8}>
        <line
          x1={0}
          y1={4}
          x2={16}
          y2={4}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dotted ? '2 3' : undefined}
        />
      </svg>
      {label}
    </span>
  )
}
