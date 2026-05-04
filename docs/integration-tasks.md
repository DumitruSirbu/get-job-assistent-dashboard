# Integration Tasks

Frontend checklists and implementation guides for backend features. Cross-reference the backend API contract documentation.

## Company Blacklist Management

**Backend contract:** See [backend docs/api.md](../../get-job-assistent/docs/api.md#company-lookup-with-blacklist-support)

### Feature Overview

Users can blacklist/unblacklist companies to automatically exclude their jobs from processing and search results.

### UI Components

**Companies Page** (`src/pages/CompaniesPage.tsx`)

- Table with columns: **Name**, **Status** (Active / Blacklisted), **Actions**
- Status badge: green "Active" or red "Blacklisted"
- Action button per row:
  - If active → **"Blacklist"** button → calls `PATCH /company/:id/blacklist`
  - If blacklisted → **"Remove from blacklist"** button → calls `PATCH /company/:id/unblacklist`
- After either action, refresh the list

Optional: Blacklist filter / tab to show only blacklisted companies (calls `GET /company?isBlacklisted=true`)

### Frontend Implementation Checklist

- [ ] Add `CompanySchema` and `PaginatedCompaniesSchema` to `src/lib/schemas/index.ts`
- [ ] Add API functions to `src/lib/api/companies.ts`:
  - `listCompanies(page, limit, search?, isBlacklisted?)`
  - `blacklistCompany(companyId)`
  - `unblacklistCompany(companyId)`
- [ ] Create `src/pages/CompaniesPage.tsx`:
  - List companies in a paginated table
  - Show blacklist status as badge
  - Add action buttons for blacklist/unblacklist
- [ ] Add `useQuery` for companies list; add `useMutation` for blacklist/unblacklist actions
- [ ] On action success, invalidate the companies list query to refetch
- [ ] Add nav item in `src/components/layout/AppShell.tsx` for `/companies` route
- [ ] Test: load page, blacklist a company, verify status changes and refresh works

---

## Job Scoring Visibility & Filtering

**Backend contract:** See [backend docs/api.md](../../get-job-assistent/docs/api.md#toggle-score-visibility) and [docs/websocket.md](../../get-job-assistent/docs/websocket.md)

### Feature Overview

1. Hide individual scores from the list view
2. Filter scored jobs by visibility: Visible (default), All, Hidden only
3. Per-row toggle: eye/eye-off icon to show/hide

### UI Modifications

**Scored Jobs Tab** (existing page, new filters)

- Add three visibility filter pills above the scored jobs table:
  - **Visible** (default, pill style = `secondary`) — shows scores where `hidden = false`
  - **All** (pill style = `outline`) — shows all scores regardless of hidden flag
  - **Hidden only** (pill style = `outline`) — shows scores where `hidden = true`
- Store the selected visibility in URL search params: `?visibility=visible` (default if not set)
- When the user clicks a pill, re-fetch `GET /job-scoring/candidate/:id?visibility=<selected>&...`

**Per-row visibility toggle**

- Add an **eye** / **eye-off** icon to the rightmost column before actions:
  - Eye icon (open) when `hidden = false` → click to hide (→ `hidden = true`)
  - Eye-off icon (closed) when `hidden = true` → click to show (→ `hidden = false`)
- On click:
  1. Call `PATCH /job-scoring/scores/:id/visibility { hidden: <boolean> }`
  2. Optimistically update the row in the UI (flip the icon)
  3. The mutation's `onSuccess` invalidates the scores list, which refetches and ensures consistency
  4. If the mutation fails, show a toast error and revert the UI

### Frontend Implementation Checklist

- [ ] Update `JobScoreSchema` to include `hidden: boolean` field
- [ ] Update `ListScoresParams` schema to include `visibility` enum query param
- [ ] Add `toggleScoreVisibility(scoreId, hidden)` mutation to `src/lib/api/scores.ts`
- [ ] Update `listScoredJobsForCandidate()` call to accept `visibility` param
- [ ] On the Scored Jobs tab, render three visibility pills using `useSearchParams` to control the filter
- [ ] Store and read `visibility` from URL search params; default to `visible`
- [ ] Add eye/eye-off icon to each score row; wire to `toggleScoreVisibility` mutation
- [ ] Show loading state on the icon during the mutation
- [ ] On success, invalidate the scores list to refetch; on error, show toast and revert UI
- [ ] Test: toggle visibility, verify icon changes; verify list refetches with correct filter

---

## Real-Time Job Scoring Progress via WebSocket

**Backend contract:** See [backend docs/websocket.md](../../get-job-assistent/docs/websocket.md#job-scoring-progress)

### Feature Overview

Users can initiate a job scoring run and see real-time progress as jobs are scored. Progress is broadcast via WebSocket with fallback polling for late-joining clients.

### UI Components

**Score Newest Jobs Button**

On the Scored Jobs tab (or Jobs list), add a button: **"Score Newest Jobs"**

Clicking opens a modal with a form:
- **Title keyword** (text input, optional)
- **Limit** (number input, optional, 1–1000)
- **Published from** (date picker, optional)
- **Published to** (date picker, optional)

On submit:
1. Call `POST /job-scoring/score-newest-jobs/:candidateId { ... }`
2. Get the `runId` back
3. Open a **progress modal**

**Progress Modal**

- Progress bar: `completedItems / totalJobs`
- Counters: "45 / 100 scored, 2 failed"
- Status: "Scoring in progress…" / "Success" / "Partial failure" / "All failed"
- Subscribe to WebSocket events (`/ws/job-scoring` → subscribe message with `runId`)
- Update the progress bar and counters as events arrive
- When `finished` event arrives:
  - Show final status and counts
  - Auto-close after 3s or show a "Close" button
  - Refetch the scored jobs list

### Frontend Implementation Checklist

- [ ] Add `ScoreNewestJobsRequestSchema` to `src/lib/schemas/index.ts`
- [ ] Add `scoreNewestJobs(candidateId, params)` to `src/lib/api/scores.ts` returning `{ runId }`
- [ ] Create `useJobScoringProgress(runId)` hook in `src/lib/hooks/useJobScoringProgress.ts`:
  - Connect to `ws://<api-base>/ws/job-scoring`
  - Subscribe with the `runId`
  - Update local state on each event (`started`, `item_completed`, `item_failed`, `finished`)
  - Return `{ progress: { completed, failed, total }, status }`
- [ ] Create `<ScoringProgressModal>` component that uses the hook
- [ ] Add "Score newest jobs" button to the Scored Jobs tab
- [ ] Create a form component for scoring filters (keyword, limit, date range)
- [ ] Wire button → open form modal → on submit, call mutation → get `runId` → open progress modal
- [ ] Use the hook to display progress bar and counters
- [ ] On `finished` event, invalidate the scores list to refetch
- [ ] Test: start scoring, verify WebSocket events update UI, verify final counts, verify list refetches

**Late-join polling (optional):**
- If user navigates away and back, check if `runId` is still in progress
- Fetch `GET /job-scoring/scoring-run/:runId/snapshot` to get current state
- Resume showing progress without reconnecting WebSocket

---

## Job Scraping Triggered from Dashboard

**Backend contract:** See [backend docs/api.md](../../get-job-assistent/docs/api.md#scrape-new-jobs-from-linkedin-via-apify)

### Feature Overview

Users can trigger job scraping directly from the dashboard and see real-time progress.

### Frontend Implementation Checklist

- [ ] Verify `POST /job-description/process-new-jobs` endpoint is working
- [ ] Add a "Scrape new jobs" button on the Jobs page
- [ ] Call the endpoint and get back `{ queued: <number> }`
- [ ] Show a toast notification: "Scraping started. Queued X locations."
- [ ] (Optional) Subscribe to WebSocket events for real-time scraping progress
- [ ] Test: click button, verify scraping triggers, check console for success

---

## Notes for Implementers

**Always cross-reference:**
- Backend contract: `docs/api.md` for endpoints and DTOs
- WebSocket events: `docs/websocket.md` for event payloads
- SDK types: ensure all imports from `@dumitrusirbu92/get-job-assistant-sdk` are up-to-date

**Testing strategy:**
- Unit test mutations and hooks with mock API
- Integration test full user flows (e.g., open modal → submit form → WebSocket updates)
- Test error cases: failed mutations, WebSocket disconnect, late-join polling

**Performance notes:**
- Use URL search params for filter state to enable deep linking and browser back/forward
- Prefix-match query key invalidations for efficient refetches (e.g., `['scores', candidateId]` invalidates `['scores', candidateId, { visibility: 'visible' }]`)
- Optimistic updates reduce perceived latency; always have a fallback if mutation fails

---

See also: [docs/architecture.md](./architecture.md), [docs/conventions.md](./conventions.md)
