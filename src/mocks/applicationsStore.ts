const STORAGE_KEY = 'dashboard.applications:v1'

export interface StoredApplication {
  applicationId: string
  candidateProfileId: number
  jobDescriptionId: number
  appliedAt: string
  status: string
}

function load(): StoredApplication[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredApplication[]
  } catch {
    return []
  }
}

function save(apps: StoredApplication[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  } catch {
    // Throws in incognito/private browsing, quota exceeded, or when storage is disabled
  }
}

export const applicationsStore = {
  getForCandidate(candidateProfileId: number): StoredApplication[] {
    return load()
      .filter(a => a.candidateProfileId === candidateProfileId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  },

  getOne(candidateProfileId: number, applicationId: string): StoredApplication | undefined {
    return load().find(
      a => a.candidateProfileId === candidateProfileId && a.applicationId === applicationId,
    )
  },

  add(
    candidateProfileId: number,
    jobDescriptionId: number,
    opts?: { statusName?: string; appliedAt?: string },
  ): StoredApplication | { conflict: true } {
    const apps = load()
    const existing = apps.find(
      a => a.candidateProfileId === candidateProfileId && a.jobDescriptionId === jobDescriptionId,
    )
    if (existing) return { conflict: true }

    const app: StoredApplication = {
      applicationId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      candidateProfileId,
      jobDescriptionId,
      appliedAt: opts?.appliedAt ?? new Date().toISOString(),
      status: opts?.statusName ?? 'applied',
    }
    save([...apps, app])
    return app
  },

  update(
    candidateProfileId: number,
    applicationId: string,
    body: { statusName?: string; appliedAt?: string },
  ): StoredApplication | undefined {
    const apps = load()
    const idx = apps.findIndex(
      a => a.candidateProfileId === candidateProfileId && a.applicationId === applicationId,
    )
    if (idx === -1) return undefined
    const updated: StoredApplication = {
      ...apps[idx],
      ...(body.statusName !== undefined ? { status: body.statusName } : {}),
      ...(body.appliedAt !== undefined ? { appliedAt: body.appliedAt } : {}),
    }
    apps[idx] = updated
    save(apps)
    return updated
  },

  remove(candidateProfileId: number, applicationId: string): boolean {
    const apps = load()
    const found = apps.some(
      a => a.candidateProfileId === candidateProfileId && a.applicationId === applicationId,
    )
    if (!found) return false
    save(apps.filter(a => !(a.candidateProfileId === candidateProfileId && a.applicationId === applicationId)))
    return true
  },
}
