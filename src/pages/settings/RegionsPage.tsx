import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { getJobRegions, createRegion, updateRegion, deleteRegion } from '@/lib/api/lookups'
import type { Region } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

export default function RegionsPage() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['regions'] })
    qc.invalidateQueries({ queryKey: ['job-regions'] })
  }

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [isDefaultInput, setIsDefaultInput] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['regions'],
    queryFn: getJobRegions,
  })

  const createMutation = useMutation({
    mutationFn: createRegion,
    onSuccess: () => { invalidate(); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; isSelectedByDefault: boolean } }) =>
      updateRegion(id, data),
    onSuccess: (_, { id, data }) => {
      qc.setQueryData(['regions'], (old: { items: Region[] } | undefined) =>
        old ? { ...old, items: old.items.map(r => r.id === id ? { ...r, ...data } : r) } : old,
      )
      invalidate()
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRegion,
    onSuccess: () => { invalidate(); setDeleteConfirmId(null) },
  })

  function openCreate() {
    setNameInput('')
    setIsDefaultInput(false)
    setDialogMode('create')
  }

  function openEdit(region: Region) {
    setSelectedRegion(region)
    setNameInput(region.name)
    setIsDefaultInput(region.isSelectedByDefault)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelectedRegion(null)
    setNameInput('')
    setIsDefaultInput(false)
  }

  function handleSubmit() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    if (dialogMode === 'create') {
      createMutation.mutate({ name: trimmed, isSelectedByDefault: isDefaultInput })
    } else if (dialogMode === 'edit' && selectedRegion) {
      updateMutation.mutate({ id: selectedRegion.id, data: { name: trimmed, isSelectedByDefault: isDefaultInput } })
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending
  const regions = [...(data?.items ?? [])].sort((a, b) => Number(b.isSelectedByDefault) - Number(a.isSelectedByDefault))

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-700">Regions</h2>
        <Button size="sm" onClick={openCreate}>Add region</Button>
      </div>

      <div className="rounded-md border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading regions…</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-red-500">Failed to load regions.</td>
              </tr>
            )}
            {!isLoading && !isError && regions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No regions found.</td>
              </tr>
            )}
            {regions.map(region => (
              <tr key={region.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{region.name}</td>
                <td className="px-4 py-3">
                  {region.isSelectedByDefault
                    ? <Badge variant="success">Default</Badge>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {deleteConfirmId === region.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gray-600">Are you sure?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(region.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(region)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirmId(region.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Add region' : 'Edit region'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input
                placeholder="e.g. Luxembourg"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefaultInput}
                onChange={e => setIsDefaultInput(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Pre-select by default
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={!nameInput.trim() || isMutating}>
              {dialogMode === 'create' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
