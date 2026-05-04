---
name: agent-device-pr-media
description: Record iOS/Android flows via agent-device for Expensify App PR evidence. Drives the app through verification steps, captures MP4 recordings per platform, saves them locally, and presents the user with file paths and a pre-filled Screenshots/Videos table snippet to paste into the PR. Mobile-native only - does not handle mWeb or Desktop.
allowed-tools: Bash(agent-device *) Bash(gh pr view *) Bash(mkdir -p *) Bash(ls *) Bash(file *) Bash(test -s *) Bash(scripts/is-hybrid-app.sh) Bash(mktemp *) Bash(grep *) Read
---

# agent-device-pr-media

Records the **iOS: Native** and **Android: Native** flows for the Expensify App PR template's `### Screenshots/Videos` section. Drives the app via [`agent-device`](../agent-device/SKILL.md), captures MP4 recordings per platform, and hands the files off to the user.

## Pre-flight

`agent-device` version check: !`R=0.13.0; V=$(agent-device --version 2>/dev/null); [ -n "$V" ] && [ "$(printf '%s\n%s\n' "$R" "$V" | sort -V | head -1)" = "$R" ] && echo "OK ($V)" || echo "FAIL (need v$R+, got: ${V:-not installed})"`

> If the check fails, **STOP** and surface the install instructions: `npm install -g agent-device@latest`.

Everything else (Metro, device boot, app state) is handled by `agent-device` commands in the capture loop.

## Scope

**In scope:** `iOS: Native` (iOS Simulator), `Android: Native` (Android Emulator)

**Out of scope:** `Android: mWeb Chrome`, `iOS: mWeb Safari`, `MacOS: Chrome / Safari` - decline and point to a browser-driver skill.

## Modes

### Mode A - PR-driven

Trigger: user provides a PR URL or number ("record the flow for PR #12345").

1. **Fetch PR body**:
   ```bash
   gh pr view <num> --json body,number,url -q '.'
   ```

2. **Extract the Tests section** - content between `### Tests` and the next `###`. Keep numbered list lines verbatim. If the section only contains the boilerplate `Verify that no errors appear in the JS console`, **stop and ask** for the actual flow.

3. **Present parsed steps + target platforms + required flow params for confirmation.** Parse any selected flow `@param` headers and ask for values before driving. Default platform: both iOS and Android.

4. Run the **Capture loop** for each approved platform.

5. **Report** - see [Handoff](#handoff).

### Mode B - Custom flow

Trigger: user describes a flow inline ("record signing in and creating an expense").

1. Treat the user message as the intent prompt.
2. Ask which platforms (default: ask, do not assume both).
3. Run the **Capture loop** per platform.
4. **Report** - see [Handoff](#handoff).

## Capture loop (per platform)

Run once per requested platform. Lifecycle (`open`/`close`, Metro, boot) is fully delegated to `agent-device`.

1. **Detect bundle ID** - Expensify-specific, platform-aware:
   ```bash
   IS_HYBRID=$(scripts/is-hybrid-app.sh)
   # iOS: HybridApp dev build uses same bundle ID as production (Debug config, no .dev suffix)
   # Android: HybridApp dev build appends .dev suffix
   if [[ "$IS_HYBRID" == "true" ]]; then
     IOS_APP_ID="com.expensify.expensifylite"
     ANDROID_APP_ID="org.me.mobiexpensifyg.dev"
   else
     IOS_APP_ID="com.expensify.chat.dev"
     ANDROID_APP_ID="com.expensify.chat.dev"
   fi
   APP_ID=$([[ "$PLATFORM" == "ios" ]] && echo "$IOS_APP_ID" || echo "$ANDROID_APP_ID")
   ```

2. **Start Metro** via `agent-device` (starts or reuses - no manual `npm run start`):
   ```bash
   agent-device metro prepare --public-base-url http://localhost:8081
   ```

3. **Compose preamble flows** - list available macro flow metadata (`@pre`, `@param`):
   ```bash
   grep -H '^# @\(pre\|param\)' .claude/skills/agent-device/flows/macros/*.ad
   ```
   Preamble is replayed silently before recording starts and does **not** appear in the output MP4. Use macro flows from `flows/macros/` for preamble setup unless the user explicitly asks to run a critical test flow first.

4. **Set up artifact path:**
   ```bash
   ARTIFACT_DIR="$(mktemp -d -t agent-device-pr-media.XXXX)"
   PLATFORM=ios   # or android
   OUT="$ARTIFACT_DIR/${PLATFORM}-native.mp4"
   ```

5. **Pick target device** - prefer already-booted to avoid boot wait:
   ```bash
   agent-device devices
   ```
   Use the first `booted=true` simulator for the target platform. If none are booted, let `agent-device open` boot the default.

6. **Open the app** (`agent-device open` handles simulator boot + app launch):
   ```bash
   agent-device open "$APP_ID" --device "<booted-device-name>"
   ```
   If `open` fails because the app isn't installed, **STOP** - surface: "Dev build not installed. Run `npm run ios` (HybridApp) or `npm run ios-standalone` (standalone) first."

7. **Resolve preamble parameters** - before replaying each preamble flow, parse its `@param` headers and ask the user for missing values. Build explicit `-e KEY=VALUE` args per flow.

8. **Replay preamble flows** identified in step 3 using explicit `-e` args from step 7. These run **before** recording starts and must not appear in the output MP4.

9. **Start recording** - only after preamble completes and app is in the test starting state:
   ```bash
   agent-device record start "$OUT" --fps 24
   ```

10. **Drive the test flow** using the agent-device autonomous loop (snapshot -> match selector -> tap/fill). For each step from the Tests section: navigate to the expected state, verify the outcome, then continue. If a step is ambiguous, **pause and ask** - do not improvise.

   > Android note: `adb screenrecord` has a 3-minute hard cap. If the flow is expected to exceed that, warn the user before starting.

11. **Stop recording:**
   ```bash
   agent-device record stop
   ```

12. **Close the session:** `agent-device close`

13. **Verify artifact:**
    ```bash
    test -s "$OUT" && file "$OUT" || echo "MISSING or empty: $OUT"
    ```
    If 0-byte or missing, retry once. If still failing, stop and report the error.

14. Repeat for the next platform.

## Handoff

After all platforms are recorded, report the local file paths:

```
iOS:     /tmp/agent-device-pr-media.XXXX/ios-native.mp4
Android: /tmp/agent-device-pr-media.XXXX/android-native.mp4
```

Drag and drop each file into the PR's Screenshots/Videos section on GitHub - it auto-uploads and generates the embed URL.

## Error handling

| Situation | Action |
| --- | --- |
| Tests section is empty/boilerplate | Stop. Ask for explicit flow (Mode B). |
| Step ambiguous mid-flow | Pause, snapshot, ask to disambiguate. Do not guess. |
| `agent-device open` fails - app not installed | Stop. Tell user to run `npm run ios` or `npm run ios-standalone` first. |
| `record stop` produces 0-byte file | Retry once. If still empty, report error. |
| Android flow expected > 3 min | Warn user before starting - recording will be silently truncated at 3 min. |
| User asks for mWeb or Desktop | Decline; suggest browser-driver skill. |

## Non-goals

- Starting Metro via `npm run start` or any raw shell command - use `agent-device metro prepare`
- Booting simulators via `xcrun simctl` - `agent-device open` handles this
- Installing the dev build - out of scope; user must have it installed before invoking this skill
- Uploading media anywhere (GitHub releases, user-attachments, Loom, etc.)
- Editing the PR body
- Capturing preamble flows in the output MP4
- Mechanical translation of ambiguous Tests prose - agent pauses and asks
