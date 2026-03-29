# Codex Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Codex equivalent |
|-----------------|------------------|
| `Task` tool (dispatch subagent) | `spawn_agent` |
| Multiple `Task` calls (parallel) | Multiple `spawn_agent` calls |
| Task returns result | `wait_agent` |
| Send follow-up to existing task | `send_input` |
| Task completes automatically | `close_agent` when no longer needed |
| `TodoWrite` (task tracking) | `update_plan` |
| `Skill` tool (invoke a skill) | Skills load natively — just follow the instructions |
| `Read`, `Write`, `Edit` (files) | Use your native file tools |
| `Bash` (run commands) | Use your native shell tools |
| Parallel file or shell inspection | `multi_tool_use.parallel` |

## Subagent dispatch in Codex

Add to your Codex config (`~/.codex/config.toml`):

```toml
[features]
multi_agent = true
```

This enables `spawn_agent`, `wait_agent`, `send_input`, and `close_agent` for skills like `dispatching-parallel-agents` and `subagent-driven-development`.

## Delegation Guardrail

Some Codex harnesses only allow delegation when the user explicitly asks for subagents, delegation, or parallel agent work. In those harnesses:

1. Do not dispatch subagents by default
2. Prefer the non-delegating workflow
3. Only switch to subagents after explicit user approval
