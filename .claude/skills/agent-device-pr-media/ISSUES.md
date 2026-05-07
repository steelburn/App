# agent-device-pr-media issues

## Resolved by v1 design (SKILL.md)

- ~~Skill pre-flight didn't inline Metro check - linked to agent-device skill instead, easy to skip~~ **RESOLVED**: pre-flight now runs `agent-device --version` inline. Metro start is the first step of shared setup, before `agent-device open`, with `agent-device metro prepare --public-base-url http://localhost:8081`.
- ~~App opened before Metro was running - got stuck on "No script URL provided"~~ **RESOLVED**: shared-setup ordering enforced (`metro prepare` before `open`).
- ~~Opened wrong bundle ID (`com.expensify.chat.dev`) - HybridApp build uses `org.me.mobiexpensifyg.dev`~~ **RESOLVED**: bundle-ID resolution wraps `scripts/is-hybrid-app.sh` and picks per-platform: HybridApp iOS `com.expensify.expensifylite`, HybridApp Android `org.me.mobiexpensifyg.dev`, standalone both `com.expensify.chat.dev`.
- ~~Skill didn't check `agent-device devices` for already-booted simulators - hardcoded device model~~ **RESOLVED**: device picker prefers `booted=true`, falls back to default. No hardcoded models.
- ~~iOS HybridApp dev bundle ID mistaken for Android-only `org.me.mobiexpensifyg.dev`~~ **RESOLVED**: explicit per-platform mapping documented in shared setup.
- ~~Recording too long: screenshot verification between every step added 3-4s dead time per action; coordinate-tap retries~~ **RESOLVED**: two-phase architecture (Phase 1 warm-up emits clean `.ad`; Phase 2 replays deterministically with no verification overhead, no retries on camera).
- ~~Recording should only start for the testing steps (skip setup if not needed)~~ **RESOLVED**: Phase 1 emits a marker between setup and test-flow portions; Phase 2 replays setup silently before `record start`, records only the post-marker portion.
- ~~PR handoff table snippet is unnecessary - users drag-and-drop the MP4 into GitHub's input field which auto-uploads and generates the URL~~ **RESOLVED**: skill prints local paths only. No table generation. PR mutation is explicitly out of scope (deferred to Melvin).
- ~~Sign-in flow `@desc` was skipped - used base email without `-e EMAIL=...+<9digits>` randomization, hitting suspended account~~ **RESOLVED (v1 scope)**: per-step explicit values pass through verbatim; otherwise the LLM context-guesses and logs the chosen value in `params:`. Preamble auth (sign-in credentials) is delegated to the underlying `agent-device` skill's preamble resolution, not this skill's responsibility.
- ~~Skill fell back to coordinate-based taps when a11y was dead - defeats the main advantage of agent-device~~ **PARTIALLY RESOLVED**: coordinate fallback is still permitted in Phase 1 (the two-phase architecture absorbs the brittleness - Phase 2 just replays what Phase 1 found), but each occurrence is logged as a manifest warning (`a11y_fallback:<screen>`). The "hard-block all coordinate fallbacks" purist option was rejected because it would render the skill unusable on hot paths like BigNumberPad until app a11y is fixed.

## Resolved by scope reduction

- ~~Mode B (free-form custom flow) muddied the contract~~ **RESOLVED**: Mode B dropped per @Julesssss review feedback. PR-driven only.
- ~~"Pause and ask the user" branches scattered through SKILL.md~~ **RESOLVED**: skill is autonomous and non-interactive by contract. All inputs are provided at invocation time; failures surface as structured exit codes.

## Known platform limitations (intentionally not addressed)

- **Native camera view returns 0 a11y nodes** - `AVCaptureSession` does not expose accessibility nodes. Platform limitation, not an app bug. Coordinate fallback path is the only option; behavior is logged as a manifest warning.
- **Custom RN screens with missing a11y props** (e.g. `BigNumberPad` / amount entry, possibly maps) - app-level a11y bugs that screen readers also can't describe. Skill encounters these via coordinate fallback and surfaces them as warnings, but does not auto-file issues. Manual triage stays a human responsibility.
- **Android `adb screenrecord` 3-minute hard cap** - per-flow MP4s rarely hit this in practice; flows that exceed it are marked `phase2_failed` rather than silently truncated.
- **Mobile-web and Desktop coverage** - explicitly out of scope. `agent-device` is native-only (iOS Simulator a11y + Android `uiautomator`); web in a real browser needs Playwright. Skill exits `4 PLATFORM_UNSUPPORTED` on those requests and points to `playwright-app-testing`.

