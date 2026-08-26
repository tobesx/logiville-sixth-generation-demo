import { useState } from 'react'
import { Plus, Settings, Trash2, X } from 'lucide-react'
import { Checkbox } from '../../lib/shadcn/checkbox'
import type { DemoPerson } from '../mockPeople'

type DemoSettingsModalProps = {
  realPeople: DemoPerson[]
  toggles: Record<string, boolean>
  disabled: boolean
  onToggle: (id: string) => void
  onAddPerson: (name: string, phone: string) => void
  onRemovePerson: (id: string) => void
  onClose: () => void
}

export default function DemoSettingsModal({
  realPeople,
  toggles,
  disabled,
  onToggle,
  onAddPerson,
  onRemovePerson,
  onClose,
}: DemoSettingsModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const canAdd = !disabled && name.trim().length > 0 && phone.trim().length > 0

  const handleAdd = () => {
    if (!canAdd) return
    onAddPerson(name, phone)
    setName('')
    setPhone('')
  }

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
                <th className="wca-settings-th text-center">Remove</th>
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
                    <Checkbox
                      className="wca-settings-check"
                      checked={toggles[person.id] ?? false}
                      disabled={disabled}
                      aria-label={`Enable live call for ${person.name}`}
                      onCheckedChange={() => onToggle(person.id)}
                    />
                  </td>
                  <td className="wca-settings-td text-center">
                    <button
                      type="button"
                      onClick={() => onRemovePerson(person.id)}
                      disabled={disabled}
                      aria-label={`Remove ${person.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] transition-colors hover:border-[var(--danger-brand)] hover:text-[var(--danger-brand)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <p className="ico-section-label mb-2">Add person</p>
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Name</span>
              <input
                className="ico-input h-[42px]"
                value={name}
                disabled={disabled}
                placeholder="Full name"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAdd()
                }}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Phone</span>
              <input
                className="ico-input h-[42px] font-mono"
                value={phone}
                disabled={disabled}
                placeholder="+32…"
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAdd()
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="ico-button ico-button-primary wca-add-btn flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
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
