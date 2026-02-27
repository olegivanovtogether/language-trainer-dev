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
