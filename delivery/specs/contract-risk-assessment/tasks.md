# Build Tasks: Upload Slice

**Slice:** Upload contract → save locally → create SQLite queue record → return processing status  
**Version:** 0.1  
**Status:** Draft  
**Source documents:**
- `delivery/specs/contract-risk-assessment/plan.md` (v0.1)
- `delivery/specs/contract-risk-assessment/architecture.md` (v0.1)
- `delivery/specs/contract-risk-assessment/design.md`
- `delivery/specs/contract-risk-assessment/feature-spec.md` (v0.6)

---

## Scope

These tasks cover the upload endpoint only: receiving a file from the browser, validating it server-side, writing it to the local file store, creating a `contracts` row in SQLite with `pending` status, and returning the new contract metadata to the caller.

**Not covered here:** Risk Engine invocation, SSE, report generation, finding review, frontend UI, authentication, or deployment.

---

## Tasks

---

### TASK-01 — Initialise the Node.js backend project

**Source reference:** plan.md §2 Technical Context — "Node.js process (Express or equivalent)"

**Implementation notes:**
- Initialise a Node.js project with `npm init`.
- Install Express (or equivalent HTTP framework) and `better-sqlite3` as runtime dependencies.
- Install `multer` for multipart file upload handling.
- Create the entry point file (e.g., `server.js` or `src/index.js`).
- Create the `uploads/` directory at the root of the backend working directory (plan.md §3.5, architecture.md §4.5).
- Do not configure the Risk Engine, SSE endpoint, or any route other than the upload route.

**Expected output:**
- A `package.json` with the three runtime dependencies listed.
- A runnable entry point that starts an Express server on `127.0.0.1:3001` only (security requirement — do not bind to `0.0.0.0`).
- An `uploads/` directory present in the project tree.

**Completion criteria:**
- `node server.js` (or equivalent) starts without errors.
- The server is bound to `127.0.0.1:3001` (not `0.0.0.0`).
- No routes are defined yet beyond a health-check `GET /health` returning `200 OK`.

**Dependencies:** None.

---

### TASK-02 — Initialise the SQLite database and create the `contracts` table

**Source reference:** plan.md §5 Data Model Summary — Contracts table; architecture.md §4.4

**Implementation notes:**
- Use `better-sqlite3` to open `data.db` in the backend working directory.
- Create the `contracts` table on startup if it does not already exist, with columns derived from plan.md §5:

  | Column | Type | Notes |
  |--------|------|-------|
  | `id` | TEXT (UUID or ULID) | Primary key; also used as the file name key in `uploads/` |
  | `file_name` | TEXT NOT NULL | Original file name shown in the queue |
  | `uploaded_at` | TEXT NOT NULL | ISO-8601 timestamp; used for display ordering (plan.md R-5) |
  | `status` | TEXT NOT NULL | `'pending'` on insert; `'complete'` set later by the Risk Engine |

- Do not create the `reports` or `findings` tables in this task — those belong to the Risk Engine slice.
- The database file path is relative to the backend working directory (architecture.md §4.4, plan.md §3.4, R-4).

**Expected output:**
- On server start, `data.db` is created (or opened) and the `contracts` table exists.
- The schema matches the columns above.

**Completion criteria:**
- Running the server and then inspecting `data.db` with any SQLite tool confirms the `contracts` table is present with the correct columns.
- Re-starting the server does not drop or recreate the table if it already exists (`CREATE TABLE IF NOT EXISTS`).

**Dependencies:** TASK-01.

---

### TASK-03 — Implement server-side file validation on the upload endpoint

**Source reference:** plan.md §3.2 REST API Layer — "Re-validates format and size server-side before any write occurs (second gate, AD-5)"; feature-spec.md FR-1, NFR-3, NFR-4; architecture.md AD-5

**Implementation notes:**
- Define `POST /upload` using `multer` configured with `memoryStorage`. The uploaded bytes will be available as `req.file.buffer` in the handler for TASK-04 to write to disk. Do not use `diskStorage` — allowing multer to write to a temp path before validation would bypass the second-gate check.
- Set the multipart parser's file-size limit to **10 MB** (NFR-3; architecture.md §6).
- After multer receives the file, validate the MIME type or file extension against the allowed set: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (i.e., PDF and DOCX only — FR-1).
- If the format is invalid, respond `400` with a JSON body that identifies which formats are accepted. Do not write any file to disk.
- If the file exceeds 10 MB, respond `413` with a JSON error body. Do not write any file to disk.
- Do not write a file to disk or touch the database in this task — that is TASK-04.
- This task implements the second gate described in AD-5; client-side validation (the first gate) belongs to the frontend slice.