## Known v1 limitations (deferred work)

- **Snapshot restore for faster intermediate prep**: v1 always replays setup silently before `record start` (always-fresh, slower). `xcrun simctl io booted saveState` (iOS) and Android emulator quicksave could speed up reruns dramatically but add staleness risk if backend evolves. Tracked as a follow-up.
- **CI runner provisioning**: skill is non-interactive *by contract* in v1, but actual CI hosting requires (a) a Mac runner with iOS Simulator, (b) Android emulator with KVM (Linux runner), (c) test-account credentials in a secret store, (d) Melvin wrapping. Belongs to the parent `integrate-agent-device-for-melvin` task, not this skill.
- **S3 / R2 upload + PR-body mutation**: deferred entirely to Melvin per @Julesssss review direction. Skill outputs local paths and a manifest; Melvin reads the manifest and uploads as it sees fit.
- **`agent-device` preamble auth contract**: skill assumes the underlying `agent-device` skill has a reliable way to resolve sign-in credentials in autonomous mode. If that contract weakens, Phase 1 setup gets flakier. Cross-skill coordination needed.
- **Concurrent runs / locking**: single-user assumption. Latest run wins. Two simultaneous runs against the same PR cache dir = undefined behavior.
- **Idempotency**: two runs on the same PR may produce different videos (LLM-driven Phase 1 may take different paths). Acceptable for PR evidence - demonstrates the flow works, byte-identity not required.
- **Test data accumulation**: accounts/expenses/workspaces created during runs accumulate in the test backend; rely on periodic test-account reset.
- **Self-demo path**: the skill's own PR (`#89475`) is `.claude/`-only but the skill no longer gates on code changes - it would parse the Tests section and try to drive whatever steps are there. Demo target choice should reflect what the steps actually exercise on the device.

## Convention adopted (v1)

