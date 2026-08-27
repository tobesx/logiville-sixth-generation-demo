import { Check } from 'lucide-react'
import {
  WEEK_LABELS,
  cellValue,
  editKey,
  fmt,
  isAlert,
  rowMax,
  rowTotal,
  type Sku,
} from './data'

type GridProps = {
  skus: Sku[]
  edits: Record<string, number>
  checked: Set<string>
  selectedWeek: number | null
  statusText: string
  colTotals: number[]
  grandTotal: number
  onToggleCheck: (skuId: string) => void
  onSelectWeek: (week: number) => void
}


export default function ForecastGrid({
  skus,
  edits,
  checked,
  selectedWeek,
  statusText,
  colTotals,
  grandTotal,
  onToggleCheck,
  onSelectWeek,
}: GridProps) {
  return (
    <section className="fc-card" style={{ overflow: 'hidden' }}>
      <div className="fc-grid-strip">
        <span>
          <strong style={{ color: '#0A2540' }}>Click a week</strong> to work on the whole column.
        </span>
        <span style={{ color: '#3C4257', fontWeight: 500 }}>{statusText}</span>
      </div>

      {/* header */}
      <div className="fc-grid-row fc-grid-head">
        <div />
        <div className="fc-hd-sku">SKU</div>
        {WEEK_LABELS.map((label, w) => (
          <div
            key={label}
            className={selectedWeek === w ? 'fc-hd-week fc-hd-week-sel fc-num' : 'fc-hd-week fc-num'}
            onClick={() => onSelectWeek(w)}
          >
            {label}
          </div>
        ))}
        <div className="fc-hd-sum">Σ 16 WKS</div>
      </div>

      {/* body */}
      <div className="fc-grid-body">
        {skus.map((sku) => {
          const rMax = rowMax(sku, edits)
          return (
            <div key={sku.id} className="fc-grid-row fc-grid-brow">
              <div>
                <div
                  className={checked.has(sku.id) ? 'fc-check fc-check-on' : 'fc-check'}
                  onClick={() => onToggleCheck(sku.id)}
                  role="checkbox"
                  aria-checked={checked.has(sku.id)}
                >
                  {checked.has(sku.id) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </div>
              </div>
              <div className="fc-sku-cell">
                <div className="fc-sku-code fc-num">{sku.code}</div>
                <div className="fc-sku-name">{sku.name}</div>
              </div>
              {WEEK_LABELS.map((_, w) => {
                const value = cellValue(sku, w, edits)
                const alert = isAlert(sku, w, edits)
                const edited = edits[editKey(sku.id, w)] !== undefined
                const selCol = selectedWeek === w
                const alpha = 0.06 + 0.34 * (rMax > 0 ? value / rMax : 0)

                const cls = ['fc-cell']
                if (alert) cls.push('fc-cell-alert')
                if (edited) cls.push('fc-cell-edited')
                if (selCol) cls.push('fc-cell-selcol')
                const style = alert
                  ? undefined
                  : { background: `rgba(9,130,93,${alpha.toFixed(3)})` }

                return (
                  <div key={w} className="fc-cell-wrap">
                    <div className={cls.join(' ')} style={style}>
                      {fmt(value)}
                    </div>
                  </div>
                )
              })}
              <div className="fc-row-total">{fmt(rowTotal(sku, edits))}</div>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className="fc-grid-row fc-grid-foot">
        <div className="fc-foot-label">TOTAL</div>
        {colTotals.map((t, w) => (
          <div
            key={w}
            className={selectedWeek === w ? 'fc-foot-col fc-foot-col-sel' : 'fc-foot-col'}
          >
            {fmt(t)}
          </div>
        ))}
        <div className="fc-foot-grand">{fmt(grandTotal)}</div>
      </div>
    </section>
  )
}
