# Task: Create feature specification from epic

## Context
- delivery/epics/contract-risk-assessment-epic.md

List the file at delivery/epics/contract-risk-assessment-epic.md. Confirm it is present and proceed.

## Step 1: Clarify scope
Identify any ambiguities in the epic that would affect scope or acceptance criteria. Ask up to 3 clarifying questions.

After receiving answers, confirm: "Ready to generate the spec. Shall I proceed?"

## Step 2: Generate first-draft specification
Create a structured Markdown feature specification with these sections:

1. Goal and expected outcome
2. Target users and scenarios
3. Scope and out of scope
4. Functional requirements (observable, independently testable)
5. Non-functional requirements (with measurable thresholds)
6. Acceptance criteria in Given / When / Then format for each major functional requirement
7. Assumptions and open questions (each with an owner placeholder)

## Rules
- Externally observable behavior only. No API design, database schema, architecture, or implementation tasks.
- Technology constraints listed only where they affect observable behavior.
- Every functional requirement must be testable and traced to an acceptance criterion.
- Every non-functional requirement must include a measurable threshold.

After presenting the draft, ask: "Does this look right? Should I refine anything before we review it?"

## Output
Save to: delivery/specs/contract-risk-assessment/feature-spec.md
