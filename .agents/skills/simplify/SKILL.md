---
name: simplify
description: Use when reviewing changed code for reuse, type safety, code quality, and efficiency before wrapping up a task or PR
---

# Simplify

Review changed code with three focused passes, then fix anything worth fixing before you call the work done.

## When to Use

- Before finishing a task, opening a PR, or asking for final review
- When a change feels correct but may still be duplicative, hacky, or heavier than needed
- When you want a cleanup pass that leads directly to code changes, not just comments

## Workflow

1. Identify the review scope:
   - Run `git diff HEAD` if there are staged changes
   - Otherwise run `git diff`
   - If there are no git changes, review the files the user mentioned most recently or the files you edited earlier in the conversation
2. Capture the full diff and changed-file list.
3. Launch three review agents in parallel in a single message. Give each the full diff and ask for actionable findings with file references where possible.
4. If review agents are unavailable or not appropriate for the task, run the same three review lenses yourself before making changes.

## Scope Rules

- Focus fixes on changed files and directly adjacent helpers they should reuse
- Avoid opportunistic refactors unless they are required to address a finding cleanly
- Prefer existing abstractions and conventions, but do not force reuse when it makes the local code harder to understand

## Review Lenses

### 1. Reuse

Look for existing utilities, helpers, shared modules, and adjacent patterns that should replace newly written code.

Flag:
- New functions that duplicate existing functionality
- Inline logic that should use an existing utility
- Hand-rolled string manipulation, path handling, env checks, or ad-hoc type guards that already have a home elsewhere

### 2. Quality

Look for:
- Redundant state or cached values that should be derived
- Parameter sprawl instead of a cleaner abstraction
- Copy-paste with slight variation
- Leaky abstractions or broken boundaries
- Raw strings where constants, unions, enums, or branded types already exist
- Unsafe typing such as `any`, casual casts, non-null assertions, weakly typed key access, or skipped type guards when stronger existing types are available
- Unnecessary JSX wrappers that add no layout value
- Comments that explain what instead of why

### 3. Efficiency

Look for:
- Redundant work, repeated reads, duplicate calls, or N+1 patterns
- Independent operations that should run concurrently
- New work added to startup, request, or render hot paths
- Unconditional recurring updates that should bail out on no-op changes
- Pre-checks for file or resource existence that should be replaced by direct operation plus error handling
- Missing cleanup, listener leaks, or unbounded memory growth
- Broad reads or loads when only a subset is needed

## Fixing Rules

- Wait for all three review agents to finish, then deduplicate findings
- Fix each worthwhile issue directly
- If a finding is a false positive or not worth addressing, note that briefly and move on
- Run the smallest relevant validation after changes, especially targeted tests, lint, and typecheck for the touched area when available

## Finish

Briefly summarize what you fixed, or confirm the reviewed code was already clean.
