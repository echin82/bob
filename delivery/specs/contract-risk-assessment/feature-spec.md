# Feature Specification: Contract Risk Assessment Tool

**Version:** 0.6
**Source epic:** `delivery/epics/contract-risk-assessment-epic.md`
**Status:** Reviewed — ready for architecture

---

## 1. Goal and Expected Outcome

Provide sales and legal desk users with a fast, consistent first-pass risk assessment on customer contracts. A user uploads a contract file, the system processes it and produces a structured risk report, and the user can review, annotate, and record decisions against each finding — all without leaving a single screen.

**Success looks like:** A user can go from uploading a contract to recording a review decision on a finding in one continuous, uninterrupted flow, with the report visible alongside the contract queue.

---

## 2. Target Users and Scenarios

### Primary persona: Sales / Legal Desk User

A non-technical professional who needs to triage contracts quickly before a deal progresses. They are not expected to have legal expertise; the tool surfaces structured findings so they can route or escalate appropriately.

### Key scenarios

| # | Scenario |
|---|----------|
| S1 | User uploads a new contract and monitors it moving from pending to complete in the queue |
| S2 | User opens a completed report inline and scans findings by severity to identify the most urgent issues |
| S3 | User marks a high-risk finding as overridden and adds a comment explaining the business rationale |
| S4 | User returns to the application after closing the browser tab and finds all previously uploaded contracts, reports, and review decisions intact |

---

## 3. Scope and Out of Scope

### In scope

- Upload of PDF and DOCX files
- A persistent contract queue showing upload metadata and processing status
- Simulated (mock) risk report generation — no real document parsing or AI required
- Inline report view within the queue screen
- Ranked findings list with severity, explanation, and simulated contract section reference
- Visual differentiation of high-risk findings
- Per-finding status: accepted, overridden, or reviewed
- Per-finding free-text comments
- Persistence of all data (uploads, reports, review decisions) across page refreshes
- Paginated findings list within a report
- Dynamic recalculation of overall risk level as findings are reviewed

### Out of scope for this version

- Real PDF/DOCX content parsing or extraction
- AI, ML, or external API integration
- Authentication, authorisation, or multi-user support
- Role-based access control (RBAC)
- Filtering, sorting, or searching the contract queue
- Export of reports or findings
- Email or notification delivery
- Compliance, encryption, or PII handling
- Mobile-optimised layout

---

## 4. Functional Requirements

> Each requirement is labelled FR-N for traceability to acceptance criteria.

| ID | Requirement |
|----|-------------|
| FR-1 | The system must accept file uploads in PDF and DOCX formats and reject all other formats with an explanatory message. |
| FR-2 | An uploaded file must be saved and appear in the contract queue immediately after upload. |
| FR-3 | The contract queue must display, for each entry: file name, upload timestamp, and current processing status. |
| FR-4 | Processing status must progress from a pending state to a completed state without requiring the user to manually refresh the page. |
| FR-5 | Completing processing must produce a structured risk report containing: an overall risk level, a short summary, and an ordered list of findings. |
| FR-6 | Each finding must include: a severity label, a short explanation, and a reference to a simulated contract section. |
| FR-7 | High-risk findings must be visually distinct from lower-severity findings. |
| FR-8 | Selecting a completed contract in the queue must open its risk report inline on the same screen, without navigating to a separate page. |
| FR-9 | The user must be able to mark any individual finding with one of three statuses: accepted, overridden, or reviewed. |
| FR-10 | The user must be able to add a free-text comment to any individual finding. |
| FR-11 | All uploaded contracts, generated reports, finding statuses, and comments must persist across page refreshes and browser restarts. |
| FR-12 | When a report contains more findings than fit on a single page, the findings list must be paginated so the user can navigate through all findings. |
| FR-13 | When the user updates the status of one or more findings, the overall risk level displayed in the report header must recalculate and update to reflect the current reviewed state. |

---

## 5. Non-Functional Requirements

| ID | Requirement | Measurable Threshold |
|----|-------------|----------------------|
| NFR-1 | Report generation time | A risk report must be fully displayed within **10 seconds** of a file being uploaded, as measured from the moment the upload completes. |
| NFR-2 | Queue update latency | Processing status must update on screen within **3 seconds** of the status change occurring server-side, without a manual page reload. |
| NFR-3 | Upload file size | The system must accept files up to **10 MB** without error. |
| NFR-4 | Supported file formats | Only PDF and DOCX are accepted; any other format must be rejected with a user-visible error message within **2 seconds** of selection. |
| NFR-5 | Data persistence | All user data (uploads, reports, statuses, comments) must survive a full browser close and reopen with **zero data loss**. |
| NFR-6 | Demo reliability | The application must complete the full upload → report → review-decision flow without error on a standard laptop for **demo use**. No minimum concurrent-user requirement applies. |
| NFR-7 | Pagination page size | Each page of the findings list must display exactly **10 findings**; the final page may display fewer if the total number of findings is not a multiple of 10. |
| NFR-8 | Risk level recalculation latency | The overall risk level in the report header must update within **2 seconds** of a finding status being changed, without a page reload. |

