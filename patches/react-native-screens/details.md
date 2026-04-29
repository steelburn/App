# `react-native-screens` patches

### [react-native-screens+4.25.0-beta.1.patch](react-native-screens+4.25.0-beta.1.patch)

- Reason: `SafeAreaView.web.tsx` only has a `default` export, but `safe-area/index.ts` re-exports it as a named export (`export { SafeAreaView } from './SafeAreaView'`). Webpack resolves the `.web` variant for web builds, causing a `ModuleDependencyWarning` that fails the Storybook smoke test. The fix adds a named export alongside the existing default export.
- Upstream PR/issue: https://github.com/software-mansion/react-native-screens/pull/3956 — once merged and released, bump the version and remove this patch.
- E/App issue: 🛑
- PR Introducing Patch: https://github.com/Expensify/App/pull/89199
