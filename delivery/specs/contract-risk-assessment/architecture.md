# Architecture: Contract Risk Assessment Tool

**Version:** 0.1  
**Status:** Draft  
**Source spec:** `delivery/specs/contract-risk-assessment/feature-spec.md`  
**MVP constraints:** React frontend · Node.js backend · SQLite database · Local file storage · Simulated document reading · No authentication

---

## 1. Purpose

This document describes the high-level architecture for the Contract Risk Assessment MVP. It covers system context, major components, their responsibilities and boundaries, data flow, and the key decisions that shape the design.

The goal is to support a single-user, single-screen experience in which a user uploads a contract file, receives a simulated risk report, and records review decisions against individual findings — all without leaving the page and with full persistence across browser restarts.

Decisions here are scoped strictly to what is required to meet the functional requirements (FR-1–FR-13) and non-functional requirements (NFR-1–NFR-8) defined in the feature spec.

---

## 2. System Context

The application runs entirely on one machine. There are no external services, cloud integrations, or third-party APIs.

```
┌─────────────────────────────────────────────────────┐
│                  User's Browser                     │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │            React Frontend (SPA)             │   │
│   └────────────────────┬────────────────────────┘   │
│                        │ HTTP (localhost)            │
└────────────────────────┼────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────┐
│             Node.js Backend (localhost)             │
│                        │                            │
│   ┌────────────────┐   │   ┌─────────────────────┐  │
│   │  REST API      │◄──┘   │  Risk Engine        │  │
│   │  + SSE endpoint│       │  (mock simulation)  │  │
│   └───────┬────────┘       └──────────┬──────────┘  │
│           │                           │             │
│   ┌───────▼────────┐       ┌──────────▼──────────┐  │
│   │  SQLite DB     │       │  Local File Store   │  │
│   │  (data.db)     │       │  (uploads/ folder)  │  │
│   └────────────────┘       └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

The frontend is served as a static build or via a local dev server. All API traffic is local (no network egress).

---

## 3. Major Components

| Component | Technology | Role |
|-----------|-----------|------|
| **React Frontend** | React (SPA) | Renders the contract queue, inline report panel, and all user interactions |
| **REST API Layer** | Node.js (Express or equivalent) | Handles file uploads, serves contract and report data, receives review decision updates |
| **SSE Endpoint** | Node.js (Server-Sent Events) | Pushes real-time status updates to the browser so the queue refreshes without polling (NFR-2) |
| **Risk Engine** | Node.js module | Simulates document processing; generates mock findings, severity labels, and section references |
| **SQLite Database** | SQLite (`data.db`) | Persists contracts, reports, findings, finding statuses, and comments |
| **Local File Store** | Filesystem (`uploads/` folder) | Stores the raw uploaded files; filenames are keyed by an internal contract ID |

---

## 4. Component Responsibilities and Boundaries

### 4.1 React Frontend

**Responsible for:**
- File selection with client-side format and size validation (FR-1, NFR-4)
- Displaying the contract queue: file name, upload timestamp, processing status (FR-3)
- Subscribing to the SSE stream and updating queue status without a page reload (FR-4, NFR-2)
- Rendering the inline report panel when a completed contract is selected (FR-8)
- Paginating findings at 10 per page (FR-12, NFR-7)
- Applying visual distinction to high-severity findings (FR-7)
- Sending finding status and comment updates to the backend (FR-9, FR-10)
- Deriving and displaying the overall risk level locally from the current finding states (FR-13, NFR-8)
- Loading all persisted state from the backend on initial page load (FR-11, NFR-5)

**Not responsible for:**
- Risk report generation logic
- File persistence
- Database writes
- Routing to separate pages (FR-8 explicitly requires inline rendering)

**Boundary:** The frontend treats the backend as its only source of truth for stored data. It holds no local state that is not reflected in or recoverable from the backend.

---

### 4.2 REST API Layer

**Responsible for:**
- Accepting multipart file upload requests; enforcing format and size constraints server-side as a second validation gate (FR-1, NFR-3)
- Writing the uploaded file to the local file store and creating a contract record in SQLite
- Triggering the Risk Engine asynchronously after a successful upload
- Serving the full contract list and individual reports on request
- Accepting PATCH requests to update finding status and comments; writing changes to SQLite (FR-9, FR-10)
- Serving the SSE stream for status change events

**Not responsible for:**
- Report generation logic (delegated to the Risk Engine)
- Risk level recalculation (handled in the frontend, per decision AD-3)

**Boundary:** The API layer orchestrates I/O. Business logic for risk simulation lives in the Risk Engine; business logic for risk level display lives in the frontend.

---

### 4.3 Risk Engine

**Responsible for:**
- Receiving a contract ID after upload
- Generating a deterministic set of mock findings (severity, explanation, simulated section reference) — without reading file content (A1)
- Applying an optional artificial delay to simulate realistic async processing (A4, NFR-1: ≤10 s total)
- Writing the completed report and findings to SQLite
- Updating the contract status in SQLite from `pending` to `complete`
- Notifying the SSE layer that the status has changed

**Not responsible for:**
- Parsing or reading the uploaded file
- Serving any HTTP endpoints
- Determining which mock rules to use (those are fixed at implementation time, per A5)

**Boundary:** The Risk Engine is a pure internal module. It does not expose a network interface and is only called by the API layer.

---

### 4.4 SQLite Database

**Responsible for:**
- Persisting all application state: contract metadata, processing status, report content, findings, finding statuses, and comments (FR-11, NFR-5)

**Boundary:** All reads and writes go through the backend. The frontend never accesses the database directly.

**Tables (logical, not schema):**
- `contracts` — one row per uploaded file; holds metadata and status
- `reports` — one row per contract; holds overall risk level and summary
- `findings` — one row per finding; holds severity, explanation, section reference, status, and comment

---

### 4.5 Local File Store

**Responsible for:**
- Storing the raw uploaded file bytes on disk under an `uploads/` directory (A3)
- Files are named by contract ID to avoid collisions

**Boundary:** The file store is write-once from the application's perspective. The MVP does not serve file download or deletion.

---

### 4.6 SSE Endpoint

**Responsible for:**
- Maintaining an open HTTP connection to the browser
- Emitting a status-change event when a contract transitions from `pending` to `complete`
- Allowing the frontend to update the queue entry in under 3 seconds of the status change (NFR-2)

**Boundary:** SSE is one-directional (server → browser). The frontend does not send data over this channel.

---

## 5. Data Flow

### 5.1 Upload and report generation

```
Browser                    REST API              Risk Engine         SQLite       File Store
  │                           │                      │                 │              │
  │── POST /upload ──────────►│                      │                 │              │
  │   (PDF or DOCX, ≤10 MB)   │                      │                 │              │
  │                           │── write file ────────────────────────────────────────►│
  │                           │── INSERT contract ──────────────────►│               │
  │◄── 201 {contractId} ──────│                      │                 │              │
  │                           │── invoke async ─────►│                 │              │
  │                           │                      │── INSERT report ──────────────►│
  │                           │                      │── INSERT findings ────────────►│
  │                           │                      │── UPDATE status=complete ─────►│
  │                           │◄── notify SSE ───────│                 │              │
  │◄── SSE: status=complete ──│                      │                 │              │
  │   (queue updates live)    │                      │                 │              │
