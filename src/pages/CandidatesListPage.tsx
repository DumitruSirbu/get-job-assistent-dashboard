import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { listCandidates } from '@/lib/api/candidates'
import { Badge } from '@/components/ui/badge'
import { MapPin, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CandidateListItem } from '@/lib/schemas'

export default function CandidatesListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', 1, 20],
    queryFn: () => listCandidates(1, 20),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        <span
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px',
            'border-blue-600 text-blue-600',
          )}
        >
          Candidates
        </span>
        <Link
          to="/candidates/scoring"
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          Score Jobs
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data ? `${data.total} candidate${data.total !== 1 ? 's' : ''}` : 'Loading…'}
        </p>
      </div>

      {isLoading && <div className="text-center py-12 text-gray-400">Loading…</div>}
      {isError && <div className="text-center py-12 text-red-500">Failed to load candidates.</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map(c => (
            <CandidateCard key={c.candidateProfileId} candidate={c} onClick={() => navigate(`/candidates/${c.candidateProfileId}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

const CandidateCard = memo(function CandidateCard({ candidate: c, onClick }: { candidate: CandidateListItem; onClick: () => void }) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
          {c.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{c.fullName}</p>
          {c.headline && <p className="text-sm text-gray-500 truncate">{c.headline}</p>}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-500">
        {c.location && (
          <span className="flex items-center gap-1.5 capitalize">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {c.location.countryName}
          </span>
        )}
        {c.yearsExperience !== null && (
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            {c.yearsExperience} years experience
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {c.experienceLevel && (
          <Badge variant="secondary">{c.experienceLevel.experienceLevelName}</Badge>
        )}
        <Badge variant="outline">{c.skillsCount} skills</Badge>
        <Badge variant="outline">v{c.version}</Badge>
      </div>
    </div>
  )
})
