# Work Network Edge Cases Backlog

## Purpose

This document is a holding area for edge cases that should be revisited during
PRD and implementation work without expanding the MVP roadmap document.

## Seed Cases

- Ambiguous intake messages that may split into multiple tasks
- Unclear, partial, or ungeocodable locations
- Cross-workspace acceptance timing and rejection loops
- Parent/child roll-up mismatches after delegation
- Attachment visibility changes after upload
- Reopened work after external completion
- Field-unit membership changing mid-task
- Receiver-side edits that materially differ from the original work request
- Sender visibility into child-task progress when the child stays hidden in UX
- Tasks with planned windows but no due date
- Tasks with due dates but no planned window
- Work requests that are urgent but still awaiting external acceptance
- Tasks created in the field and later delegated externally
- Notes or attachments that should remain private after a task becomes shared

## Usage Rule

- Add new cases here whenever we discover an unresolved workflow edge.
- Promote a case into a PRD only when it materially affects the slice being
  designed or implemented.
