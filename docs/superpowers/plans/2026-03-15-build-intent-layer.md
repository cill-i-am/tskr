# Build Intent Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `build-intent-layer` skill that teaches Codex how to inspect a multi-agent repo, place intent at the right semantic boundaries, and update nested `AGENTS.md` and colocated `CLAUDE.md` files by default.

**Architecture:** Keep the skill lean and reference-driven. Put the operational workflow in `SKILL.md`, put the article-derived model in a single reference file, and generate `agents/openai.yaml` so the skill is discoverable in UI surfaces. Validate structure with the skill-creator tooling and verify the content against the approved spec.

**Tech Stack:** Markdown skills, YAML frontmatter, skill-creator scripts, repo docs

---

## Chunk 1: Scaffold The Skill

### Task 1: Create the skill folder with the required structure

**Files:**

- Create: `.agents/skills/build-intent-layer/SKILL.md`
- Create: `.agents/skills/build-intent-layer/references/intent-layer.md`
- Create: `.agents/skills/build-intent-layer/agents/openai.yaml`

- [ ] **Step 1: Write the failing test condition**

Define the baseline failure: the repo does not yet contain a `build-intent-layer`
skill directory, so the skill cannot be discovered or loaded.

- [ ] **Step 2: Run a command that proves the failure**

Run:

```bash
test -d .agents/skills/build-intent-layer
```

Expected: non-zero exit because the directory does not exist.

- [ ] **Step 3: Create the minimal scaffold**

Run the skill creator initializer from the repo root:

```bash
python3 /Users/cillianbarron/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  build-intent-layer \
  --path .agents/skills \
  --resources references \
  --interface display_name="Build Intent Layer" \
  --interface short_description="Build nested repo intent layers" \
  --interface default_prompt="Use $build-intent-layer to inspect this repo and build or repair its instruction topology."
```

This should create the skill folder, `SKILL.md`, `references/`, and
`agents/openai.yaml`.

- [ ] **Step 4: Re-run the check**

Run:

```bash
test -d .agents/skills/build-intent-layer
```

Expected: zero exit because the scaffold now exists.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/build-intent-layer
git commit -m "feat: scaffold build intent layer skill"
```

## Chunk 2: Author The Skill Content

### Task 2: Write the operational skill and the article-derived reference

**Files:**

- Modify: `.agents/skills/build-intent-layer/SKILL.md`
- Modify: `.agents/skills/build-intent-layer/references/intent-layer.md`
- Verify against: `docs/superpowers/specs/2026-03-15-build-intent-layer-design.md`

- [ ] **Step 1: Write the failing test condition**

Define the content gap: the scaffolded files contain placeholders and do not yet
teach the intended workflow from the approved design.

- [ ] **Step 2: Prove the content is still placeholder-level**

Run:

```bash
sed -n '1,220p' .agents/skills/build-intent-layer/SKILL.md
sed -n '1,220p' .agents/skills/build-intent-layer/references/intent-layer.md
```

Expected: template content or TODO markers that do not match the approved spec.

- [ ] **Step 3: Replace the placeholders with the minimal useful implementation**

Write `SKILL.md` so it covers:

- triggering conditions only in frontmatter description
- a concise workflow for inventory, scope mapping, LCA placement, edit
  application, and verification
- the canonical rule that `AGENTS.md` owns shared intent per semantic scope
- colocated `CLAUDE.md` symlink behavior
- removal or thinning of legacy mirrors when tools already read `AGENTS.md`
- explicit safeguards for ambiguity, unique legacy instructions, and symlink
  fallbacks

Write `references/intent-layer.md` so it captures:

- semantic boundaries over technical boundaries
- nearest-common-ancestor placement
- local refinement instead of duplication
- downlinks and intent maintenance loops
- concrete repo-oriented examples aligned with multi-agent instruction files

Keep `SKILL.md` procedural and keep the deeper model in the reference file.

- [ ] **Step 4: Re-read the written files**

Run:

```bash
sed -n '1,260p' .agents/skills/build-intent-layer/SKILL.md
sed -n '1,260p' .agents/skills/build-intent-layer/references/intent-layer.md
```

Expected: no placeholders, no TODOs, and clear alignment with the approved spec.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/build-intent-layer/SKILL.md .agents/skills/build-intent-layer/references/intent-layer.md
git commit -m "feat: author build intent layer skill"
```

## Chunk 3: Validate Discovery Metadata And Final Behavior

### Task 3: Ensure metadata matches the skill and validate the folder

**Files:**

- Modify: `.agents/skills/build-intent-layer/agents/openai.yaml`
- Verify: `.agents/skills/build-intent-layer/SKILL.md`
- Verify: `.agents/skills/build-intent-layer/references/intent-layer.md`

- [ ] **Step 1: Write the failing test condition**

Define the expected verification target: the new skill should have valid
frontmatter, valid UI metadata, and no stale generated fields.

- [ ] **Step 2: Regenerate metadata from the finished skill**

Run:

```bash
python3 /Users/cillianbarron/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py \
  .agents/skills/build-intent-layer \
  --interface display_name="Build Intent Layer" \
  --interface short_description="Build nested repo intent layers" \
  --interface default_prompt="Use $build-intent-layer to inspect this repo and build or repair its instruction topology."
```

Expected: `agents/openai.yaml` reflects the finished skill.

- [ ] **Step 3: Run structural validation**

Run:

```bash
python3 /Users/cillianbarron/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/build-intent-layer
```

Expected: validation succeeds with no frontmatter or naming errors.

- [ ] **Step 4: Run repo hygiene and focused verification**

Run:

```bash
pnpm exec ultracite fix
rg -n "TODO|TBD|placeholder" .agents/skills/build-intent-layer
git diff -- .agents/skills/build-intent-layer docs/superpowers/plans/2026-03-15-build-intent-layer.md
```

Expected:

- formatting and lint-compatible rewrites succeed
- the new skill contains no placeholder markers
- the resulting diff is limited to the plan and the skill files

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/build-intent-layer docs/superpowers/plans/2026-03-15-build-intent-layer.md
git commit -m "feat: add build intent layer skill"
```
