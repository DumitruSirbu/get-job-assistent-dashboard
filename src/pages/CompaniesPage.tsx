import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listCompanies, type CompanyFilters, blacklistCompany, unblacklistCompany } from '@/lib/api/companies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

function filtersFromParams(params: URLSearchParams): CompanyFilters {
  const rawIsBlacklisted = params.get('isBlacklisted')
  return {
    search: params.get('search') ?? undefined,
    isBlacklisted: rawIsBlacklisted === null ? undefined : rawIsBlacklisted === 'true',
    page: Number(params.get('page') ?? '1'),
    limit: PAGE_SIZE,
  }
}

function filtersToParams(filters: CompanyFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.isBlacklisted !== undefined) params.set('isBlacklisted', String(filters.isBlacklisted))
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  return params
}

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = filtersFromParams(searchParams)

  function setFilters(next: CompanyFilters) {
    setSearchParams(filtersToParams(next))
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['companies', filters],
    queryFn: () => listCompanies(filters),
  })

  const toggleBlacklistMutation = useMutation({
    mutationFn: ({ id, isBlacklisted }: { id: number; isBlacklisted: boolean }) =>
      isBlacklisted ? unblacklistCompany(id) : blacklistCompany(id),
    onSuccess: (_data, variables) => {
      const nextFilters: CompanyFilters = {
        ...filters,
        isBlacklisted: variables.isBlacklisted ? false : true,
        page: 1,
      }
      setFilters(nextFilters)
      qc.invalidateQueries({ queryKey: ['companies'] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1
  const currentPage = filters.page ?? 1
  const searchValue = filters.search ?? ''
  const activeStatus =
    filters.isBlacklisted === undefined ? 'all' : filters.isBlacklisted ? 'blacklisted' : 'active'

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data ? `${data.total} compan${data.total === 1 ? 'y' : 'ies'} found` : 'Loading…'}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search company name…"
            value={searchValue}
            onChange={e => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
            className="w-full max-w-sm"
          />
          <Button
            size="sm"
            variant={activeStatus === 'blacklisted' ? 'default' : 'outline'}
            onClick={() =>
              setFilters({
                ...filters,
                isBlacklisted: activeStatus === 'blacklisted' ? undefined : true,
                page: 1,
              })
            }
          >
            {activeStatus === 'blacklisted' ? 'Show all companies' : 'Show blacklisted only'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters({ ...filters, isBlacklisted: undefined, page: 1 })}
          >
            All
          </Button>
          <Button
            variant={activeStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters({ ...filters, isBlacklisted: false, page: 1 })}
          >
            Active
          </Button>
          <Button
            variant={activeStatus === 'blacklisted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters({ ...filters, isBlacklisted: true, page: 1 })}
          >
            Blacklisted
          </Button>
        </div>
      </div>

      {toggleBlacklistMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Action failed:{' '}
          {toggleBlacklistMutation.error instanceof Error
            ? toggleBlacklistMutation.error.message
            : 'Unknown error'}
        </div>
      )}

      {isLoading && <div className="text-center py-12 text-gray-400">Loading companies…</div>}
      {isError && (
        <div className="text-center py-12 text-red-500">
          Failed to load companies.{error instanceof Error ? ` ${error.message}` : ''}
        </div>
      )}

      {data && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-400" colSpan={3}>
                      No companies match your filters.
                    </td>
                  </tr>
                )}

                {data.items.map(company => {
                  const isPending =
                    toggleBlacklistMutation.isPending &&
                    toggleBlacklistMutation.variables?.id === company.id

                  return (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{company.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={company.isBlacklisted ? 'destructive' : 'success'}>
                          {company.isBlacklisted ? 'Blacklisted' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={company.isBlacklisted ? 'outline' : 'destructive'}
                          onClick={() =>
                            toggleBlacklistMutation.mutate({
                              id: company.id,
                              isBlacklisted: company.isBlacklisted,
                            })
                          }
                          disabled={isPending}
                        >
                          {company.isBlacklisted ? 'Remove from blacklist' : 'Blacklist'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
