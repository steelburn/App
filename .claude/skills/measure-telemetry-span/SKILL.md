---
name: measure-telemetry-span
description: >
  Use when measuring a Sentry performance span locally with an agent-device replay flow on iOS simulator or Android emulator.
argument-hint: "<span-name> [runs] [platform] [--boot]"
allowed-tools: Bash, Read, Grep, Glob
---

# Measure Telemetry Span

**Pattern:** from repo root, run one command with a span name and platform → stdout is a small summary table (avg / min / max + sample ms list). Measures whatever Git checkout is currently checked out; no branch switching.

## Command

```bash
.claude/skills/measure-telemetry-span/measure.sh <span-name> [runs] [platform] [--boot]
```

| Argument       | Default | Description                                                                 |
| -------------- | ------- | --------------------------------------------------------------------------- |
| `<span-name>`  | —       | Must match `# @tag sentry-<span-name>` on a flow in `.claude/skills/agent-device/flows/`. |
| `[runs]`       | `10`    | Measured replays after **one** warmup inside the script.                    |
| `[platform]`   | `ios`   | `ios` or `android` — must match the simulator/emulator you use.          |
| `--boot`       | off     | Before `open`, runs `agent-device boot --platform <platform>` so a simulator/emulator is started when nothing was connected (`adb devices` empty, etc.). |

To pick a **specific** Android AVD or iOS simulator, use the same global flags `agent-device` already supports (for example `--device "Pixel_7_API_34"`) on **`boot`** and on later commands — either run `agent-device boot --platform android --device "…"` yourself before `measure.sh`, or rely on `agent-device` config (`~/.agent-device/config.json`). `--boot` inside this script only passes `--platform` through to `boot`.

**Environment:** `APP_ID` overrides app bundle (default `com.expensify.chat.dev`). If the flow declares `env KEY=…`, set **`AD_KEY`** to pass `-e` to replay.

**Output:** table + `Samples: …ms` line; stderr has progress (`Using flow:`, runs, optional reset).

## Before you run

| Must have | Notes |
| --------- | ----- |
| `agent-device` (global install, version per repo agent-device skill) | |
| Metro on **8081** (`npm run start`) | |
| Dev build on device | |
| **iOS** | `agent-device react-devtools` attached so Hermes `console.debug` reaches logs. |
| **Android** | Span line visible in `adb logcat` at debug once you verify manually. |

If you see **no Android device** (`adb devices` empty): append **`--boot`** to the measure command, or run manually first:

`agent-device boot --platform android` (optional `--device "<AVD name>"`). For iOS, `agent-device boot --platform ios` or `agent-device ensure-simulator --boot` when you need a created simulator instance.

## Contract

- App logs: `[Sentry][<SpanName>] Ending span (<N>ms)` via `console.debug`.
- Flow file includes `# @tag sentry-<SpanName>` (same name, case-sensitive).
- Optional flow headers: `@reset <path.ad>` (run by the script after warmup and each measured replay); `env` keys overridable via `AD_*`.

## If something fails

| Symptom | Action |
| ------- | ------ |
| `No captured runs` | iOS: DevTools. Android: log level / package. Retry after clearing log pipeline. |
| `SESSION_NOT_FOUND` / empty `adb devices` | Use **`--boot`** on the measure script, or `agent-device boot --platform android|ios` (see `--device` if multiple AVDs/simulators). Then `open` again if needed. |
| Fewer samples than `runs` | Span not emitted or flow flaky — `agent-device replay <flow> --debug`; fix selectors (`ad-flow-author`). |

For another app bundle, export `APP_ID` before the command.
