import { Settings, X } from 'lucide-react'
import type { DemoPerson } from '../mockPeople'

type DemoSettingsModalProps = {
  realPeople: DemoPerson[]
  toggles: Record<string, boolean>
  disabled: boolean
  onToggle: (id: string) => void
  onClose: () => void
}

export default function DemoSettingsModal({
  realPeople,
  toggles,
  disabled,
  onToggle,
  onClose,
}: DemoSettingsModalProps) {
  return (
    <div className="wca-overlay" onClick={onClose}>
      <div
        className="wca-settings-card"
        role="dialog"
        aria-label="Demo settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--accent-brand)]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="ico-heading text-[19px] font-bold text-[var(--text-white)]">
                Demo settings
              </h2>
              <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
                Enable a real phone call for a person in the run
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border-brand)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-deep)]">
                <th className="wca-settings-th">Name</th>
                <th className="wca-settings-th">Role</th>
                <th className="wca-settings-th">Phone</th>
                <th className="wca-settings-th text-center">Live call</th>
              </tr>
            </thead>
            <tbody>
              {realPeople.map((person) => (
                <tr key={person.id} className="border-t border-[var(--border-brand)]">
                  <td className="wca-settings-td ico-heading font-semibold text-[var(--text-white)]">
                    {person.name}
                  </td>
                  <td className="wca-settings-td text-[var(--text-body)]">{person.role}</td>
                  <td className="wca-settings-td font-mono text-[13px] text-[var(--text-muted)]">
                    {person.phone}
                  </td>
                  <td className="wca-settings-td text-center">
                    <LiveCallToggle
                      checked={toggles[person.id] ?? false}
                      disabled={disabled}
                      label={`Enable live call for ${person.name}`}
                      onToggle={() => onToggle(person.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {disabled ? (
          <p className="mt-3 font-['IBM_Plex_Sans'] text-[12px] text-[var(--text-muted)]">
            Live-call selection is locked while a run is in progress. Reset the demo to change it.
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Schakelaar voor "bel deze persoon echt". Vervangt de checkbox omdat de demo
 * op een touchscreen gegeven wordt: groter raakvlak en in één oogopslag te
 * zien of er live gebeld gaat worden.
 *
 * Geen Radix Switch — die zit niet in de dependencies. De data-state komt
 * overeen met wat `.ico-switch` in ico.css al verwacht.
 */
function LiveCallToggle({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      data-state={checked ? 'checked' : 'unchecked'}
      className="ico-switch relative inline-flex h-[26px] w-[48px] shrink-0 items-center rounded-full border border-[var(--border-brand)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="pointer-events-none block h-[20px] w-[20px] rounded-full shadow transition-transform"
        style={{ transform: checked ? 'translateX(25px)' : 'translateX(3px)' }}
      />
    </button>
  )
}
