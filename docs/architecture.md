---
description: Routes, components, state management, API client design, and WebSocket integration
globs: "src/**/*.tsx,src/**/*.ts"
alwaysApply: false
---

# Architecture

A React dashboard for job searching, candidate management, and application tracking. Talks to a private REST API and uses the internal SDK for type-safe API contracts.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19, TypeScript 5.8, Vite 6 |
| Routing | React Router DOM 7 |
| Server state | TanStack React Query 5 |
| Styling | TailwindCSS 4 (Vite plugin), CSS variables |
| UI primitives | Radix UI (dialog, popover, select, tabs, …) + lucide-react icons |
| Validation | Zod 4 |
| Component variants | class-variance-authority + clsx + tailwind-merge (`cn()`) |
| SDK | `@dumitrusirbu92/get-job-assistant-sdk` — enums + DTOs for API contracts |

## Project Structure

```
src/
├── main.tsx                           # entry: reflect-metadata, QueryClient, Router
├── routes.tsx                         # all route definitions
├── lib/
│   ├── api/
│   │   ├── client.ts                  # fetch-based HTTP client with Zod validation + token refresh
│   │   ├── auth.ts                    # login, register, logout (direct fetch, not apiClient)
│   │   ├── jobs.ts                    # listJobs, getJob, processNewJobs
│   │   ├── candidates.ts              # listCandidates, getCandidate
│   │   ├── companies.ts               # listCompanies, blacklistCompany, unblacklistCompany
│   │   ├── scores.ts                  # listScoredJobsForCandidate, toggleScoreVisibility, scoreNewestJobs
│   │   ├── applications.ts            # getApplicationsForCandidate, createApplication, updateApplication, deleteApplication
│   │   └── lookups.ts                 # getJobRegions, createRegion, updateRegion, deleteRegion
│   ├── auth/
│   │   └── tokenStore.ts              # access token: in-memory; refresh token: sessionStorage (gja_refresh_token)
│   ├── schemas/
│   │   └── index.ts                   # all Zod schemas and inferred TypeScript types
│   └── utils.ts                       # cn() helper
├── components/
│   ├── layout/AppShell.tsx            # sidebar nav + auth guard
│   ├── ui/                            # badge, button, card, dialog, input, select, multi-select
│   ├── jobs/                          # JobFilters, GetNewJobsForm
│   └── candidates/                    # SkillChips, ScoredJobsTable
└── pages/
    ├── LoginPage.tsx
    ├── JobsListPage.tsx               # tabs: Jobs list + Get New Jobs form
    ├── JobDetailPage.tsx
    ├── CandidatesListPage.tsx
    ├── CandidateDetailPage.tsx        # tabs: Profile, Skills, Scored Jobs
    ├── CompaniesPage.tsx              # CRUD: blacklist/unblacklist
    └── settings/
        ├── SettingsLayout.tsx         # inner tab nav + <Outlet>
        └── RegionsPage.tsx            # full CRUD for job regions
```

## Routes

| Path | Component | Notes |
|---|---|---|
| `/login` | LoginPage | public |
| `/` | — | redirects to `/jobs` |
| `/jobs` | JobsListPage | |
| `/jobs/:id` | JobDetailPage | |
| `/candidates` | CandidatesListPage | |
| `/candidates/:id` | CandidateDetailPage | |
| `/companies` | CompaniesPage | |
| `/settings` | SettingsLayout | redirects to `/settings/regions` |
| `/settings/regions` | RegionsPage | |
| `*` | — | redirects to `/jobs` |

## API Client

All requests go through `apiClient` in `src/lib/api/client.ts`:

```ts
apiClient.get(path, ZodSchema)
apiClient.post(path, body, ZodSchema)
apiClient.put(path, body, ZodSchema)
apiClient.patch(path, body, ZodSchema)
apiClient.delete(path)          // returns void
```

**Features:**
- Every response is validated against a Zod schema; throws on failure
- Adds `Authorization: Bearer <accessToken>` when a token is present
- On 401: attempts token refresh via `POST /user/refresh { refreshToken }`, retries once
- On refresh failure: clears tokens and calls the unauthorised handler (redirects to `/login`)
- Empty response bodies return `undefined` without error

## Authentication

- `login()` / `register()` → store tokens with `tokenStore.setTokens(access, refresh)`
- **Access token**: in-memory only (lost on page close)
- **Refresh token**: in `sessionStorage` under key `gja_refresh_token` (survives tab reloads)
- `AppShell` has a `useEffect` auth guard that redirects to `/login` if not authenticated
- `logout()` clears both tokens locally (no API call)

## State Management Patterns

### Server State (React Query)

```ts
useQuery({
  queryKey: ['resource', filters],
  queryFn: () => apiCall(filters),
})
```

Query key conventions:
```ts
['jobs', filters]                  // list queries include filter object
['job', id]                        // detail queries
['scores', candidateId, filters]   // scoring list queries
['regions']                        // settings page
['job-regions']                    // GetNewJobsForm regions picker
```

### Mutations

```ts
const qc = useQueryClient()
const mutation = useMutation({
  mutationFn: apiCall,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['resource'] }),
})
```

For immediate UI updates without waiting for refetch, use `setQueryData` before `invalidateQueries`.

### Filter/Pagination State

URL search params via `useSearchParams` — persists across navigation:

```tsx
const [searchParams, setSearchParams] = useSearchParams()
const visibility = searchParams.get('visibility') ?? 'visible'
const setVisibility = (v: string) => setSearchParams({ visibility: v })
```

### UI State

`useState` for modals, tabs, expanded rows (local to component).

## Schemas & Naming Conventions

Entity field naming mirrors the API:

