import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import type {TextSelection} from '@components/Composer/types';
import useAncestors from '@hooks/useAncestors';
import useOnyx from '@hooks/useOnyx';
import useTransactionThreadReportID from '@hooks/useTransactionThreadReportID';
import {getOriginalReportID, shouldExcludeAncestorReportAction} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

function NOOP() {
    return null;
}

/** Whether the report is currently being edited, is already submitted or is not editing any m */
type ReportActionEditMessageState = ValueOf<typeof CONST.REPORT_ACTION_EDIT_MESSAGE_STATE>;

type ReportActionActiveEdit = {
    /** The report ID */
    editingReportID: string | null;
    /** The report action ID */
    editingReportActionID: string | null;
    /** The report action */
    editingReportAction: OnyxTypes.ReportAction | null;
    /** The editing message */
    editingMessage: string | null;
};

type ReportActionEditMessageContextValue = ReportActionActiveEdit & {
    /** The current edit message selection */
    currentEditMessageSelection: TextSelection | null;
    /** The editing state */
    editingState: ReportActionEditMessageState;
};

type ReportActionEditMessageContextActions = {
    /** Set the editing message */
    setEditingMessage: Dispatch<SetStateAction<string | null>>;
    /** Set the current edit message selection */
    setCurrentEditMessageSelection: Dispatch<SetStateAction<TextSelection | null>>;
    /** Submit the edit */
    submitEdit: () => void;
    /** Stop the editing */
    stopEditing: () => void;
};

const ReportActionEditMessageContext = createContext<ReportActionEditMessageContextValue>({
    editingState: CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF,
    editingReportID: null,
    editingReportActionID: null,
    editingReportAction: null,
    editingMessage: null,
    currentEditMessageSelection: null,
});

const ReportActionEditMessageActionsContext = createContext<ReportActionEditMessageContextActions>({
    setEditingMessage: NOOP,
    setCurrentEditMessageSelection: NOOP,
    submitEdit: NOOP,
    stopEditing: NOOP,
});

type ReportActionEditMessageContextProviderProps = {
    /** The report ID */
    reportID: string | undefined;
    /**
     * When set, drafts for edits that render on money-request views but persist under the
     * one-transaction thread report are wired into this provider. Omit on non-money-request
     * screens, or supply the effective ID from `useTransactionThreadReportID` /
     * `ReportScreenEditMessageProviderWithTransactionThread`.
     */
    effectiveTransactionThreadReportID?: string;
    /** The children */
    children: React.ReactNode;
};

