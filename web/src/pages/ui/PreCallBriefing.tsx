import { ListChecks, PhoneCall, Users } from 'lucide-react'

type PreCallBriefingProps = {
  rosterTotal: number
  phoneCount: number
  liveEnabled: number
  callCount: number
}

const steps = [
  { icon: PhoneCall, text: 'Retrieve phone numbers from the HR system' },
  { icon: Users, text: 'Call every worker in the plan in parallel' },
  { icon: ListChecks, text: 'Classify every answer into availability, shift and follow-up' },
]

export default function PreCallBriefing({
  rosterTotal,
  phoneCount,
  liveEnabled,
  callCount,
}: PreCallBriefingProps) {
  return (
    <div className="flex h-full flex-col p-6">
      <div>
        <h3 className="ico-section-label">The agent will</h3>
        <div className="mt-3 space-y-2.5">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.text} className="wca-briefing-row">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--accent-brand)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-['IBM_Plex_Sans'] text-[14px] leading-snug text-[var(--text-body)]">
                  {step.text}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="ico-section-label">Call script</h3>
        <div className="wca-script-card mt-3">
          <span className="wca-script-quote">
            “Hi <span className="wca-script-token">{'{name}'}</span>, this is the Logiville planning
            assistant. You're scheduled for the early shift tomorrow, 6 to 2. Can you make it?”
          </span>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="wca-briefing-footer">
          <strong className="text-[var(--text-white)]">{rosterTotal}</strong> workers ·{' '}
          <strong className="text-[var(--text-white)]">{phoneCount}</strong> phone numbers on file ·{' '}
          <strong className="text-[var(--text-white)]">{liveEnabled}</strong> live calls enabled
        </div>
        <div className="mt-2 text-center font-['IBM_Plex_Sans'] text-[12px] text-[var(--text-muted)]">
          {callCount} workers will be called in this run
        </div>
      </div>
    </div>
  )
}
