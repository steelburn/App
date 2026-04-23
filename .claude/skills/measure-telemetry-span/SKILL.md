---
name: measure-telemetry-span
description: >
  Measure a Sentry performance span on iOS simulator or Android emulator by replaying an agent-device flow, comparing current branch vs main. Use when someone says "measure span", "benchmark span", "compare span times", or wants to measure any Sentry span timing.
argument-hint: "<span-name> [runs] [platform] [threshold-pct] (e.g. ManualNavigateToInboxTab 10 ios 5)"
allowed-tools: Bash, Read, Grep, Glob
---

# Measure Telemetry Span

Replay an `agent-device` flow N times on current branch and on `main`, diff the average duration of a Sentry span.

## Arguments

- `<span-name>` required (e.g. `ManualNavigateToInboxTab`).
- `[runs]` default `10`.
- `[platform]` default `ios` (`ios` or `android`).
- `[threshold-pct]` default `5`.

If `<span-name>` is missing, ask.

## Preconditions (user handles these)

- `agent-device` installed: `npm install -g agent-device`.
- Target ready: booted iOS simulator or running Android emulator.
- Metro running on port 8081 (`npm start`).
- iOS only: `npx react-devtools` running (Hermes `console.debug` only reaches `os_log` when the GUI DevTools is attached).
- Clean worktree (commit or stash first).
- A flow in `.claude/skills/agent-device/flows/` with header:
  ```
  # @tag sentry-<SpanName>
  ```
  Author one with the `ad-flow-author` skill if it does not exist.
- Sentry code emits `[Sentry][<SpanName>] Ending span (<N>ms)` via `console.debug`.

The skill fails fast if any of the above is missing. It does not try to start Metro/DevTools or stash changes for you.

## Execution

Run the block below in a single Bash tool call.

```bash
SPAN="${1:?span name required}"
RUNS="${2:-10}"
PLATFORM="${3:-ios}"
THRESHOLD="${4:-5}"
APP_ID="com.expensify.chat.dev"

REPO="$(git rev-parse --show-toplevel)"
FLOW=$(grep -l "^# @tag[[:space:]]\+sentry-${SPAN}\$" "$REPO"/.claude/skills/agent-device/flows/*.ad 2>/dev/null | head -1)
if [ -z "$FLOW" ]; then
  echo "No flow declares '@tag sentry-$SPAN'. Available:"
  grep -h '^# @tag[[:space:]]\+sentry-' "$REPO"/.claude/skills/agent-device/flows/*.ad | sed 's/.*sentry-//' | sort -u
  exit 1
fi
echo "Using flow: $FLOW"

git diff --quiet && git diff --cached --quiet || { echo "Commit or stash changes first."; exit 1; }
BRANCH="$(git branch --show-current)"

start_log() {
  local out="$1"
  if [ "$PLATFORM" = "ios" ]; then
    xcrun simctl spawn booted log stream --level debug \
      --predicate "eventMessage CONTAINS \"[Sentry][$SPAN] Ending span\"" > "$out" &
  else
    adb logcat -c
    adb logcat '*:D' > "$out" &
  fi
  echo $!
}

measure() {
  local label="$1"
  local raw="/tmp/measure_${label}.log"
  agent-device open "$APP_ID" --platform "$PLATFORM" --relaunch
  sleep 5
  local pid
  pid=$(start_log "$raw")
  for i in $(seq 1 "$RUNS"); do
    agent-device replay -u "$FLOW"
    sleep 1
  done
  kill "$pid" 2>/dev/null
  # Discard first capture as warmup
  grep -oE "Ending span \(([0-9]+)ms\)" "$raw" | grep -oE '[0-9]+' | tail -n +2
}

measure "branch" > /tmp/branch_durations.txt
git checkout main || { echo "Failed to checkout main"; exit 1; }
measure "main"   > /tmp/main_durations.txt
git checkout "$BRANCH"

awk -v T="$THRESHOLD" '
  FNR==NR { b[++bn]=$1; bs+=$1; if(!bmin||$1<bmin)bmin=$1; if($1>bmax)bmax=$1; next }
          { m[++mn]=$1; ms+=$1; if(!mmin||$1<mmin)mmin=$1; if($1>mmax)mmax=$1 }
  END {
    if (!bn || !mn) { print "No captured runs on one side."; exit 1 }
    ba=bs/bn; ma=ms/mn; pct=(ba-ma)/ma*100
    printf "| Metric | main   | branch |\n"
    printf "|--------|--------|--------|\n"
    printf "| Runs   | %6d | %6d |\n", mn, bn
    printf "| Avg    | %4.0fms | %4.0fms |\n", ma, ba
    printf "| Min    | %4dms | %4dms |\n", mmin, bmin
    printf "| Max    | %4dms | %4dms |\n", mmax, bmax
    printf "\nDelta: %+.0fms (%+.1f%%)\n", ba-ma, pct
    if (pct >  T) printf "Regression beyond +%d%% threshold.\n", T
    else if (pct < -T) printf "Improvement beyond -%d%% threshold. Re-run to confirm.\n", T
    else printf "Perf-neutral (within +/-%d%%).\n", T
  }' /tmp/branch_durations.txt /tmp/main_durations.txt
```

## Troubleshooting

- **"No captured runs"** — on iOS, `react-devtools` is not attached. On Android, the app did not log at debug level. Verify both manually before re-running.
- **"Failed to checkout main"** — you have uncommitted submodule changes (e.g. `Mobile-Expensify`). Commit or stash them, then re-run.
- **All captures identical** — log stream is replaying a cached line. Restart the log tool (or the simulator) and re-run.
- **Capture count << runs** — selectors drifted or Sentry span is not firing. Run the flow once manually (`agent-device replay -u <flow>`) and inspect logs.

## Universality

Works for any Sentry span that has a matching `.ad` flow tagged `sentry-<SpanName>` and emits `[Sentry][<SpanName>] Ending span (<N>ms)` via `console.debug`. Nothing in the skill is LHN- or Inbox-specific; change `APP_ID` at the top for other apps.
