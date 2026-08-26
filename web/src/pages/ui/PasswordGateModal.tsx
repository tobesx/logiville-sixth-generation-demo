import { useState } from 'react'
import { Lock, X } from 'lucide-react'

type PasswordGateModalProps = {
  expected: string
  onUnlock: () => void
  onClose: () => void
}

export default function PasswordGateModal({ expected, onUnlock, onClose }: PasswordGateModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (value === expected) {
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <div className="wca-overlay" onClick={onClose}>
      <div
        className="wca-settings-card"
        style={{ width: 400 }}
        role="dialog"
        aria-label="Enter password"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--accent-brand)]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="ico-heading text-[19px] font-bold text-[var(--text-white)]">
                Settings locked
              </h2>
              <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
                Enter the password to open demo settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Password</span>
            <input
              type="password"
              autoFocus
              className="ico-input h-[42px]"
              value={value}
              placeholder="••••••"
              onChange={(event) => {
                setValue(event.target.value)
                if (error) setError(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
          </label>
          <button
            type="button"
            onClick={submit}
            className="ico-button ico-button-primary wca-add-btn"
          >
            Unlock
          </button>
        </div>

        {error ? (
          <p className="mt-2 font-['IBM_Plex_Sans'] text-[12px] text-[var(--danger-brand)]">
            Incorrect password. Please try again.
          </p>
        ) : null}
      </div>
    </div>
  )
}