- **`### Tests` is the only hard structural anchor.** Everything inside it is freeform - authors use single numbered lists, restarted numbered lists, h4 sub-headers, prose, "N/A", or leave it empty. The skill does **not** enforce a separator convention. Flow segmentation is LLM-driven; the LLM uses whatever signals are present (h4 headers, numbered restarts, prose markers like "Test case N:" / "Repeat with...", state-change cues). Sample (9 recent merged PRs, 2026-05-07): 0/9 used `#### Test case N:` headers - that convention exists (e.g. PR #89743) but is a minority pattern, not a default.
- **Platform restriction is opt-in** via PR title or Tests prose ("iOS only", "Android only", "On iOS:"). Default is both. No file-path heuristics, no PR-checklist parsing.
- **Per-flow artifact**: one MP4 per flow per platform (or one PNG for verify-only single-step flows). Not one big MP4.
- **Persistent cache**: `~/.cache/agent-device-pr-media/<pr-num>/<run-ts>/`. Survives reboots; latest-run-wins.

## Generalize input source: PR or issue (added 2026-05-07)

- **Removed**: the runtime-code gate. The skill no longer fetches `gh pr diff --name-only` and no longer skips PRs whose diff is `.claude/`-only / docs-only. The user's directive: test steps are the source of truth, not the surrounding code; the skill should be smart enough to extract them from whatever GitHub Markdown body it's pointed at.
- **Inputs broadened** from "PR number or URL" to "Source URL (PR or issue)". URL path disambiguates kind: `/pull/N` → PR, `/issues/N` → issue. Bare numbers rejected (PR/issue share namespace).
- **Source-aware parsing**:
  - PR body → anchor on `### Tests` (with `### Test`, `## Tests` fallbacks).
  - Issue body → anchor on `## Action Performed:` (with `## Repro`, `## Steps to reproduce`, `## Reproduction Steps` fallbacks).
  - No anchor match → pass whole body to LLM. The anchor list is a token-cost optimization, not a hard contract.
- **Issue platform-checklist is a real signal** (unlike PR's, where every box is always checked as "tested on"). The issue template's `## Platforms:` checkboxes denote where the bug reproduces. The platform resolver now uses this when the source is an issue. Aliases: `iOS: App` ≡ `iOS: Native`, `Android: App` ≡ `Android: Native`. mWeb / Windows / MacOS variants stay out of scope.
- **Issues are typically single-flow.** Bug reports describe one repro path. Multi-flow segmentation logic stays for PRs.
- **`expected` field added to per-flow manifest** (issues only) - populated from `## Expected Result:`. The driver MAY use it as a final-state assertion target.
- **New exit code `8 BAD_INPUT`** for malformed / non-PR-non-issue source URLs. Replaces the old exit `2 SKIP` behavior.
- **Run-output dir generalized** from `<pr-num>/` to `<source-kind>-<source-num>/` (e.g. `pr-89475/`, `issue-89855/`).
- **Skill name not yet aligned with broadened scope.** Directory + cache path + cross-links still say `agent-device-pr-media`. Rename to something like `agent-device-flow-evidence` or `agent-device-test-recorder` is a candidate follow-up.

Reference: https://github.com/Expensify/App/issues/89855 (and 6 other recent bug-tagged issues sampled 2026-05-07) - all follow the `## Action Performed:` + `## Expected Result:` + `## Platforms:` template consistently.

## Phase 1 cache (added 2026-05-07)

- **Problem**: Phase 1 (LLM-driven exploration) is the expensive part; Phase 2 is just `agent-device replay`. Re-running on a PR whose Tests steps haven't changed wastes Phase 1's full cost on every invocation.
- **Solution**: content-addressable `.ad` cache at `~/.cache/agent-device-pr-media/.ad-cache/<fingerprint>.ad`, shared across PRs.
- **Fingerprint** = `sha256(precondition + json(steps) + platform + bundle_id + agent_device_version)`. Title is excluded (label only). PR number / app SHA excluded so the cache shares across PRs; correctness enforced at replay time, not lookup time.
- **Self-healing**: on Phase 2 replay failure (cache hit path only), invalidate the entry, re-run Phase 1, retry Phase 2 once. Stale entries get evicted lazily as the underlying app changes.
- **Manifest**: per-flow `cache: "hit" | "miss" | "invalidated" | "bypassed"` and `fingerprint` so reviewers can see what was reused.
- **Overrides**: `--no-cache` (force fresh Phase 1) and `--cache-clear` (wipe before run).
- **Hygiene**: prune entries with `last_used_ts > 30d` at start of each run. No hard TTL.

## Composition refactor (Option A, applied 2026-05-06)

- **Device lifecycle delegated to parent skill's bring-up.** This skill no longer documents bundle-ID resolution, Metro prepare, device pick, session reuse, or the initial `agent-device open`. It calls [`agent-device` §Bring-up](../agent-device/SKILL.md#bring-up) once per platform and reuses the resolved `$APP_ID` / `$DEVICE_NAME` for Phase 1 / Phase 2 re-opens. Selector discipline references the parent skill's `flows/README.md` rather than re-stating it.
- **Standalone (non-HybridApp) builds dropped.** Parent skill is HybridApp-only; this specialization inherits the gate. Production mobile evidence runs against HybridApp, so the standalone fallback was variance for an unused path. Bringing this skill back to non-HybridApp would require loosening the parent's pre-flight gate first.
- **Inline pre-flight version check removed.** Parent skill's auto-pre-flight covers it. If the parent gate fails, this skill exits `7 NO_BUILD`.
- **Allowed-tools list reduced.** Dropped `Bash(scripts/is-hybrid-app.sh)`, `Bash(grep *)`, `Bash(echo *)`, `Bash(cat *)`. The parent skill owns the HybridApp probe; the rest were no longer needed by the rewritten flow.
- **Net change**: SKILL.md shrinks ~40 lines and documents *only* the PR-media-specific work (Tests parsing, two-phase capture, manifest). Drift risk vs parent reduced to one cross-link.

Reference: [`reference/agent-device-skill-composition.md`](../../../../../../projects/self/tasks/integrate-agent-device-for-melvin/reference/agent-device-skill-composition.md) in the orchestration vault for the full duplication trace and the Option A vs B vs C analysis.
