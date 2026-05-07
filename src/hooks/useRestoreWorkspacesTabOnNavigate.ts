import type {NavigationState, PartialState} from '@react-navigation/native';
import {getPreservedNavigatorState} from '@libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState';
import {isFullScreenName, isWorkspaceNavigatorRouteName} from '@libs/Navigation/helpers/isNavigatorName';
import {getWorkspacesTabStateFromSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import navigateToWorkspacesPage from '@libs/Navigation/helpers/navigateToWorkspacesPage';
import {getTabState} from '@libs/Navigation/helpers/tabNavigatorUtils';
import navigationRef from '@libs/Navigation/navigationRef';
import type {DomainSplitNavigatorParamList, WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import NAVIGATORS from '@src/NAVIGATORS';
import type SCREENS from '@src/SCREENS';
import useResponsiveLayout from './useResponsiveLayout';

type WorkspaceRouteType = NavigationState['routes'][number] | NonNullable<PartialState<NavigationState>['routes']>[number];
type WorkspaceParams = WorkspaceSplitNavigatorParamList[typeof SCREENS.WORKSPACE.INITIAL] | DomainSplitNavigatorParamList[typeof SCREENS.DOMAIN.INITIAL];

/**
 * Walks the root nav state to find the last workspace/domain route the user had open.
 * Falls back to session storage when no live workspace route exists.
 *
 * Multiple TAB_NAVIGATOR instances can coexist in the root stack — when navigation from
 * inside an RHP targets a tab, linkTo PUSHes a fresh TabNavigator above the modal, and that
 * new instance's WORKSPACE_NAVIGATOR slot starts empty. Older instances kept alive by
 * ensureTabNavigatorRoutes still hold the previous workspace state, so flatten every
 * workspace route from every TabNavigator in stack order and take the most recent one.
 */
function findLastWorkspaceRoute(rootState: NavigationState | undefined): WorkspaceRouteType | undefined {
    const topmostFullScreenRoute = rootState?.routes?.findLast((route) => isFullScreenName(route.name));
    if (!topmostFullScreenRoute) {
        return undefined;
    }

    const lastWorkspaceRoute = (rootState?.routes ?? [])
        .filter((route) => route.name === NAVIGATORS.TAB_NAVIGATOR)
        .flatMap((tabNavigatorRoute) => {
            const workspaceNavigatorRoute = getTabState(tabNavigatorRoute)?.routes?.find((route) => route.name === NAVIGATORS.WORKSPACE_NAVIGATOR);
            const workspaceNavigatorState = workspaceNavigatorRoute?.state ?? (workspaceNavigatorRoute?.key ? getPreservedNavigatorState(workspaceNavigatorRoute.key) : undefined);
            return workspaceNavigatorState?.routes?.filter((route) => isWorkspaceNavigatorRouteName(route.name)) ?? [];
        })
        .at(-1);

    if (lastWorkspaceRoute) {
        return lastWorkspaceRoute;
    }

    return getWorkspacesTabStateFromSessionStorage()
        ?.routes?.findLast((route) => route.name === NAVIGATORS.WORKSPACE_NAVIGATOR)
        ?.state?.routes?.findLast((route) => isWorkspaceNavigatorRouteName(route.name));
}

function getWorkspacesTabState(route: WorkspaceRouteType | undefined): NavigationState | PartialState<NavigationState> | undefined {
    if (!route) {
        return undefined;
    }
    return route.state ?? (route.key ? getPreservedNavigatorState(route.key) : undefined);
}

/**
 * The Workspaces tab can show three things: the workspaces list, a specific workspace page,
 * or a specific domain page. When the user navigates away and comes back to the tab,
 * this hook ensures they return to whichever of those they had open last — not always the list.
 *
 * Resolves nav state and route IDs at click time inside the returned callback so the hook
 * has no reactive subscriptions to nav state — unrelated navigations (e.g. opening a report)
 * don't trigger re-renders. The destination workspace/domain page handles invalid IDs.
 */
function useRestoreWorkspacesTabOnNavigate() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    return () => {
        const rootState = navigationRef.isReady() ? navigationRef.getRootState() : undefined;
        const topmostFullScreenRoute = rootState?.routes?.findLast((route) => isFullScreenName(route.name));
        const lastWorkspacesTabNavigatorRoute = findLastWorkspaceRoute(rootState);
        const workspacesTabState = getWorkspacesTabState(lastWorkspacesTabNavigatorRoute);

        const params = workspacesTabState?.routes?.at(0)?.params as WorkspaceParams | undefined;
        const policyID = params && 'policyID' in params ? params.policyID : undefined;
        const domainAccountID = params && 'domainAccountID' in params ? params.domainAccountID : undefined;

        navigateToWorkspacesPage({
            shouldUseNarrowLayout,
            policyID,
            domainAccountID,
            lastWorkspacesTabNavigatorRoute,
            topmostFullScreenRoute,
            workspacesTabState,
        });
    };
}

export default useRestoreWorkspacesTabOnNavigate;