| Entity | ID field | Name field |
|---|---|---|
| Job region | `jobRegionId` | `name` |
| Location | `locationId` | `countryName` |
| Company | `companyId` | `companyName` |
| Sector | `sectorId` | `sectorName` |
| Experience level | `experienceLevelId` | `experienceLevelName` |
| Contract type | `contractTypeId` | `contractTypeName` |

**Transform pattern:** `RegionSchema` uses a Zod `.transform()` to map `jobRegionId → id` so all UI components receive `{ id, name }`:

```ts
const RegionSchema = z.object({
  jobRegionId: z.number(),
  name: z.string(),
  isSelectedByDefault: z.boolean().default(false),
}).transform(r => ({ id: r.jobRegionId, name: r.name, isSelectedByDefault: r.isSelectedByDefault }));
```

## UI Component Conventions

- **Button**: variants `default | destructive | outline | secondary | ghost | link`; sizes `default | sm | lg | icon`
- **Badge**: variants `default | secondary | destructive | success | warning | outline`
- **MultiSelect**: accepts `{ id: number; name: string }[]` — use for any multi-value picker
- **Dialog**: use for create/edit forms; controlled via `open` + `onOpenChange`
- All components use `cn()` for class composition and `React.forwardRef` where they accept a ref
- Icons from `lucide-react`, standard sizes: `h-4 w-4` (nav/buttons), `h-3.5 w-3.5` (inline in sm buttons)

## GetNewJobsForm & SDK

The form uses enums from `@dumitrusirbu92/get-job-assistant-sdk`:

- `ContractTypeEnum`, `ExperienceLevelEnum`, `PublishedAtEnum`, `WorkTypeEnum`
- Submits `GetNewJobsParamsDto` with `jobRegionIds: number[]` (not location strings)
- Regions with `isSelectedByDefault: true` are pre-selected via `useEffect` on load
- `reflect-metadata` must be imported before the SDK (done in `main.tsx`)

## Job Regions

Regions are stored in the `job_region` Postgres table (`jobRegionId`, `name`, `isSelectedByDefault`).

**Endpoints:**
- `GET /job-region` → list (does not return `isSelectedByDefault`; schema defaults to `false`)
- `POST /job-region` → create `{ name, isSelectedByDefault }`
- `PUT /job-region/:id` → full update (not PATCH)
- `DELETE /job-region/:id` → delete
- Managed in Settings → Regions; also used as the multi-select in the Get New Jobs form

## Scored Jobs Visibility

The Scored Jobs tab on the candidate detail page filters scores by visibility via three pills: **Visible** (default), **All**, **Hidden only** — backed by `JobScoreVisibilityEnum` from the SDK.

**Features:**
- Visibility filter stored in URL search params: `?visibility=visible|hidden|all`
- Each row has an eye/eye-off icon that calls `PATCH /job-scoring/scores/:id/visibility { hidden }`
- The mutation invalidates `['scores', candidateId]`, which prefix-matches the list query
- Toggle's response schema is `z.unknown()` — response payload not consumed
- Match flags shown per row: **Seniority** only (location matching not surfaced in UI)
- List query supports filtering by `companyId`, `applicationStatusId`, and `noApplication` params

## Real-Time Job Scoring Progress

### Implementation Pattern

Create a hook `useJobScoringProgress(runId)`:

```tsx
const useJobScoringProgress = (runId: string) => {
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0 });
  const [status, setStatus] = useState<'running' | 'success' | 'partial' | 'fail'>('running');

  useEffect(() => {
    const socket = io(`${apiBase}/ws/job-scoring`);
    socket.emit('subscribe', { runId });

    socket.on('started', (payload) => {
      setProgress({ completed: 0, failed: 0, total: payload.totalJobs });
    });

    socket.on('item_completed', (payload) => {
      setProgress({ 
        completed: payload.completedItems, 
        failed: payload.failedItems, 
        total: payload.totalJobs 
      });
    });

    socket.on('item_failed', (payload) => {
      setProgress({ 
        completed: payload.completedItems, 
        failed: payload.failedItems, 
        total: payload.totalJobs 
      });
    });

    socket.on('finished', (payload) => {
      setStatus(payload.status);
      setProgress({ 
        completed: payload.completedItems, 
        failed: payload.failedItems, 
        total: payload.totalJobs 
      });
    });

    return () => socket.disconnect();
  }, [runId]);

  return { progress, status };
};
```

### Late-Join Polling

If a user navigates away and back before the run finishes, fetch the snapshot:

```tsx
const snapshot = await apiClient.get(
  `/job-scoring/scoring-run/${runId}/snapshot`,
  z.object({
    runId: z.string(),
    totalJobs: z.number(),
    completedItems: z.number(),
    failedItems: z.number(),
    status: z.enum(['running', 'success', 'partial', 'fail']),
  })
);
```

## Adding a New Page

1. Create `src/pages/MyPage.tsx`
2. Add route in `src/routes.tsx` inside the `<AppShell>` route group
3. Add nav item in `src/components/layout/AppShell.tsx` `navItems` array
4. Add API functions in the appropriate `src/lib/api/` module
5. Add Zod schemas + types in `src/lib/schemas/index.ts`

## Adding a New Settings Section

1. Create `src/pages/settings/MySection.tsx`
2. Add `<Route path="my-section" element={<MySection />} />` inside the `/settings` route group
3. Add a nav entry to the `settingsNav` array in `src/pages/settings/SettingsLayout.tsx`

## See also

- [README.md](../README.md) — setup, features, dev commands
- [docs/conventions.md](./conventions.md) — component patterns, schemas, naming
- [docs/integration-tasks.md](./integration-tasks.md) — frontend checklists for backend features
- [docs/agents-and-rules.md](./agents-and-rules.md) — team structure and tooling
