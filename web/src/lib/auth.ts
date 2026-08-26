/**
 * Toegang tot de demo-omgeving: één gedeeld wachtwoord dat de server omruilt
 * voor een token.
 *
 * Niet te verwarren met `PasswordGateModal`, die alleen de demo-settings
 * binnen de Call Agent afschermt en client-side vergelijkt. Dit is de echte
 * poort: zonder token weigert de server elk `/api`-verzoek.
 */

const STORAGE_KEY = 'sixthgen.token'

/** De server ondertekent `<vervaltijd>.<hmac>`, dus de client kent de vervaltijd. */
function expiryOf(token: string): number {
  const [expiresAt] = token.split('.')
  const parsed = Number(expiresAt)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getToken(): string | null {
  let token: string | null = null
  try {
    token = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Privémodus of geblokkeerde site-data: dan telt het als niet ingelogd.
    return null
  }

  if (!token) return null
  if (expiryOf(token) <= Date.now()) {
    clearToken()
    return null
  }
  return token
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Zonder opslag werkt de sessie tot een refresh; beter dan een harde fout.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* niets te doen */
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

/** Waarschuwt de gate dat de server een token weigerde. */
export const AUTH_EXPIRED_EVENT = 'sixthgen:auth-expired'

export function notifyAuthExpired(): void {
  clearToken()
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
