import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit3, Plus, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../lib/shadcn/dialog'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../lib/shadcn/table'
import { Button } from '../lib/shadcn/button'
import { cn } from '../lib/shadcn/utils'
import BrandButton from './ui/BrandButton'
import type { Worker } from './types'
import { loadWorkers, makeDefaultShiftInterval, makeWorkerId, saveWorkers } from './workers'

type WorkerFormValues = {
  name: string
  phone: string
}

type WorkerModalProps = {
  open: boolean
  worker: Worker | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WorkerFormValues) => void
}

function getDefaultFormValues(): WorkerFormValues {
  return {
    name: '',
    phone: '',
  }
}

function workerToFormValues(worker: Worker): WorkerFormValues {
  return {
    name: worker.name,
    phone: worker.phone,
  }
}

function WorkerModal({ open, worker, onOpenChange, onSubmit }: WorkerModalProps) {
  const [values, setValues] = useState<WorkerFormValues>(() => getDefaultFormValues())
  const [formError, setFormError] = useState<string | null>(null)
  const editing = worker !== null

  useEffect(() => {
    if (open) {
      setValues(worker ? workerToFormValues(worker) : getDefaultFormValues())
      setFormError(null)
    }
  }, [open, worker])

  const updateField = (field: keyof WorkerFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedValues = {
      name: values.name.trim(),
      phone: values.phone.trim(),
    }

    if (!trimmedValues.name || !trimmedValues.phone) {
      setFormError('Name and phone are required.')
      return
    }

    onSubmit(trimmedValues)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] border border-[var(--border-brand)] bg-[var(--bg-surface)] p-6 text-[var(--text-body)] shadow-none sm:rounded-[12px] [&>button]:text-[var(--text-muted)] [&>button:hover]:text-[var(--text-white)]">
        <DialogHeader>
          <DialogTitle className="ico-heading text-[18px] font-bold text-[var(--text-white)]">
            {editing ? 'Edit worker' : 'Add worker'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? 'Edit worker contact details.' : 'Add a worker to the roster.'}
          </DialogDescription>
        </DialogHeader>
        <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="font-['IBM_Plex_Sans'] text-[13px] font-normal text-[var(--text-muted)]" htmlFor="worker-name">
              Name
            </Label>
            <Input
              id="worker-name"
              className="ico-input h-auto"
              value={values.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="font-['IBM_Plex_Sans'] text-[13px] font-normal text-[var(--text-muted)]" htmlFor="worker-phone">
              Phone
            </Label>
            <Input
              id="worker-phone"
              className="ico-input h-auto"
              placeholder="+32..."
              value={values.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              required
            />
          </div>

          {formError ? <p className="font-['IBM_Plex_Sans'] text-[13px] text-[var(--danger-brand)]">{formError}</p> : null}
          <div className="flex items-center gap-3 pt-2">
            <BrandButton type="submit">{editing ? 'Save changes' : 'Add worker'}</BrandButton>
            <BrandButton type="button" brandVariant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </BrandButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function People() {
  const [workers, setWorkers] = useState<Worker[]>(() => loadWorkers())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [exitingWorkerId, setExitingWorkerId] = useState<string | null>(null)

  const editingWorker = useMemo(
    () => workers.find((worker) => worker.id === editingWorkerId) ?? null,
    [editingWorkerId, workers],
  )

  const persistWorkers = (nextWorkers: Worker[]) => {
    setWorkers(nextWorkers)
    saveWorkers(nextWorkers)
  }

  const openAddModal = () => {
    setEditingWorkerId(null)
    setModalOpen(true)
  }

  const openEditModal = (workerId: string) => {
    setEditingWorkerId(workerId)
    setModalOpen(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) setEditingWorkerId(null)
  }

  const handleSubmitWorker = (values: WorkerFormValues) => {
    if (editingWorker) {
      const nextWorkers = workers.map((worker) =>
        worker.id === editingWorker.id
          ? { ...worker, name: values.name, phone: values.phone }
          : worker,
      )
      persistWorkers(nextWorkers)
    } else {
      persistWorkers([
        ...workers,
        { id: makeWorkerId(), name: values.name, phone: values.phone, ...makeDefaultShiftInterval() },
      ])
    }
    setModalOpen(false)
    setEditingWorkerId(null)
  }

  const requestDelete = (workerId: string) => {
    setConfirmDeleteId(workerId)
  }

  const cancelDelete = () => {
    setConfirmDeleteId(null)
  }

  const confirmDelete = (workerId: string) => {
    setExitingWorkerId(workerId)
    window.setTimeout(() => {
      persistWorkers(workers.filter((worker) => worker.id !== workerId))
      setConfirmDeleteId(null)
      setExitingWorkerId(null)
    }, 150)
  }

  return (
    <div className="px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="ico-heading text-[22px] font-bold leading-tight text-[var(--text-white)]">People</h1>
          <p className="mt-1 font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-muted)]">
            Manage your worker roster
          </p>
        </div>
        <BrandButton onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add worker
        </BrandButton>
      </header>

      <section className="ico-card mt-7 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[rgba(89,89,89,0.35)] hover:bg-transparent">
              <TableHead className="ico-table-head h-auto px-6 py-4">Name</TableHead>
              <TableHead className="ico-table-head h-auto px-4 py-4">Phone</TableHead>
              <TableHead className="ico-table-head h-auto px-6 py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => {
              const confirmingDelete = confirmDeleteId === worker.id
              const exiting = exitingWorkerId === worker.id
              return (
                <TableRow
                  key={worker.id}
                  className={cn('ico-worker-row border-0', confirmingDelete && 'ico-row-danger', exiting && 'ico-row-exiting')}
                >
                  <TableCell className="px-6 py-4">
                    <div className="ico-heading text-[14px] font-semibold text-[var(--text-white)]">{worker.name}</div>
                  </TableCell>
                  <TableCell className="px-4 py-4 font-['IBM_Plex_Sans'] text-[14px] text-[var(--text-body)]">
                    {worker.phone}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {confirmingDelete ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 font-['IBM_Plex_Sans'] text-[12px] text-[var(--danger-brand)] hover:bg-transparent hover:text-[var(--danger-brand)]"
                            onClick={() => confirmDelete(worker.id)}
                          >
                            Delete?
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Cancel delete ${worker.name}`}
                            className="h-8 w-8 text-[var(--text-muted)] hover:bg-transparent hover:text-[var(--text-white)]"
                            onClick={cancelDelete}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${worker.name}`}
                            className="h-8 w-8 text-[var(--text-muted)] hover:bg-transparent hover:text-[var(--accent-brand)]"
                            onClick={() => openEditModal(worker.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${worker.name}`}
                            className="h-8 w-8 text-[var(--text-muted)] hover:bg-transparent hover:text-[var(--danger-brand)]"
                            onClick={() => requestDelete(worker.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </section>

      <WorkerModal
        open={modalOpen}
        worker={editingWorker}
        onOpenChange={handleModalOpenChange}
        onSubmit={handleSubmitWorker}
      />
    </div>
  )
}