---

## 6. Acceptance Criteria

### FR-1 — File format validation

```
Given the user selects a file to upload
When the file is not a PDF or DOCX
Then the system rejects the upload and displays a message explaining which formats are accepted
And no entry is added to the contract queue
```

```
Given the user selects a PDF or DOCX file
When the file is within the supported size limit (≤10 MB)
Then the upload is accepted and processing begins
```

```
Given the user selects a file to upload
When the file exceeds 10 MB
Then the system rejects the upload and displays a message stating the file is too large
And no entry is added to the contract queue
```

---

### FR-2 & FR-3 — Contract queue entry

```
Given the user has successfully uploaded a PDF or DOCX file
When the upload completes
Then a new entry appears in the contract queue showing the correct file name, the upload timestamp, and a pending status
```

---

### FR-4 — Status update without page reload

```
Given a contract is in the queue with a pending status
When the simulated processing completes
Then the status in the queue updates to complete without the user taking any action (no manual refresh)
```

---

### FR-5 & FR-6 — Report content

```
Given a contract has reached complete status in the queue
When the user opens the report
Then the report displays an overall risk level and a short summary
And the report displays a list of findings ordered by severity (highest first)
And each finding shows a severity label, a short explanation, and a simulated contract section reference
```

---

### FR-7 — High-risk visual distinction

```
Given a risk report contains at least one high-severity finding
When the report is displayed
Then high-severity findings are visually distinguishable from medium- and low-severity findings (e.g., via colour, badge, or icon)
```

---

### FR-8 — Inline report opening

```
Given a contract in the queue has a complete status
When the user selects that contract
Then the risk report is displayed inline on the same screen
And the user has not been navigated to a different page or URL
```

---

### FR-9 — Finding status

```
Given a risk report is open and a finding is displayed
When the user selects a status of accepted, overridden, or reviewed for a finding
Then the finding is updated to reflect the chosen status
And only one status can be active on a finding at a time
```

```
Given the user has set a status on one or more findings
When the user closes and reopens the browser (or refreshes the page) and reopens the same report
Then each finding still displays the status that was previously set
```

---

### FR-10 — Finding comments

```
Given a risk report is open and a finding is displayed
When the user types a comment in the comment field and moves focus away from it
Then the comment is automatically saved and displayed on that finding without any explicit save action
```

---

### FR-11 — Persistence

```
Given the user has uploaded contracts, received reports, set finding statuses, and added comments
When the user closes and reopens the browser (or refreshes the page)
Then all previously uploaded contracts are still present in the queue with their correct statuses
And all previously generated reports are still accessible
And all finding statuses and comments are still present and accurate
```

---

### FR-12 — Findings pagination

```
Given a risk report is open and contains more findings than the page size
When the report is displayed
Then only one page of findings is shown at a time
And the user can navigate to the next and previous pages of findings
And all findings are reachable through pagination
```

---

### FR-13 — Dynamic risk level recalculation

```
Given a risk report is open and the overall risk level is displayed in the report header
When the user marks one or more findings with a status (accepted, overridden, or reviewed)
Then the overall risk level in the report header updates to reflect the current reviewed state of all findings
```

---

## 7. Assumptions and Open Questions

### Assumptions

| # | Assumption |
|---|------------|
| A1 | Document intelligence is simulated — the backend generates mock findings without parsing the actual file content. |
| A2 | No authentication or multi-user isolation is required; the application runs as a single-user experience. |
| A3 | File storage is local to the application (e.g., a local folder or embedded database); no cloud storage is required. |
| A4 | A processing animation or artificial delay is acceptable to simulate realistic async behaviour but is not required. |
| A5 | The set of predefined mock risk rules (e.g., indemnification clause, unlimited liability, auto-renewal) is determined at implementation time and does not affect these acceptance criteria. |
| A8 | Comments on findings are auto-saved when the user moves focus away from the comment field (on blur); no explicit save button is required or shown. |
| A6 | "Overall risk level" is a single categorical label (e.g., Low / Medium / High) derived from the mock findings. |
| A7 | The overall risk level is determined by the highest severity among findings that have not yet been marked with any status (accepted, overridden, or reviewed). The levels map as follows: any unreviewed High finding → High; no unreviewed High but at least one unreviewed Medium → Medium; only unreviewed Low findings → Low; all findings have a status set → Reviewed. Both "accepted" and "overridden" statuses are treated equivalently for recalculation purposes. |

### Open Questions

| # | Question | Owner |
|---|----------|-------|
| OQ-1 | What specific mock risk rules should be predefined for the MVP demo? The spec does not constrain this, but the demo scenario depends on having recognisable clause types (e.g., indemnification, auto-renewal, unlimited liability). | `[Product Owner]` |
| OQ-2 | Should the contract queue support filtering or sorting in a future version, and if so, what columns should be sortable? This affects whether the queue data model needs to be designed for extensibility now. | `[Product Owner]` |
