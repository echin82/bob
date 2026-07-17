# Task: Generate unit tests for upload validation

Generate unit tests for the scenarios in delivery/specs/contract-risk-assessment/unit-test-scenarios.md.

Use:

- delivery/specs/contract-risk-assessment/feature-spec.md
- delivery/specs/contract-risk-assessment/tasks.md
- delivery/specs/contract-risk-assessment/unit-test-scenarios.md

Before writing tests:

- Inspect the repository.
- Identify the existing Node.js test framework and conventions.
- Find the upload validation logic or the closest unit-testable module.

## Rules

- Generate tests only for file upload validation.
- Use the existing test framework.
- Do not introduce a new test framework unless none exists.
- Do not test the full upload-to-queue integration.
- Do not test SQLite persistence.
- Do not test UI.
- Do not test report generation.
- Do not test finding review.
- Do not test authentication or RBAC.
- Do not test real document parsing.
- Do not change production code unless required to make validation logic testable, and explain why.

## Output

After generating tests, summarize:

1. Test files created or changed
2. Scenarios covered
3. How to run the tests
