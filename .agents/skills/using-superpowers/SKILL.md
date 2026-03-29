---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Instruction Priority

Superpowers skills override default system prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) — highest priority
2. **Superpowers skills** — override default system behavior where they conflict
3. **Default system prompt** — lowest priority

If CLAUDE.md, GEMINI.md, or AGENTS.md says "don't use TDD" and a skill says "always use TDD," follow the user's instructions. The user is in control.

## How to Access Skills

**In Claude Code:** Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you—follow it directly. Never use the Read tool on skill files.

**In Gemini CLI:** Skills activate via the `activate_skill` tool. Gemini loads skill metadata at session start and activates the full content on demand.

**In other environments:** Check your platform's documentation for how skills are loaded.

## Platform Adaptation

Skills use Claude Code tool names. Non-CC platforms: see `references/codex-tools.md` (Codex) for tool equivalents. Gemini CLI users get the tool mapping loaded automatically via GEMINI.md.

**Codex note:** In Codex, follow the closest native workflow instead of forcing Claude-specific mechanics. Prefer the smallest set of skills that covers the task, and respect current harness rules around delegation.

# Using Skills

## The Rule

**Invoke relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you should invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.

```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "About to EnterPlanMode?" [shape=doublecircle];
    "Already brainstormed?" [shape=diamond];
    "Invoke brainstorming skill" [shape=box];
    "Might any skill apply?" [shape=diamond];
    "Invoke Skill tool" [shape=box];
    "Announce: 'Using [skill] to [purpose]'" [shape=box];
    "Has checklist?" [shape=diamond];
    "Create TodoWrite todo per item" [shape=box];
    "Follow skill exactly" [shape=box];
    "Respond (including clarifications)" [shape=doublecircle];

    "About to EnterPlanMode?" -> "Already brainstormed?";
    "Already brainstormed?" -> "Invoke brainstorming skill" [label="no"];
    "Already brainstormed?" -> "Might any skill apply?" [label="yes"];
    "Invoke brainstorming skill" -> "Might any skill apply?";

    "User message received" -> "Might any skill apply?";
    "Might any skill apply?" -> "Invoke Skill tool" [label="yes, even 1%"];
    "Might any skill apply?" -> "Respond (including clarifications)" [label="definitely not"];
    "Invoke Skill tool" -> "Announce: 'Using [skill] to [purpose]'";
    "Announce: 'Using [skill] to [purpose]'" -> "Has checklist?";
    "Has checklist?" -> "Create TodoWrite todo per item" [label="yes"];
    "Has checklist?" -> "Follow skill exactly" [label="no"];
    "Create TodoWrite todo per item" -> "Follow skill exactly";
}
```

## Minimal Applicable Set

Default to the smallest set of skills that fully covers the task:

1. One **process skill** when needed (`brainstorming`, `systematic-debugging`, `test-driven-development`, `writing-skills`)
2. One **domain or implementation skill** when needed
3. One **finish skill** when needed (`verification-before-completion`, `finishing-a-development-branch`, `requesting-code-review`)

Do not load every maybe-relevant skill. If two skills overlap, pick the one that most directly matches the task.

## Intent Router

Use this as the fast routing layer before doing work:

- Underdefined feature or behavior change with real product choices: `brainstorming`
- Approved spec or plan already exists: `writing-plans`, `executing-plans`, or `subagent-driven-development`
- Bug, failing test, broken build, flaky behavior: `systematic-debugging`
- Feature or bugfix implementation with clear scope: `test-driven-development`
- Code review, PR feedback, staged diff review: `requesting-code-review` or the relevant GitHub review skill
- Railway, deploy, service config, infra triage: `use-railway`, plus `systematic-debugging` if something is broken
- Repo instruction topology or agent workflow changes: `build-intent-layer`
- Creating or editing skills: `writing-skills`

If the task falls cleanly into one router bucket, start there instead of stacking generic skills.

## Codex Delegation Rule

If you are in Codex, only dispatch subagents when both are true:

1. The current harness supports subagents
2. The user has explicitly asked for delegation, subagents, or parallel agent work

If either is false, stay in the main agent and use the non-delegating workflow.

## Rationalization Tripwires

Pause and re-check skills immediately if you catch yourself thinking:

- "I'll just inspect a couple files first"
- "This is probably too small for a skill"
- "I remember this skill well enough"
- "I'll do one quick change, then come back"

For the longer red-flag list and rationale, see `references/red-flags.md`.

## Skill Priority

When multiple skills could apply, use this order:

1. **Process skills first** (brainstorming, debugging) - these determine HOW to approach the task
2. **Implementation skills second** (frontend-design, mcp-builder) - these guide execution

"Let's build X" → brainstorming first, then implementation skills.
"Fix this bug" → debugging first, then domain-specific skills.

## Skill Types

**Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.

**Flexible** (patterns): Adapt principles to context.

The skill itself tells you which.

## User Instructions

Instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows.