function ReportActionEditMessageContextProvider({reportID, effectiveTransactionThreadReportID, children}: ReportActionEditMessageContextProviderProps) {
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
    const ancestors = useAncestors(report, shouldExcludeAncestorReportAction);

    // In one-transaction reports, the visible action can belong to the transaction thread report.
    // Edit drafts are stored against that owner report ID, so the edit state has to watch it too.
    // Sent-money reports do not surface transaction-thread actions in this view; use the effective ID so we
    // never pull drafts from a thread that is not editable here.
    // This is not automatically memoized by React Compiler, therefore we need to use useMemo to avoid infinite re-renders.
    const additionalReportIDs = useMemo(() => {
        const shouldIncludeTransactionThreadReport =
            !!effectiveTransactionThreadReportID && effectiveTransactionThreadReportID !== CONST.FAKE_REPORT_ID && effectiveTransactionThreadReportID !== reportID;
        return shouldIncludeTransactionThreadReport ? [effectiveTransactionThreadReportID] : [];
    }, [effectiveTransactionThreadReportID, reportID]);

    const reportActionsSelector = useCallback(
        (allReportActions: OnyxCollection<OnyxTypes.ReportActions>) => {
            if (!allReportActions) {
                return {};
            }
            const result: OnyxCollection<OnyxTypes.ReportActions> = {};

            // Visible-report actions — required when the draft sits on this report (`reportDraftEntry` resolves `reportActionID` → need the row).
            if (reportID) {
                const visibleReportActionsKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`;
                result[visibleReportActionsKey] = allReportActions[visibleReportActionsKey];
            }

            for (const additionalReportID of additionalReportIDs) {
                const additionalReportActionsKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${additionalReportID}`;
                result[additionalReportActionsKey] = allReportActions[additionalReportActionsKey];
            }
            for (const ancestor of ancestors) {
                const ancestorReportActionsKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestor.report.reportID}`;
                result[ancestorReportActionsKey] = allReportActions[ancestorReportActionsKey];
            }

            return result;
        },
        [additionalReportIDs, ancestors, reportID],
    );

    const [reportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS, {selector: reportActionsSelector}, [reportActionsSelector]);

    const reportActionsDraftsSelector = useCallback(
        (allDrafts: OnyxCollection<OnyxTypes.ReportActionsDrafts>) => {
            if (!allDrafts) {
                return {};
            }
            const result: OnyxCollection<OnyxTypes.ReportActionsDrafts> = {};
            if (reportID) {
                const currentDraftKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${reportID}`;
                result[currentDraftKey] = allDrafts[currentDraftKey];
            }
            for (const additionalReportID of additionalReportIDs) {
                const additionalDraftKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${additionalReportID}`;
                result[additionalDraftKey] = allDrafts[additionalDraftKey];
            }
            for (const ancestor of ancestors) {
                const reportActionsForAncestor = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestor.report.reportID}`];
                const originalReportID = getOriginalReportID(ancestor.report.reportID, ancestor.reportAction, reportActionsForAncestor);
                if (!originalReportID) {
                    continue;
                }
                const draftKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${originalReportID}`;
                result[draftKey] = allDrafts[draftKey];
            }
            return result;
        },
        [additionalReportIDs, ancestors, reportActions, reportID],
    );

    const [reportActionsDrafts] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS, {selector: reportActionsDraftsSelector}, [reportActionsDraftsSelector]);

    const [editingState, setEditingState] = useState<ReportActionEditMessageState>(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF);
    const [prevEditingReportActionID, setPrevEditingReportActionID] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<string | null>(null);
    const [currentEditMessageSelection, setCurrentEditMessageSelectionState] = useState<TextSelection | null>(null);

    const reportDrafts = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${reportID}`];
    const reportDraftEntry = Object.entries(reportDrafts ?? {}).find(([, draft]) => draft?.message !== undefined);
    const additionalReportWithDraft = additionalReportIDs
        .map((additionalReportID) => {
            const additionalDrafts = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${additionalReportID}`];
            const additionalDraftEntry = Object.entries(additionalDrafts ?? {}).find(([, draft]) => draft?.message !== undefined);
            if (!additionalDraftEntry) {
                return null;
            }

            const [reportActionIDOfDraft, reportActionDraft] = additionalDraftEntry;
            const reportActionsForAdditionalReport = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${additionalReportID}`];
            const reportAction = reportActionsForAdditionalReport?.[reportActionIDOfDraft];
            if (!reportAction) {
                return null;
            }

            return {
                reportID: additionalReportID,
                reportActionID: reportActionIDOfDraft,
                reportAction,
                draft: reportActionDraft,
            };
        })
        .find((additionalDraft): additionalDraft is NonNullable<typeof additionalDraft> => additionalDraft !== null);

    let editingReportID: string | null = null;
    let editingReportActionID: string | null = null;
    let editingReportAction: OnyxTypes.ReportAction | null = null;

    const ancestorWithDraft = [...ancestors]
        .slice()
        .reverse()
        .find(({report: ancestorReport, reportAction}) => {
            const reportActionsForAncestor = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestorReport.reportID}`];
            const origID = getOriginalReportID(ancestorReport.reportID, reportAction, reportActionsForAncestor);
            if (!origID) {
                return false;
            }
            const ancestorDrafts = reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${origID}`];
            const ancestorDraft = ancestorDrafts?.[reportAction.reportActionID];

            return ancestorDraft?.message !== undefined;
        });

    const updateMessage = (nextMessage: string | null) => {
        if (nextMessage == null) {
            return;
        }

        const didReportActionChange = prevEditingReportActionID !== editingReportActionID;
        if (didReportActionChange) {
            setEditingMessage(nextMessage);
            setPrevEditingReportActionID(editingReportActionID);
            const defaultSelection: TextSelection = {start: nextMessage.length, end: nextMessage.length};
            setCurrentEditMessageSelectionState(defaultSelection);
        }
    };

    if (ancestorWithDraft) {
        const {report: ancestorReport, reportAction: ancestorReportAction} = ancestorWithDraft;
        const reportActionsForAncestor = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${ancestorReport.reportID}`];
        const ancestorOrigReportID = getOriginalReportID(ancestorReport.reportID, ancestorReportAction, reportActionsForAncestor);
        const ancestorDrafts = ancestorOrigReportID ? reportActionsDrafts?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${ancestorOrigReportID}`] : undefined;
        const ancestorReportActionDraft = ancestorDrafts?.[ancestorReportAction.reportActionID];

        editingReportID = ancestorReport.reportID;
        editingReportActionID = ancestorReportAction.reportActionID;
        editingReportAction = ancestorReportAction;

        if (editingState === CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF) {
            setEditingState(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.EDITING);
        }

        const nextMessage = ancestorReportActionDraft?.message ?? null;
        updateMessage(nextMessage);
    } else if (reportDraftEntry) {
        const [reportActionIDOfDraft, reportActionDraft] = reportDraftEntry;

        editingReportID = reportID ?? null;
        editingReportActionID = reportActionIDOfDraft;
        editingReportAction = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`]?.[reportActionIDOfDraft] ?? null;

        if (editingState === CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF) {
            setEditingState(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.EDITING);
        }

        const nextMessage = reportActionDraft?.message ?? null;
        updateMessage(nextMessage);
    } else if (additionalReportWithDraft) {
        editingReportID = additionalReportWithDraft.reportID;
        editingReportActionID = additionalReportWithDraft.reportActionID;
        editingReportAction = additionalReportWithDraft.reportAction;

        if (editingState === CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF) {
            setEditingState(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.EDITING);
        }

        const nextMessage = additionalReportWithDraft.draft?.message ?? null;
        updateMessage(nextMessage);
    }

    const submitEdit = () => {
        setEditingState(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.SUBMITTED);
    };

    const stopEditing = () => {
        setEditingState(CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF);
        setEditingMessage(null);
        setPrevEditingReportActionID(null);
        setCurrentEditMessageSelectionState(null);
    };

    if (editingReportID == null && editingState !== CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.OFF) {
        stopEditing();
    }

    const setCurrentEditMessageSelection = (setSelectionStateAction: SetStateAction<TextSelection | null>) => {
        if (editingState !== CONST.REPORT_ACTION_EDIT_MESSAGE_STATE.EDITING) {
            return;
        }

        setCurrentEditMessageSelectionState(setSelectionStateAction);
    };

    const reportActionEditMessageContextValue: ReportActionEditMessageContextValue = {
        editingState,
        editingReportID,
        editingReportActionID,
        editingReportAction,
        editingMessage,
        currentEditMessageSelection,
    };

    const actions: ReportActionEditMessageContextActions = {
        setEditingMessage,
        setCurrentEditMessageSelection,
        submitEdit,
        stopEditing,
    };

    return (
        <ReportActionEditMessageContext.Provider value={reportActionEditMessageContextValue}>
            <ReportActionEditMessageActionsContext.Provider value={actions}>{children}</ReportActionEditMessageActionsContext.Provider>
        </ReportActionEditMessageContext.Provider>
    );
}

type ReportScreenEditMessageProviderWithTransactionThreadProps = {
    reportID: string | undefined;
    children: React.ReactNode;
};

/** Wires `effectiveTransactionThreadReportID` from `useTransactionThreadReportID` for money-request report views. */
function ReportScreenEditMessageProviderWithTransactionThread({reportID, children}: ReportScreenEditMessageProviderWithTransactionThreadProps) {
    const {effectiveTransactionThreadReportID} = useTransactionThreadReportID(reportID);
    return (
        <ReportActionEditMessageContextProvider
            effectiveTransactionThreadReportID={effectiveTransactionThreadReportID}
            reportID={reportID}
        >
            {children}
        </ReportActionEditMessageContextProvider>
    );
}

function useReportActionActiveEdit() {
    return useContext(ReportActionEditMessageContext);
}

function useReportActionActiveEditActions() {
    return useContext(ReportActionEditMessageActionsContext);
}

export {
    ReportActionEditMessageContextProvider,
    ReportScreenEditMessageProviderWithTransactionThread,
    useReportActionActiveEdit,
    useReportActionActiveEditActions,
    ReportActionEditMessageContext,
};
export type {ReportActionActiveEdit, ReportActionEditMessageContextValue, ReportActionEditMessageState};
