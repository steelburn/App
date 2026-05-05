import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {LayoutChangeEvent} from 'react-native';
import ReportActionsSkeletonView from '@components/ReportActionsSkeletonView';
import useConciergeSidePanelReportActions from '@hooks/useConciergeSidePanelReportActions';
import useCopySelectionHelper from '@hooks/useCopySelectionHelper';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useIsInSidePanel from '@hooks/useIsInSidePanel';
import useLoadReportActions from '@hooks/useLoadReportActions';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useParentReportAction from '@hooks/useParentReportAction';
import usePendingConciergeResponse from '@hooks/usePendingConciergeResponse';
import usePrevious from '@hooks/usePrevious';
import useReportActionsPagination from '@hooks/useReportActionsPagination';
import useReportIsArchived from '@hooks/useReportIsArchived';
import useSidePanelState from '@hooks/useSidePanelState';
import useTransactionsAndViolationsForReport from '@hooks/useTransactionsAndViolationsForReport';
import {getReportPreviewAction} from '@libs/actions/IOU';
import {updateLoadingInitialReportAction} from '@libs/actions/Report';
import {getAllNonDeletedTransactions} from '@libs/MoneyRequestReportUtils';
import {generateNewRandomInt} from '@libs/NumberUtils';
import {isCreatedAction, isDeletedParentAction, isIOUActionMatchingTransactionList, isReportActionVisible} from '@libs/ReportActionsUtils';
import {canUserPerformWriteAction, isConciergeChatReport, isReportTransactionThread as isReportTransactionThreadUtil} from '@libs/ReportUtils';
import markOpenReportEnd from '@libs/telemetry/markOpenReportEnd';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';
import ReportActionsList from './ReportActionsList';
import UserTypingEventListener from './UserTypingEventListener';

type ReportActionsViewProps = {
    /** The ID of the report to display actions for */
    reportID: string | undefined;

    /** Callback executed on layout */
    onLayout?: (event: LayoutChangeEvent) => void;
};

let listOldID = Math.round(Math.random() * 100);

