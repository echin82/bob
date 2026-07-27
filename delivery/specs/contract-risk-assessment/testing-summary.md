# Testing Summary: File Upload Validation

**Feature:** Contract Risk Assessment Tool  
**Spec version:** feature-spec.md v0.6  
**Slice:** Upload contract — server-side file validation (TASK-03)  
**Test file:** `backend/src/upload.test.js`  
**Date:** 2025-01-07

---

## 1. Behaviour Tested

The tests validate the server-side file validation gate (AD-5, TASK-03) implemented in
`backend/src/upload.js`. This gate runs after multer receives the multipart request and
before any file is written to disk or any database row is inserted.

Two distinct layers are exercised:

**Layer 1 — `validateUploadFile()` pure function**  
Called directly with synthetic `req.file` objects. No Express, no multer, no filesystem,
no database. Tests cover:

- A valid PDF is accepted and the canonical `pdf` extension is returned.
- A valid DOCX is accepted and the canonical `docx` extension is returned.
- An unsupported MIME type (`text/plain`) is rejected with `400` and an error body that
  names the accepted formats.
- An unsupported MIME type (`image/png`) is rejected with `400` and the same error body.
- A missing file (`undefined` or `null`, i.e. no `file` field in the request) is rejected
  with `400`.

**Layer 2 — multer size-limit middleware (HTTP integration)**  
A temporary in-process Express server is started on a random loopback port. Real
`multipart/form-data` payloads are constructed and posted over HTTP. Tests cover:

- A PDF file of exactly 10 MB passes through multer without triggering `LIMIT_FILE_SIZE`
  (boundary-acceptance case).
- A PDF file of 10 MB + 1 byte triggers multer's `LIMIT_FILE_SIZE` error, causing a `413`
  response.
- A DOCX file of 25 MB triggers `413` regardless of valid MIME type.

**Exported constants**  
Sanity checks confirm that `ALLOWED_TYPES` and `MAX_FILE_SIZE` hold the values the
validation logic depends on:

- `ALLOWED_TYPES['application/pdf']` === `'pdf'`
- `ALLOWED_TYPES['application/vnd.openxmlformats-officedocument.wordprocessingml.document']` === `'docx'`
- `ALLOWED_TYPES['text/plain']` === `undefined`
- `MAX_FILE_SIZE` === `10 * 1024 * 1024` (10 485 760 bytes)

---

## 2. Acceptance Criteria Covered

| AC ID | Given / When / Then | Covered by |
|-------|---------------------|------------|
| AC-FR-1a | File is not PDF or DOCX → rejected with message naming accepted formats, no queue entry | UTS-03, UTS-04, UTS-08 |
| AC-FR-1b | PDF or DOCX within size limit → upload accepted, processing begins | UTS-01, UTS-02, UTS-05 |
| AC-FR-1c | File exceeds 10 MB → rejected with "file too large" message, no queue entry | UTS-06, UTS-07 |

Supporting NFRs confirmed:

| NFR | Requirement | How confirmed |
|-----|-------------|---------------|
| NFR-3 | Files up to 10 MB must be accepted | UTS-05 (exactly 10 MB passes multer without 413/400) |
| NFR-4 | Unsupported formats rejected within 2 s of selection | UTS-03, UTS-04 (synchronous pure-function check; no network call) |

---

## 3. Unit Test Scenarios Covered

All eight scenarios from `unit-test-scenarios.md` are implemented and pass:

| Scenario | Type | Result |
|----------|------|--------|
| UTS-01 — Valid PDF (1 MB) accepted | Positive | ✔ pass |
| UTS-02 — Valid DOCX (1 MB) accepted | Positive | ✔ pass |
| UTS-03 — `text/plain` (.txt) rejected with 400 | Negative | ✔ pass |
| UTS-04 — `image/png` (.png) rejected with 400 | Negative | ✔ pass |
| UTS-05 — PDF at exactly 10 MB accepted (boundary) | Boundary | ✔ pass |
| UTS-06 — PDF at 10 MB + 1 byte rejected with 413 (boundary) | Boundary | ✔ pass |
| UTS-07 — DOCX at 25 MB rejected with 413 | Negative | ✔ pass |
| UTS-08 — No file field in request rejected with 400 | Negative | ✔ pass |

