# Task: Set up Carbon and implement selected frontend tasks

## Context

You are helping me set up a Carbon React frontend and implement the upload UI slice.

Use these approved design artifacts:

- delivery/specs/contract-risk-assessment/feature-spec.md
- delivery/specs/contract-risk-assessment/architecture.md
- delivery/specs/contract-risk-assessment/design.md
- delivery/specs/contract-risk-assessment/plan.md
- delivery/specs/contract-risk-assessment/tasks.md

## Step 1 — Scaffold the frontend

If a frontend/ folder does not already exist, scaffold a minimal React app with Carbon configured:

- Use @carbon/react as the component library
- Set up SCSS with @use '@carbon/react' as the entry import
- Include the Carbon Grid for layout
- Node.js 18+ required

If a frontend/ folder already exists, inspect it and follow its existing structure.

After scaffolding, run npm install and npm run dev in frontend/ and confirm the dev server starts without errors.

## Step 2 — Implement the selected frontend slice

Implement only the frontend task IDs in delivery/specs/contract-risk-assessment/tasks.md for this slice:

Contract upload page → file selection and validation feedback → submit to POST /uploads → show job ID and processing status in the queue.

For each selected task:

- Read the acceptance criteria in delivery/specs/contract-risk-assessment/feature-spec.md to understand what the UI must do
- Use the carbon-builder skill to identify the right Carbon components for each UI need — infer component choices from the spec, do not assume component names in advance
- Use the POST /uploads interface contract from delivery/specs/contract-risk-assessment/design.md or delivery/specs/contract-risk-assessment/plan.md
- Follow existing React and Carbon conventions in the repository

## Rules

- Implement only the tasks marked for the selected frontend slice.
- Do not add new tasks.
- Do not expand scope.
- Do not implement deferred scope (report generation, finding review, authentication, real document parsing, deployment).
- Do not introduce new architecture or unnecessary dependencies.
- Do not generate or run functional or end-to-end tests in this step; tests are covered in the next lesson.
- Prefer Carbon components over custom HTML for all interactive and status elements so accessibility is built in.

## Output

After coding, summarize:

1. Carbon components selected and why each was chosen for its UI role
2. Task IDs implemented
3. Files changed
4. How to verify the implemented slice
