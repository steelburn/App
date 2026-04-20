import {Str} from 'expensify-common';
import React, {useContext, useEffect, useRef, useState} from 'react';
import type {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {useSharedValue} from 'react-native-reanimated';
import {scheduleOnUI} from 'react-native-worklets';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import useAncestors from '@hooks/useAncestors';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useIsInSidePanel from '@hooks/useIsInSidePanel';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useOriginalReportID from '@hooks/useOriginalReportID';
import usePaginatedReportActions from '@hooks/usePaginatedReportActions';
import useReportTransactionsCollection from '@hooks/useReportTransactionsCollection';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useShortMentionsList from '@hooks/useShortMentionsList';
import {createTaskAndNavigate, setNewOptimisticAssignee} from '@libs/actions/Task';
import canFocusInputOnScreenFocus from '@libs/canFocusInputOnScreenFocus';
import {isEmailPublicDomain} from '@libs/LoginUtils';
import {getAllNonDeletedTransactions} from '@libs/MoneyRequestReportUtils';
import {rand64} from '@libs/NumberUtils';
import {addDomainToShortMention} from '@libs/ParsingUtils';
import {getFilteredReportActionsForReportView, getOneTransactionThreadReportID, isSentMoneyReportAction} from '@libs/ReportActionsUtils';
import {chatIncludesConcierge} from '@libs/ReportUtils';
import {startSpan} from '@libs/telemetry/activeSpans';
import {generateAccountID} from '@libs/UserUtils';
import {useAgentZeroStatusActions} from '@pages/inbox/AgentZeroStatusContext';
import {useReportActionActiveEdit} from '@pages/inbox/report/ReportActionEditMessageContext';
import {ActionListContext} from '@pages/inbox/ReportScreenContext';
import {addAttachmentWithComment, addComment, setIsComposerFullSize} from '@userActions/Report';
import {isBlockedFromConcierge as isBlockedFromConciergeUserAction} from '@userActions/User';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import type {FileObject} from '@src/types/utils/Attachment';
import {
    ComposerActionsContext,
    ComposerEditActionsContext,
    ComposerEditStateContext,
    ComposerMetaContext,
    ComposerSendActionsContext,
    ComposerSendStateContext,
    ComposerStateContext,
    ComposerTextContext,
} from './ComposerContext';
import type {SuggestionsRef} from './ComposerContext';
import type {ComposerWithSuggestionsRef} from './ComposerWithSuggestions';
import useComposerFocus from './useComposerFocus';
import useDebouncedCommentMaxLengthValidation from './useDebouncedCommentMaxLengthValidation';
import useEditMessage from './useEditMessage';

const shouldFocusInputOnScreenFocus = canFocusInputOnScreenFocus();

type ComposerProviderProps = {
    reportID: string;
    children: React.ReactNode;
};

function ComposerProvider({children, reportID}: ComposerProviderProps) {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {isOffline} = useNetwork();
    const isInSidePanel = useIsInSidePanel();
    const {scrollOffsetRef} = useContext(ActionListContext);

    const [blockedFromConcierge] = useOnyx(ONYXKEYS.NVP_BLOCKED_FROM_CONCIERGE);
    const [initialModalState] = useOnyx(ONYXKEYS.MODAL);
    const [draftComment] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`);
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const [isComposerFullSize = false] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_IS_COMPOSER_FULL_SIZE}${reportID}`);

    const [rawReportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report?.reportID}`, {
        canEvict: false,
    });

    const reportActionKeys = rawReportActions ? Object.keys(rawReportActions) : [];

    const {reportActions: unfilteredReportActions} = usePaginatedReportActions(report?.reportID);
    const filteredReportActions = getFilteredReportActionsForReportView(unfilteredReportActions);
    const [chatReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${report?.chatReportID}`);
    const allReportTransactions = useReportTransactionsCollection(reportID);
    const reportTransactions = getAllNonDeletedTransactions(allReportTransactions, filteredReportActions, isOffline, true);
    const visibleTransactions = isOffline ? reportTransactions : reportTransactions?.filter((t) => t.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE);
    const reportTransactionIDs = visibleTransactions?.map((t) => t.transactionID);
    const isSentMoneyReport = filteredReportActions.some((action) => isSentMoneyReportAction(action));
    const transactionThreadReportID = getOneTransactionThreadReportID(report, chatReport, filteredReportActions, isOffline, reportTransactionIDs);
    const effectiveTransactionThreadReportID = isSentMoneyReport ? undefined : transactionThreadReportID;
    const [targetReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${effectiveTransactionThreadReportID ?? reportID}`);
    const reportAncestors = useAncestors(report);
    const targetReportAncestors = useAncestors(targetReport);

    const shouldFocusComposerOnScreenFocus = shouldFocusInputOnScreenFocus || !!draftComment;

    const initialFocused = shouldFocusComposerOnScreenFocus && !initialModalState?.isVisible && !initialModalState?.willAlertModalBecomeVisible;

    const containerRef = useRef<View>(null);
    const suggestionsRef = useRef<SuggestionsRef>(null);
    const composerRef = useRef<ComposerWithSuggestionsRef | null>(null);
    const actionButtonRef = useRef<View | HTMLDivElement | null>(null);
    const attachmentFileRef = useRef<FileObject | FileObject[] | null>(null);

    const composerRefShared = useSharedValue<Partial<ComposerWithSuggestionsRef>>({});

    const [isFullComposerAvailable, setIsFullComposerAvailable] = useState(isComposerFullSize);
    const [isMenuVisible, setMenuVisibility] = useState(false);

    const [text, setText] = useState(() => {
        return draftComment ?? '';
    });

    const includesConcierge = chatIncludesConcierge({participants: report?.participants});
    const userBlockedFromConcierge = isBlockedFromConciergeUserAction(blockedFromConcierge);
    const isBlockedFromConcierge = includesConcierge && userBlockedFromConcierge;

    const {kickoffWaitingIndicator} = useAgentZeroStatusActions();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const personalDetails = usePersonalDetails();
    const [quickAction] = useOnyx(ONYXKEYS.NVP_QUICK_ACTION_GLOBAL_CREATE);
    const {availableLoginsList} = useShortMentionsList();
    const currentUserEmail = currentUserPersonalDetails.email ?? '';

    const {editingState, editingReportID, editingReportActionID, editingReportAction, editingMessage} = useReportActionActiveEdit();

    const isEditingLastReportAction = editingReportActionID === reportActionKeys.at(-1);

    const [didResetComposerHeight, setDidResetComposerHeight] = useState(false);
    useEffect(() => {
        if (editingState !== 'off' || !didResetComposerHeight) {
            return;
        }

        setDidResetComposerHeight(false);
    }, [didResetComposerHeight, editingState]);

    const isEditingInComposer = shouldUseNarrowLayout && editingState !== 'off' && !didResetComposerHeight;

    const effectiveDraft = isEditingInComposer ? editingMessage : draftComment;
    const isEmpty = !effectiveDraft || !!text.match(CONST.REGEX.EMPTY_COMMENT);

    const {debouncedCommentMaxLengthValidation, exceededMaxLength, isExceedingMaxLength, isTaskTitle} = useDebouncedCommentMaxLengthValidation({
        reportID,
        isEditing: !!editingReportAction,
    });

    const originalReportID = useOriginalReportID(editingReportID ?? undefined, editingReportAction);

    const {publishDraft, deleteDraft} = useEditMessage({
        reportID: editingReportID ?? undefined,
        originalReportID,
        reportAction: editingReportAction,
        shouldScrollToLastMessage: isEditingLastReportAction,
        debouncedCommentMaxLengthValidation,
        composerRef,
    });

    const isSubmittingDraftCommentDisabled = isBlockedFromConcierge || isExceedingMaxLength || isEmpty;
    const isSendDisabled = !isEditingInComposer && isSubmittingDraftCommentDisabled;

    const {isFocused, onBlur, onFocus, onAddActionPressed, onItemSelected, onTriggerAttachmentPicker, isNextModalWillOpenRef} = useComposerFocus({
        composerRef,
        suggestionsRef,
        actionButtonRef,
        initialFocused,
    });

    const clearComposer = () => {
        const clearWorklet = composerRefShared.get().clearWorklet;
        if (!clearWorklet) {
            throw new Error('The composerRef.clearWorklet function is not set yet. This should never happen, and indicates a developer error.');
        }
        scheduleOnUI(clearWorklet);
    };

    /**
     * Add or edit a comment in the composer
     */
    const validateAndSubmitDraft = (draftMessage: string) => {
        const draftMessageTrimmed = draftMessage.trim();

        const isSubmittingEdit = isEditingInComposer || didResetComposerHeight;
        if (isSubmittingEdit && !attachmentFileRef.current) {
            publishDraft(draftMessageTrimmed);
            return;
        }

        if (!draftMessageTrimmed && !attachmentFileRef.current) {
            return;
        }
        kickoffWaitingIndicator();

        if (attachmentFileRef.current) {
            addAttachmentWithComment({
                report: targetReport,
                notifyReportID: reportID,
                ancestors: targetReportAncestors,
                attachments: attachmentFileRef.current,
                currentUserAccountID: currentUserPersonalDetails.accountID,
                text: draftMessageTrimmed,
                timezone: currentUserPersonalDetails.timezone,
                shouldPlaySound: true,
                isInSidePanel,
            });
            attachmentFileRef.current = null;
            return;
        }

        const taskMatch = draftMessageTrimmed.match(CONST.REGEX.TASK_TITLE_WITH_OPTIONAL_SHORT_MENTION);
        if (taskMatch) {
            let taskTitle = taskMatch[3] ? taskMatch[3].trim().replaceAll('\n', ' ') : undefined;
            if (taskTitle) {
                const mention = taskMatch[1] ? taskMatch[1].trim() : '';
                const currentUserPrivateDomain = isEmailPublicDomain(currentUserEmail) ? '' : Str.extractEmailDomain(currentUserEmail);
                const mentionWithDomain = addDomainToShortMention(mention, availableLoginsList, currentUserPrivateDomain) ?? mention;
                const isValidMention = Str.isValidEmail(mentionWithDomain);

                let assignee: OnyxEntry<OnyxTypes.PersonalDetails>;
                let assigneeChatReport;
                if (mentionWithDomain) {
                    if (isValidMention) {
                        assignee = Object.values(personalDetails ?? {}).find((value) => value?.login === mentionWithDomain) ?? undefined;
                        if (!Object.keys(assignee ?? {}).length) {
                            const optimisticDataForNewAssignee = setNewOptimisticAssignee(currentUserPersonalDetails.accountID, {
                                accountID: generateAccountID(mentionWithDomain),
                                login: mentionWithDomain,
                            });
                            assignee = optimisticDataForNewAssignee.assignee;
                            assigneeChatReport = optimisticDataForNewAssignee.assigneeReport;
                        }
                    } else {
                        taskTitle = `@${mentionWithDomain} ${taskTitle}`;
                    }
                }
                createTaskAndNavigate({
                    parentReport: report,
                    title: taskTitle,
                    description: '',
                    assigneeEmail: assignee?.login ?? '',
                    currentUserAccountID: currentUserPersonalDetails.accountID,
                    currentUserEmail,
                    assigneeAccountID: assignee?.accountID,
                    assigneeChatReport,
                    policyID: report?.policyID,
                    isCreatedUsingMarkdown: true,
                    quickAction,
                    ancestors: reportAncestors,
                });
                return;
            }
        }

        const optimisticReportActionID = rand64();
        const isScrolledToBottom = scrollOffsetRef.current < CONST.REPORT.ACTIONS.ACTION_VISIBLE_THRESHOLD;
        if (isScrolledToBottom) {
            startSpan(`${CONST.TELEMETRY.SPAN_SEND_MESSAGE}_${optimisticReportActionID}`, {
                name: 'send-message',
                op: CONST.TELEMETRY.SPAN_SEND_MESSAGE,
                attributes: {
                    [CONST.TELEMETRY.ATTRIBUTE_REPORT_ID]: reportID,
                    [CONST.TELEMETRY.ATTRIBUTE_MESSAGE_LENGTH]: draftMessageTrimmed.length,
                },
            });
        }
        addComment({
            report: targetReport,
            notifyReportID: reportID,
            ancestors: targetReportAncestors,
            text: draftMessageTrimmed,
            timezoneParam: currentUserPersonalDetails.timezone ?? CONST.DEFAULT_TIME_ZONE,
            currentUserAccountID: currentUserPersonalDetails.accountID,
            shouldPlaySound: true,
            isInSidePanel,
            reportActionID: optimisticReportActionID,
        });
    };

    const submitDraftAndClearComposer = () => {
        if (isSendDisabled || !debouncedCommentMaxLengthValidation.flush()) {
            return;
        }

        if (isComposerFullSize) {
            setIsComposerFullSize(reportID, false);
        }

        // If there is a draft comment and we are submitting an edit, we don't want to clear the composer height and the draft comment.
        // Therefore, we directly trigger the validation and submission of the draft comment.
        if (isEditingInComposer && editingMessage !== null && draftComment) {
            validateAndSubmitDraft(editingMessage);
            return;
        }

        if (effectiveDraft !== null && effectiveDraft !== '') {
            composerRef.current?.resetHeight();
            if (isEditingInComposer) {
                setDidResetComposerHeight(true);
            }
        }

        scheduleOnUI(() => {
            const {clearWorklet} = composerRefShared.get();

            if (!clearWorklet) {
                throw new Error('The composerRef.clearWorklet function is not set yet. This should never happen, and indicates a developer error.');
            }

            clearWorklet?.();
        });
    };

    const setComposerRef = (ref: ComposerWithSuggestionsRef | null) => {
        composerRef.current = ref;
        composerRefShared.set({
            clearWorklet: ref?.clearWorklet,
        });
    };

    const composerState = {
        isFocused,
        isMenuVisible,
        isFullComposerAvailable,
        didResetComposerHeight,
    };

    const composerEditState = {
        isEditingInComposer,
        editingReportActionID,
        editingMessage,
        editingState,
    };

    const composerSendState = {
        isSendDisabled,
        debouncedCommentMaxLengthValidation,
        isExceedingMaxLength,
        exceededMaxLength,
        isBlockedFromConcierge,
        isTaskTitle,
    };

    const composerActions = {
        setText,
        setMenuVisibility,
        setIsFullComposerAvailable,
        setComposerRef,
        onBlur,
        onFocus,
        onAddActionPressed,
        onItemSelected,
        onTriggerAttachmentPicker,
        clearComposer,
    };

    const composerEditActions = {
        publishDraft,
        deleteDraft,
    };

    const composerSendActions = {
        validateAndSubmitDraft,
        submitDraftAndClearComposer,
    };

    const composerMeta = {
        containerRef,
        composerRef,
        suggestionsRef,
        actionButtonRef,
        isNextModalWillOpenRef,
        attachmentFileRef,
    };

    return (
        <ComposerTextContext.Provider value={text}>
            <ComposerStateContext.Provider value={composerState}>
                <ComposerSendStateContext.Provider value={composerSendState}>
                    <ComposerEditStateContext.Provider value={composerEditState}>
                        <ComposerActionsContext.Provider value={composerActions}>
                            <ComposerEditActionsContext.Provider value={composerEditActions}>
                                <ComposerSendActionsContext.Provider value={composerSendActions}>
                                    <ComposerMetaContext.Provider value={composerMeta}>{children}</ComposerMetaContext.Provider>
                                </ComposerSendActionsContext.Provider>
                            </ComposerEditActionsContext.Provider>
                        </ComposerActionsContext.Provider>
                    </ComposerEditStateContext.Provider>
                </ComposerSendStateContext.Provider>
            </ComposerStateContext.Provider>
        </ComposerTextContext.Provider>
    );
}

export default ComposerProvider;
export type {ComposerProviderProps};
