# Task: Implement selected backend tasks

Implement the backend tasks defined in delivery/specs/contract-risk-assessment/tasks.md.

## Selected backend slice

Implement only the backend task IDs in delivery/specs/contract-risk-assessment/tasks.md for this slice:

Upload contract → save locally → create SQLite queue record → return processing status.

## Implementation context

For each selected task, use these inputs:

- **Task:** Implement the Upload Handler — validate file type and size, save the file locally, create a SQLite queue record, and return a job ID with processing status
- **Relevant spec sections:** FR-01 acceptance criteria (valid upload, oversized file, unsupported format)
- **Interface contract:** POST /uploads request, response, and error shapes from delivery/specs/contract-risk-assessment/design.md or delivery/specs/contract-risk-assessment/plan.md
- **Constraints:** no contract body in logs; local file storage only; SQLite queue; no authentication; no real document parsing; no report generation or frontend UI in this slice

Use:

- delivery/specs/contract-risk-assessment/feature-spec.md
- delivery/specs/contract-risk-assessment/architecture.md
- delivery/specs/contract-risk-assessment/design.md
- delivery/specs/contract-risk-assessment/plan.md
- delivery/specs/contract-risk-assessment/tasks.md

Before coding:

- Inspect the repository.
- Follow existing Node.js conventions.
- Use the implementation notes, expected outputs, and completion criteria from delivery/specs/contract-risk-assessment/tasks.md.

## Rules

- Implement only the tasks marked for the selected backend slice.
- Do not add new tasks.
- Do not expand scope.
- Do not implement deferred scope.
- Do not introduce new architecture or unnecessary dependencies.
- Do not generate or run functional tests in this step; tests are covered in the next lesson.

## Output

After coding, summarize:

1. Task IDs implemented
2. Files changed
3. How to verify the implemented slice
