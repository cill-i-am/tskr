# PRD 3: Manual Intake And Review

## Problem Statement

The product needs a way to turn messy, human-provided text into structured
 tasks without forcing dispatchers and admins back into heavy manual data entry.

The core problem is not just task creation. Real inbound work descriptions are
 often incomplete, ambiguous, duplicated, or batch-submitted. One pasted note
 may describe several separate jobs. Another may lack a dispatchable location.
 A parser may incorrectly split one real job into several drafts, or combine
 several jobs into one. If the product jumps straight from raw text to live
 tasks without a review step, users will lose trust in it quickly.

This slice needs to introduce a human-in-the-loop intake workflow that makes AI
 useful without making it authoritative. It must let authorized office users
 submit free text, review one or more extracted drafts, merge and split drafts
 when the parser gets it wrong, override extracted fields, and finalize only
 when the resulting task data is good enough.

## Solution

Build a dedicated manual intake and review slice with a separate intake queue
 and batch-review workflow.

Authorized users can submit free text manually. That submission becomes an
 intake batch. The parser may extract one or more draft tasks from the batch.
 Each draft includes the extracted task fields, overall confidence, optional
 per-field confidence, provenance showing what the AI suggested versus what the
 human later changed, and coordination state when clarification is needed.

Review happens in a dedicated queue rather than inside the normal task list.
 Reviewers can edit drafts, merge multiple drafts into one, split one draft into
 several, reject a single draft, reject the whole batch, or finalize drafts
 into real tasks. High-confidence complete drafts can be finalized in one click,
 but that approval must still be recorded explicitly as a reviewer action.

This PRD is text-only. It does not include inbound email/WhatsApp ingestion,
 screenshot parsing, image extraction, outbound clarification messaging, or
 assignment suggestions.

## User Stories

1. As an owner, admin, or dispatcher, I want to submit free-text work descriptions manually, so that I can turn messy inbound information into structured tasks.
2. As an intake user, I want the intake workflow kept separate from ordinary task creation, so that extraction/review feels like its own operational process.
3. As an intake user, I want free-text intake to live on a dedicated intake surface, so that batch review and queue behavior remain clear.
4. As a reviewer, I want each free-text submission to create an intake batch, so that one inbound source can produce multiple related draft tasks.
5. As a reviewer, I want extracted drafts linked back to the source batch, so that I can understand where they came from.
6. As a reviewer, I want the intake batch to remain visible after resolution, so that the system keeps an intake history rather than hiding what happened.
7. As a reviewer, I want resolved batches removed from the active queue, so that the queue remains focused on work that still needs attention.
8. As a reviewer, I want to reject an entire intake batch at once when the whole submission is unusable, so that I do not have to reject each draft individually.
9. As a reviewer, I want to reject a single extracted draft without discarding the whole batch, so that partially useful submissions can still be salvaged.
10. As a reviewer, I want rejection to require a reason, so that the system captures why the parser or submission failed.
11. As a team, I want rejection reasons to come from a predefined set with optional notes, so that later analysis is possible without forcing everything into free text.
12. As a reviewer, I want rejection reasons to include at least invalid job, duplicate work, insufficient information, bad extraction, and submitted by mistake, so that the common failure modes are captured.
13. As a reviewer, I want the parser to extract multiple drafts from one free-text submission, so that batch-submitted work can be separated cleanly.
14. As a reviewer, I want to merge extracted drafts back together when the parser splits one real job incorrectly, so that I can repair over-splitting quickly.
15. As a reviewer, I want to split one extracted draft into multiple tasks when the parser missed the split, so that I can repair under-splitting too.
16. As a reviewer, I want to see which fields were AI-suggested and which were later overridden by a human, so that I can trust the review flow and audit what changed.
17. As a reviewer, I want to see an overall confidence score per draft, so that I can prioritize uncertain work.
18. As a reviewer, I want per-field confidence where available, so that I can see exactly what the parser was unsure about.
19. As a reviewer, I want the queue to highlight incomplete drafts separately from low-confidence drafts, so that I can distinguish “uncertain” from “missing critical information.”
20. As a reviewer, I want missing critical fields to mean at least missing dispatchable location or missing usable task body/description, so that the incomplete signal stays tight and meaningful.
21. As a system, I want low-confidence or incomplete submissions to still become drafts rather than being discarded, so that human review can rescue useful work.
22. As a reviewer, I want drafts with weak location extraction to land in `needs clarification` rather than disappear, so that the system remains resilient to imperfect input.
23. As a reviewer, I want to finalize a draft after manually fixing missing information myself, so that unresolved AI extraction does not block progress unnecessarily.
24. As a reviewer, I want the queue to sort by highest review need first, so that the most uncertain and incomplete work gets attention before easy wins.
25. As a reviewer, I want recency to remain a secondary signal, so that newer work does not disappear even when the queue is uncertainty-driven.
26. As a reviewer, I want high-confidence complete drafts to support one-click finalization, so that easy work can move fast.
27. As a workspace, I want one-click finalization to still record an explicit reviewer approval event, so that the audit trail shows human acceptance.
28. As a reviewer, I want finalized drafts to become real tasks using the shared core task model, so that intake does not invent a second task system.
29. As a product team, I want the structured manual-intake path to reuse the same composer primitives and visual language as task core, so that the product stays consistent.
30. As a reviewer, I want the free-text flow to land directly in a batch-focused review experience after submission, so that I can keep working on the same intake immediately.
31. As a workspace, I want no automated inbound email/WhatsApp ingestion in this slice, so that manual intake and review stay sharply scoped.
32. As a workspace, I want no screenshot or image parsing in this slice, so that we do not add image-processing complexity too early.
33. As a workspace, I want no outbound clarification messages in this slice, so that the system models clarification state now without committing to channel automation yet.
34. As a workspace, I want no assignment suggestions or auto-assignment in this slice, so that intake review stops at finalizing tasks rather than spilling into dispatch logic.
35. As a product team, I want parser analytics deferred, so that the slice focuses on workflow correctness rather than optimization dashboards.
36. As a workspace, I want basic audit/history around intake actions, so that we can understand what was submitted, extracted, changed, approved, or rejected.

