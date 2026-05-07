---
name: agent-device-evidence
description: Records iOS/Android native MP4 evidence for test/repro flows extracted from an Expensify GitHub PR or issue. Use when the user asks to "record the flow for PR #X", "capture mobile evidence for issue #Y", or "produce screenshots/videos for <PR or issue URL>". Mobile-native only - declines mWeb and Desktop.
allowed-tools: Bash(agent-device *) Bash(gh pr view *) Bash(gh issue view *) Bash(gh api *) Bash(mkdir -p *) Bash(rm -rf *) Bash(ls *) Bash(file *) Bash(test *) Bash(date *) Read Write
---

# agent-device-evidence

Records `iOS: Native` and `Android: Native` MP4 evidence for the test or repro steps declared in an Expensify GitHub **PR or issue**. The source of truth is the test/repro steps themselves, not the surrounding code or context - the skill works equally well on a PR's `### Tests` section, an issue's `## Action Performed:` block, or any future Markdown body where steps are clearly authored.

Specializes the [`agent-device`](../agent-device/SKILL.md) skill: delegates device lifecycle (bundle ID, Metro, device pick, session, open) to its [Bring-up](../agent-device/SKILL.md#bring-up), then captures one artifact per declared flow per platform, writes a JSON manifest, and surfaces local file paths.

The skill is **autonomous and non-interactive**. It never pauses for user input mid-run. All inputs are provided at invocation time; all failures surface as structured errors with exit codes.

HybridApp-only (the parent skill's pre-flight enforces this). Standalone (non-HybridApp) builds are out of scope - production mobile evidence runs against HybridApp.

## Scope

**In scope:** `iOS: Native` (iOS Simulator), `Android: Native` (Android Emulator), HybridApp dev build only. Inputs may come from PRs or issues - the skill does not gate on code changes.

**Out of scope:** `Android: mWeb Chrome`, `iOS: mWeb Safari`, `iOS: mWeb Chrome`, `Windows: Chrome`, `MacOS: Chrome / Safari`. Decline with `EXIT 4` and point to a browser-driver skill (`playwright-app-testing`). Standalone (non-HybridApp) builds. Decline with `EXIT 7 NO_BUILD` per the parent skill's gate.

## Inputs

| Input | Source | Required |
| --- | --- | --- |
| Source URL (PR or issue) | First positional arg, e.g. `https://github.com/Expensify/App/pull/89475` or `.../issues/89855` | Yes |
| `--platforms ios,android` | Flag | No (default: derived) |
| `-e KEY=VALUE` step-param overrides | Repeatable | No |
| `--no-cache` | Flag | No (default: cache enabled) - forces fresh Phase 1, bypasses `.ad` cache |
| `--cache-clear` | Flag | No - wipes the entire `.ad` cache before running |

Bare numbers are rejected (PRs and issues share the GitHub number namespace; the URL path is the safe disambiguator). No interactive prompts.

## Triage gates (run in order, before any device work)

1. **Detect source kind** from the URL: `/pull/N` → PR, `/issues/N` → issue. Anything else → exit `8 BAD_INPUT`.
2. **Fetch the source body**:
   - PR: `gh pr view <num> --json title,body`
   - Issue: `gh issue view <num> --json title,body,labels`
3. **Platform resolution** - in priority order:
   1. `--platforms` arg (CSV, wins all).
   2. **PR source**: explicit prose markers in title or `### Tests` body - `iOS only`, `Android only`, `On iOS:`, `On Android:`.
   3. **Issue source**: the `## Platforms:` checkbox list. Filled boxes denote where the bug reproduces; restrict to the matching native platforms.
   4. Default: both `ios` and `android`.

   Aliases: `iOS: Native` ≡ `iOS: App` (both → `ios`); `Android: Native` ≡ `Android: App` (both → `android`). All mWeb / Windows / MacOS variants are out of scope.

   If the only platforms matched are out of scope (e.g. an issue checks only `MacOS: Chrome / Safari`), **exit `4 PLATFORM_UNSUPPORTED`**.
4. **Steps parsing** - extract the steps section and produce a flow list (see below). If the flow list is empty, **exit `3 NO_FLOWS`**.

## Steps parsing rules

The **only hard rule**: steps live in a Markdown body. Where they live within that body depends on the source kind, and what counts as "structure" inside the steps section varies wildly across authors.

### Section anchor (heuristic, with fallback)

Strip the body to the steps section using a list of known headings, in order:

| Source | Anchor (in priority order) |
| --- | --- |
| PR | `### Tests`, `### Test`, `## Tests` |
| Issue | `## Action Performed:`, `## Repro`, `## Steps to reproduce`, `## Reproduction Steps` |

If no anchor matches, pass the **whole body** to the LLM and ask it to find the steps. The anchor list is a hint to reduce token cost on the 99% case, not a hard contract.

Stop the section at the next equal-or-higher heading (e.g. for issues, `## Expected Result:` ends the steps section). Strip trailing GitHub-template footers (Upwork automation block, contributing-guide preamble, `## Workaround:`, `## Screenshots/Videos`).

### Boilerplate stripping

- "Verify that no errors appear in the JS console" line - strip wherever it appears.
- Trailing `- [x] ...` checklist blocks - strip.
- Preamble metadata blocks (`**Version Number:** ...`, `**Device used:** ...`, etc.) - strip.

### Flow segmentation (LLM-driven)

Pass the stripped section to the LLM and ask it to return a list of flows: `[{title, precondition?, steps[]}, ...]`. Signals it may use (all optional - the LLM picks whichever apply):

- Explicit separators: `#### Test case N:` / `## ...` headers, `---` rules.
- Numbered-list restarts (a fresh `1.` after a `5.` typically signals a new flow).
- Prose markers: "Test case N:", "Repeat with...", "Then test...", "Now do...".
- State-change indicators: "Sign out, then ...", "On a fresh session, ...".

**Issues are typically single-flow.** Bug reports describe one repro path. The LLM should return one flow for an issue body unless it sees explicit multi-scenario structure (rare).

When the LLM finds a single coherent flow, the whole section is one flow. When it finds N, it produces N.

### Per flow

The LLM returns these fields:

- `title` - short label (header text if present, or LLM-summarized intent).
- `precondition` - free-form setup metadata if the author provided one (e.g. "Account has no workspace.", "Log in with Expensifail account.").
- `steps[]` - the numbered/listed items belonging to this flow, with nested `a/b/c` sub-items flattened into the parent.
- `expected` (issues only) - free-form expected outcome from the issue's `## Expected Result:` block. The driver MAY use this as a final-state assertion target after the flow drives.

### Single-step verify-only classification

If a flow has exactly one step whose intent is purely a `Verify|Confirm|Check` (no preceding action), set `kind: still`. Otherwise `kind: video`. LLM judgment, not regex.

### Step interpretation

Each step's text is passed verbatim to the agent-device driver, which decides per-step whether it's a tap, fill, navigation, or assertion. If the driver cannot interpret a step, that step (and the rest of the flow) hard-fails.

If the LLM returns an empty flow list (body was prose-only, "N/A", "We'll test it live", or empty after stripping), exit `3 NO_FLOWS`.

## Phase 1 cache (skip warm-up when flow text is unchanged)

Phase 1 is the expensive part - it runs the LLM-driven exploration loop to produce a deterministic `.ad` script. Phase 2 is just `agent-device replay` and is cheap. When a flow's text and target environment are identical to a prior run's, reuse the cached `.ad` and skip Phase 1 entirely.

### Cache layout

```
~/.cache/agent-device-evidence/.ad-cache/
├── <fingerprint>.ad         # the cached Phase 1 script
└── <fingerprint>.meta.json  # {created_ts, original_pr, last_used_ts, hits}
```

Content-addressable, **shared across PRs**. Two PRs whose Tests sections both contain the same "Sign in and create an expense" flow share the same cache entry.

### Cache key

```
fingerprint = sha256(
  flow.precondition  ||  "" +
  json(flow.steps)              +
  platform                      +
  bundle_id                     +
  agent_device_version
)
```

Fields included by design:
- **`flow.steps`** - if the steps change at all, the fingerprint changes. This is the primary correctness signal.
- **`flow.precondition`** - drives setup behavior; affects what the `.ad` script contains.
- **`platform`** - iOS and Android need separate scripts (different selectors).
- **`bundle_id`** - HybridApp vs standalone (and dev vs prod) render differently.
- **`agent_device_version`** - replay semantics can change between CLI versions; pinning to the running version protects against subtle drift.

Fields NOT included (intentionally):
- **`flow.title`** - human-readable label only; doesn't affect actions.
- **PR number / SHA** - we want sharing across PRs. Correctness is enforced at replay time, not at lookup time.
- **App build SHA** - hard to extract reliably; relying on Phase 2 self-healing instead (see below).

### Lookup, write, invalidate

For each flow, in order:

1. **Compute fingerprint** from flow + platform + bundle_id + CLI version.
2. **Look up** `~/.cache/agent-device-evidence/.ad-cache/<fingerprint>.ad`:
   - **Hit** (and `--no-cache` is not set): copy cached `.ad` to `$TEST_FLOW.ad`, mark `cache: "hit"` in the manifest, **skip Phase 1 entirely**, proceed to Phase 2.
   - **Miss** (or `--no-cache`): mark `cache: "miss"`, run Phase 1 normally.
3. **On Phase 1 success** (cache miss path): write `$TEST_FLOW.ad` to the cache, write `<fingerprint>.meta.json` with `{created_ts, original_pr, hits: 1}`.
4. **On Phase 2 replay failure** (cache hit path only): the cached script is stale (UI changed under it). Delete the cache entry, mark the flow `cache: "invalidated"`, re-run Phase 1 fresh, retry Phase 2 once. If the retry still fails, mark `phase2_failed`.
5. **On Phase 2 success** (cache hit path): bump `last_used_ts` and increment `hits` in the meta file.

## Capture loop (per flow per platform)

Two phases per flow. Lifecycle delegated to the parent skill's bring-up. Phase 1 is skipped on cache hit (see above).

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
   RUN_DIR="$HOME/.cache/agent-device-evidence/$PR_NUM/$RUN_TS"
   mkdir -p "$RUN_DIR/ios" "$RUN_DIR/android"
   # Optional: rm -rf prior runs for this PR before mkdir to keep disk lean
   ```

### Phase 1 - Warm-up (per flow, no camera)

Goal: produce a deterministic `.ad` script of the successful command sequence, plus per-step still candidates. Drives autonomously from cold start. No recording.

**Skip if cached.** Before any device work, consult the [Phase 1 cache](#phase-1-cache-skip-warm-up-when-flow-text-is-unchanged). On cache hit, copy the cached `.ad` to `$TEST_FLOW.ad`, log `cache: "hit"` to the manifest, and proceed straight to Phase 2 for this flow.

On cache miss (or `--no-cache`):

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

7. **Write to cache** - on success, copy `$TEST_FLOW.ad` to `~/.cache/agent-device-evidence/.ad-cache/<fingerprint>.ad` and write the meta sidecar.

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

**On Phase 2 replay failure (cache hit path only):** the cached `.ad` is stale. Delete `<fingerprint>.ad` and `<fingerprint>.meta.json`, mark `cache: "invalidated"`, re-run Phase 1 fresh, and retry Phase 2 once. If the retry still fails, mark `phase2_failed`. (Cache miss path failures don't trigger a retry - the freshly generated `.ad` failed on its own first replay, so retrying will hit the same problem.)

### Multi-flow chunking

Multiple flows in one PR share a single Phase 2 session (one `agent-device open` + replay-to-marker), with `record start` / `record stop` per flow. State carries between flows unless Phase 1 flagged `requires_cold_start: true` for a flow, in which case Phase 2 closes and re-opens before that flow.

### Single-step verify-only flows

For flows classified `kind: still`:
- Phase 1 still drives autonomously to the verification screen.
- Phase 2 opens fresh, replays setup, takes one screenshot at the verification screen via `agent-device screenshot`, and writes `flow-<id>.png`. No `record start`/`stop`.

## Output

### Run-output layout

```
~/.cache/agent-device-evidence/
├── .ad-cache/                            # cross-source Phase 1 cache (see "Phase 1 cache")
│   ├── <fingerprint>.ad
│   └── <fingerprint>.meta.json
└── <source-kind>-<source-num>/           # per-source run output, e.g. pr-89475/ or issue-89855/
    └── <run-ts>/
        ├── manifest.json
        ├── ios/
        │   ├── flow-1.mp4
        │   ├── flow-1-step-2-tap-signin.png
        │   ├── flow-2.png   (still-only flow)
        │   └── ...
        └── android/
            └── ...
```

Run output is persistent across reboots. The skill purges prior runs for the same source at the start of each new run (latest-run-wins; no concurrent locking; single-user assumption). The `.ad-cache/` directory is **not** purged on per-source runs - it's shared across sources and self-heals on Phase 2 replay failure.

### Manifest schema

`manifest.json` at the run root:

```json
{
  "source": {
    "kind": "pr",
    "number": 89475,
    "url": "https://github.com/Expensify/App/pull/89475",
    "title": "<source title>"
  },
  "platforms_requested": ["ios", "android"],
  "platforms_run": ["ios", "android"],
  "flows": {
    "ios": [
      {
        "id": 1,
        "title": "Test case 1: ...",
        "kind": "video",
        "path": "ios/flow-1.mp4",
        "stills": ["ios/flow-1-step-2-tap-signin.png"],
        "expected": "App will show error when creating new agent without name.",
        "status": "ok",
        "cache": "hit",
        "fingerprint": "a3f9b2c4...",
        "warnings": [],
        "params": {"email": "test+ci-89475-1@expensify.com"}
      }
    ],
    "android": [...]
  }
}
```

`source.kind` is `"pr"` or `"issue"`. `expected` is populated for issues (from `## Expected Result:`); absent for PRs. `status` is one of: `ok`, `phase1_failed`, `phase2_failed`, `skipped_after_failure`. `cache` is one of: `"hit"` (cached `.ad` reused, Phase 1 skipped), `"miss"` (no cache, Phase 1 ran fresh), `"invalidated"` (cache hit but Phase 2 replay failed; entry deleted, Phase 1 re-ran fresh, Phase 2 retried), `"bypassed"` (`--no-cache` flag).

### Handoff

After all platforms, the skill prints the run directory and lists per-flow paths. The user drags each artifact into the PR's `### Screenshots/Videos` section (or attaches to the issue, depending on source). The skill never edits the source.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | All applicable flows produced an artifact (or the run was best-effort with at least one usable artifact; per-flow status reflects reality). |
| `3` | `NO_FLOWS` - steps section unparseable or empty after stripping. |
| `4` | `PLATFORM_UNSUPPORTED` - mWeb / Desktop / Windows requested or only out-of-scope platforms checked on the source. |
| `5` | `PHASE1_TOTAL_FAILURE` - every flow failed Phase 1. |
| `6` | `PHASE2_TOTAL_FAILURE` - every flow failed Phase 2 despite Phase 1 success. |
| `7` | `NO_BUILD` - `agent-device open` failed because the dev build is not installed. |
| `8` | `BAD_INPUT` - source URL is missing, malformed, or not a recognised PR/issue URL. |

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
| Source URL missing or not a recognised PR/issue URL | Exit `8 BAD_INPUT` |
| Steps section missing or empty (PR `### Tests` / issue `## Action Performed:`) | Exit `3 NO_FLOWS` |
| Only out-of-scope platforms checked on issue (e.g. `MacOS: Chrome / Safari` only) | Exit `4 PLATFORM_UNSUPPORTED` |
| mWeb / Desktop / Windows explicitly requested via `--platforms` | Exit `4 PLATFORM_UNSUPPORTED` |
| Bring-up fails (HybridApp gate, missing dev build, Metro start, etc.) | Surface parent skill's error verbatim; exit `7 NO_BUILD` |
| Phase 1 step uninterpretable by LLM | Mark flow `phase1_failed`, log the step that failed, continue to next flow |
| Phase 1 a11y empty (0 nodes) on a screen | Use coordinate fallback; log `warnings: ["a11y_fallback:<screen>"]` |
| Phase 1 `$TEST_FLOW.ad` empty after warm-up | Mark flow `phase1_failed`, continue |
| Phase 2 `replay` fails on a step (cache hit path) | Cached `.ad` is stale - delete cache entry, mark `cache: "invalidated"`, re-run Phase 1, retry Phase 2 once. If still failing, mark `phase2_failed`. |
| Phase 2 `replay` fails on a step (cache miss path) | Selector drift between Phase 1 and Phase 2; mark flow `phase2_failed`, continue. No retry - Phase 1 just ran fresh, retrying would hit the same problem. |
| `record stop` produces 0-byte file | Retry Phase 2 once for that flow; if still empty, mark `phase2_failed` |
| Android flow exceeds 3-min cap | Mark `phase2_failed`, continue (per-flow MP4s should rarely hit this; if they do, the Tests section is too coarse-grained) |

## Non-goals

- Mobile web (`iOS: mWeb Safari`, `Android: mWeb Chrome`) and Desktop (`MacOS: Chrome / Safari`) - belong in `playwright-app-testing` or a future browser-driver skill.
- Standalone (non-HybridApp) builds - parent skill is HybridApp-only and this specialization inherits the gate. Production mobile evidence runs against HybridApp.
- Device lifecycle (Metro, simulator boot, bundle ID resolution, session reuse, app install verification) - fully delegated to the parent skill's [Bring-up](../agent-device/SKILL.md#bring-up). This skill does not call `agent-device metro prepare`, `xcrun simctl`, or `is-hybrid-app.sh` directly.
- Editing the PR body or posting PR comments - the skill only writes local files.
- Interactive prompts of any kind. CI is the eventual host; the skill must run end-to-end without human input.
- Test data cleanup. Accounts/expenses/workspaces created during runs accumulate; rely on periodic test-account reset.
