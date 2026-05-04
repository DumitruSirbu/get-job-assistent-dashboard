---
description: Component patterns, Zod schema conventions, TanStack Query patterns, UI component style guide, and naming conventions
globs: "src/**/*.tsx,src/**/*.ts"
alwaysApply: false
---

# Conventions

## Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Files — page components | PascalCase | `JobsListPage.tsx` |
| Files — UI components | PascalCase | `JobCard.tsx` |
| Files — hooks | camelCase + Hook suffix | `useJobScoringProgress.ts` |
| Files — utilities | camelCase | `formatDate.ts` |
| Folders | kebab-case | `pages/`, `components/ui/` |
| Component names | PascalCase | `JobCard`, `MultiSelect` |
| Hooks | `use` prefix + PascalCase | `useJobScoringProgress`, `useCandidates` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

## Zod Schemas

All API responses are validated with Zod schemas in `src/lib/schemas/index.ts`.

### Schema Patterns

**Simple entity:**
```ts
const JobSchema = z.object({
  jobDescriptionId: z.number(),
  jobTitle: z.string(),
  jobDescription: z.string(),
  publishedAt: z.string().datetime(),
});
```

**Paginated response:**
```ts
const PaginatedJobsSchema = z.object({
  items: z.array(JobSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
```

**Transform for renamed fields:**
```ts
const RegionSchema = z.object({
  jobRegionId: z.number(),
  name: z.string(),
  isSelectedByDefault: z.boolean().default(false),
}).transform(r => ({ 
  id: r.jobRegionId, 
  name: r.name, 
  isSelectedByDefault: r.isSelectedByDefault 
}));
```

**Enum with mapped values:**
```ts
const VisibilitySchema = z.enum(['visible', 'hidden', 'all']);
type Visibility = z.infer<typeof VisibilitySchema>;
```

### Type Inference

```ts
type Job = z.infer<typeof JobSchema>;
type PaginatedJobs = z.infer<typeof PaginatedJobsSchema>;
```

## TanStack Query Patterns

### useQuery

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs', { page, search }],
  queryFn: () => api.listJobs({ page, search }),
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

**Query key conventions:**
```ts
['jobs']                                 // single resource
['jobs', { page, search }]              // with filters (pass full filter object)
['job', jobId]                          // single item
['scores', candidateId]                 // list scoped to parent resource
['scores', candidateId, { visibility }] // list with filters
```

### useMutation

```ts
const qc = useQueryClient();
const createJob = useMutation({
  mutationFn: (data: CreateJobInput) => api.createJob(data),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['jobs'] });
  },
  onError: (error) => {
    showToast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

**Mutation success patterns:**

Option 1 — Invalidate (full refetch):
```ts
onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] })
```

Option 2 — SetQueryData (optimistic update):
```ts
onSuccess: (newJob) => {
  qc.setQueryData(['jobs'], (old: Job[]) => [...old, newJob]);
}
```

Option 3 — Both (optimistic + invalidate on background refetch):
```ts
onSuccess: (newJob) => {
  qc.setQueryData(['jobs'], (old: Job[]) => [...old, newJob]);
  qc.invalidateQueries({ queryKey: ['jobs'] });
}
```

## UI Component Style Guide

### Button

```tsx
<Button variant="default" size="default">Primary</Button>
<Button variant="secondary" size="sm">Secondary</Button>
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
```

**Variants:** `default | secondary | destructive | outline | ghost | link`
**Sizes:** `default | sm | lg | icon`

### Badge

```tsx
<Badge variant="default">Active</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
```

**Variants:** `default | secondary | destructive | success | warning | outline`

### MultiSelect

```tsx
const [selected, setSelected] = useState<{ id: number; name: string }[]>([]);

<MultiSelect
  options={regions}
  value={selected}
  onChange={setSelected}
  placeholder="Select regions…"
/>
```

Accepts array of `{ id: number; name: string }` objects. Used for any multi-value picker (regions, companies, statuses).

### Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <div>{/* content */}</div>
  </DialogContent>
</Dialog>
```

Controlled via `open` and `onOpenChange` props.

### Icons

From `lucide-react`:
```tsx
<Trash2 className="h-4 w-4" />         // standard button/nav icon
<Eye className="h-3.5 w-3.5" />        // inline in small button
<ChevronDown className="h-5 w-5" />    // dropdown indicator
```