## Implementation Decisions

- This PRD covers human-triggered manual intake plus AI-assisted parsing only.
- It excludes:
  - automated inbound channel ingestion
  - screenshot/image parsing
  - outbound clarification messaging
  - assignment suggestions
  - auto-assignment
  - parser analytics dashboards
- Intake is restricted in this slice to:
  - owner
  - admin
  - dispatcher
- Free-text intake happens on a dedicated intake surface, not inside the normal task composer modal.
- Structured manual intake should reuse the same composer primitives and visual language as the core task composer.
- Every free-text submission creates an intake batch/source container.
- One intake batch can produce one or more extracted draft tasks.
- Intake batches remain visible after resolution for history/audit, but drop out of the active queue when all drafts are resolved.
- Reviewers can:
  - edit drafts
  - merge drafts
  - split drafts
  - reject one draft
  - reject a whole batch
  - finalize drafts into real tasks
- Rejecting a draft or a batch requires:
  - predefined rejection reason
  - optional free-text note
- Minimum predefined rejection reasons are:
  - not a valid job/task
  - duplicate of existing work
  - insufficient information
  - parser error / bad extraction
  - user cancelled / submitted by mistake
- Drafts should store:
  - extracted field values
  - overall confidence
  - per-field confidence where available
  - provenance showing AI-suggested versus human-overridden values
  - coordination state when clarification/review is needed
- Queue presentation should show:
  - confidence
  - incomplete indicator
  - batch context
- A draft is incomplete in this slice when it lacks:
  - dispatchable location
  - usable task body/description
- Low-confidence or incomplete extraction should still produce drafts rather than blocking intake.
- Weak location extraction should create a draft and place it into `needs clarification`.
- Reviewers can still finalize a draft after manually resolving missing fields themselves.
- The queue should default-sort by highest review need first, with recency as a secondary signal.
- High-confidence complete drafts should support one-click finalization.
- One-click finalization must still record explicit reviewer approval in the audit trail.
- This slice includes the state model for clarification loops, but not the outbound agent messaging loop itself.
- Finalized drafts become real tasks through the task-core model rather than inventing a separate intake-owned task object.

## Testing Decisions

- Good tests should verify end-user workflow behavior, parser/output boundaries, reviewer control, and auditability rather than internal parser implementation details.
- This slice should test:
  - free-text submission creating an intake batch
  - one batch producing multiple drafts
  - low-confidence drafts remaining reviewable
  - incomplete drafts receiving the correct signal/state
  - batch-level rejection
  - draft-level rejection
  - required rejection reasons
  - merge behavior
  - split behavior
  - reviewer field overrides
  - provenance tracking of AI-suggested versus human-overridden fields
  - one-click finalization with explicit reviewer approval recorded
  - finalizing manually repaired drafts
  - queue ordering by review need
- Tests should cover both service behavior and web review-flow behavior.
- Parser-specific tests should focus on contract behavior at the parser boundary, so provider changes later do not invalidate the slice.
- Focused route/service tests plus focused UI tests are preferred over heavyweight end-to-end coverage for most of this slice.

## Out Of Scope

- Automated email ingestion
- Automated WhatsApp ingestion
- SMS ingestion
- Screenshot parsing
- Image parsing
- OCR-heavy intake
- Outbound clarification messaging
- Agent-led conversational follow-up loops
- Assignment suggestions
- Auto-assignment
- Cross-workspace work requests
- Parser analytics dashboards
- Attachment-assisted free-text intake

## Further Notes

- This slice should make AI useful without making it sovereign.
- The reviewer experience is the product here, not the parser alone.
- The product should preserve a clear audit trail of what AI suggested, what humans changed, and what ultimately became a real task.
- Follow-ups that should stay visible but outside this slice:
  - channel-driven intake
  - screenshot/image-assisted parsing
  - clarification automation
  - parser analytics
  - assignment suggestions