**Expected output:**
- `POST /upload` with a non-PDF/DOCX file returns `400` and a JSON error.
- `POST /upload` with a file over 10 MB returns `413` and a JSON error.
- `POST /upload` with a valid PDF or DOCX within the size limit reaches the handler without error (file is not yet persisted — that comes in TASK-04).

**Completion criteria:**
- Manual or automated test: uploading a `.txt` file receives `400`.
- Manual or automated test: uploading a file exceeding 10 MB receives `413`.
- Manual or automated test: uploading a valid PDF or DOCX ≤10 MB does not receive a `4xx` validation error.

**Dependencies:** TASK-01.

---

### TASK-04 — Save the uploaded file to the local file store

**Source reference:** plan.md §3.2 REST API Layer — "Writes the uploaded file to the local file store"; plan.md §3.5 Local File Store; architecture.md §4.5; design.md §2 step 3; architecture.md §5.1 data flow (write file → File Store)

**Implementation notes:**
- Generate a unique contract ID (UUID v4 or ULID) for each upload.
- Write the file buffer (`req.file.buffer`) to `uploads/<contractId>.<ext>` where `<ext>` is derived from the MIME type validated in TASK-03 (`application/pdf` → `pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → `docx`). Do not use the original filename extension — it can be spoofed. (plan.md §3.5 — "files named by contract ID to avoid collisions")
- The path is relative to the backend working directory (plan.md R-4).
- If the file write fails, respond `500` and do not proceed to the database insert.
- Do not delete or overwrite existing files (plan.md §3.5 — "write-once").

**Expected output:**
- After a valid upload, a file exists at `uploads/<contractId>.<ext>` containing the uploaded bytes.
- File name contains no user-supplied path segments (contract ID is internally generated).

**Completion criteria:**
- After a valid upload request, the `uploads/` directory contains a new file named by the generated contract ID.
- The file byte count matches the uploaded file.
- A simulated file-write failure (e.g., by making `uploads/` read-only temporarily) causes the endpoint to return `500` without inserting a database row.

**Dependencies:** TASK-01, TASK-02, TASK-03.

---

### TASK-05 — Insert the contract record into SQLite and return the upload response

**Source reference:** plan.md §3.2 REST API Layer — "creates the contract record in SQLite before returning the upload response"; plan.md §5 Data Model Summary — Contracts; architecture.md §5.1 (INSERT contract → SQLite); feature-spec.md FR-2, FR-3; design.md §2 steps 3–4

**Implementation notes:**
- After the file is written successfully (TASK-04), insert a row into the `contracts` table:
  - `id`: the contract ID generated in TASK-04.
  - `file_name`: the original file name from the upload (from `req.file.originalname` or equivalent).
  - `uploaded_at`: current UTC time in ISO-8601 format.
  - `status`: `'pending'`.
- Use a parameterised query — never interpolate user-supplied values into SQL strings (security requirement).
- Return `201 Created` with a JSON body containing the contract metadata. The response shape must be sufficient for the frontend to render the queue entry immediately (design.md §2 step 4; plan.md §4.1):

  ```json
  {
    "id": "<contractId>",
    "fileName": "<originalName>",
    "uploadedAt": "<iso8601>",
    "status": "pending"
  }
  ```

- The response is returned **before** the Risk Engine is invoked (plan.md §3.2 — "Triggers the Risk Engine asynchronously after a successful upload; the response to the browser does not wait for generation to complete"). Risk Engine invocation belongs to the Risk Engine slice.
- If the database insert fails after the file has already been written, return `500`. The orphaned file on disk is acceptable for MVP — no rollback mechanism is required (plan.md §2 — single-user, no concurrency).

**Expected output:**
- `POST /upload` with a valid file returns `201` with the JSON contract metadata.
- A new row exists in the `contracts` table with `status = 'pending'`.

**Completion criteria:**
- After a valid upload, the response status is `201`.
- The response body contains `id`, `fileName`, `uploadedAt`, and `status: "pending"`.
- Querying `data.db` confirms a matching row in `contracts` with `status = 'pending'`.
- The SQL insert uses parameterised queries (no string interpolation of user input).

**Dependencies:** TASK-04.

---

### TASK-06 — Verify the end-to-end upload slice

**Source reference:** feature-spec.md AC for FR-2, FR-3; plan.md §4.1 Frontend ↔ REST API; architecture.md §5.1 data flow

**Implementation notes:**
- Using `curl`, Postman, or a minimal automated test, exercise the following cases against the running server:
  1. Upload a valid PDF ≤10 MB → expect `201`, a queue row in SQLite with `status = 'pending'`, and a file in `uploads/`.
  2. Upload a valid DOCX ≤10 MB → same expectations as above.
  3. Upload a `.txt` file → expect `400`, no database row, no file written.
  4. Upload a file exceeding 10 MB → expect `413`, no database row, no file written.
- Confirm that restarting the server and re-querying `data.db` shows the rows from steps 1 and 2 intact (NFR-5 — persistence across restart).
- Do not test Risk Engine behaviour, SSE delivery, or report generation — those are out of scope for this slice.

**Expected output:**
- All four cases above return the expected HTTP status.
- The database and file store are in the expected state for each case.
- Data persists across a server restart.

**Completion criteria:**
- All test cases pass with no unexpected errors in the server log.
- No sensitive data (file content, internal paths) appears in server-side log output.

**Dependencies:** TASK-01 through TASK-05 all complete.

---

## Summary Table

| Task ID | Title | Key spec references | Depends on |
|---------|-------|---------------------|------------|
| TASK-01 | Initialise the Node.js backend project | plan.md §2, architecture.md §4.2, §4.5 | — |
| TASK-02 | Initialise SQLite and create `contracts` table | plan.md §5, architecture.md §4.4 | TASK-01 |
| TASK-03 | Implement server-side file validation | plan.md §3.2, FR-1, NFR-3, NFR-4, AD-5 | TASK-01 |
| TASK-04 | Save uploaded file to local file store | plan.md §3.2, §3.5, architecture.md §4.5 | TASK-01, TASK-02, TASK-03 |
| TASK-05 | Insert contract record and return upload response | plan.md §3.2, §4.1, §5, FR-2, FR-3 | TASK-04 |
| TASK-06 | Verify end-to-end upload slice | FR-1, FR-2, FR-3, NFR-3, NFR-4, NFR-5 | TASK-01–TASK-05 |

---

## Frontend Tasks — Upload Slice

**Slice:** Contract upload page → file selection and validation feedback → submit to `POST /upload` → show job ID and processing status in the queue
**Source documents:**
- `delivery/specs/contract-risk-assessment/plan.md` §3.1, §4.1 (v0.1)
- `delivery/specs/contract-risk-assessment/architecture.md` §4.1, AD-5, §6 (v0.1)
- `delivery/specs/contract-risk-assessment/design.md` §2 steps 1–4
- `delivery/specs/contract-risk-assessment/feature-spec.md` FR-1, FR-2, FR-3, NFR-3, NFR-4 (v0.6)

**Not covered here:** Report generation, finding review, SSE subscription, authentication, real document parsing, backend API implementation, or deployment.

---

### TASK-FE-01 — Initialise the React frontend project

**Source reference:** plan.md §2 Technical Context — "React single-page application (SPA)"; architecture.md §3

**Implementation notes:**
- Scaffold a React SPA using **Vite** (`npm create vite@latest -- --template react`). Do not use Create React App — it is unmaintained.
- Install no additional dependencies beyond those required for this slice: a fetch-capable HTTP client is available natively via the browser `fetch` API; no extra library is needed for this slice.
- Create the single top-level `App` component. Do not introduce a router; the application uses a single screen throughout (plan.md §3.1, AD-6).
- Configure Vite's `server.proxy` in `vite.config.js` to forward requests matching `/upload` (and later `/contracts`, `/findings`, `/events`) to `http://127.0.0.1:3001`. This eliminates CORS configuration during development.
- Do not implement any components beyond the shell needed to mount child components built in subsequent tasks.

**Expected output:**
- A bootstrapped React project that starts without errors.
- A single `App` component rendered in the browser at `localhost`.
- No routes; no navigation.

**Completion criteria:**
- `npm start` (or `npm run dev`) launches the app in the browser without errors.
- The browser console is free of errors on initial load.
- A proxy or equivalent is in place so `fetch('/upload', ...)` resolves to the backend during development.

**Dependencies:** TASK-01 (backend must be reachable for proxy/integration to function).

---

### TASK-FE-02 — Build the file selection control with client-side validation

**Source reference:** plan.md §3.1 — "Validates file format and size in the browser on selection (first gate), before any upload request is sent"; architecture.md §4.1, AD-5; feature-spec.md FR-1, NFR-4; design.md §2 step 1

**Implementation notes:**
- Render a file input control (or a styled wrapper around `<input type="file">`) that restricts selection via the `accept` attribute to `.pdf` and `.docx` (MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- On file selection (`onChange`), immediately validate the chosen file in the browser before any network request:
  - **Format check:** if the file's MIME type or extension is not PDF or DOCX, show an inline error message explaining which formats are accepted and clear the selection. Do not enable the submit control.
  - **Size check:** if the file exceeds 10 MB (`file.size > 10 * 1024 * 1024`), show an inline error message stating the file is too large and clear the selection. Do not enable the submit control.
- If the file passes both checks, clear any prior error message and enable the submit control.
- The error must be visible within 2 seconds of the file being selected (NFR-4 — this check is synchronous; there is no network call involved).
- Do not trigger any upload in this task; that is TASK-FE-03.

**Expected output:**
- A file input control visible in the browser.
- Selecting an invalid format shows an explanatory inline error; the submit control remains disabled.
- Selecting a file over 10 MB shows an inline size error; the submit control remains disabled.
- Selecting a valid PDF or DOCX within 10 MB clears any error and enables the submit control.

**Completion criteria:**
- Manual test: selecting a `.txt` file shows a format error immediately; no upload is triggered.
- Manual test: selecting a file larger than 10 MB shows a size error immediately; no upload is triggered.
- Manual test: selecting a valid PDF ≤ 10 MB shows no error and enables the submit control.
- The error messages are visible in the UI without any console errors.
- Both checks run synchronously on selection — no network request is made during validation.

**Dependencies:** TASK-FE-01.

---

### TASK-FE-03 — Submit the validated file to POST /upload and handle the response

**Source reference:** plan.md §4.1 Frontend ↔ REST API — "File upload (multipart POST)"; plan.md §3.2 — "The upload response returns the new contract metadata immediately"; design.md §2 steps 2–4; architecture.md §5.1; feature-spec.md FR-2, NFR-3

**Implementation notes:**
- On submit, construct a `FormData` object containing the validated file and send it as a `multipart/form-data` POST to `POST /upload` using `fetch`.
- While the request is in flight, disable the submit control and show a loading indicator (e.g., a spinner or disabled button label change) to prevent duplicate submissions.
- On a `201 Created` response, parse the JSON body. The backend returns the following shape (plan.md §4.1, TASK-05 response contract):

  ```json
  {
    "id": "<contractId>",
    "fileName": "<originalName>",
    "uploadedAt": "<iso8601>",
    "status": "pending"
  }
  ```

  Pass this object to the queue state so it can be rendered immediately (TASK-FE-04).
- On a `400` response (invalid format — server-side second gate), display an inline error message explaining which formats are accepted. Do not add a queue entry.
- On a `413` response (file too large — server-side second gate), display an inline error message stating the file is too large. Do not add a queue entry.
- On any other non-`2xx` response or network error, display a generic upload failure message. Do not add a queue entry.
- After a successful `201`, reset the file input and clear the selected file so the control is ready for the next upload.
- Do not implement SSE subscription or status progression in this task; that belongs to the SSE slice.

**Expected output:**
- Clicking submit sends a `multipart/form-data` POST to `/upload`.
- A `201` response causes the contract metadata to be passed to queue state and the file input to reset.
- `400` and `413` responses surface appropriate inline error messages.
- The submit control is disabled during the in-flight request.

**Completion criteria:**
- Manual test: submitting a valid PDF ≤ 10 MB results in a `201` response and the returned metadata is available for the queue component.
- Manual test: the submit control is visually disabled while the upload is in flight.
- Manual test: a `400` response from the server shows an inline format error message.
- Manual test: a `413` response from the server shows an inline size error message.
- Manual test: after a successful upload the file input is cleared and ready for another selection.
- No unhandled promise rejections appear in the browser console.

**Dependencies:** TASK-FE-01, TASK-FE-02, TASK-03 (server-side validation endpoint must exist), TASK-05 (upload response shape must be available).

---

### TASK-FE-04 — Render the contract queue and display the uploaded entry

**Source reference:** plan.md §3.1 — "Displays the contract queue: file name, upload timestamp, processing status"; plan.md §4.1 — "The upload response returns the new contract metadata immediately so the queue entry appears before report generation completes"; architecture.md §4.1; feature-spec.md FR-2, FR-3; design.md §2 step 4; architecture.md R-5 — "Most-recently-uploaded first assumed"

**Implementation notes:**
- Create a queue component that accepts a list of contract objects and renders one row per contract.
- Each row must display (feature-spec.md FR-3):
  - **File name** — the original file name from the upload response (`fileName`).
  - **Upload timestamp** — the `uploadedAt` ISO-8601 value, formatted for readability (e.g., `toLocaleString()`).
  - **Processing status** — the current `status` value; display `pending` as a visible label (e.g., "Pending").
- When TASK-FE-03 receives a `201` response, prepend the new contract object to the queue list so it appears at the top (R-5 — most-recently-uploaded first).
- On initial page load, the queue is empty; the component must render without error when the list is empty (e.g., show a placeholder such as "No contracts uploaded yet").
- Do not implement `GET /contracts` loading on page load in this task — that is a separate slice. The queue for this slice is populated solely from the in-memory result of `POST /upload` responses.
- Do not wire up SSE-driven status updates in this task; status changes belong to the SSE slice.
- Do not make rows interactive (clickable to open a report); that belongs to the report viewing slice.

**Expected output:**
- After a successful upload, a new row appears at the top of the queue showing the correct file name, a formatted timestamp, and a "Pending" status label.
- Uploading a second file adds a second row above the first.
- An empty queue renders a placeholder message without errors.

**Completion criteria:**
- Manual test: uploading a valid file renders a new queue row immediately with the correct file name, timestamp, and "Pending" status — without a page reload.
- Manual test: uploading two files results in two rows, newest first.
- Manual test: the queue renders without errors when no uploads have been made.
- The queue state is held in React component state and does not depend on a database or page reload.

**Dependencies:** TASK-FE-01, TASK-FE-03.

---

### TASK-FE-05 — Verify the end-to-end frontend upload slice

**Source reference:** feature-spec.md AC for FR-1, FR-2, FR-3, NFR-3, NFR-4; design.md §2 steps 1–4; architecture.md AD-5

**Implementation notes:**
- With both the backend (TASK-01 through TASK-05) and the frontend running locally, manually exercise the following cases:
  1. Select a `.txt` file → expect an immediate inline format error; the submit control remains disabled; no network request is made.
  2. Select a file over 10 MB → expect an immediate inline size error; the submit control remains disabled; no network request is made.
  3. Select a valid PDF ≤ 10 MB → expect no error, submit control is enabled; submitting shows a loading state, then on success a new row appears in the queue with the correct file name, a readable timestamp, and "Pending" status.
  4. Select a valid DOCX ≤ 10 MB → same expectation as case 3.
  5. Upload a second valid file → confirm two rows are present in the queue, newest first.
- Confirm that the `id` and `status: "pending"` values in the queue row match the JSON body returned by the backend `201` response (visible via browser DevTools Network tab).
- Do not test SSE status progression, report opening, finding review, or persistence across page reload — those are out of scope for this slice.

**Expected output:**
- All five cases behave as described with no console errors or unhandled rejections.
- The queue visually reflects the correct data from the backend response immediately after upload.

**Completion criteria:**
- All five manual test cases produce the expected outcomes.
- The browser console is free of errors and unhandled promise rejections throughout.
- No sensitive data (file content, internal paths) is logged to the browser console.

**Dependencies:** TASK-FE-01 through TASK-FE-04 all complete; TASK-01 through TASK-05 (backend upload slice) all complete.

---

## Frontend Summary Table

| Task ID | Title | Key spec references | Depends on |
|---------|-------|---------------------|------------|
| TASK-FE-01 | Initialise the React frontend project | plan.md §2, architecture.md §3, AD-6 | TASK-01 |
| TASK-FE-02 | Build file selection control with client-side validation | plan.md §3.1, FR-1, NFR-4, AD-5 | TASK-FE-01 |
| TASK-FE-03 | Submit validated file to POST /upload and handle response | plan.md §4.1, FR-2, NFR-3, design.md §2 steps 2–4 | TASK-FE-01, TASK-FE-02, TASK-03, TASK-05 |
| TASK-FE-04 | Render the contract queue and display the uploaded entry | plan.md §3.1, FR-2, FR-3, design.md §2 step 4, R-5 | TASK-FE-01, TASK-FE-03 |
| TASK-FE-05 | Verify end-to-end frontend upload slice | FR-1, FR-2, FR-3, NFR-3, NFR-4, AD-5 | TASK-FE-01–TASK-FE-04, TASK-01–TASK-05 |
