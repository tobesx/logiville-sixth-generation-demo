import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react'
import type { Worker } from '@shared'
import { createPerson, deletePerson, listPeople, updatePerson } from '../lib/api'
import { nextShiftDateTime } from './shift'
import './ico.css'

type Draft = Omit<Worker, 'id'>

const EMPTY: Draft = {
  name: '',
  phone: '',
  shift_start_at: nextShiftDateTime(6),
  shift_end_at: nextShiftDateTime(14),
}

export default function People() {
  const [people, setPeople] = useState<Worker[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const report = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Er ging iets mis')

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch(report)
      .finally(() => setLoading(false))
  }, [])

  const add = async () => {
    if (!draft.name.trim() || !draft.phone.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const created = await createPerson({ ...draft, name: draft.name.trim(), phone: draft.phone.trim() })
      setPeople((current) => [...current, created])
      setDraft(EMPTY)
    } catch (err) {
      report(err)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (person: Worker) => {
    if (!window.confirm(`${person.name} verwijderen uit het rooster?`)) return
    // Optimistisch weghalen; bij een fout terugzetten, zodat de lijst niet
    // stilzwijgend uit de pas loopt met de database.
    const previous = people
    setPeople((current) => current.filter((p) => p.id !== person.id))
    try {
      await deletePerson(person.id)
    } catch (err) {
      setPeople(previous)
      report(err)
    }
  }

  const edit = async (person: Worker, changes: Partial<Draft>) => {
    const previous = people
    setPeople((current) => current.map((p) => (p.id === person.id ? { ...p, ...changes } : p)))
    try {
      await updatePerson(person.id, changes)
    } catch (err) {
      setPeople(previous)
      report(err)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-brand)] text-[var(--accent-brand)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="ico-heading text-[22px] font-bold text-[var(--text-white)]">Werknemers</h1>
              <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
                Wie er gebeld kan worden. Van de shift telt alleen de klokttijd —
                die wordt bij elke belronde op morgen gezet.
              </p>
            </div>
          </div>
          <Link to="/demo/workforce-call-agent" className="wca-topbar-pill">
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug
          </Link>
        </div>

        {error ? (
          <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">{error}</p>
        ) : null}

        <div className="wca-settings-card flex flex-col gap-3">
          <span className="font-['IBM_Plex_Sans'] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Toevoegen
          </span>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[160px] flex-1 flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Naam</span>
              <input
                className="ico-input h-[42px]"
                value={draft.name}
                placeholder="Jan Declercq"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="flex min-w-[150px] flex-1 flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Telefoon</span>
              <input
                className="ico-input h-[42px]"
                value={draft.phone}
                placeholder="+32471000000"
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Start</span>
              <input
                type="datetime-local"
                className="ico-input h-[42px]"
                value={draft.shift_start_at}
                onChange={(e) => setDraft({ ...draft, shift_start_at: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-['IBM_Plex_Sans'] text-[11px] text-[var(--text-muted)]">Einde</span>
              <input
                type="datetime-local"
                className="ico-input h-[42px]"
                value={draft.shift_end_at}
                onChange={(e) => setDraft({ ...draft, shift_end_at: e.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={() => void add()}
              disabled={saving || !draft.name.trim() || !draft.phone.trim()}
              className="ico-button ico-button-primary wca-add-btn"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Bezig…' : 'Toevoegen'}
            </button>
          </div>
        </div>

        <div className="wca-settings-card flex flex-col gap-2">
          {loading ? (
            <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">Laden…</p>
          ) : people.length === 0 ? (
            <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--text-muted)]">
              Nog geen werknemers. Voeg er hierboven een toe.
            </p>
          ) : (
            people.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-end gap-2 border-b border-[var(--border-brand)] py-2 last:border-b-0"
              >
                <input
                  className="ico-input h-[38px] min-w-[160px] flex-1"
                  defaultValue={person.name}
                  onBlur={(e) =>
                    e.target.value !== person.name && void edit(person, { name: e.target.value })
                  }
                />
                <input
                  className="ico-input h-[38px] min-w-[150px] flex-1"
                  defaultValue={person.phone}
                  onBlur={(e) =>
                    e.target.value !== person.phone && void edit(person, { phone: e.target.value })
                  }
                />
                <input
                  type="datetime-local"
                  className="ico-input h-[38px]"
                  defaultValue={person.shift_start_at}
                  onBlur={(e) =>
                    e.target.value !== person.shift_start_at &&
                    void edit(person, { shift_start_at: e.target.value })
                  }
                />
                <input
                  type="datetime-local"
                  className="ico-input h-[38px]"
                  defaultValue={person.shift_end_at}
                  onBlur={(e) =>
                    e.target.value !== person.shift_end_at &&
                    void edit(person, { shift_end_at: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => void remove(person)}
                  aria-label={`${person.name} verwijderen`}
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-[var(--border-brand)] text-[var(--text-muted)] hover:border-[var(--danger-brand)] hover:text-[var(--danger-brand)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
