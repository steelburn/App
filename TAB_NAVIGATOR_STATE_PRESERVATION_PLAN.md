# Plan: TabNavigator State Preservation

## Context

With the introduction of `TabNavigator`, the split navigators (`ReportsSplitNavigator`, `SettingsSplitNavigator`, `SearchFullscreenNavigator`, `WorkspaceNavigator`) are now tabs **inside** `TAB_NAVIGATOR` rather than independent routes in the root stack. The existing `usePreserveNavigatorState` mechanism saves and restores `StackNavigationState` for split/workspace navigators via their custom routers (`SplitRouter.getInitialState`, `WorkspaceRouter.getInitialState`). The `TAB_NAVIGATOR` itself has no analogous preservation: when it is unmounted (sliced out by `useCustomRootStackNavigatorState` when there are >2 TAB_NAVIGATOR instances on the root stack), its nested tab state — specifically which tab is focused (`index`) — is not explicitly saved. `useCustomRootStackNavigatorState` also has no code path to rehydrate a re-added TAB_NAVIGATOR route from preserved state.

## Approach

Mirror the split-navigator preservation pattern, adapted for the bottom tab navigator (which has no custom router).

### Step 1 — Extend `usePreserveNavigatorState.ts`

**File:** `src/libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState.ts`

Add a second, separate in-memory store for tab navigator states (keeping the existing `preservedNavigatorStates` typed as `StackNavigationState` untouched):

```ts
// Route.state property type — matches what NavigationRoute.state can hold
type AnyNavigationState = Readonly<NavigationState> | PartialState<NavigationState>;

const preservedTabNavigatorStates: Record<string, AnyNavigationState> = {};
```

Export three new functions alongside the existing ones:

- `setPreservedTabNavigatorState(key: string, state: AnyNavigationState): void`
- `getPreservedTabNavigatorState(key: string): AnyNavigationState | undefined`
- `cleanPreservedTabNavigatorStates(rootState: NavigationState): void` — mirrors `cleanPreservedNavigatorStates`, filters by TAB_NAVIGATOR route keys

### Step 2 — Save state inside `TabNavigator.tsx`

**File:** `src/libs/Navigation/AppNavigator/Navigators/TabNavigator.tsx`

Within the `TabNavigator` function component, which is rendered **as a screen** inside the root stack:

- `useRoute()` returns the `TAB_NAVIGATOR` route object (giving its `.key`)
- `useNavigationState(rootState => rootState.routes.find(r => r.key === route.key)?.state)` extracts the tab navigator's nested state from the root stack state (confirmed: `useNavigationState` here reads the root stack context, as demonstrated by the existing `findFocusedRoute(state)` call)

Add:

```ts
const route = useRoute();
const tabState = useNavigationState(
    (rootState) => rootState.routes.find((r) => r.key === route.key)?.state,
);

useEffect(() => {
    if (!tabState) {
        return;
    }
    setPreservedTabNavigatorState(route.key, tabState);
}, [tabState, route.key]);
```

This fires on every tab state change (tab switch, nested navigation), keeping the preserved state current.

### Step 3 — Restore preserved state in `useCustomRootStackNavigatorState/index.ts`

**File:** `src/libs/Navigation/AppNavigator/createRootStackNavigator/useCustomRootStackNavigatorState/index.ts`

After `ensureTabNavigatorRoutes` reconstructs `routesToRender`, map over the routes and — for TAB_NAVIGATOR routes whose `state` is `undefined` — rehydrate from preserved state:

```ts
import NAVIGATORS from '@src/NAVIGATORS';
import {getPreservedTabNavigatorState} from '…/createSplitNavigator/usePreserveNavigatorState';

// after ensureTabNavigatorRoutes call:
const routesWithRestoredState = routesToRender.map((route) => {
    if (route.name !== NAVIGATORS.TAB_NAVIGATOR || route.state !== undefined) {
        return route;
    }
    const preservedState = getPreservedTabNavigatorState(route.key);
    return preservedState ? {...route, state: preservedState} : route;
});

return {...state, routes: routesWithRestoredState, index: routesWithRestoredState.length - 1};
```

This is a _fallback only_ — when React Navigation already has the nested state on the route object (`route.state !== undefined`) we leave it untouched, matching how SplitRouter uses `getPreservedNavigatorState(key) ?? stackRouter.getInitialState(…)`.

### Step 4 — Clean up stale tab states in `NavigationRoot.tsx`

**File:** `src/libs/Navigation/NavigationRoot.tsx`

In `handleStateChange`, alongside the existing `cleanPreservedNavigatorStates(state)` call, add:

```ts
cleanPreservedTabNavigatorStates(state);
```

This removes preserved states for TAB_NAVIGATOR route keys that no longer exist in the root stack, preventing memory leaks.

## Critical files

| File | Change |
|---|---|
| `src/libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState.ts` | Add tab-specific store + 3 exported helpers |
| `src/libs/Navigation/AppNavigator/Navigators/TabNavigator.tsx` | `useRoute` + state selector + `useEffect` save |
| `src/libs/Navigation/AppNavigator/createRootStackNavigator/useCustomRootStackNavigatorState/index.ts` | Rehydrate route.state from preserved tab state as fallback |
| `src/libs/Navigation/NavigationRoot.tsx` | Call `cleanPreservedTabNavigatorStates` in `handleStateChange` |

## Verification

1. Open Reports tab, navigate to a specific report.
2. Navigate from an RHP screen to a workspace (this pushes a second `TAB_NAVIGATOR`).
3. Navigate again to push a third `TAB_NAVIGATOR` (if testable), causing the first one to be unmounted by the slicing logic.
4. Navigate back all the way — the first `TAB_NAVIGATOR` should restore on the Reports tab, and the previously-opened report should be visible (restored via `usePreserveNavigatorState` in `SplitRouter`).
5. Run `npm run typecheck-tsgo` to confirm types are correct.
6. Run `npm run lint-changed` on modified files.
