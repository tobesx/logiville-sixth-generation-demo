import { useEffect, useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { login } from '../../lib/api'
import { AUTH_EXPIRED_EVENT, isAuthenticated } from '../../lib/auth'

/**
 * Toegangspoort tot de hele demo. Tot Retool wegviel leverde dát de enige
 * toegangscontrole; de API zelf stond altijd al open. Dit sluit beide: zonder
 * token weigert de server elk `/api`-verzoek.
 */
export default function LoginGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isAuthenticated)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onExpired = () => setUnlocked(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  if (unlocked) return <>{children}</>

  const submit = async () => {
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      await login(password)
      setPassword('')
      setUnlocked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-deep)] p-6">
      <div className="wca-settings-card w-full" style={{ maxWidth: 420 }} role="dialog" aria-label="Log in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--accent-brand)]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="ico-heading text-[19px] font-bold text-[var(--text-white)]">
              Sixth Generation
            </h1>
            <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
              Voer het demo-wachtwoord in
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">
              Wachtwoord
            </span>
            <input
              type="password"
              autoFocus
              disabled={busy}
              className="ico-input h-[42px]"
              value={password}
              placeholder="••••••"
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit()
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !password}
            className="ico-button ico-button-primary wca-add-btn"
          >
            {busy ? 'Bezig…' : 'Inloggen'}
          </button>
        </div>

        {error ? (
          <p className="mt-2 font-['IBM_Plex_Sans'] text-[12px] text-[var(--danger-brand)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
