import React, {useCallback, useMemo} from 'react';
import type {ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import type {OnyxCollection} from 'react-native-onyx';
import type {OptionRowLHNDataProps} from '@components/LHNOptionsList/types';
import useReportPreviewSenderID from '@components/ReportActionAvatars/useReportPreviewSenderID';
import {useCurrentReportIDState} from '@hooks/useCurrentReportID';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useGetExpensifyCardFromReportAction from '@hooks/useGetExpensifyCardFromReportAction';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {getLastVisibleActionIncludingTransactionThread, getOriginalMessage, isActionableTrackExpense, isInviteOrRemovedAction} from '@libs/ReportActionsUtils';
import {canUserPerformWriteAction as canUserPerformWriteActionUtil} from '@libs/ReportUtils';
import SidebarUtils from '@libs/SidebarUtils';
import CONST from '@src/CONST';
import {getMovedReportID} from '@src/libs/ModifiedExpenseMessage';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportActions as ReportActionsType} from '@src/types/onyx';
import type {VisibleReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import OptionRowLHN from './OptionRowLHNCore';

/*
 * Onyx-backed props for one LHN row; renders OptionRowLHNCore (memoized; re-renders when derived data changes).
 * Colocated under OptionRowLHN/; consumers import ./OptionRowLHN for OptionRowLHNData only (see index.ts).
 */
function OptionRowLHNData({
    isOptionFocused = false,
    fullReport,
    reportAttributes,
    reportAttributesDerived,
    oneTransactionThreadReport,
    personalDetails = {},
    policy,
    invoiceReceiverPolicy,
    viewMode = 'default',
    ...propsToForward
}: OptionRowLHNDataProps) {
    const styles = useThemeStyles();
    const reportID = propsToForward.reportID;
    const {currentReportID: currentReportIDValue} = useCurrentReportIDState();
    const isReportFocused = isOptionFocused && currentReportIDValue === reportID;
    const {translate, localeCompare} = useLocalize();
    const {login, accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const oneTransactionThreadReportID = oneTransactionThreadReport?.reportID;
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);

    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);
    const [parentReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(fullReport?.parentReportID)}`);
    const [transactionThreadReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(oneTransactionThreadReportID)}`);

    const visibleActionsSelector = useCallback(
        (data: VisibleReportActionsDerivedValue | undefined) => {
            if (!data) {
                return undefined;
            }
            const result: VisibleReportActionsDerivedValue = {};
            const reportEntry = data[reportID];
            if (reportEntry) {
                result[reportID] = reportEntry;
            }
            if (oneTransactionThreadReportID) {
                const txThreadEntry = data[oneTransactionThreadReportID];
                if (txThreadEntry) {
                    result[oneTransactionThreadReportID] = txThreadEntry;
                }
            }
            return result;
        },
        [reportID, oneTransactionThreadReportID],
    );
    const [visibleReportActionsData] = useOnyx(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS, {selector: visibleActionsSelector});

    const [reportNameValuePairs] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`);

    const parentReportAction = fullReport?.parentReportActionID ? parentReportActions?.[fullReport.parentReportActionID] : undefined;

    const isReportArchived = !!reportNameValuePairs?.private_isArchived;
    const canUserPerformWrite = canUserPerformWriteActionUtil(fullReport, isReportArchived);

    const lastAction = useMemo(() => {
        const actionsCollection: OnyxCollection<ReportActionsType> = {
            [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`]: reportActions ?? undefined,
        };
        if (oneTransactionThreadReportID) {
            actionsCollection[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${oneTransactionThreadReportID}`] = transactionThreadReportActions ?? undefined;
        }
        return getLastVisibleActionIncludingTransactionThread(reportID, canUserPerformWrite, actionsCollection, visibleReportActionsData, oneTransactionThreadReportID);
    }, [reportID, canUserPerformWrite, reportActions, transactionThreadReportActions, visibleReportActionsData, oneTransactionThreadReportID]);

    const whisperTransactionID = isActionableTrackExpense(lastAction) ? getOriginalMessage(lastAction)?.transactionID : undefined;
    const [whisperTransaction] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION}${getNonEmptyStringOnyxID(whisperTransactionID)}`);

    const lastMessageTextFromReport = useMemo(() => {
        if (whisperTransactionID && !whisperTransaction) {
            return '';
        }
        return undefined;
    }, [whisperTransactionID, whisperTransaction]);

    const lastActionReportID = useMemo(() => {
        if (isInviteOrRemovedAction(lastAction)) {
            const lastActionOriginalMessage = lastAction?.actionName ? getOriginalMessage(lastAction) : null;
            return lastActionOriginalMessage?.reportID;
        }
        return undefined;
    }, [lastAction]);
    const [lastActionReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(lastActionReportID ? String(lastActionReportID) : undefined)}`);

    const [draftComment] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`);
    const hasDraftComment = !!draftComment && !draftComment.match(CONST.REGEX.EMPTY_COMMENT);

    const [movedFromReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getMovedReportID(lastAction, CONST.REPORT.MOVE_TYPE.FROM)}`);
    const [movedToReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getMovedReportID(lastAction, CONST.REPORT.MOVE_TYPE.TO)}`);
    const [policyTags] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${fullReport?.policyID}`);

    const card = useGetExpensifyCardFromReportAction({reportAction: lastAction, policyID: fullReport?.policyID});

    const isIOUReport = fullReport?.type === CONST.REPORT.TYPE.IOU;
    const [chatReportForIOU] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(isIOUReport ? fullReport?.chatReportID : undefined)}`);
    const reportPreviewSenderID = useReportPreviewSenderID({
        iouReport: isIOUReport ? fullReport : undefined,
        action: parentReportAction,
        chatReport: chatReportForIOU,
    });

    const optionItem = SidebarUtils.getOptionData({
        report: fullReport,
        reportAttributes,
        oneTransactionThreadReport,
        reportNameValuePairs,
        personalDetails,
        policy,
        parentReportAction,
        conciergeReportID,
        lastMessageTextFromReport,
        invoiceReceiverPolicy,
        card,
        lastAction,
        translate,
        localeCompare,
        isReportArchived,
        lastActionReport,
        movedFromReport,
        movedToReport,
        currentUserAccountID,
        reportAttributesDerived,
        policyTags,
        currentUserLogin: login ?? '',
    });

    const finalOptionItem = useMemo(() => {
        if (!optionItem || !isIOUReport || reportPreviewSenderID === undefined || !optionItem.icons || optionItem.icons.length <= 1) {
            return optionItem;
        }

        const senderIcon = optionItem.icons.find((icon) => Number(icon.id) === reportPreviewSenderID);
        return {...optionItem, icons: [senderIcon ?? optionItem.icons.at(0)].filter((icon): icon is Icon => !!icon)};
    }, [optionItem, isIOUReport, reportPreviewSenderID]);

    const isInFocusMode = viewMode === CONST.OPTION_MODE.COMPACT;
    const placeholderRowStyle = StyleSheet.flatten<ViewStyle>(
        isInFocusMode
            ? [styles.chatLinkRowPressable, styles.flexGrow1, styles.optionItemAvatarNameWrapper, styles.optionRowCompact, styles.justifyContentCenter]
            : [styles.chatLinkRowPressable, styles.flexGrow1, styles.optionItemAvatarNameWrapper, styles.optionRow, styles.justifyContentCenter],
    );

    if (!finalOptionItem) {
        return isReportFocused ? null : <View style={placeholderRowStyle} />;
    }

    return (
        <OptionRowLHN
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...propsToForward}
            viewMode={viewMode}
            isOptionFocused={isReportFocused}
            optionItem={finalOptionItem}
            report={fullReport}
            hasDraftComment={hasDraftComment}
        />
    );
}

OptionRowLHNData.displayName = 'OptionRowLHNData';

export default React.memo(OptionRowLHNData);
