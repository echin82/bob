# Unit Test Scenarios: File Upload Validation

**Feature:** Contract Risk Assessment Tool  
**Spec version:** feature-spec.md v0.6  
**Build slice:** Upload contract → save locally → create SQLite queue record → return processing status  
**Scope:** Server-side file validation only (TASK-03)  
**Status:** Draft

---

## Source acceptance criteria

All scenarios below trace to the three acceptance criteria defined under **FR-1** in `feature-spec.md §6`:

> **AC-FR-1a** — Given the user selects a file to upload / When the file is not a PDF or DOCX / Then the system rejects the upload and displays a message explaining which formats are accepted / And no entry is added to the contract queue.
>
> **AC-FR-1b** — Given the user selects a PDF or DOCX file / When the file is within the supported size limit (≤10 MB) / Then the upload is accepted and processing begins.
>
> **AC-FR-1c** — Given the user selects a file to upload / When the file exceeds 10 MB / Then the system rejects the upload and displays a message stating the file is too large / And no entry is added to the contract queue.

Supporting non-functional requirements: **NFR-3** (files up to 10 MB must be accepted), **NFR-4** (unsupported formats rejected within 2 seconds of selection).

Build slice confirmation: TASK-03 in `tasks.md` covers exactly these checks — MIME-type/extension validation and the 10 MB size gate — as the server-side second gate (AD-5). TASK-04 (file write) and TASK-05 (SQLite insert) are explicitly out of scope here.

---

## Scenarios

---

### UTS-01 — Valid PDF is accepted

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-01 |
| **Source AC** | AC-FR-1b |
| **Type** | Positive |
| **Input** | A file with MIME type `application/pdf`, size 1 MB |
| **Expected result** | Validation passes; handler proceeds without returning a `4xx` error |

---

### UTS-02 — Valid DOCX is accepted

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-02 |
| **Source AC** | AC-FR-1b |
| **Type** | Positive |
| **Input** | A file with MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, size 1 MB |
| **Expected result** | Validation passes; handler proceeds without returning a `4xx` error |

---

### UTS-03 — Unsupported file type (plain text) is rejected

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-03 |
| **Source AC** | AC-FR-1a |
| **Type** | Negative |
| **Input** | A file with MIME type `text/plain` (`.txt`), size 1 KB |
| **Expected result** | Returns `400`; response body is JSON and identifies the accepted formats (PDF and DOCX); no file is written to disk |

---

### UTS-04 — Unsupported file type (PNG image) is rejected

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-04 |
| **Source AC** | AC-FR-1a |
| **Type** | Negative |
| **Input** | A file with MIME type `image/png` (`.png`), size 50 KB |
| **Expected result** | Returns `400`; response body is JSON and identifies the accepted formats; no file is written to disk |

---

### UTS-05 — File within the size limit is accepted (boundary)

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-05 |
| **Source AC** | AC-FR-1b, NFR-3 |
| **Type** | Boundary |
| **Input** | A PDF file with size exactly 10 MB (10 × 1024 × 1024 bytes) |
| **Expected result** | Validation passes; handler proceeds without returning a `4xx` or `413` error |

---

### UTS-06 — File exceeding the size limit is rejected (boundary)

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-06 |
| **Source AC** | AC-FR-1c, NFR-3 |
| **Type** | Boundary |
| **Input** | A PDF file with size 10 MB + 1 byte (10 × 1024 × 1024 + 1 bytes) |
| **Expected result** | Returns `413`; response body is JSON and states the file is too large; no file is written to disk |

---

### UTS-07 — Oversized file is rejected regardless of format

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-07 |
| **Source AC** | AC-FR-1c |
| **Type** | Negative |
| **Input** | A DOCX file with size 25 MB |
| **Expected result** | Returns `413`; response body is JSON; no file is written to disk |

---

### UTS-08 — No file attached to the request is rejected

| Field | Value |
|-------|-------|
| **Scenario ID** | UTS-08 |
| **Source AC** | AC-FR-1a (no valid file provided) |
| **Type** | Negative |
| **Input** | `POST /upload` with an empty multipart body (no `file` field) |
| **Expected result** | Returns `400`; response body is JSON; no file is written to disk |

---

## Out of scope

The following are explicitly excluded from this set per the task instructions:

- Full upload-to-queue integration
- SQLite persistence (TASK-05)
- UI validation (TASK-FE-02)
- Report generation (FR-5, FR-6)
- Finding review (FR-9, FR-10)
- Authentication or RBAC (out of scope in spec §3)
- Real document parsing (assumption A1)