function ReportActionsView({reportID, onLayout}: ReportActionsViewProps) {
    useCopySelectionHelper();
    const {translate} = useLocalize();
    usePendingConciergeResponse(reportID);
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const {isOffline} = useNetwork();

    const [report, reportResult] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);

    const {
        reportActions,
        allReportActions,
        allReportActionIDs,
        hasOlderActions,
        hasNewerActions,
        reportActionID,
        transactionThreadReportID,
        transactionThreadReport,
        parentReportActionForTransactionThread,
        shouldAddCreatedAction,
    } = useReportActionsPagination(reportID);

    const parentReportAction = useParentReportAction(report);

    const [reportLoadingState] = useOnyx(`${ONYXKEYS.COLLECTION.RAM_ONLY_REPORT_LOADING_STATE}${reportID}`);
    const isLoadingInitialReportActions = reportLoadingState?.isLoadingInitialReportActions;
    const hasOnceLoadedReportActions = reportLoadingState?.hasOnceLoadedReportActions;

    const isInSidePanel = useIsInSidePanel();
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const isConciergeSidePanel = isInSidePanel && isConciergeChatReport(report, conciergeReportID);

    const {sessionStartTime} = useSidePanelState();

    const hasUserSentMessage = useMemo(() => {
        if (!isConciergeSidePanel || !sessionStartTime) {
            return false;
        }
        return allReportActions.some((action) => !isCreatedAction(action) && action.actorAccountID === currentUserAccountID && action.created >= sessionStartTime);
    }, [isConciergeSidePanel, allReportActions, currentUserAccountID, sessionStartTime]);

    const isReportTransactionThread = isReportTransactionThreadUtil(report);

    const isReportArchived = useReportIsArchived(reportID);
    const canPerformWriteAction = canUserPerformWriteAction(report, isReportArchived);

    const [isLoadingApp] = useOnyx(ONYXKEYS.IS_LOADING_APP);
    const [visibleReportActionsData] = useOnyx(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
    const prevReportActionID = usePrevious(reportActionID);
    const reportPreviewAction = useMemo(() => getReportPreviewAction(report?.chatReportID, report?.reportID), [report?.chatReportID, report?.reportID]);
    const didLayout = useRef(false);

    const {transactions: reportTransactions} = useTransactionsAndViolationsForReport(reportID);
    const reportTransactionIDs = useMemo(
        () => getAllNonDeletedTransactions(reportTransactions, allReportActions ?? []).map((transaction) => transaction.transactionID),
        [reportTransactions, allReportActions],
    );

    useEffect(() => {
        // When we linked to message - we do not need to wait for initial actions - they already exists
        if (!reportActionID || !isOffline) {
            return;
        }
        updateLoadingInitialReportAction(report?.reportID ?? reportID);
    }, [isOffline, report?.reportID, reportID, reportActionID]);

    // Change the list ID only for comment linking to get the positioning right
    const listID = useMemo(() => {
        if (!reportActionID && !prevReportActionID) {
            // Keep the old list ID since we're not in the Comment Linking flow
            return listOldID;
        }
        const newID = generateNewRandomInt(listOldID, 1, Number.MAX_SAFE_INTEGER);
        listOldID = newID;

        return newID;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportActionID]);

    const visibleReportActions = useMemo(
        () =>
            reportActions.filter((reportAction) => {
                const passesOfflineCheck =
                    isOffline || isDeletedParentAction(reportAction) || reportAction.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || reportAction.errors;

                if (!passesOfflineCheck) {
                    return false;
                }

                const actionReportID = reportAction.reportID ?? reportID;
                if (!isReportActionVisible(reportAction, actionReportID, canPerformWriteAction, visibleReportActionsData)) {
                    return false;
                }

                if (!isIOUActionMatchingTransactionList(reportAction, reportTransactionIDs)) {
                    return false;
                }

                return true;
            }),
        [reportActions, isOffline, canPerformWriteAction, reportTransactionIDs, visibleReportActionsData, reportID],
    );

    const isSingleExpenseReport = reportPreviewAction?.childMoneyRequestCount === 1;
    const isMissingTransactionThreadReportID = !transactionThreadReport?.reportID;
    const isReportDataIncomplete = isSingleExpenseReport && isMissingTransactionThreadReportID;
    const isMissingReportActions = visibleReportActions.length === 0;
    // When an expense is added optimistically, the transaction thread report ID is available
    // before useOnyx returns the report data (new subscription takes one render cycle).
    // Detect this transient state so we can keep showing a skeleton instead of a partial view.
    // Bounded by a timeout so a missing/failed report load doesn't block the view indefinitely.
    const isTransactionThreadPending = isSingleExpenseReport && !!transactionThreadReportID && transactionThreadReportID !== CONST.FAKE_REPORT_ID && !transactionThreadReport?.reportID;
    const [transactionThreadTimedOutID, setTransactionThreadTimedOutID] = useState<string | undefined>();

    useEffect(() => {
        if (!isTransactionThreadPending || !transactionThreadReportID) {
            return;
        }

        const timeoutID = setTimeout(() => {
            setTransactionThreadTimedOutID(transactionThreadReportID);
        }, CONST.SKELETON_LOADING_TIMEOUT_MS);

        return () => clearTimeout(timeoutID);
    }, [isTransactionThreadPending, transactionThreadReportID]);

    const isWaitingForTransactionThread = isTransactionThreadPending && transactionThreadTimedOutID !== transactionThreadReportID;

    const {loadOlderChats, loadNewerChats} = useLoadReportActions({
        reportID,
        reportActions,
        allReportActionIDs,
        transactionThreadReportID,
        hasOlderActions,
        hasNewerActions,
    });

    const {
        filteredVisibleActions: conciergeSidePanelFilteredVisibleActions,
        filteredReportActions: conciergeSidePanelFilteredReportActions,
        showConciergeSidePanelWelcome,
        showFullHistory,
        hasPreviousMessages,
        handleShowPreviousMessages,
    } = useConciergeSidePanelReportActions({
        report,
        reportActions,
        visibleReportActions,
        isConciergeSidePanel,
        hasUserSentMessage,
        hasOlderActions,
        sessionStartTime,
        currentUserAccountID,
        greetingText: translate('common.concierge.sidePanelGreeting'),
        loadOlderChats,
    });

    /**
     * Runs when the FlatList finishes laying out
     */
    const recordTimeToMeasureItemLayout = (event: LayoutChangeEvent) => {
        onLayout?.(event);
        if (didLayout.current) {
            return;
        }

        didLayout.current = true;

        if (report) {
            markOpenReportEnd(report, {warm: true});
        }
    };

    // Show skeleton while loading initial report actions when data is incomplete/missing and online
    const shouldShowSkeletonForInitialLoad = isLoadingInitialReportActions && (isReportDataIncomplete || isMissingReportActions) && !isOffline;

    // Show skeleton while the app is loading and we're online
    const shouldShowSkeletonForAppLoad = isLoadingApp && !isOffline;

    // Show skeleton for the Concierge side panel until report data has been
    // loaded at least once. Before the first openReport response, hasOlderActions
    // is unreliable, so we can't determine whether to show the greeting or
    // onboarding messages. The skeleton avoids flashing wrong content.
    const shouldShowSkeletonForConciergePanel = isConciergeSidePanel && !hasOnceLoadedReportActions && !isOffline;

    // Show skeleton while waiting for the transaction thread report to load after
    // an optimistic expense creation. This prevents the partial "amount with nothing else"
    // flash between the orchestrator skeleton and the fully rendered single-expense view.
    const shouldShowSkeletonForTransactionThread = isWaitingForTransactionThread && !isOffline;

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const shouldShowSkeleton = shouldShowSkeletonForConciergePanel || shouldShowSkeletonForInitialLoad || shouldShowSkeletonForAppLoad || shouldShowSkeletonForTransactionThread;

    useEffect(() => {
        if (!shouldShowSkeleton || !report) {
            return;
        }
        markOpenReportEnd(report, {warm: false});
    }, [report, shouldShowSkeleton]);

    if (isLoadingOnyxValue(reportResult) || !report) {
        return <ReportActionsSkeletonView />;
    }

    if (shouldShowSkeleton) {
        return <ReportActionsSkeletonView />;
    }

    const hasDerivedValueTimingIssue = reportActions.length > 0 && isMissingReportActions;
    if ((hasDerivedValueTimingIssue || (!isReportTransactionThread && isMissingReportActions)) && !showConciergeSidePanelWelcome) {
        return <ReportActionsSkeletonView shouldAnimate={false} />;
    }

    return (
        <>
            <ReportActionsList
                report={report}
                transactionThreadReport={transactionThreadReport}
                parentReportAction={parentReportAction}
                parentReportActionForTransactionThread={parentReportActionForTransactionThread}
                onLayout={recordTimeToMeasureItemLayout}
                sortedReportActions={conciergeSidePanelFilteredReportActions}
                sortedVisibleReportActions={conciergeSidePanelFilteredVisibleActions}
                loadOlderChats={loadOlderChats}
                loadNewerChats={loadNewerChats}
                listID={listID}
                hasCreatedActionAdded={shouldAddCreatedAction}
                showHiddenHistory={!showFullHistory}
                hasPreviousMessages={hasPreviousMessages}
                onShowPreviousMessages={handleShowPreviousMessages}
            />
            <UserTypingEventListener report={report} />
        </>
    );
}

export default ReportActionsView;
