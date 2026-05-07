---
name: agent-device-pr-media
description: Records iOS/Android native MP4 evidence for an Expensify PR's `### Tests` section flows. Use when the user asks to "record the flow for PR #X", "capture mobile evidence for PR X", or "produce screenshots/videos for PR X". Mobile-native only - declines mWeb and Desktop.
allowed-tools: Bash(agent-device *) Bash(gh pr view *) Bash(gh pr diff *) Bash(mkdir -p *) Bash(rm -rf *) Bash(ls *) Bash(file *) Bash(test *) Bash(date *) Read Write
---

# agent-device-pr-media

Records `iOS: Native` and `Android: Native` MP4 evidence for an Expensify PR's `### Tests` section. Specializes the [`agent-device`](../agent-device/SKILL.md) skill: delegates device lifecycle (bundle ID, Metro, device pick, session, open) to its [Bring-up](../agent-device/SKILL.md#bring-up), then captures one artifact per declared test flow per platform, writes a JSON manifest, and surfaces local file paths.

The skill is **autonomous and non-interactive**. It never pauses for user input mid-run. All inputs are provided at invocation time; all failures surface as structured errors with exit codes.

HybridApp-only (the parent skill's pre-flight enforces this). Standalone (non-HybridApp) builds are out of scope - production mobile evidence runs against HybridApp.

## Scope

**In scope:** `iOS: Native` (iOS Simulator), `Android: Native` (Android Emulator), HybridApp dev build only.

**Out of scope:** `Android: mWeb Chrome`, `iOS: mWeb Safari`, `MacOS: Chrome / Safari`. Decline with `EXIT 4` and point to a browser-driver skill (`playwright-app-testing`). Standalone (non-HybridApp) builds. Decline with `EXIT 7 NO_BUILD` per the parent skill's gate.

## Inputs

| Input | Source | Required |
| --- | --- | --- |
| PR number or URL | First positional arg | Yes |
| `--platforms ios,android` | Flag | No (default: derived) |
| `-e KEY=VALUE` step-param overrides | Repeatable | No |

No interactive prompts. Missing inputs that cannot be defaulted hard-fail.

## Triage gates (run in order, before any device work)

1. **Fetch PR** - `gh pr view <num> --json title,body` and `gh pr diff <num> --name-only`.
2. **Runtime-code gate** - if every changed path matches `^(\.claude/|docs/|.*\.md$|\.github/)`, **exit `2 SKIP: no runtime code changed`**. The skill does not record docs/skill-only PRs.
3. **Platform resolution** - in priority order:
   1. `--platforms` arg (CSV, wins all).
   2. Explicit prose markers in PR title or `### Tests` body: `iOS only`, `Android only`, `On iOS:`, `On Android:`. Restrict to that platform if found.
   3. Default: both `ios` and `android`.

   If the resolved set requests an out-of-scope platform (e.g. `mweb`), **exit `4 PLATFORM_UNSUPPORTED`**.
4. **Tests parsing** - extract `### Tests` content; produce a flow list (see below). If the flow list is empty after stripping, **exit `3 NO_FLOWS`**.

## Tests parsing rules

The **only hard rule**: tests live under the `### Tests` heading. Everything inside it varies wildly across authors - single numbered list, multiple numbered lists with restarts, h4 sub-headers, prose paragraphs, "N/A", or empty. Do not mechanically parse it; let the LLM interpret structure.

Operating on the `### Tests` block of the PR body:

1. **Strip the boilerplate** "Verify that no errors appear in the JS console" line wherever it appears.
2. **Strip trailing checklist metadata** (`- [x] ...` blocks).
3. **LLM-driven flow segmentation.** Pass the stripped section to the LLM and ask it to return a list of distinct test flows: `[{title, precondition?, steps[]}, ...]`. Signals it may use (all optional, none required - the LLM picks whichever apply to the input):
   - Explicit separators: `#### Test case N:` / `## ...` headers, `---` rules.
   - Numbered-list restarts (a fresh `1.` after a `5.` typically signals a new flow).
   - Prose markers: "Test case N:", "Repeat with...", "Then test...", "Now do...".
   - State-change indicators: "Sign out, then ...", "On a fresh session, ...".
   - Any per-author writing pattern when nothing explicit is present.

   When the LLM finds a single coherent flow, the whole section is one flow. When it finds N, it produces N. The skill does not enforce a particular separator convention.
4. **Per flow** (LLM returns these fields):
   - `title` - short label (header text if present, or LLM-summarized intent).
   - `precondition` - free-form setup metadata if the author provided one (e.g. "Account has no workspace.", "Enable Invoices in workspace settings.").
   - `steps[]` - the numbered/listed items belonging to this flow, with nested `a/b/c` sub-items flattened into the parent.
5. **Single-step verify-only classification**: if a flow has exactly one step whose intent is purely a `Verify|Confirm|Check` (no preceding action), set `kind: still`. Otherwise `kind: video`. The LLM makes this call too - no leading-verb regex.
6. **Step interpretation is also LLM-driven, not parsed.** Each step's text is passed verbatim to the agent-device driver, which decides per-step whether it's a tap, fill, navigation, or assertion. If the driver cannot interpret a step, that step (and the rest of the flow) hard-fails - no fallback to coordinates, no skipping.

If the LLM returns an empty flow list (Tests was prose-only, "N/A", "We'll test it live", or empty after stripping), exit `3 NO_FLOWS`.

## Capture loop (per flow per platform)

Two phases per flow. Lifecycle delegated to the parent skill's bring-up.

### Shared setup (run once per platform, before the first flow)

1. **Run the [agent-device bring-up](../agent-device/SKILL.md#bring-up)** for the target platform. The parent skill resolves bundle ID, starts Metro, picks/confirms the device, manages session, and opens the app for sanity verification. Capture the resolved `$APP_ID` (bundle ID) and `$DEVICE_NAME` for re-opens in Phases 1 and 2.
   - If the bring-up's HybridApp gate fails or the dev build is not installed, **exit `7 NO_BUILD`** with the parent skill's install instructions.
   - Selector discipline (id > role+label, no coordinate fallback unless 0 a11y nodes) follows the parent skill's [`flows/README.md`](../agent-device/flows/README.md).

2. **Close the bring-up session** so each phase starts cold:
   ```bash
   agent-device close
   ```

3. **Set up run directory** - persistent cache, latest-run-wins:
   ```bash
   PR_NUM=<num>; RUN_TS=$(date -u +%Y%m%dT%H%M%SZ)
   RUN_DIR="$HOME/.cache/agent-device-pr-media/$PR_NUM/$RUN_TS"
   mkdir -p "$RUN_DIR/ios" "$RUN_DIR/android"
   # Optional: rm -rf prior runs for this PR before mkdir to keep disk lean
   ```

### Phase 1 - Warm-up (per flow, no camera)

Goal: produce a deterministic `.ad` script of the successful command sequence, plus per-step still candidates. Drives autonomously from cold start. No recording.

1. **Open the app** with the bring-up's resolved values:
   ```bash
   agent-device open "$APP_ID" --device "$DEVICE_NAME"
   ```

2. **Drive setup actions** based on the flow's `Precondition:` block (if any) and what the steps imply. Setup actions go into the `.ad` script up to the marker; everything after the marker is what Phase 2 records.

3. **Drive the test flow** - one numbered step at a time. For each step:
   - Send the step text verbatim to the agent-device LLM driver.
   - On success, append the **final, successful** action to `$TEST_FLOW.ad`. Do not append actions that needed retries on different selectors.
   - **If a value is explicit in the step** (e.g. "Enter $42.50"), pass it through verbatim. **If not**, the LLM picks a context-appropriate value and the chosen value is recorded in `params:` in the manifest.
   - The post-action `agent-device snapshot` (taken for selector matching) is **saved as a candidate still** - `flow-<id>-step-<n>-<label>.png`. Free side-effect.

4. **Verify final state** - `agent-device is exists "<selector>"` on the post-condition implied by the last step.

5. **Close session** - `agent-device close`.

6. **Sanity-check** the script is non-empty:
   ```bash
   test -s "$TEST_FLOW.ad" || { record per-flow status "phase1_failed: empty script"; continue }
   ```

### Phase 2 - Recording (per flow, deterministic replay)

Goal: clean MP4 of only the test-flow steps. No snapshots on camera, no retries, no LLM thinking time.

1. **Open the app fresh** with the bring-up's resolved values:
   ```bash
   agent-device open "$APP_ID" --device "$DEVICE_NAME"
   ```

2. **Replay setup silently** - everything in the `.ad` script up to the marker. Off-camera. The app reaches the test starting state.

3. **Start recording**:
   ```bash
   agent-device record start "$RUN_DIR/$PLATFORM/flow-$ID.mp4" --fps 24
   ```

   > Android: `adb screenrecord` has a 3-min hard cap. Per-flow MP4s rarely hit this; if a flow exceeds, mark `status: phase2_failed` and continue.

4. **Replay test-flow portion**:
   ```bash
   agent-device replay "$TEST_FLOW.ad" --from-marker
   ```

5. **Stop recording**:
   ```bash
   agent-device record stop
   ```

6. **Close session** - `agent-device close`.

7. **Verify artifact**:
   ```bash
   test -s "$RUN_DIR/$PLATFORM/flow-$ID.mp4" && file "$RUN_DIR/$PLATFORM/flow-$ID.mp4" \
     || { mark phase2_failed; continue }
   ```

### Multi-flow chunking

Multiple flows in one PR share a single Phase 2 session (one `agent-device open` + replay-to-marker), with `record start` / `record stop` per flow. State carries between flows unless Phase 1 flagged `requires_cold_start: true` for a flow, in which case Phase 2 closes and re-opens before that flow.

### Single-step verify-only flows

For flows classified `kind: still`:
- Phase 1 still drives autonomously to the verification screen.
- Phase 2 opens fresh, replays setup, takes one screenshot at the verification screen via `agent-device screenshot`, and writes `flow-<id>.png`. No `record start`/`stop`.

## Output

### Cache layout

```
~/.cache/agent-device-pr-media/<pr-num>/<run-ts>/
├── manifest.json
├── ios/
│   ├── flow-1.mp4
│   ├── flow-1-step-2-tap-signin.png
│   ├── flow-2.png   (still-only flow)
│   └── ...
└── android/
    └── ...
```

Cache is persistent across reboots. The skill purges prior runs for the same PR at the start of each new run (latest-run-wins; no concurrent locking; single-user assumption).

### Manifest schema

`manifest.json` at the run root:

```json
{
  "pr": 89475,
  "title": "<PR title>",
  "platforms_requested": ["ios", "android"],
  "platforms_run": ["ios", "android"],
  "skipped": null,
  "flows": {
    "ios": [
      {
        "id": 1,
        "title": "Test case 1: ...",
        "kind": "video",
        "path": "ios/flow-1.mp4",
        "stills": ["ios/flow-1-step-2-tap-signin.png"],
        "status": "ok",
        "warnings": [],
        "params": {"email": "test+ci-89475-1@expensify.com"}
      }
    ],
    "android": [...]
  }
}
```

`status` is one of: `ok`, `phase1_failed`, `phase2_failed`, `skipped_after_failure`.

### Handoff

After all platforms, the skill prints the run directory and lists per-flow paths. The user drags each artifact into the PR's `### Screenshots/Videos` section. The skill never edits the PR.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | All applicable flows produced an artifact (or the run was best-effort with at least one usable artifact; per-flow status reflects reality). |
| `2` | `SKIP: no runtime code changed` - PR diff is entirely docs/skills/CI metadata. |
| `3` | `NO_FLOWS` - Tests section unparseable or empty after stripping. |
| `4` | `PLATFORM_UNSUPPORTED` - mWeb / Desktop requested. |
| `5` | `PHASE1_TOTAL_FAILURE` - every flow failed Phase 1. |
| `6` | `PHASE2_TOTAL_FAILURE` - every flow failed Phase 2 despite Phase 1 success. |
| `7` | `NO_BUILD` - `agent-device open` failed because the dev build is not installed. |

## Cost guards

| Cap | Value |
| --- | --- |
| Phase 1 timeout | 5 min per flow |
| Phase 2 timeout | 3 min per flow (Android cap) |
| Max driver actions | 50 per flow |

Hitting any cap marks the flow `phase1_failed` / `phase2_failed` and proceeds to the next flow.

## Error handling

| Situation | Action |
| --- | --- |
| `### Tests` section missing or empty | Exit `3 NO_FLOWS` |
| Only docs/skill paths changed | Exit `2 SKIP` |
| mWeb / Desktop requested | Exit `4 PLATFORM_UNSUPPORTED` |
| Bring-up fails (HybridApp gate, missing dev build, Metro start, etc.) | Surface parent skill's error verbatim; exit `7 NO_BUILD` |
| Phase 1 step uninterpretable by LLM | Mark flow `phase1_failed`, log the step that failed, continue to next flow |
| Phase 1 a11y empty (0 nodes) on a screen | Use coordinate fallback; log `warnings: ["a11y_fallback:<screen>"]` |
| Phase 1 `$TEST_FLOW.ad` empty after warm-up | Mark flow `phase1_failed`, continue |
| Phase 2 `replay` fails on a step | Selector drift between Phase 1 and Phase 2; mark flow `phase2_failed`, continue |
| `record stop` produces 0-byte file | Retry Phase 2 once for that flow; if still empty, mark `phase2_failed` |
| Android flow exceeds 3-min cap | Mark `phase2_failed`, continue (per-flow MP4s should rarely hit this; if they do, the Tests section is too coarse-grained) |

## Non-goals

- Mobile web (`iOS: mWeb Safari`, `Android: mWeb Chrome`) and Desktop (`MacOS: Chrome / Safari`) - belong in `playwright-app-testing` or a future browser-driver skill.
- Standalone (non-HybridApp) builds - parent skill is HybridApp-only and this specialization inherits the gate. Production mobile evidence runs against HybridApp.
- Device lifecycle (Metro, simulator boot, bundle ID resolution, session reuse, app install verification) - fully delegated to the parent skill's [Bring-up](../agent-device/SKILL.md#bring-up). This skill does not call `agent-device metro prepare`, `xcrun simctl`, or `is-hybrid-app.sh` directly.
- S3 / R2 / GitHub artifact upload - deferred to Melvin (the eventual CI caller).
- Editing the PR body or posting PR comments - the skill only writes local files.
- Macro composition from `flows/macros/*.ad` - Phase 1 drives setup autonomously; no `@provides`/`@pre` graph, no fixed registry.
- Interactive prompts of any kind. CI is the eventual host; the skill must run end-to-end without human input.
- Test data cleanup. Accounts/expenses/workspaces created during runs accumulate; rely on periodic test-account reset.
