import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCandidate } from '@/lib/api/candidates'
import SkillChips from '@/components/candidates/SkillChips'
import ScoredJobsTable from '@/components/candidates/ScoredJobsTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, MapPin, Mail, Phone, Briefcase,
  Globe, ChevronDown, ChevronUp, Link,
} from 'lucide-react'
import { format } from 'date-fns'

const TABS = ['Profile', 'Skills', 'Scored Jobs'] as const
type Tab = typeof TABS[number]

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const [cvExpanded, setCvExpanded] = useState(false)

  const { data: candidate, isLoading, isError } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => getCandidate(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>
  if (isError || !candidate) return <div className="p-6 text-red-500">Candidate not found.</div>

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
              {candidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{candidate.fullName}</h1>
              {candidate.headline && <p className="text-gray-500 mt-0.5">{candidate.headline}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {candidate.experienceLevel && (
                  <Badge variant="secondary">{candidate.experienceLevel.experienceLevelName}</Badge>
                )}
                {candidate.openToRemote && <Badge variant="success">Open to Remote</Badge>}
                {candidate.yearsExperience && (
                  <Badge variant="outline">{candidate.yearsExperience}+ years</Badge>
                )}
                <Badge variant="outline">v{candidate.version}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'Profile' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {candidate.email && (
                  <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Mail className="h-4 w-4 shrink-0" />
                    {candidate.email}
                  </a>
                )}
                {candidate.phone && (
                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Phone className="h-4 w-4 shrink-0" />
                    {candidate.phone}
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Link className="h-4 w-4 shrink-0" />
                    LinkedIn Profile
                  </a>
                )}
              </CardContent>
            </Card>

            {/* CV raw text */}
            {candidate.cvRawText && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">CV Text</CardTitle>
                    <button
                      onClick={() => setCvExpanded(v => !v)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      {cvExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {cvExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre
                    className={cn(
                      'whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed overflow-hidden transition-all',
                      cvExpanded ? 'max-h-none' : 'max-h-32',
                    )}
                  >
                    {candidate.cvRawText}
                  </pre>
                  {!cvExpanded && (
                    <button
                      onClick={() => setCvExpanded(true)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Show full CV…
                    </button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {candidate.location && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Location</p>
                    <p className="flex items-center gap-1 text-gray-700 mt-0.5 capitalize">
                      <MapPin className="h-3.5 w-3.5" />
                      {candidate.location.countryName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Remote</p>
                  <p className="flex items-center gap-1 text-gray-700 mt-0.5">
                    <Globe className="h-3.5 w-3.5" />
                    {candidate.openToRemote ? 'Open to remote' : 'On-site preferred'}
                  </p>
                </div>
                {candidate.yearsExperience !== null && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Experience</p>
                    <p className="flex items-center gap-1 text-gray-700 mt-0.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {candidate.yearsExperience}+ years
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Updated</p>
                  <p className="text-gray-700 mt-0.5">{format(new Date(candidate.updatedAt), 'MMM d, yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'Skills' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{candidate.skillsJson.length} Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillChips skills={candidate.skillsJson} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'Scored Jobs' && (
        <ScoredJobsTable candidateId={candidate.candidateProfileId} />
      )}
    </div>
  )
}
