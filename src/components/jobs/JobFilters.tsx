import { useQuery } from '@tanstack/react-query'
import { getCompanies, getLocations } from '@/lib/api/lookups'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { X } from 'lucide-react'
import type { JobFilters } from '@/lib/api/jobs'

interface Props {
  filters: JobFilters
  onChange: (f: JobFilters) => void
}

export default function JobFilters({ filters, onChange }: Props) {
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: getCompanies })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })

  const hasFilters =
    filters.search ||
    filters.publishedFrom ||
    filters.publishedTo ||
    (filters.companyId?.length ?? 0) > 0 ||
    (filters.locationId?.length ?? 0) > 0

  return (
    <div className="flex flex-wrap gap-3">
      {/* Text search */}
      <Input
        placeholder="Search jobs…"
        value={filters.search ?? ''}
        onChange={e => onChange({ ...filters, search: e.target.value || undefined, page: 1 })}
        className="w-56"
      />

      {/* Company multi-select */}
      <MultiSelect
        options={companies?.items ?? []}
        value={filters.companyId ?? []}
        onChange={ids => onChange({ ...filters, companyId: ids, page: 1 })}
        placeholder="Company"
      />

      {/* Location multi-select */}
      <MultiSelect
        options={locations?.items ?? []}
        value={filters.locationId ?? []}
        onChange={ids => onChange({ ...filters, locationId: ids, page: 1 })}
        placeholder="Location"
      />

      {/* Date from */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
        <Input
          type="date"
          value={filters.publishedFrom ?? ''}
          onChange={e => onChange({ ...filters, publishedFrom: e.target.value || undefined, page: 1 })}
          className="w-40"
        />
      </div>

      {/* Date to */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
        <Input
          type="date"
          value={filters.publishedTo ?? ''}
          onChange={e => onChange({ ...filters, publishedTo: e.target.value || undefined, page: 1 })}
          className="w-40"
        />
      </div>

      {/* Sort */}
      <Select
        value={filters.sort ?? 'publishedAt:desc'}
        onValueChange={v => onChange({ ...filters, sort: v as JobFilters['sort'], page: 1 })}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="publishedAt:desc">Newest first</SelectItem>
          <SelectItem value="publishedAt:asc">Oldest first</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ sort: 'publishedAt:desc', page: 1 })}
          className="text-gray-500"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
