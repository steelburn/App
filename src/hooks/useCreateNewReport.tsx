import {accountIDSelector, emailSelector} from '@selectors/Session';
import {useCallback} from 'react';
import {createNewReport} from '@libs/actions/Report';
import setNavigationActionToMicrotaskQueue from '@libs/Navigation/helpers/setNavigationActionToMicrotaskQueue';
import Navigation from '@libs/Navigation/Navigation';
import {hasViolations as hasViolationsUtil} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';
import usePermissions from './usePermissions';

/**
 * Returns a stable callback that creates a new expense report for the given
 * policyID and navigates to it.  Useful for callers that already know which
 * workspace to use and don't need the workspace-selection page.
 */
function useCreateNewReport() {
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const {isBetaEnabled} = usePermissions();
    const isASAPSubmitBetaEnabled = isBetaEnabled(CONST.BETAS.ASAP_SUBMIT);
    const [accountID] = useOnyx(ONYXKEYS.SESSION, {selector: accountIDSelector});
    const [email] = useOnyx(ONYXKEYS.SESSION, {selector: emailSelector});
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);

    const hasViolations = hasViolationsUtil(undefined, transactionViolations, accountID ?? CONST.DEFAULT_NUMBER_ID, email ?? '');

    return useCallback(
        (policyID: string, forceReplace = false) => {
            const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
            const result = createNewReport(currentUserPersonalDetails, hasViolations, isASAPSubmitBetaEnabled, policy, betas, false);
            setNavigationActionToMicrotaskQueue(() => {
                Navigation.navigate(ROUTES.REPORT_WITH_ID.getRoute(result.reportID), {forceReplace});
            });
        },
        [betas, currentUserPersonalDetails, hasViolations, isASAPSubmitBetaEnabled, policies],
    );
}

export default useCreateNewReport;
