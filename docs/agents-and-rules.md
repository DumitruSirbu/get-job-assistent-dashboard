# Agents, Commands, and Rules

Catalog of the AI agents, CLI commands, and rules available to this project and the broader `get-job-assistent` ecosystem.

## Subagents (`~/.claude/agents/`)

| Agent | Role | When to use |
|---|---|---|
| `gja-architect` | Orchestration, planning, high-level design decisions | Breaking down large features, planning component structure, refactoring scope |
| `gja-frontend-react` | React UI implementation, component design, state management | Dashboard feature implementation, bug fixes, component refactoring |
| `gja-backend-nestjs` | NestJS implementation, API changes | When dashboard needs new backend endpoints or changes |
| `gja-sdk-maintainer` | SDK exports, type definitions, cross-repo compatibility | When SDK exports or types need updating for new dashboard features |
| `gja-devops` | Infrastructure, deployment, CI/CD | Deployment changes, environment configuration |
| `gja-qa-engineer` | Test coverage, test automation | Test writing, coverage analysis |
| `gja-scribe` | Documentation, README updates | Syncing docs with code changes |
| `gja-review-logic` | Code review for business logic correctness | Reviewing complex state management, API integration logic |
| `gja-review-performance` | Code review for performance and optimization | Component render optimization, query key efficiency |
| `gja-review-security` | Code review for security vulnerabilities | Token handling, sensitive data in state, XSS prevention |

## Commands

| Command | Description | Agent |
|---|---|---|
| `/cover-tests` | Analyze code for missing test coverage; suggest tests | gja-qa-engineer |
| `/review-changes [dimension]` | Review recent diffs in one dimension: logic / performance / security | gja-review-{logic,performance,security} |

## User-Level Rules (`~/.claude/rules/`)

| Rule | Purpose |
|---|---|
| `context7.md` | Use Context7 MCP to fetch current library docs (React, TanStack Query, Zod, etc.) instead of relying on training data |

## Project-Level Rules (canonical source: `docs/`)

**Note:** Conventions now live in the `docs/` directory. No `.cursor/rules/` symlinks needed for dashboard.

| File | Globs | Purpose |
|---|---|---|
| `docs/architecture.md` | `src/**/*.tsx,src/**/*.ts` | Routes, state management, API client design |
| `docs/conventions.md` | `src/**/*.tsx,src/**/*.ts` | Component patterns, Zod schemas, TanStack Query, naming |
| `docs/integration-tasks.md` | — | Frontend checklists for backend features (no globs) |
| `docs/agents-and-rules.md` | — | Team catalog (no globs) |

## Skills

- **Frontend**: React 19, TanStack Query 5, React Router 7, TailwindCSS 4, Zod, Radix UI, TypeScript advanced types
- **Backend (for integration)**: NestJS 11, TypeORM, PostgreSQL, Socket.io, WebSocket patterns
- **Testing**: Jest, React Testing Library
- **Documentation**: Markdown, technical writing

## How Agents Use This Catalog

1. **Implementing a new feature**: Invoke `gja-frontend-react` with detailed requirements; it cross-references `docs/` and backend `docs/api.md` for contracts
2. **Cross-team changes**: If the feature requires backend API changes, escalate API details to `gja-backend-nestjs`; sync via the SDK
3. **Code review**: Invoke `/review-changes logic` (or performance/security) to analyze recent commits
4. **Documentation sync**: After a code change, invoke `gja-scribe` to update `docs/`

## Key Cross-Repository Patterns

**Backend API Contract**
- All endpoints documented in `get-job-assistent/docs/api.md`
- WebSocket events documented in `get-job-assistent/docs/websocket.md`
- Keep dashboard docs/integration-tasks.md in sync with backend changes

**Shared SDK**
- Enums and types from `@dumitrusirbu92/get-job-assistant-sdk`
- Updated and published via `gja-sdk-maintainer`
- Dashboard schemas should match SDK types exactly

**State Management**
- Server state: React Query (`useQuery` / `useMutation`)
- Filter state: URL search params (persisted across navigation)
- Auth tokens: `tokenStore` module (access in-memory, refresh in sessionStorage)

---

See also: [README.md](../README.md), [CLAUDE.md](../CLAUDE.md), [backend docs/agents-and-rules.md](../../get-job-assistent/docs/agents-and-rules.md)
