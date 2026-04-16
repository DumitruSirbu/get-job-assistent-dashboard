import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface MultiSelectProps {
  options: { id: number; name: string }[]
  value: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  className?: string
}

export function MultiSelect({ options, value, onChange, placeholder, className }: MultiSelectProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options

  function toggle(id: number) {
    const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id]
    onChange(next)
  }

  const label = value.length > 0 ? `${placeholder} (${value.length})` : placeholder

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'flex h-10 items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            value.length > 0 && 'border-blue-500 text-blue-700',
            className,
          )}
        >
          <span>{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-64 rounded-md border border-gray-200 bg-white shadow-md focus:outline-none"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className="p-2 border-b border-gray-100">
            <Input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-400">No results</p>
            ) : (
              filtered.map(option => {
                const selected = value.includes(option.id)
                return (
                  <button
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 focus:outline-none"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{option.name}</span>
                  </button>
                )
              })
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t border-gray-100 p-1">
              <button
                onClick={() => onChange([])}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none"
              >
                <X className="h-3 w-3" />
                Clear selection
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