```

### 5.2 Loading the report

```
Browser                    REST API              SQLite
  │                           │                    │
  │── GET /contracts ────────►│── SELECT all ─────►│
  │◄── contract list ─────────│◄── rows ───────────│
  │                           │                    │
  │  (user selects contract)  │                    │
  │                           │                    │
  │── GET /contracts/:id/report►│── SELECT report + findings ►│
  │◄── report + findings ─────│◄── rows ───────────│
  │   (rendered inline)       │                    │
```

### 5.3 Saving a finding review

```
Browser                    REST API              SQLite
  │                           │                    │
  │── PATCH /findings/:id ───►│                    │
  │   {status, comment}       │── UPDATE finding ─►│
  │◄── 200 OK ────────────────│◄── done ───────────│
  │                           │                    │
  │  (risk level recalculated locally in browser)  │
```

Risk level recalculation (FR-13) is computed in the frontend from the full findings list already held in memory. No additional round-trip is required.

---

## 6. Cross-Cutting Requirements

| Requirement | Approach |
|-------------|----------|
| **NFR-1 — Report within 10 s** | The Risk Engine runs immediately after upload. Mock generation is in-process (no I/O bottleneck). Any artificial delay must be tuned to complete within the 10 s budget. |
| **NFR-2 — Queue update within 3 s** | SSE pushes the status change event as soon as the Risk Engine updates SQLite. No polling interval to tune. |
| **NFR-3 — Files up to 10 MB** | Enforced server-side on the upload endpoint. The multipart parser limit is set to 10 MB. |
| **NFR-4 — Format rejection within 2 s** | Checked client-side on file selection (immediate); also validated server-side before any disk write. |
| **NFR-5 — Zero data loss across browser restarts** | All state is in SQLite. On page load, the frontend fetches the full contract list and any open report. Nothing is held only in memory. |
| **NFR-6 — Demo reliability** | Single-process, single-user; SQLite requires no separate server process. No network dependency. |
| **NFR-7 — 10 findings per page** | Pagination is entirely a frontend concern; all findings are fetched and paginated in the browser. |
| **NFR-8 — Risk level update within 2 s** | Recalculation is synchronous in the frontend on each status change. No server round-trip needed. |

---

## 7. Key Architecture Decisions

### AD-1 — SSE over polling for status updates

**Decision:** Use Server-Sent Events to deliver the `pending → complete` transition to the browser.

**Rationale:** NFR-2 requires the queue to update within 3 seconds of a server-side status change. SSE delivers the event immediately after the status changes, with no polling interval, and is simpler to implement than WebSockets for a one-directional push case.

**Trade-off:** SSE requires the browser to hold an open HTTP connection. For a single-user MVP this is not a concern.

**Spec trace:** FR-4, NFR-2.

---

### AD-2 — Risk Engine as an in-process module, not a separate service

**Decision:** The Risk Engine runs inside the same Node.js process as the REST API.

**Rationale:** The processing is simulated (A1); there is no real computation workload. Separating it into a distinct service would add deployment complexity with no benefit at this scale.

**Trade-off:** The API process and the Risk Engine share a single failure domain. Acceptable for MVP/demo use (NFR-6).

**Spec trace:** A1, A4, NFR-6.

---

### AD-3 — Overall risk level recalculated in the frontend

**Decision:** The overall risk level (FR-13) is computed by the React frontend from the findings it already holds, not by a server round-trip.

**Rationale:** The recalculation rule is fully defined in assumption A7 of the feature spec. All required data (findings + their current statuses) is already present in the frontend after the report is loaded. A server call would add latency inconsistent with NFR-8 (≤2 s update).

**Trade-off:** The recalculation logic must be kept consistent between the frontend implementation and any future server-side derivation. For MVP this is a single implementation site.

**Spec trace:** FR-13, NFR-8, A7.

---

### AD-4 — SQLite as the sole persistence layer

**Decision:** All persisted data (contracts, reports, findings, statuses, comments) lives in a single SQLite file (`data.db`).

**Rationale:** NFR-5 requires zero data loss across browser restarts. SQLite satisfies this with no additional server process, matching the single-machine, single-user MVP scope (A2, A3, NFR-6).

**Trade-off:** SQLite does not support concurrent write access from multiple processes. For a single-user MVP this is not a constraint.

**Spec trace:** FR-11, NFR-5, A2, A3.

---

### AD-5 — Client-side file validation as the first gate, server-side as the second

**Decision:** Format and size are validated in the browser on file selection, and again on the server before any write occurs.

**Rationale:** Client-side validation gives immediate feedback within the NFR-4 budget (≤2 s). Server-side re-validation prevents invalid files from being saved if the client check is bypassed.

**Spec trace:** FR-1, NFR-3, NFR-4.

---

### AD-6 — Single-page, inline report rendering (no routing)

**Decision:** The report is rendered inline within the same screen as the contract queue. No separate route or page is introduced.

**Rationale:** FR-8 and its acceptance criterion explicitly require that the report opens without navigating to a different page or URL.

**Spec trace:** FR-8.

---

## 8. Assumptions and Decisions for Human Review

The following items are carried forward from the feature spec or arise from architectural choices. They require confirmation before or during implementation.

| # | Item | Type | Owner |
|---|------|------|-------|
| R-1 | The set of predefined mock risk rules (clause types, severities, section references) must be agreed before implementation. The architecture treats these as fixed configuration, but the demo scenario depends on them being recognisable (OQ-1 from feature spec). | Open question | Product Owner |
| R-2 | The artificial processing delay (A4) has not been specified. It must be set so that the full upload → report flow completes within 10 seconds (NFR-1) while still feeling realistic. A value in the 2–4 second range is suggested, but this needs confirmation. | Decision needed | Tech Lead |
| R-3 | All findings for a report are fetched in a single request and paginated in the frontend (AD-3, NFR-7). If the number of findings per report grows significantly beyond the current MVP scope, this approach would need revisiting. For now, a small fixed count of mock findings is assumed. | Assumption | Tech Lead |
| R-4 | The `uploads/` folder location on disk is not specified. A path relative to the backend working directory is assumed for the MVP. If the application needs to be portable across machines, this path may need to be configurable. | Assumption | Tech Lead |
| R-5 | The contract queue display order is not specified in the feature spec (OQ-2 from feature spec). Most-recently-uploaded first is assumed. Confirm before implementation. | Assumption | Product Owner |
