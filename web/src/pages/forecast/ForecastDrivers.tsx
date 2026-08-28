const DRIVERS: { label: string; value: number }[] = [
  { label: 'Seasonality', value: 0.34 },
  { label: 'Promotions', value: 0.21 },
  { label: 'FC 2w temp avg', value: 0.08 },
  { label: 'Holidays BE', value: 0.06 },
  { label: 'Store footfall', value: 0.05 },
  { label: 'Price index', value: -0.11 },
]

const MAX_ABS = 0.34

type DriversProps = {
  insight: string
}

export default function ForecastDrivers({ insight }: DriversProps) {
  return (
    <section className="fc-card" data-tour="fc-drivers" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="fc-card-head">
        <div className="fc-card-title">Why this forecast</div>
        <div className="fc-card-sub">Average driver contribution on the filtered selection</div>
      </div>

      <div style={{ padding: '0 18px 6px' }}>
        {DRIVERS.map((d) => {
          const positive = d.value >= 0
          const widthPct = (Math.abs(d.value) / MAX_ABS) * 50
          return (
            <div key={d.label} className="fc-driver-row">
              <div className="fc-driver-label">{d.label}</div>
              <div className="fc-driver-track">
                <div className="fc-driver-mid" />
                <div
                  className="fc-driver-fill"
                  style={{
                    background: positive ? '#635BFF' : '#DF1B41',
                    width: `${widthPct}%`,
                    left: positive ? '50%' : `${50 - widthPct}%`,
                  }}
                />
              </div>
              <div
                className="fc-driver-val fc-num"
                style={{ color: positive ? '#0E6245' : '#A41C4E' }}
              >
                {positive ? '+' : '\u2212'}
                {Math.abs(d.value).toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', padding: '14px 18px 18px' }}>
        <p className="fc-insight">{insight}</p>
        {/* Stond hier een uitnodiging om cellen te bewerken; die kunnen niet
            meer, dus die tekst beloofde iets wat de demo niet doet. */}
        <div className="fc-hint">
          Every number in the table above traces back to these drivers.
        </div>
      </div>
    </section>
  )
}
