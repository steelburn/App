import {useCallback} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import Navigation from '@libs/Navigation/Navigation';
import {getDefaultChatEnabledPolicy} from '@libs/PolicyUtils';
import {generateReportID} from '@libs/ReportUtils';
import {shouldRestrictUserBillableActions} from '@libs/SubscriptionUtils';
import useRedirectToExpensifyClassic from '@pages/inbox/sidebar/FABPopoverContent/useRedirectToExpensifyClassic';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type * as OnyxTypes from '@src/types/onyx';
import useCreateEmptyReportConfirmation from './useCreateEmptyReportConfirmation';
import useHasEmptyReportsForPolicy from './useHasEmptyReportsForPolicy';
import useOnyx from './useOnyx';

type UseCreateReportActionParams = {
    /** Callback that creates the report and navigates after creation */
    onCreateReport: (shouldDismissEmptyReportsConfirmation?: boolean) => void;
    /** Group paid policies with expense chat enabled */
    groupPoliciesWithChatEnabled: readonly never[] | Array<OnyxEntry<OnyxTypes.Policy>>;
    /** Whether the empty-report confirmation modal should push a history entry so browser-back dismisses it (default: true) */
    shouldHandleNavigationBack?: boolean;
};

type UseCreateReportActionResult = {
    /** The action to trigger when the user clicks "Create report" */
    createReportAction: () => void;
    /** Whether the menu item/button should be visible — false only when redirecting to Classic is required but not currently possible */
    isVisible: boolean;
};

/**
 * Hook that encapsulates the shared "create report" branching logic used across
 * the FAB, the search Create dropdown, and the empty reports state.
 *
 * Decision flow:
 * 1. Redirect to Expensify Classic if all group policies have expense chat disabled
 * 2. Navigate to upgrade path if user has no valid group policies at all
 * 3. Navigate to workspace selector if no default workspace or restricted with multiple options
 * 4. Show empty report confirmation or create directly if workspace is valid
 * 5. Navigate to restricted action if billing restricts the workspace
 */
export default function useCreateReportAction({onCreateReport, groupPoliciesWithChatEnabled, shouldHandleNavigationBack = true}: UseCreateReportActionParams): UseCreateReportActionResult {
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [activePolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [userBillingGracePeriodEnds] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);
    const [hasDismissedEmptyReportsConfirmation] = useOnyx(ONYXKEYS.NVP_EMPTY_REPORTS_CONFIRMATION_DISMISSED);

    const {shouldRedirectToExpensifyClassic, canUseAction, showRedirectToExpensifyClassicModal} = useRedirectToExpensifyClassic();

    // Visible whenever clicking the button would do something meaningful (upgrade flow, workspace selection, direct create, or classic redirect).
    // Hidden only when classic redirect is required but currently suppressed (e.g. TryNewDot loading / hybrid app state).
    const isVisible = canUseAction;
    const shouldNavigateToUpgradePath = !shouldRedirectToExpensifyClassic && groupPoliciesWithChatEnabled.length === 0;

    const defaultChatEnabledPolicy = getDefaultChatEnabledPolicy(groupPoliciesWithChatEnabled as Array<OnyxEntry<OnyxTypes.Policy>>, activePolicy);
    const defaultChatEnabledPolicyID = defaultChatEnabledPolicy?.id;

    const hasEmptyReport = useHasEmptyReportsForPolicy(defaultChatEnabledPolicyID);
    const shouldShowEmptyReportConfirmation = hasEmptyReport && hasDismissedEmptyReportsConfirmation !== true;

    const {openCreateReportConfirmation} = useCreateEmptyReportConfirmation({
        policyID: defaultChatEnabledPolicyID,
        policyName: defaultChatEnabledPolicy?.name ?? '',
        onConfirm: onCreateReport,
        shouldHandleNavigationBack,
    });

    const createReportAction = useCallback(() => {
        interceptAnonymousUser(() => {
            if (shouldRedirectToExpensifyClassic) {
                showRedirectToExpensifyClassicModal();
                return;
            }

            // No valid policy at all → upgrade + create workspace flow
            if (shouldNavigateToUpgradePath) {
                const freshReportID = generateReportID();
                const freshTransactionID = generateReportID();
                Navigation.navigate(
                    ROUTES.MONEY_REQUEST_UPGRADE.getRoute({
                        action: CONST.IOU.ACTION.CREATE,
                        iouType: CONST.IOU.TYPE.CREATE,
                        transactionID: freshTransactionID,
                        reportID: freshReportID,
                        upgradePath: CONST.UPGRADE_PATHS.REPORTS,
                    }),
                );
                return;
            }

            const workspaceIDForReportCreation = defaultChatEnabledPolicyID;

            // No default or restricted with multiple workspaces → workspace selector
            if (
                !workspaceIDForReportCreation ||
                (shouldRestrictUserBillableActions(workspaceIDForReportCreation, ownerBillingGracePeriodEnd, userBillingGracePeriodEnds, amountOwed) &&
                    groupPoliciesWithChatEnabled.length > 1)
            ) {
                Navigation.navigate(ROUTES.NEW_REPORT_WORKSPACE_SELECTION.getRoute());
                return;
            }

            // Default workspace is not restricted → create report directly (or show empty-report confirmation)
            if (!shouldRestrictUserBillableActions(workspaceIDForReportCreation, ownerBillingGracePeriodEnd, userBillingGracePeriodEnds, amountOwed)) {
                if (shouldShowEmptyReportConfirmation) {
                    openCreateReportConfirmation();
                } else {
                    onCreateReport(false);
                }
                return;
            }

            Navigation.navigate(ROUTES.RESTRICTED_ACTION.getRoute(workspaceIDForReportCreation));
        });
    }, [
        shouldRedirectToExpensifyClassic,
        showRedirectToExpensifyClassicModal,
        shouldNavigateToUpgradePath,
        defaultChatEnabledPolicyID,
        ownerBillingGracePeriodEnd,
        userBillingGracePeriodEnds,
        amountOwed,
        groupPoliciesWithChatEnabled.length,
        shouldShowEmptyReportConfirmation,
        openCreateReportConfirmation,
        onCreateReport,
    ]);

    return {createReportAction, isVisible};
}
