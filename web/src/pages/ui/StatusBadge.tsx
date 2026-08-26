import type { CallClassification } from '../types'
import { cn } from '../../lib/shadcn/utils'

type StatusBadgeProps = {
  classification?: CallClassification | null
  calling?: boolean
}

const badgeClasses: Record<CallClassification, string> = {
  YES: 'ico-badge-yes',
  NO: 'ico-badge-no',
  OTHER: 'ico-badge-other',
  NO_ANSWER: 'ico-badge-no-answer',
}

export default function StatusBadge({ classification, calling = false }: StatusBadgeProps) {
  if (calling) {
    return <span className="ico-status-badge ico-badge-calling">Calling...</span>
  }

  const value = classification ?? 'NO_ANSWER'
  return <span className={cn('ico-status-badge', badgeClasses[value])}>{value}</span>
}
