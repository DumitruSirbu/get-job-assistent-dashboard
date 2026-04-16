import type { Skill } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type KnownLevel = 'advanced' | 'intermediate' | 'beginner'

const levelConfig: Record<KnownLevel, { label: string; bar: string; bg: string }> = {
  advanced: { label: 'Advanced', bar: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
  intermediate: { label: 'Intermediate', bar: 'bg-amber-400', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
  beginner: { label: 'Beginner', bar: 'bg-gray-300', bg: 'bg-gray-50 border-gray-200 text-gray-700' },
}

const knownLevels: KnownLevel[] = ['advanced', 'intermediate', 'beginner']

function normalizeLevel(level: string | null | undefined): KnownLevel {
  if (level && knownLevels.includes(level.toLowerCase() as KnownLevel)) {
    return level.toLowerCase() as KnownLevel
  }
  return 'beginner'
}

interface Props {
  skills: Skill[]
}

export default function SkillChips({ skills }: Props) {
  const grouped = skills.reduce<Record<KnownLevel, Skill[]>>(
    (acc, skill) => {
      const key = normalizeLevel(skill.level)
      acc[key].push(skill)
      return acc
    },
    { advanced: [], intermediate: [], beginner: [] },
  )

  return (
    <div className="space-y-6">
      {knownLevels.map(level => {
        const group = grouped[level]
        if (!group.length) return null
        const cfg = levelConfig[level]
        return (
          <div key={level}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              {cfg.label} ({group.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {group
                .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
                .map(skill => {
                  const pct = skill.confidence != null ? Math.round(skill.confidence * 100) : null
                  return (
                    <div
                      key={skill.name}
                      title={pct != null ? `Confidence: ${pct}%` : undefined}
                      className={cn('rounded-full border px-3 py-1 text-xs font-medium relative overflow-hidden', cfg.bg)}
                    >
                      {pct != null && (
                        <span
                          className={cn('absolute bottom-0 left-0 h-0.5 rounded-full', cfg.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      {skill.name}
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
