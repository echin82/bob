# Design: Contract Risk Assessment Tool

## HLD

This HLD describes the MVP user and system flow for the Contract Risk Assessment Tool, based on the architecture in [`architecture.md`](sw-ai-academy-engineering-lab/delivery/specs/contract-risk-assessment/architecture.md). It stays within the defined architecture: React frontend, Node.js backend, SSE for status updates, SQLite for persistence, local file storage for uploads, and an in-process simulated Risk Engine.

### 1. Main user flow

The primary user flow is a single-screen sequence:

1. The user selects a contract file in the React UI and uploads it.
2. The contract appears in the queue immediately with file name, upload timestamp, and a `pending` status.
3. The user remains on the same screen while the system simulates processing.
4. The queue updates automatically when processing completes.
5. The user selects the completed contract from the queue.
6. The report opens inline on the same screen and shows the overall risk level, summary, and findings.
7. The user pages through findings if needed, focusing first on the highest-severity items.
8. The user reviews findings one by one, setting a status (`accepted`, `overridden`, or `reviewed`) and optionally adding comments.
9. As findings are reviewed, the displayed overall risk level updates to reflect the current reviewed state.
10. If the user refreshes or closes and reopens the browser, the queue, reports, and prior review decisions remain available.

This flow covers the required MVP journey: upload → queue → simulated processing → report viewing → finding review.

### 2. Main system flow

At a high level, the system flow is:

1. The React frontend validates the selected file type and size before upload.
2. The frontend sends the file to the Node.js REST API.
3. The REST API validates the file again server-side, writes the file to the local file store, and creates a contract record in SQLite with a `pending` status.
4. The API returns the new contract metadata so the frontend can show the queue entry immediately.
5. The API invokes the in-process Risk Engine asynchronously.
6. The Risk Engine simulates processing, generates mock report content and findings, stores them in SQLite, updates the contract status to `complete`, and signals the SSE layer.
7. The SSE endpoint pushes the status change to the browser.
8. The frontend updates the queue without a page reload.
9. When the user opens a completed contract, the frontend requests the report and findings from the REST API.
10. The API reads the persisted report data from SQLite and returns it to the frontend for inline rendering.
11. When the user changes a finding status or comment, the frontend sends the update to the API.
12. The API persists the update in SQLite.
13. The frontend recalculates the overall risk level locally from the in-memory findings state and updates the displayed report header.

### 3. Component interactions

The main component interactions are:

- **React Frontend ↔ REST API**  
  Used for file upload, initial contract queue loading, report retrieval, and saving finding review updates.

- **React Frontend ← SSE Endpoint**  
  Used for one-way status updates so queue entries move from `pending` to `complete` without polling or refresh.

- **REST API → Local File Store**  
  Used to persist the uploaded raw contract file under an internal contract ID.

- **REST API ↔ SQLite**  
  Used to create and load contract records and to persist finding review changes.

- **REST API → Risk Engine**  
  Used to trigger asynchronous simulated processing after a successful upload.

- **Risk Engine ↔ SQLite**  
  Used to persist generated report content, generated findings, and the final `complete` status.

- **Risk Engine → SSE Endpoint**  
  Used to notify the backend event stream that processing has finished and the browser can be updated.

These interactions preserve the architecture boundaries defined in [`architecture.md`](sw-ai-academy-engineering-lab/delivery/specs/contract-risk-assessment/architecture.md:66): the frontend handles presentation and user interaction, the REST API orchestrates I/O, the Risk Engine owns simulated report generation, and SQLite plus the file store provide persistence.

### 4. Data movement across components

The main data movement through the system is:

- **Upload data**  
  The contract file moves from browser to REST API, then from REST API to the local file store. At the same time, contract metadata moves from REST API into SQLite so the queue can show the new entry immediately.

- **Processing state**  
  The contract status starts as `pending` in SQLite. When simulated processing completes, the Risk Engine updates the status to `complete` in SQLite, and that status change is pushed through SSE to the browser.

- **Generated report data**  
  Mock report summary, overall risk level, and findings are generated inside the Risk Engine and written into SQLite. When the user opens a contract, that persisted report data moves from SQLite through the REST API to the React frontend.

- **Review decision data**  
  Finding status selections and comments move from the React frontend to the REST API and then into SQLite. The updated findings remain available on subsequent page loads because SQLite is the source of truth.

- **Displayed risk level**  
  The stored report provides the initial displayed risk level. After the report is loaded, the frontend recalculates the displayed overall risk level locally from the current finding statuses, following the architectural decision in [`architecture.md`](sw-ai-academy-engineering-lab/delivery/specs/contract-risk-assessment/architecture.md:256).

### 5. Traceability to the spec

| HLD area | Design coverage | Spec trace |
|---|---|---|
| Upload validation and acceptance | Frontend validates early; REST API validates again before saving | FR-1, NFR-3, NFR-4 |
| Queue entry creation | Upload creates a persisted contract record shown immediately in the queue | FR-2, FR-3 |
| Automatic status progression | Risk Engine updates contract from `pending` to `complete`; SSE updates the browser live | FR-4, NFR-2 |
| Report generation | Simulated Risk Engine produces overall risk level, summary, and ordered findings | FR-5, FR-6, NFR-1 |
| High-risk visibility | Frontend renders high-severity findings distinctly in the inline report | FR-7 |
| Inline report viewing | User opens the completed report on the same screen with no route change | FR-8 |
| Finding review | Frontend captures status and comment updates; API persists them | FR-9, FR-10 |
| Persistence across restart | Contracts, reports, statuses, and comments are stored in SQLite and reloaded on startup | FR-11, NFR-5 |
| Findings pagination | Frontend paginates the findings list at 10 items per page | FR-12, NFR-7 |
| Risk level recalculation | Frontend updates displayed overall risk level from current finding state | FR-13, NFR-8, A7 |

### 6. MVP design summary

The MVP HLD is intentionally simple:

- one browser-based React screen for queue and report viewing
- one local Node.js backend for orchestration
- one in-process Risk Engine for simulated report generation
- one SQLite database for all persisted business data
- one local uploads folder for raw files
- one SSE stream for live queue status updates

This keeps the upload-to-review experience fast, local, and aligned with the architecture constraints while avoiding API detail, schema detail, and implementation planning.