One additional defensive case is also covered: `null` passed as the file argument
(multer can return `null` in some edge cases) returns `400`.

---

## 4. Code Coverage

Test runner: Node.js built-in `node:test` with `--experimental-test-coverage`.  
Command: `node --test --experimental-test-coverage src/upload.test.js`

```
-------------------------------------------------------------------
file       | line % | branch % | funcs % | uncovered lines
-------------------------------------------------------------------
src        |        |          |         |
 db.js     |  46.58 |   100.00 |    0.00 | 16-40 46-51 58-61 68-71
 upload.js |  79.14 |    82.35 |  100.00 | 87-88 102-128 149-153
-------------------------------------------------------------------
all files  |  69.07 |    83.33 |   55.56 |
-------------------------------------------------------------------
```

**`upload.js` — the module under test**

| Metric | Value |
|--------|-------|
| Lines | 79.14 % |
| Branches | 82.35 % |
| Functions | 100.00 % |

All exported functions (`validateUploadFile`, `createUploadRouter`) are exercised.
Uncovered lines (87–88, 102–128, 149–153) correspond to the happy-path continuation
inside `uploadHandler` — the file-write step (TASK-04) and the SQLite insert step
(TASK-05) — which are intentionally outside the scope of these unit tests. The error
branch for multer's unexpected error (lines 149–153) is also not exercised.

**`db.js` — the database module**

`db.js` is not initialised in the unit-test context. Branch coverage is 100 % because
none of the tested code paths branch on database state. Line and function coverage
reflect that the DB initialisation, query, and run helpers are never invoked.

---

## 5. What Is Intentionally Not Covered in This Lab

The following are explicitly out of scope for this test suite, matching the exclusions
stated in `unit-test-scenarios.md §Out of scope`:

- **File write to disk (TASK-04):** `uploadHandler` attempts `fs.writeFileSync` after
  validation passes. This path is not tested. In UTS-05 the handler is reached but
  fails at the write step (`file is not defined` — a pre-existing bug in the handler
  where `req.file` is referenced as `file`); the test only asserts that no validation
  4xx was returned.
- **SQLite insert and persistence (TASK-05):** The database is never initialised in the
  test process. FR-11 (data persistence), FR-2, FR-3, and the full `201` response shape
  are not validated here.
- **Client-side validation (TASK-FE-02):** The React file selection control and its
  inline error messages are not tested. No frontend tests exist for this slice.
- **Full upload-to-queue integration (TASK-06):** No integration test exercises the
  complete request path (validation → file write → DB insert → `201` response).
- **Report generation and finding review (FR-5 through FR-13):** Not implemented in this
  slice; no tests exist.
- **Authentication and RBAC:** Out of scope per feature-spec.md §3.
- **Real document parsing:** Out of scope per assumption A1.

---

## 6. Recommendations for Next Testing Steps

**Immediate — fix identified defect**  
`uploadHandler` in `upload.js` references `file` (lines 96, 106) instead of `req.file`.
This causes a `ReferenceError` on every valid upload. Fix the variable name and add an
integration test for the full success path (`201` response, file on disk, row in DB)
before advancing to the next slice.

**Short term — extend unit coverage**

1. Add a test for the multer unexpected-error branch (lines 149–153): send a malformed
   multipart request or a field named something other than `file` to reach that code path.
2. Add a test confirming the `201` JSON response shape once the `req.file` bug is fixed:
   `{ id, fileName, uploadedAt, status: "pending" }`.
3. Add a test for the `500` response when the file write fails (TASK-04 completion
   criterion: "simulated file-write failure causes 500").

**Medium term — integration and persistence testing**

1. Wire up `db.js` in a test-specific in-memory SQLite instance and assert that a valid
   upload inserts a row with `status = 'pending'` (TASK-05, FR-2, FR-3, NFR-5).
2. Test server restart persistence: start the server, upload a file, restart, query
   `data.db`, and confirm the row is still present (TASK-06 verification criterion).

**Later slices**

1. Frontend component tests (Vitest or Jest) for `TASK-FE-02`: assert that an invalid
   MIME type or oversized file shows an inline error and keeps the submit button
   disabled; assert that a valid selection clears errors and enables submit.
2. End-to-end tests (Playwright or equivalent) covering TASK-FE-05 scenario cases 1–5:
   the full browser flow from file selection through queue row appearance.
