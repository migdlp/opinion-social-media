---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Project rules: Opinión

These project-specific additions are required by the owner. Preserve the original guidelines above and follow `AGENTS.md` for the complete collaboration protocol and current authorized scope.

- Before choosing or starting a task, and before changing its status, refresh the remote `main` reference and read `docs/tareas-futuras.md` there. The current state on `main` is the shared source of task availability; respect existing reservations and dependencies.
- Publish task reservations and every change of status, agent or handoff in a dedicated commit directly to `main`. Publish the reservation before implementation and synchronize the issue. Refresh `main` immediately before publishing and never force-push. If `main` advances and rejects the push, reread its updated task state before retrying; do not overwrite another agent's reservation.
- Keep implementation and other documentation changes in a task branch created from updated `main`, then open a PR, pass the applicable checks and merge. Only dedicated task coordination commits have the standing direct-to-`main` exception; other exceptions require the owner's explicit authorization.
- Always use TDD for behavior changes: write and run the test before production code, observe RED for missing or incorrect behavior, implement the minimum for GREEN, then REFACTOR with tests still passing. Identify the actual runner and command first; if test infrastructure is missing, establish a working runner before implementing behavior. Missing dependencies do not count as RED.
- Record the actual commands and observed RED, GREEN and REFACTOR results in the task and PR, including failures or blockers. For documentation-only changes, check content, consistency and links and report those checks without inventing executable tests or an application TDD cycle.
