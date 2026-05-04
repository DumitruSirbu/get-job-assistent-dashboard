# CLAUDE.md

A React dashboard for job searching, candidate management, and application tracking. Talks to a private REST API using an internal SDK for type-safe contracts. See [README.md](./README.md) for setup.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript 5.8, Vite 6 |
| Routing | React Router DOM 7 |
| Server state | TanStack React Query 5 |
| Styling | TailwindCSS 4, CSS variables |
| UI primitives | Radix UI + lucide-react icons |
| Validation | Zod 4 |
| SDK | `@dumitrusirbu92/get-job-assistant-sdk` |

## Dev Commands

```bash
npm run dev       # Vite dev server on port 3001
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Environment Variables

```
VITE_API_BASE_URL=   # empty → same-origin; set to full URL (e.g. http://localhost:3000) for backend
```

## Folder Layout

```
src/
├── main.tsx               # entry: reflect-metadata, QueryClient, Router
├── routes.tsx             # route definitions
├── lib/
│   ├── api/              # HTTP clients: client.ts, auth.ts, jobs.ts, candidates.ts, scores.ts, etc.
│   ├── auth/             # tokenStore.ts (access in-memory, refresh in sessionStorage)
│   ├── schemas/          # All Zod schemas + inferred types
│   └── utils.ts          # cn() helper
├── components/
│   ├── layout/           # AppShell (nav + auth guard)
│   ├── ui/               # Button, Badge, Dialog, Input, MultiSelect, etc.
│   ├── jobs/             # JobFilters, GetNewJobsForm
│   └── candidates/       # SkillChips, ScoredJobsTable
└── pages/
    ├── LoginPage.tsx
    ├── JobsListPage.tsx
    ├── CandidatesListPage.tsx
    ├── CandidateDetailPage.tsx (tabs: Profile, Skills, Scored Jobs)
    ├── CompaniesPage.tsx
    └── settings/
        ├── SettingsLayout.tsx
        └── RegionsPage.tsx
```

## Where to look for…

- **Routes, state management, API client** → [docs/architecture.md](./docs/architecture.md)
- **Component patterns, Zod schemas, TanStack Query** → [docs/conventions.md](./docs/conventions.md)
- **Frontend checklists for backend features** → [docs/integration-tasks.md](./docs/integration-tasks.md)
- **Agents + rules** → [docs/agents-and-rules.md](./docs/agents-and-rules.md)

## Hard Rules

1. **All requests via apiClient** — `src/lib/api/client.ts` handles auth tokens + Zod validation
2. **Zod schemas validate all API responses** — add schemas to `src/lib/schemas/index.ts` before using a response
3. **URL search params for filter state** — use `useSearchParams` to persist filters across navigation
4. **TanStack Query for server state** — use `useQuery` for fetches, `useMutation` for mutations
5. **Invalidate, don't refetch manually** — use `qc.invalidateQueries()` after mutations
6. **Tokens: access in-memory, refresh in sessionStorage** — tokenStore handles this
7. **UI state with useState, server state with React Query** — don't mix them
8. **Entity naming matches API** — use `jobDescriptionId` not `id`; transform if API uses different names
9. **cn() for Tailwind composition** — never concatenate class strings
10. **Add page → add route → add nav item** — always do all three

## Context7 Reminder

See `~/.claude/rules/context7.md` — use Context7 MCP to fetch docs for React, TanStack Query, Zod, Tailwind, etc.
