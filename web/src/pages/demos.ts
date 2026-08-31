import { LineChart, MessageSquareWarning, PhoneCall, Factory } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Demo = {
  slug: string
  path: string
  title: string
  subtitle: string
  /** Optioneel: niet elk blok heeft nog toelichting nodig. */
  description?: string
  cta: string
  icon: LucideIcon
  featured?: boolean
}

export const demos: Demo[] = [
  {
    slug: 'workforce-call-agent',
    path: '/demo/workforce-call-agent',
    title: 'Workforce Call Agent',
    subtitle: 'Automate high-volume workforce communication',
    description:
      'An AI-powered agent that calls employees, understands their responses and turns conversations into structured operational actions.',
    cta: 'Start demo',
    icon: PhoneCall,
    featured: true,
  },
  {
    slug: 'smart-production-planning',
    path: '/demo/smart-production-planning',
    title: 'Smart Production Planning',
    subtitle: 'From planning constraints to an optimized schedule',
    description:
      'See how intelligent software can help planners respond to changing capacity, priorities and operational constraints.',
    cta: 'Explore demo',
    icon: Factory,
  },
  {
    slug: 'demand-forecasting',
    path: '/demo/demand-forecasting',
    title: 'Demand Forecasting',
    subtitle: 'Turn historical data into better decisions',
    cta: 'Explore demo',
    icon: LineChart,
  },
  {
    slug: 'complaint-agent',
    path: '/demo/complaint-agent',
    title: 'Complaint Agent',
    subtitle: 'From incoming complaint to structured follow-up',
    description:
      'See how AI can understand complaints, collect the right context and support the operational follow-up process.',
    cta: 'Explore demo',
    icon: MessageSquareWarning,
  },
]
