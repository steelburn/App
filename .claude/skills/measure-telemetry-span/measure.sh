#!/usr/bin/env bash
set -euo pipefail

COMPARE="false"
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--compare" ]]; then
    COMPARE="true"
  else
    ARGS+=("$arg")
  fi
done
set -- "${ARGS[@]}"

SPAN="${1:?span name required}"
RUNS="${2:-10}"
PLATFORM="${3:-ios}"
APP_ID="${APP_ID:-com.expensify.chat.dev}"
LOG_PID=""
STASHED_CHANGES="false"
FLOW_ENV_ARGS=()
RESET_FLOW=""

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  echo "Platform must be 'ios' or 'android'." >&2
  exit 1
fi

if ! [[ "$RUNS" =~ ^[0-9]+$ ]] || [[ "$RUNS" -lt 1 ]]; then
  echo "Runs must be a positive integer." >&2
  exit 1
fi

REPO="$(git rev-parse --show-toplevel)"
FLOW=$(grep -l "^# @tag[[:space:]]\+sentry-${SPAN}\$" "$REPO"/.claude/skills/agent-device/flows/*.ad 2>/dev/null | head -1 || true)
if [[ -z "$FLOW" ]]; then
  echo "No flow declares '@tag sentry-$SPAN'. Available:" >&2
  grep -h '^# @tag[[:space:]]\+sentry-' "$REPO"/.claude/skills/agent-device/flows/*.ad 2>/dev/null | sed 's/.*sentry-//' | sort -u >&2
  exit 1
fi

RESET_DECL=$(grep -E '^# @reset[[:space:]]+' "$FLOW" | sed -E 's/^# @reset[[:space:]]+//' | head -1 || true)
if [[ -n "$RESET_DECL" ]]; then
  if [[ "$RESET_DECL" = /* ]]; then
    RESET_FLOW="$RESET_DECL"
  else
    RESET_FLOW="$REPO/$RESET_DECL"
  fi

  if [[ ! -f "$RESET_FLOW" ]]; then
    echo "Reset flow does not exist: $RESET_FLOW" >&2
    exit 1
  fi
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Run this from a branch, not a detached HEAD." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
BRANCH_DURATIONS="$TMP_DIR/branch_durations.txt"
MAIN_DURATIONS="$TMP_DIR/main_durations.txt"

cleanup() {
  if [[ -n "$LOG_PID" ]]; then
    kill "$LOG_PID" 2>/dev/null || true
  fi
  git checkout "$BRANCH" >/dev/null 2>&1 || true
  if [[ "$STASHED_CHANGES" == "true" ]]; then
    git stash pop --index >/dev/null 2>&1 || {
      echo "Failed to restore stashed changes. Resolve with 'git stash list' and 'git stash pop --index'." >&2
    }
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

stash_changes_if_needed() {
  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    return
  fi

  echo "Stashing dirty worktree before measuring main..." >&2
  git stash push --include-untracked -m "measure-telemetry-span temporary changes" >&2
  STASHED_CHANGES="true"
}

restore_changes_if_needed() {
  if [[ "$STASHED_CHANGES" != "true" ]]; then
    return
  fi

  echo "Restoring dirty worktree changes..." >&2
  if git stash pop --index >&2; then
    STASHED_CHANGES="false"
    return
  fi

  STASHED_CHANGES="false"
  echo "Failed to restore stashed changes. Resolve with 'git stash list' and 'git stash pop --index'." >&2
  exit 1
}

# Flow `env KEY=default` lines: only AD_<KEY> overrides are applied (see measure-telemetry-span SKILL.md).
append_flow_env_from_ad_vars() {
  local env_lines line assignment key env_key
  env_lines=$(grep -E '^env [A-Za-z_][A-Za-z0-9_]*=' "$FLOW" || true)
  if [[ -z "$env_lines" ]]; then
    return
  fi

  while IFS= read -r line; do
    assignment="${line#env }"
    key="${assignment%%=*}"
    env_key="AD_${key}"
    if [[ -n "${!env_key:-}" ]]; then
      FLOW_ENV_ARGS+=("-e" "$key=${!env_key}")
      echo "Replay env: $key from $env_key" >&2
    fi
  done <<< "$env_lines"
}

start_log() {
  local out="$1"
  if [[ "$PLATFORM" == "ios" ]]; then
    xcrun simctl spawn booted log stream --level debug \
      --predicate "eventMessage CONTAINS \"[Sentry][$SPAN] Ending span\"" > "$out" &
  else
    adb logcat -c
    adb logcat '*:D' > "$out" &
  fi
  echo $!
}

reset_if_needed() {
  if [[ -z "$RESET_FLOW" ]]; then
    return
  fi

  echo "Resetting with: $RESET_FLOW" >&2
  agent-device replay "$RESET_FLOW" >&2
}

# After --relaunch on Android, UIAutomator often returns Snapshot: 0 nodes briefly; warmup replay then fails @pre.
wait_until_android_ui_ready() {
  local attempt snapshot
  for attempt in $(seq 1 60); do
    snapshot="$(agent-device snapshot 2>/dev/null || true)"
    if [[ "$snapshot" == *'"Home"'* && "$snapshot" == *'"Inbox'* ]]; then
      return
    fi
    sleep 1
  done

  echo "Warning: Android UI not ready after 60s (no Home/Inbox tabs); proceeding anyway." >&2
}

measure() {
  local label="$1"
  local raw="$TMP_DIR/${label}.log"

  agent-device open "$APP_ID" --platform "$PLATFORM" --relaunch >&2
  sleep 5
  if [[ "$PLATFORM" == "android" ]]; then
    wait_until_android_ui_ready
  fi

  LOG_PID=$(start_log "$raw")
  agent-device replay "$FLOW" ${FLOW_ENV_ARGS[@]+"${FLOW_ENV_ARGS[@]}"} >&2 # warmup
  reset_if_needed
  sleep 1

  for i in $(seq 1 "$RUNS"); do
    echo "Run $i/$RUNS ($label)" >&2
    agent-device replay "$FLOW" ${FLOW_ENV_ARGS[@]+"${FLOW_ENV_ARGS[@]}"} >&2
    reset_if_needed
    sleep 1
  done

  kill "$LOG_PID" 2>/dev/null || true
  LOG_PID=""

  grep "\\[Sentry\\]\\[$SPAN\\] Ending span" "$raw" | grep -oE "Ending span \(([0-9]+)ms\)" | grep -oE '[0-9]+' | tail -n "$RUNS" || true
}

echo "Using flow: $FLOW" >&2
if [[ -n "$RESET_FLOW" ]]; then
  echo "Using reset flow: $RESET_FLOW" >&2
fi
append_flow_env_from_ad_vars
measure "branch" > "$BRANCH_DURATIONS"

if [[ "$COMPARE" != "true" ]]; then
  awk '
    { b[++bn]=$1; bs+=$1; if(!bmin||$1<bmin)bmin=$1; if($1>bmax)bmax=$1 }
    END {
      if (!bn) { print "No captured runs."; exit 1 }
      ba=bs/bn
      printf "| Metric | branch |\n"
      printf "|--------|--------|\n"
      printf "| Runs   | %6d |\n", bn
      printf "| Avg    | %4.0fms |\n", ba
      printf "| Min    | %4dms |\n", bmin
      printf "| Max    | %4dms |\n", bmax
      printf "\nBranch samples: "
      for (i=1; i<=bn; i++) printf "%sms%s", b[i], (i<bn ? ", " : "\n")
    }' "$BRANCH_DURATIONS"
  exit 0
fi

stash_changes_if_needed

git checkout main >&2 || {
  echo "Failed to checkout main" >&2
  exit 1
}
measure "main" > "$MAIN_DURATIONS"

git checkout "$BRANCH" >&2
restore_changes_if_needed

awk '
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
    printf "\nMain samples:   "
    for (i=1; i<=mn; i++) printf "%sms%s", m[i], i<mn ? ", " : "\n"
    printf "Branch samples: "
    for (i=1; i<=bn; i++) printf "%sms%s", b[i], i<bn ? ", " : "\n"
    printf "\nDelta: %+.0fms (%+.1f%%)\n", ba-ma, pct
    printf "Re-run to confirm if samples are noisy or the delta is close.\n"
  }' "$BRANCH_DURATIONS" "$MAIN_DURATIONS"
