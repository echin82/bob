# Task: Create unit test scenarios from acceptance criteria

## Context

You are helping me move from Build into Testing.

Testing starts from the acceptance criteria in the spec.

Build slice:

Upload contract → save locally → create SQLite queue record → return processing status.

Testing focus:

File upload validation.

Use:

- delivery/specs/contract-risk-assessment/feature-spec.md
- delivery/specs/contract-risk-assessment/tasks.md

Create:

delivery/specs/contract-risk-assessment/unit-test-scenarios.md

## Instructions

First, identify the relevant acceptance criteria from delivery/specs/contract-risk-assessment/feature-spec.md that apply to file upload validation.

Then create concise unit test scenarios for that behavior.

For each scenario, include:

- Scenario ID
- Source acceptance criterion
- Input
- Expected result
- Type: positive, negative, or boundary

Include where applicable:

- Valid PDF or DOCX file should be accepted
- Unsupported file type should be rejected
- Oversized file should be rejected only if a size limit is defined in the spec

Use delivery/specs/contract-risk-assessment/tasks.md only to confirm that the behavior was part of the Build slice.

## Rules

- Do not include tests for the full upload-to-queue integration.
- Do not include tests for SQLite persistence.
- Do not include tests for UI.
- Do not include tests for report generation.
- Do not include tests for finding review.
- Do not include tests for authentication or RBAC.
- Do not include tests for real document parsing.
