# sw-ai-academy-engineering-lab

This is the starting workspace for the **AI Academy — Module 3: PDLC in Practice** engineering track.

Clone this repository into the folder where you run Bob and work through each lesson in sequence. Bob reads your workspace files as context, so keeping everything in this folder is important.

```bash
git clone https://github.ibm.com/productivity-platforms/sw-ai-academy-engineering-lab
cd sw-ai-academy-engineering-lab
```

Then open the folder in VS Code with Bob before starting the first lesson.

## What's in this repo

```
sw-ai-academy-engineering-lab/
├── delivery/
│   └── epics/
│       └── contract-risk-assessment-epic.md   ← sample epic from the PM track
└── prompts/
    ├── 03-define-specs-1-create-feature-spec.md
    ├── 03-define-specs-2-review-feature-spec.md
    ├── 03-technical-solution-1-create-architecture.md
    ├── 03-technical-solution-2-create-hld.md
    ├── 03-technical-solution-3-create-lld.md
    ├── 03-technical-solution-4-create-implementation-plan.md
    ├── 04-build-1-create-backend-tasks.md
    ├── 04-build-2-add-frontend-tasks.md
    ├── 04-build-3-review-task-readiness.md
    ├── 04-build-4-implement-backend.md
    ├── 04-build-5-implement-frontend.md
    ├── 04-build-6-technical-code-review.md
    ├── 05-test-1-create-unit-test-scenarios.md
    ├── 05-test-2-generate-unit-tests.md
    ├── 05-test-3-run-unit-tests.md
    ├── 05-test-4-create-coverage-report.md
    ├── 05-release-1-review-branch-status.md
    ├── 05-release-2-create-commit-and-push.md
    ├── 05-release-3-draft-pull-request.md
    ├── 05-release-4-create-pull-request.md
    ├── 05-release-5-collect-release-context.md
    ├── 05-release-6-draft-release-notes.md
    └── 05-release-7-save-release-notes.md
```

**`delivery/epics/`** contains the sample epic produced by the PM track. It is the input for the first exercise (Delivery: Define feature specification).

**`prompts/`** contains one file per Bob prompt used in each exercise. Open the file for the current step, copy the prompt, and paste it into Bob. This is an alternative to copying from the course UI — useful if you prefer to work entirely in your editor.

As you work through the lessons, Bob will generate additional files under `delivery/specs/` and in the project root. These are outputs you produce during the exercises, not starter files.

## Lesson sequence

| Lesson | What you build |
|--------|---------------|
| [Delivery: Define feature specification](https://w3.ibm.com/software/winning-products-ai/learn/ai-academy/foundations/ai_native_pdlc_practice/delivery_specs) | `delivery/specs/contract-risk-assessment/feature-spec.md` |
| [Delivery: Define technical solution](https://w3.ibm.com/software/winning-products-ai/learn/ai-academy/foundations/ai_native_pdlc_practice/delivery_technical_solution) | `delivery/specs/contract-risk-assessment/architecture.md`, `design.md`, `plan.md` |
| [Delivery: Build](https://w3.ibm.com/software/winning-products-ai/learn/ai-academy/foundations/ai_native_pdlc_practice/delivery_build) | `delivery/specs/contract-risk-assessment/tasks.md`, implementation code |
| [Delivery: Test](https://w3.ibm.com/software/winning-products-ai/learn/ai-academy/foundations/ai_native_pdlc_practice/delivery_test) | Unit tests, `delivery/specs/contract-risk-assessment/unit-test-scenarios.md`, `testing-summary.md` |
| [Delivery: Release](https://w3.ibm.com/software/winning-products-ai/learn/ai-academy/foundations/ai_native_pdlc_practice/delivery_release) | Pull request, `RELEASE_NOTES.md` |

## Course

[AI Academy — Module 3: PDLC in Practice](https://ibm.biz/sw-ai-academy)
