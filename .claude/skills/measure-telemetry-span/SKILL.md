---
name: measure-telemetry-span
description: >
  Use when measuring a Sentry performance span locally with an agent-device replay flow on iOS simulator or Android emulator.
argument-hint: "<span-name> [runs] [platform]"
allowed-tools: Bash, Read, Grep, Glob
---

# Measure Telemetry Span

Replay one tagged `agent-device` flow on the current branch and on `main`, capture one Sentry span from native logs, and compare the duration distributions.

## Arguments

- `<span-name>` required (e.g. `ManualNavigateToInboxTab`).
- `[runs]` default `10`.
- `[platform]` default `ios` (`ios` or `android`).

If `<span-name>` is missing, ask. Runs means measured samples: the script performs one warmup replay first, then N measured replays.

## Preconditions (user handles these)

- `agent-device` installed: `npm install -g agent-device`.
- Target ready: booted iOS simulator or running Android emulator.
- Metro running on port 8081 (`npm start`).
- iOS only: `agent-device react-devtools` running (Hermes `console.debug` only reaches `os_log` when DevTools is attached).
- Android only: verify the span log appears in `adb logcat`.
- Dirty worktree is allowed. The helper measures current changes first, then temporarily stashes them while measuring `main`, and restores them before exit.
- A flow in `.claude/skills/agent-device/flows/` with header:
  ```
  # @tag sentry-<SpanName>
  ```
  Author one with the `ad-flow-author` skill if it does not exist.
- Sentry code emits `[Sentry][<SpanName>] Ending span (<N>ms)` via `console.debug`.

The skill fails fast if any of the above is missing. It does not try to start Metro or DevTools for you.

## Execution

Run the helper script from the repo root:

```bash
.claude/skills/measure-telemetry-span/measure.sh <span-name> [runs] [platform]
```

Example:

```bash
.claude/skills/measure-telemetry-span/measure.sh ManualNavigateToInboxTab 10 ios
```

The helper fails fast, restores the starting branch and dirty worktree on exit, runs one warmup replay before the measured samples, filters logs for the exact span name, and prints a compact table plus raw samples. Keep the app installed for each checked-out revision; this skill measures JS/dev-server span behavior, not native rebuild changes.

## Troubleshooting

- **"No captured runs"** — on iOS, `agent-device react-devtools` is not attached. On Android, the app did not log at debug level. Verify both manually before re-running.
- **"Failed to restore stashed changes"** — the temporary stash conflicted while restoring. Resolve with `git stash list` and `git stash pop --index`.
- **All captures identical** — log stream is replaying a cached line. Restart the log tool (or the simulator) and re-run.
- **Capture count << runs** — selectors drifted or Sentry span is not firing. Run the flow once manually (`agent-device replay -u <flow>`) and inspect logs.

## Universality

Works for any Sentry span that has a matching `.ad` flow tagged `sentry-<SpanName>` and emits `[Sentry][<SpanName>] Ending span (<N>ms)` via `console.debug`. Nothing in the skill is LHN- or Inbox-specific; change `APP_ID` at the top for other apps.
