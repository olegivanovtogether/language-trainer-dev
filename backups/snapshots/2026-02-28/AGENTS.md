# Backup Policy (Mandatory for All AI Agents)

This repository uses a single backup hierarchy.  
If the user asks to create a backup, every AI agent must follow this policy.

## Required hierarchy

Use only the `backups/` root:

- `backups/snapshots/YYYY-MM-DD/` for full project snapshots
- `backups/legacy-engines/YYYY-MM-DD/` for old engine/script-only backups
- `backups/manual/YYYY-MM-DD-short-note/` for user-requested custom/manual backups

## Naming rules

- Date format is always `YYYY-MM-DD`.
- Do not create top-level folders like `backup-*`, `BackUp`, `old_backup`, etc.
- If multiple backups are created on the same date, add a suffix:
  - `YYYY-MM-DD-a`
  - `YYYY-MM-DD-b`

## Operational rules

- Never overwrite an existing backup folder.
- Keep backup content read-only in spirit: do not edit backup files in place.
- Prefer creating a new backup folder instead of mutating an old one.
- If legacy/incorrect backup folders are found, move them into this hierarchy.

## Current canonical locations

- `backups/snapshots/2025-02-25/`
- `backups/legacy-engines/2026-02-16/`

---

# Editing Large or Risky Files (Mandatory for All AI Agents)

When editing a large file or one where a failed write could corrupt or empty it (e.g. big HTML/JS inline in one file):

## Responsibility

- **Do not** say "the file is empty" or blame the environment. If the file ends up 0 bytes after your edit, **take responsibility** and restore it.
- Before making edits that could wipe the file, **create a temp backup** of that file (e.g. copy to `backups/manual/YYYY-MM-DD-temp-edit/` or a single temp path like `root/index.html.temp-edit`).
- **If you discover the file is 0 bytes** (or clearly corrupted), **restore it from that temp backup immediately**. Do not leave the user with an empty file.
- **Delete the temp backup only after** you have verified that the restored/current file is correct and the app works (or the user confirms). Until then, keep the temp file.

## Workflow

1. **Before** risky edit: copy the file to a temp backup path.
2. Perform the edit.
3. If the file is 0 bytes or broken: restore from the temp backup, then retry with a smaller/safer edit (e.g. single line or small block).
4. **Only after** confirming the file is OK: remove the temp backup file if you created one in the repo.

---

# Backup Access and Restore Authority (Mandatory for All AI Agents)

## Permission boundary

- Agents must **not** copy, restore, or "take" files from any path under `backups/` without explicit user approval in the current task.
- Backup folders are archival by default and are not a silent source for file recovery.

## Default recovery source

- If something is broken and no explicit backup-restore permission is given, recovery must use the latest git commit (`HEAD`) only.
- Using `backups/` as a recovery source requires a direct user instruction.
