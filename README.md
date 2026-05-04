# Get Job Assistant Dashboard

React dashboard for job searching, candidate management, and application tracking. Talks to the backend REST API using a shared SDK for type-safe contracts.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript 5.8, Vite 6 |
| Routing | React Router DOM 7 |
| Server state | TanStack React Query 5 |
| Styling | TailwindCSS 4, CSS variables |
| UI | Radix UI, lucide-react icons |
| Validation | Zod 4 |
| SDK | `@dumitrusirbu92/get-job-assistant-sdk` |

## Getting Started

### Prerequisites

- Node 22
- Backend running on `http://localhost:3000` (or set `VITE_API_BASE_URL`)

### Setup

```bash
npm install
npm run dev       # Vite dev server on http://localhost:3001
```

### Environment

```bash
# .env (optional)
VITE_API_BASE_URL=http://localhost:3000
```

Leave empty to use same-origin (useful when both backend and frontend are behind a reverse proxy).

## Dev Commands

```bash
npm run dev        # dev server on port 3001
npm run build      # tsc -b && vite build
npm run lint       # ESLint with --fix
npm run preview    # preview production build
```

## Features

- **Jobs** — list/filter jobs, view details, trigger LinkedIn scraping. Real-time scraping progress via WebSocket.
- **Candidates** — list candidates, view profiles (name, skills, experience), scored jobs per candidate.
- **Scored Jobs** — per-candidate match scores with visibility filters (Visible / All / Hidden). Real-time scoring progress via WebSocket. Filter by company, application status, score range.
- **Applications** — track which jobs you've applied to and their status (applied, interview, offer, rejected, withdrawn).
- **Companies** — manage blacklist to exclude companies from job processing.
- **Settings → Regions** — CRUD for job regions/locations used in the "Score New Jobs" form.

## Authentication

- **Access token**: in-memory only (lost on page close)
- **Refresh token**: stored in `sessionStorage` under `gja_refresh_token` (survives tab reloads)
- Login page → enter credentials → tokens are set → redirected to `/jobs`
- 401 response on API call → auto-refresh token → retry request → if refresh fails, redirect to `/login`
- Manual logout clears tokens locally (no API call)

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | (empty) | Backend API base URL; empty = same-origin |

## Project Structure

```
src/
├── main.tsx              # React entry + React Query setup
├── routes.tsx            # all route definitions
├── lib/
│   ├── api/             # API client functions (jobs, candidates, scores, etc.)
│   ├── auth/            # token management
│   ├── schemas/         # Zod schemas for all API responses
│   └── utils.ts         # cn() helper
├── components/          # reusable UI components
└── pages/               # page-level components
```

Full structure and conventions: see [docs/architecture.md](./docs/architecture.md) and [docs/conventions.md](./docs/conventions.md).

## Key Patterns

### API Client

```ts
import { apiClient } from '@/lib/api/client';

const jobs = await apiClient.get('/job-description?page=1', JobsResponseSchema);
const result = await apiClient.post('/candidate-profile/process-cv', { version: 'v1' }, CandidateSchema);
```

Every response is validated against a Zod schema.

### React Query

```ts
// Query
const { data, isLoading } = useQuery({
  queryKey: ['jobs', { page }],
  queryFn: () => api.listJobs({ page }),
});

// Mutation
const mutation = useMutation({
  mutationFn: api.toggleVisibility,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] }),
});
```

### Filter State

Use URL search params to persist filters across navigation:

```ts
const [searchParams, setSearchParams] = useSearchParams();
const page = parseInt(searchParams.get('page') ?? '1');
```

## Real-Time Features

**Job Scraping Progress**: `WebSocket /ws/job-scraping` (emits location completion events)

**Job Scoring Progress**: `WebSocket /ws/job-scoring` (emits item_completed, item_failed, finished events)

See [backend docs/websocket.md](../get-job-assistent/docs/websocket.md) for event payloads and subscription pattern.

## Integration with Backend

The dashboard consumes:
- **HTTP API** — [backend docs/api.md](../get-job-assistent/docs/api.md)
- **WebSocket Events** — [backend docs/websocket.md](../get-job-assistent/docs/websocket.md)
- **SDK Types** — `@dumitrusirbu92/get-job-assistant-sdk`

New backend features → add Zod schemas + API functions → build UI → test integration.

## Docs

See [CLAUDE.md](./CLAUDE.md) for a quick router to all docs:
- [docs/architecture.md](./docs/architecture.md) — routes, state management, API client
- [docs/conventions.md](./docs/conventions.md) — component patterns, Zod schemas, TanStack Query
- [docs/integration-tasks.md](./docs/integration-tasks.md) — frontend checklists for backend features
- [docs/agents-and-rules.md](./docs/agents-and-rules.md) — team structure and tooling
