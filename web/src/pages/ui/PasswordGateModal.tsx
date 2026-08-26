import { useState } from 'react'
import { Delete, Lock, X } from 'lucide-react'

type PasswordGateModalProps = {
  expected: string
  onUnlock: () => void
  onClose: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Pincode-invoer voor de demo-settings. Bewust helemaal met knoppen op het
 * scherm: de demo draait op een touchscreen zonder toetsenbord.
 *
 * Geen lockout en geen maximum aantal pogingen — dit houdt een voorbijganger
 * tegen, niet een aanvaller. De code staat in de bundel en is daar leesbaar.
 */
export default function PasswordGateModal({ expected, onUnlock, onClose }: PasswordGateModalProps) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  const press = (digit: string) => {
    if (entry.length >= expected.length) return

    const next = entry + digit
    setError(false)
    setEntry(next)

    if (next.length < expected.length) return

    // Even laten staan zodat de laatste stip nog oplicht voor het oordeel.
    window.setTimeout(() => {
      if (next === expected) {
        onUnlock()
      } else {
        setError(true)
        setEntry('')
      }
    }, 150)
  }

  const backspace = () => {
    setError(false)
    setEntry((current) => current.slice(0, -1))
  }

  return (
    <div className="wca-overlay" onClick={onClose}>
      <div
        className="wca-settings-card"
        style={{ width: 340 }}
        role="dialog"
        aria-label="Voer de pincode in"
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
                Voer de pincode in
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:text-[var(--text-white)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mt-6 flex items-center justify-center gap-4"
          role="status"
          aria-label={`${entry.length} van ${expected.length} cijfers ingevoerd`}
        >
          {Array.from({ length: expected.length }, (_, index) => (
            <span
              key={index}
              className="h-3.5 w-3.5 rounded-full border transition-colors"
              style={{
                borderColor: error ? 'var(--danger-brand)' : 'var(--border-soft)',
                backgroundColor:
                  index < entry.length
                    ? error
                      ? 'var(--danger-brand)'
                      : 'var(--accent-brand)'
                    : 'transparent',
              }}
            />
          ))}
        </div>

        <p
          className="mt-3 text-center font-['IBM_Plex_Sans'] text-[12px]"
          style={{ color: 'var(--danger-brand)', minHeight: 18 }}
          role="alert"
        >
          {error ? 'Pincode incorrect' : ''}
        </p>

        <div className="mt-3 grid grid-cols-3 justify-items-center gap-3">
          {KEYS.map((digit) => (
            <PinKey key={digit} label={digit} onPress={() => press(digit)} />
          ))}

          <span />
          <PinKey label="0" onPress={() => press('0')} />
          <button
            type="button"
            onClick={backspace}
            disabled={entry.length === 0}
            aria-label="Wissen"
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-white)] disabled:opacity-30 active:bg-[var(--bg-deep)]"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

function PinKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="ico-heading flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[24px] font-semibold text-[var(--text-white)] transition-colors hover:border-[var(--accent-brand)] active:bg-[var(--accent-brand)] active:text-[var(--bg-deep)]"
    >
      {label}
    </button>
  )
}
