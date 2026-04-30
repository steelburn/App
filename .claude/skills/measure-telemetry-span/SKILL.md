---
name: measure-telemetry-span
description: >
  Use when measuring a Sentry performance span locally with an agent-device replay flow on iOS simulator or Android emulator.
argument-hint: "<span-name> [runs] [platform] [--compare]"
allowed-tools: Bash, Read, Grep, Glob
---

# Measure Telemetry Span

Measure **one** Sentry span locally by replaying a tagged `.ad` flow and reading `[Sentry][<SpanName>] Ending span (<N>ms)` from native logs. This document is the **source of truth** for procedure and agent behavior; `measure.sh` is an optional **bundled automation** of the same protocol (recommended for `--compare` so git stash/checkout stays safe).

## Span + flow contract

- App code emits `console.debug` so logs contain:
  `[Sentry][<SpanName>] Ending span (<N>ms)`
- A flow under `.claude/skills/agent-device/flows/` declares:
  `# @tag sentry-<SpanName>`
- Same span name in both places (case-sensitive).

Find the flow file:

```bash
SpanName=ManualNavigateToReports  # example
REPO="$(git rev-parse --show-toplevel)"
grep -l "^# @tag[[:space:]]\+sentry-${SpanName}\$" "$REPO"/.claude/skills/agent-device/flows/*.ad
```

List known span tags:

```bash
grep -h '^# @tag[[:space:]]\+sentry-' .claude/skills/agent-device/flows/*.ad | sed 's/.*sentry-//' | sort -u
```

If missing, author a flow (see `ad-flow-author` skill).

## Preconditions (fail fast — skill/agent does not start Metro or DevTools)

- `agent-device` installed (`npm install -g agent-device`), minimum version per repo `agent-device` skill.
- **Metro** on **8081**: `npm run start` from repo root (or project convention).
- **Device**: booted iOS simulator or running Android emulator / authorized device.
- **Dev build** on device (`npm run ios` / `npm run android` from repo as applicable).

Platform-specific logging:

| Platform | Requirement |
|----------|-------------|
| **iOS** | `agent-device react-devtools` running — Hermes `console.debug` reaches `os_log` when DevTools is attached. |
| **Android** | Span line must appear in `adb logcat` at debug level; verify once manually before trusting numbers. |

Optional app id override: export `APP_ID` (default `com.expensify.chat.dev` in the script; match your install).

## Flow extras

### `env KEY=value` in the flow

`agent-device replay` accepts `-e KEY=VALUE`. The script only applies overrides when you set **`AD_<KEY>`** in the environment (e.g. flow has `env EMAIL=…` → export `AD_EMAIL=user@…` before running `measure.sh`). No interactive prompts — non-interactive runs stay deterministic.

### `# @reset path/to/reset.ad`

After warmup and after **each** measured replay, run `agent-device replay <reset-flow>` so the next replay starts from the same UI state. Paths are relative to repo root unless absolute.

Author reset flows when the navigation flow ends on a different tab/screen than where it started.

## Measurement protocol (human or agent — same steps)

Use this when **not** invoking `measure.sh`, or to debug a failed run.

1. **Resolve** flow path (grep above). Confirm `@pre` on device (`agent-device snapshot`, `agent-device is exists '…'`).
2. **Open / relaunch** app on the target platform (clean run for comparable samples):
   `agent-device open "$APP_ID" --platform <ios|android> --relaunch`
3. **Settle** ~5s after launch.
4. **Android only:** after relaunch, UIAutomator can briefly return an empty snapshot. Wait until a snapshot shows both **Home** and **Inbox** in the accessibility output (poll `agent-device snapshot` up to ~60s, 1s apart) before relying on `@pre` tabs.
5. **Start log capture** (background in a real terminal; kill the process when done):
   - **iOS:**

     ```bash
     xcrun simctl spawn booted log stream --level debug \
       --predicate 'eventMessage CONTAINS "[Sentry][YOUR_SPAN] Ending span"' > /tmp/sentry-span.log &
     ```

   - **Android:**

     ```bash
     adb logcat -c
     adb logcat '*:D' > /tmp/sentry-span.log &
     ```

6. **Warmup:** `agent-device replay "$FLOW"` once (discarded for stats unless you parse it — warmup reduces cold-start noise in interpretation).
7. **Reset** if the flow declares `@reset`.
8. **Measured runs:** repeat `agent-device replay "$FLOW"` **N** times; after **each** run, `@reset` again if declared. Short sleep between runs (~1s) if flaky.
9. **Stop** log capture (kill the background `log stream` / `logcat` job).
10. **Extract** millisecond values (adjust `YOUR_SPAN`):

    ```bash
    grep '\[Sentry\]\[YOUR_SPAN\] Ending span' /tmp/sentry-span.log \
      | grep -oE 'Ending span \(([0-9]+)ms\)' | grep -oE '[0-9]+' | tail -n "$RUNS"
    ```

11. **Summarize** (pipe the last command’s stdout into stats — use `awk` or a spreadsheet). For a single branch, min/max/avg on the N lines is enough.

## Compare branch vs `main`

Goal: same `RUNS`, same `PLATFORM`, same protocol on **current branch** then on **`main`**, then compare distributions.

**Git safety (order matters):**

1. Record branch name: `git branch --show-current` (detached HEAD is a bad state for this workflow).
2. Measure **current branch** first; save duration lines to a file (e.g. `branch.txt`).
3. If worktree is dirty: `git stash push --include-untracked -m "measure-telemetry-span compare"` then `git checkout main`.
4. Measure **main**; save to `main.txt`.
5. `git checkout <branch>` and `git stash pop --index` if you stashed.

If stash pop conflicts, recover with `git stash list` / `git stash pop --index` per Git docs.

**Bundled shortcut:** `measure.sh … --compare` performs stash/checkout/measure/restore and prints both tables — **use it for compare** to avoid branch/stash mistakes.

## Execution (script — optional but recommended for compare)

From repo root:

```bash
.claude/skills/measure-telemetry-span/measure.sh <span-name> [runs] [platform] [--compare]
```

- `[runs]` default `10` — counted **after** one warmup replay inside the script.
- `[platform]` default `ios` (`ios` or `android`). Match the device you actually use.
- `--compare` — measures current branch, then stashes if needed, checks out `main`, measures again, checks out back, restores stash. Restores starting branch and worktree on exit (trap).

Export overrides for flow `env` keys as `AD_<KEY>` before calling.

**What remains in the script (must-have automation):** validated args, flow + `@reset` resolution, `open --relaunch`, Android UI readiness wait, background log capture + teardown, warmup + N replays + optional reset, duration extraction, summary tables, and **safe git choreography for `--compare`**. Everything else lives in this skill.

## Troubleshooting

- **"No captured runs" / empty grep** — iOS: attach React DevTools. Android: confirm debug logs and correct package. Restart log stream / clear logcat and retry.
- **"Failed to restore stashed changes"** — stash conflict on pop; see `git stash` recovery.
- **All samples identical** — stale log line; restart simulator / log pipeline.
- **Fewer samples than runs** — span not firing, selectors drift, or flow ends before span ends; run `agent-device replay <flow>` once with `--debug`, fix flow (`ad-flow-author`).
- **SESSION_NOT_FOUND** — run `agent-device open …` first or align `--session` / device flags with your session.

## Universality

Any span that matches an `@tag sentry-<SpanName>` flow and emits the log line above. Not Inbox-specific. Non–Expensify apps: set `APP_ID` when invoking the script or `open`.
