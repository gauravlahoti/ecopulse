---
name: sprint
description: Implement the next EcoPulse sprint end-to-end based on its spec file. Pass the sprint number (1-4) or "next" to auto-detect. Example: /sprint 1
disable-model-invocation: false
---

# Sprint Implementation Skill

You are implementing a sprint for the EcoPulse hackathon project. The user may pass a sprint number (1, 2, 3, or 4) or "next" as $ARGUMENTS.

## Step 1: Identify the Sprint

If $ARGUMENTS is empty or "next":
- Check which directories exist (frontend/, services/, etc.) to determine current state
- Sprint 1 = nothing built yet; Sprint 2 = foundation exists; Sprint 3 = frontend exists; Sprint 4 = agents exist

Read the appropriate spec file:
- Sprint 1: `specs/02-sprints/sprint-1-foundation/spec.md`
- Sprint 2: `specs/02-sprints/sprint-2-frontend-accessibility/spec.md`
- Sprint 3: `specs/02-sprints/sprint-3-ai-agents/spec.md`
- Sprint 4: `specs/02-sprints/sprint-4-polish-judge-checklist/spec.md`

Also read:
- `specs/01-architecture/system-architecture.md`
- `specs/01-architecture/agentic-ai-workflow.md`
- `specs/00-overview/evaluation-criteria.md`

## Step 2: Plan Before Implementing

Print a numbered implementation plan with every file you will create or modify. List them grouped by:
1. Infrastructure/config files
2. Source code files
3. Test files
4. Documentation

Show estimated judge impact for each group (which of the 5 axes it hits).

## Step 3: Implement

Work through the plan systematically. For each file:
- Follow the rules in `.claude/rules/` (security, testing, accessibility, ai-agents)
- Create tests alongside implementation — never defer tests to later
- Use the exact commands from CLAUDE.md for build/lint/test validation

## Step 4: Validate

After implementing, run:
```bash
npm run lint
npm run type-check
npm run test
```

For Sprint 3+, also run:
```bash
pytest services/
mypy --strict services/
```

Report any failures and fix them before considering the sprint done.

## Step 5: Sprint Summary

Print a checklist of every deliverable from the spec file, marked ✅ or ❌, with a one-line note for any gaps.
