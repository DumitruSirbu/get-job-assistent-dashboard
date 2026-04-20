# Get Job Assistant Dashboard

A React dashboard for job searching, candidate management, and application tracking. It talks to a private REST API and uses an internal SDK for job-fetch queue parameters.

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
| SDK | `@dumitru_sirbu92/get-job-assistant-sdk` — enums + DTOs for the job-fetch queue |

## Dev Commands

```bash
npm run dev       # dev server on port 3001
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # preview production build
```

## Environment Variables

```
VITE_API_BASE_URL=   # empty → same-origin; set to full URL (e.g. http://localhost:3000) for real backend
```

## Project Structure

```
src/
├── main.tsx                    # entry: reflect-metadata, QueryClient, Router
├── routes.tsx                  # all route definitions
├── lib/
│   ├── api/
│   │   ├── client.ts           # fetch-based HTTP client with Zod validation + token refresh
│   │   ├── auth.ts             # login, register, logout (direct fetch, not apiClient)
│   │   ├── jobs.ts             # listJobs, getJob, processNewJobs
│   │   ├── candidates.ts       # listCandidates, getCandidate
│   │   ├── companies.ts        # listCompanies, blacklistCompany, unblacklistCompany
│   │   ├── scores.ts           # listScoredJobsForCandidate
│   │   ├── applications.ts     # getApplicationsForCandidate, createApplication, updateApplication, deleteApplication
│   │   └── lookups.ts          # getJobRegions, createRegion, updateRegion, deleteRegion + read-only lookup helpers
│   ├── auth/
│   │   └── tokenStore.ts       # access token: in-memory; refresh token: sessionStorage (key: gja_refresh_token)
│   ├── schemas/
│   │   └── index.ts            # all Zod schemas and inferred TypeScript types
│   └── utils.ts                # cn() helper
├── components/
│   ├── layout/AppShell.tsx     # sidebar nav + auth guard
│   ├── ui/                     # badge, button, card, dialog, input, select, multi-select
│   ├── jobs/                   # JobFilters, GetNewJobsForm
│   └── candidates/             # SkillChips, ScoredJobsTable
└── pages/
    ├── LoginPage.tsx
    ├── JobsListPage.tsx        # tabs: Jobs list + Get New Jobs form
    ├── JobDetailPage.tsx
    ├── CandidatesListPage.tsx
    ├── CandidateDetailPage.tsx # tabs: Profile, Skills, Scored Jobs
    ├── CompaniesPage.tsx       # CRUD: blacklist/unblacklist
    └── settings/
        ├── SettingsLayout.tsx  # inner tab nav + <Outlet>
        └── RegionsPage.tsx     # full CRUD for job regions
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

- Every response is validated against a Zod schema; throws on failure
- Adds `Authorization: Bearer <accessToken>` when a token is present
- On 401: attempts token refresh via `POST /user/refresh { refreshToken }`, retries once; on failure clears tokens and calls the unauthorised handler (which redirects to `/login`)
- Empty response bodies return `undefined` without error

## Authentication

- `login()` / `register()` → store tokens with `tokenStore.setTokens(access, refresh)`
- Access token is in-memory only (lost on page close)
- Refresh token is in `sessionStorage` (survives tab reloads)
- `AppShell` has a `useEffect` auth guard that redirects to `/login` if not authenticated
- `logout()` clears both tokens locally (no API call)

## Schemas & Naming Conventions

Entity field naming mirrors the API (not generic `id`):

| Entity | ID field | Name field |
|---|---|---|
| Job region | `jobRegionId` | `name` |
| Location | `locationId` | `countryName` |
| Company | `companyId` | `companyName` |
| Sector | `sectorId` | `sectorName` |
| Experience level | `experienceLevelId` | `experienceLevelName` |
| Contract type | `contractTypeId` | `contractTypeName` |

`RegionSchema` uses a Zod `.transform()` to map `jobRegionId → id` so all UI components (especially `MultiSelect`) receive `{ id, name }` — do the same for any new lookup with a non-`id` primary key.

`LookupListSchema` (`{ items: { id, name }[] }`) is used for read-only dropdown lists where the API genuinely returns `id` and `name`. Do not use it for entities that use `entityId` naming.

## State Management Patterns

- **Server state**: React Query (`useQuery` / `useMutation`)
- **Filter/pagination state**: URL search params via `useSearchParams` — persists across navigation
- **UI state**: `useState` (modals, tabs, expanded rows)
- **Auth tokens**: `tokenStore` module

### Query key conventions
```ts
['jobs', filters]          // list queries include filter object
['job', id]                // detail queries
['regions']                // settings page
['job-regions']            // GetNewJobsForm regions picker
```

### Mutation pattern (follow this everywhere)
```ts
const qc = useQueryClient()
const mutation = useMutation({
  mutationFn: apiCall,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['resource'] }),
})
```

For immediate UI updates without waiting for refetch, use `setQueryData` before `invalidateQueries`.

## UI Component Conventions

- `Button`: variants `default | destructive | outline | secondary | ghost | link`; sizes `default | sm | lg | icon`
- `Badge`: variants `default | secondary | destructive | success | warning | outline`
- `MultiSelect`: accepts `{ id: number; name: string }[]` — use for any multi-value picker
- `Dialog`: use for create/edit forms; controlled via `open` + `onOpenChange`
- All components use `cn()` for class composition and `React.forwardRef` where they accept a ref
- Icons from `lucide-react`, standard sizes: `h-4 w-4` (nav/buttons), `h-3.5 w-3.5` (inline in sm buttons)

## GetNewJobsForm & SDK

The form uses enums from `@dumitru_sirbu92/get-job-assistant-sdk`:

- `ContractTypeEnum`, `ExperienceLevelEnum`, `PublishedAtEnum`, `WorkTypeEnum`
- Submits `GetNewJobsParamsDto` with `jobRegionIds: number[]` (not location strings)
- Regions with `isSelectedByDefault: true` are pre-selected via `useEffect` on load
- `reflect-metadata` must be imported before the SDK (done in `main.tsx`)

## Job Regions

Regions are stored in the `job_region` Postgres table (`jobRegionId`, `name`, `isSelectedByDefault`).

- `GET /job-region` → list (currently does not return `isSelectedByDefault`; schema defaults to `false` via `.catch(false)`)
- `POST /job-region` → create `{ name, isSelectedByDefault }`
- `PUT /job-region/:id` → full update (not PATCH)
- `DELETE /job-region/:id` → delete
- Managed in Settings → Regions; also used as the multi-select in the Get New Jobs form

## Adding a New Page

1. Create `src/pages/MyPage.tsx`
2. Add route in `src/routes.tsx` inside the `<AppShell>` route group
3. Add nav item in `src/components/layout/AppShell.tsx` `navItems` array
4. Add API functions in the appropriate `src/lib/api/` module
5. Add Zod schemas + types in `src/lib/schemas/index.ts`

## Adding a New Settings Section

1. Create `src/pages/settings/MySection.tsx`
2. Add `<Route path="my-section" element={<MySection />} />` inside the `/settings` route group in `routes.tsx`
3. Add a nav entry to the `settingsNav` array in `src/pages/settings/SettingsLayout.tsx`