Standard sizes: `h-4 w-4` (nav, buttons), `h-3.5 w-3.5` (inline in small), `h-5 w-5` (large).

## Component Patterns

### Page Component

```tsx
export function JobsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1');
  
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', { page }],
    queryFn: () => api.listJobs({ page }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Jobs</h1>
      {jobs?.items.map(job => <JobCard key={job.jobDescriptionId} job={job} />)}
      <Pagination page={page} onPageChange={p => setSearchParams({ page: p.toString() })} />
    </div>
  );
}
```

### Controlled Form Component

```tsx
export function JobFiltersForm({ onSubmit }: { onSubmit: (data: FilterData) => void }) {
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');

  const handleSubmit = () => {
    onSubmit({ search, minScore: minScore ? parseInt(minScore) : undefined });
  };

  return (
    <div className="flex gap-2">
      <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      <Input type="number" placeholder="Min score…" value={minScore} onChange={e => setMinScore(e.target.value)} />
      <Button onClick={handleSubmit}>Apply Filters</Button>
    </div>
  );
}
```

### Custom Hook

```tsx
export function useJobScoringProgress(runId: string) {
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0 });
  const [status, setStatus] = useState<'running' | 'success' | 'partial' | 'fail'>('running');

  useEffect(() => {
    const socket = io(`${getApiBase()}/ws/job-scoring`);
    socket.emit('subscribe', { runId });

    socket.on('item_completed', (payload) => {
      setProgress({
        completed: payload.completedItems,
        failed: payload.failedItems,
        total: payload.totalJobs,
      });
    });

    socket.on('finished', (payload) => {
      setStatus(payload.status);
    });

    return () => socket.disconnect();
  }, [runId]);

  return { progress, status };
}
```

## Styling with TailwindCSS

- Use `cn()` from `src/lib/utils.ts` to compose classes
- Leverage CSS variables for theme colors (defined in `tailwind.config.js`)
- Standard spacing: `gap-2`, `gap-4`, `p-4`, `mb-8`
- Responsive: `md:grid md:grid-cols-2`, `lg:flex-row`

Example:
```tsx
<div className={cn(
  'flex items-center justify-between',
  'p-4 rounded-lg border',
  isActive && 'bg-blue-50',
)}>
  {/* content */}
</div>
```

## API Client Patterns

### Fetch helper

All API calls use `apiClient` in `src/lib/api/client.ts`:

```ts
// GET request
const jobs = await apiClient.get('/job-description?page=1', PaginatedJobsSchema);

// POST request
const result = await apiClient.post('/candidate-profile/process-cv', { version: 'v1' }, CandidateProfileSchema);

// PATCH request
const updated = await apiClient.patch('/job-scoring/scores/1/visibility', { hidden: true }, JobScoreSchema);

// DELETE request
await apiClient.delete('/job-region/1');
```

### Module organization

Each `src/lib/api/` module groups related endpoints:

```ts
// src/lib/api/scores.ts
export const listScoredJobsForCandidate = (candidateId: number, filters: ScoreFilters) =>
  apiClient.get(`/job-scoring/candidate/${candidateId}?...`, PaginatedScoresSchema);

export const toggleScoreVisibility = (scoreId: number, hidden: boolean) =>
  apiClient.patch(`/job-scoring/scores/${scoreId}/visibility`, { hidden }, JobScoreSchema);

export const scoreNewestJobs = (candidateId: number, params: ScoreParams) =>
  apiClient.post(`/job-scoring/score-newest-jobs/${candidateId}`, params, z.object({ runId: z.string() }));
```

## Adding a Settings Section

1. Create page component in `src/pages/settings/MySection.tsx`
2. Add route in `src/routes.tsx`:
   ```tsx
   <Route path="my-section" element={<MySection />} />
   ```
3. Add nav item in `src/pages/settings/SettingsLayout.tsx`:
   ```tsx
   const settingsNav = [
     { label: 'Regions', href: '/settings/regions' },
     { label: 'My Section', href: '/settings/my-section' },
   ];
   ```
4. Implement CRUD using TanStack Query mutations + Dialog/Form components

## See also

- [docs/architecture.md](./architecture.md) — routes, state management, API client
- [README.md](../README.md) — setup, features, dev commands
- [docs/integration-tasks.md](./integration-tasks.md) — frontend checklists for backend features
