import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJob } from '@/lib/api/jobs'
import { getApplicationsForCandidate, createApplication, deleteApplication } from '@/lib/api/applications'
import { listCandidates } from '@/lib/api/candidates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft, ExternalLink, MapPin, Building2, Calendar,
  CheckCircle2, Circle, User, Briefcase,
} from 'lucide-react'
import { format } from 'date-fns'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(Number(id)),
    enabled: !!id,
  })

  // Load the first candidate to support apply action
  const { data: candidateList } = useQuery({
    queryKey: ['candidates', 1, 20],
    queryFn: () => listCandidates(1, 20),
  })
  const candidate = candidateList?.items[0]

  const { data: applications } = useQuery({
    queryKey: ['applications', candidate?.candidateProfileId],
    queryFn: () => getApplicationsForCandidate(candidate!.candidateProfileId),
    enabled: !!candidate,
  })

  const applied = applications?.items.find(a => a.jobDescriptionId === Number(id))

  const applyMutation = useMutation({
    mutationFn: () => createApplication(candidate!.candidateProfileId, Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications', candidate?.candidateProfileId] }),
  })

  const unapplyMutation = useMutation({
    mutationFn: () => deleteApplication(candidate!.candidateProfileId, applied!.applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications', candidate?.candidateProfileId] }),
  })

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>
  if (isError || !job) return <div className="p-6 text-red-500">Job not found.</div>

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl">{job.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1 capitalize">
                  <Building2 className="h-4 w-4" />
                  {job.company.companyName}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1 capitalize">
                    <MapPin className="h-4 w-4" />
                    {job.location.countryName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(job.publishedAt), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={job.applyType.applyTypeName === 'EASY_APPLY' ? 'success' : 'outline'}>
                  {job.applyType.applyTypeName === 'EASY_APPLY' ? 'Easy Apply' : 'External'}
                </Badge>
                <Badge variant="secondary">{job.experienceLevel.experienceLevelName}</Badge>
                <Badge variant="secondary">{job.contractType.contractTypeName}</Badge>
                {job.salary && <Badge variant="default">{job.salary}</Badge>}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Apply
                </Button>
              </a>

              {candidate && (
                applied ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unapplyMutation.mutate()}
                    disabled={unapplyMutation.isPending}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Applied
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                  >
                    <Circle className="h-3.5 w-3.5 mr-1.5" />
                    Mark Applied
                  </Button>
                )
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Description */}
        <div className="col-span-2 space-y-4">
          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                  {job.description}
                </pre>
              </CardContent>
            </Card>
          )}

          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{job.benefits}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sector</p>
                <p className="text-gray-800">{job.sector.sectorName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Speciality</p>
                <p className="text-gray-800">{job.speciality.specialityName}</p>
              </div>
              {job.applicationsCount && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Applicants</p>
                  <p className="text-gray-800">{job.applicationsCount}</p>
                </div>
              )}
              {job.posterFullName && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Posted by</p>
                  {job.posterProfileUrl ? (
                    <a
                      href={job.posterProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <User className="h-3.5 w-3.5" />
                      {job.posterFullName}
                    </a>
                  ) : (
                    <p className="text-gray-800 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {job.posterFullName}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Quick links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on LinkedIn
              </a>
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Apply
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
