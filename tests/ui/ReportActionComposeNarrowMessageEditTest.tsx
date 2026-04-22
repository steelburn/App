/* eslint-disable @typescript-eslint/naming-convention */
import type * as NativeNavigation from '@react-navigation/native';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {PropsWithChildren} from 'react';
import Onyx from 'react-native-onyx';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {KeyboardStateProvider} from '@components/withKeyboardState';
import * as Report from '@libs/actions/Report';
import type {ReportActionComposeProps} from '@pages/inbox/report/ReportActionCompose/ReportActionCompose';
import ReportActionCompose from '@pages/inbox/report/ReportActionCompose/ReportActionCompose';
import {ReportActionEditMessageContextProvider} from '@pages/inbox/report/ReportActionEditMessageContext';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import * as LHNTestUtils from '../utils/LHNTestUtils';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// Narrow layout: message edits happen in the main composer (ComposerWithSuggestions + useEditComposerToggle),
// and ReportActionCompose swaps the attachment action row for edit chrome (ComposerEditingButtons).

jest.mock('@hooks/useResponsiveLayout', () => ({
    __esModule: true,
    default: () => ({
        shouldUseNarrowLayout: true,
        isSmallScreenWidth: true,
        isInNarrowPaneModal: false,
        isExtraSmallScreenHeight: false,
        isExtraSmallScreenWidth: false,
        isMediumScreenWidth: false,
        onboardingIsMediumOrLargerScreenWidth: false,
        isLargeScreenWidth: false,
        isSmallScreen: true,
    }),
}));

jest.mock('@libs/getPlatform', () => ({
    __esModule: true,
    default: () => 'web',
}));

jest.mock('@libs/ComponentUtils', () => ({
    forceClearInput: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: jest.fn((key: string) => key),
        numberFormat: jest.fn((num: number) => num.toString()),
    })),
);

jest.mock('@hooks/usePaginatedReportActions', () => jest.fn(() => ({reportActions: [], hasNewerActions: false, hasOlderActions: false})));
jest.mock('@hooks/useParentReportAction', () => jest.fn(() => null));
jest.mock('@hooks/useReportTransactionsCollection', () => jest.fn(() => ({})));
jest.mock('@hooks/useShortMentionsList', () => jest.fn(() => ({availableLoginsList: []})));
jest.mock('@hooks/useSidePanelState', () => jest.fn(() => ({sessionStartTime: null})));

jest.mock('@components/DropZone/DualDropZone', () => {
    const RN = jest.requireActual<Record<string, React.ComponentType<{testID?: string; children?: React.ReactNode}>>>('react-native');
    return ({shouldAcceptSingleReceipt}: {shouldAcceptSingleReceipt?: boolean}) => (
        <RN.Text testID="dual-drop-zone">{shouldAcceptSingleReceipt ? 'receipt-editable' : 'receipt-not-editable'}</RN.Text>
    );
});

const mockRouteReportID = {current: '1'};

jest.mock('@react-navigation/native', () => ({
    ...((): typeof NativeNavigation => {
        return jest.requireActual('@react-navigation/native');
    })(),
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    })),
    useIsFocused: jest.fn(() => true),
    useRoute: jest.fn(() => ({key: '', name: '', params: {reportID: mockRouteReportID.current}})),
}));

TestHelper.setupGlobalFetchMock();

const defaultReport = LHNTestUtils.getFakeReport();
mockRouteReportID.current = defaultReport.reportID;

const defaultProps: ReportActionComposeProps = {
    reportID: defaultReport.reportID,
};

const commentAction = {
    ...LHNTestUtils.getFakeReportAction(),
    actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
};

function ReportActionEditMessageContextProviderForReport({children}: PropsWithChildren) {
    return <ReportActionEditMessageContextProvider reportID={defaultReport.reportID}>{children}</ReportActionEditMessageContextProvider>;
}

function ReportScreenProviders({children}: PropsWithChildren) {
    return <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, KeyboardStateProvider, ReportActionEditMessageContextProviderForReport]}>{children}</ComposeProviders>;
}

const saveReportActionDraftSpy = jest.spyOn(Report, 'saveReportActionDraft');

function renderNarrowReportActionCompose() {
    return render(
        <ReportScreenProviders>
            <ReportActionCompose
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...defaultProps}
            />
        </ReportScreenProviders>,
    );
}

describe('ReportActionCompose — narrow layout message edit flow', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
            evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS],
        });
    });

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(async () => {
        jest.useRealTimers();
        await act(async () => {
            await Onyx.clear();
        });
        saveReportActionDraftSpy.mockClear();
    });

    it('shows edit chrome (close) instead of the create control while a report action draft is open', async () => {
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${defaultReport.reportID}`, {
                [commentAction.reportActionID]: commentAction,
            });
            await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS, {
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${defaultReport.reportID}`]: {
                    [commentAction.reportActionID]: {message: 'Edit me in the composer'},
                },
            });
        });
        await waitForBatchedUpdatesWithAct();

        renderNarrowReportActionCompose();
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByLabelText('common.close')).toBeOnTheScreen();
        expect(screen.queryByLabelText('common.create')).toBeNull();
    });

    it('loads the draft into the composer and debounces saveReportActionDraft while typing in edit mode', async () => {
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${defaultReport.reportID}`, {
                [commentAction.reportActionID]: commentAction,
            });
            await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS, {
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${defaultReport.reportID}`]: {
                    [commentAction.reportActionID]: {message: 'Start'},
                },
            });
        });
        await waitForBatchedUpdatesWithAct();

        renderNarrowReportActionCompose();
        await waitForBatchedUpdatesWithAct();

        const composer = screen.getByTestId('composer');
        await waitFor(() => {
            expect(composer.props.value).toBe('Start');
        });

        fireEvent.changeText(composer, 'Start, edited');

        act(() => {
            jest.advanceTimersByTime(1100);
        });
        await waitForBatchedUpdatesWithAct();

        expect(saveReportActionDraftSpy).toHaveBeenCalled();
        const lastCall = saveReportActionDraftSpy.mock.calls.at(-1);
        expect(lastCall?.[0]).toBe(defaultReport.reportID);
        expect(lastCall?.[2]).toBe('Start, edited');
    });

    it('leaves edit mode and restores default composer actions when the user cancels', async () => {
        await act(async () => {
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${defaultReport.reportID}`, defaultReport);
            await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${defaultReport.reportID}`, {
                [commentAction.reportActionID]: commentAction,
            });
            await Onyx.mergeCollection(ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS, {
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${defaultReport.reportID}`]: {
                    [commentAction.reportActionID]: {message: 'To cancel'},
                },
            });
        });
        await waitForBatchedUpdatesWithAct();

        renderNarrowReportActionCompose();
        await waitForBatchedUpdatesWithAct();

        const cancelButton = screen.getByLabelText('common.close');
        fireEvent.press(cancelButton);
        await waitForBatchedUpdatesWithAct();

        await waitFor(() => {
            expect(screen.getByLabelText('common.create')).toBeOnTheScreen();
        });
        expect(screen.queryByLabelText('common.close')).toBeNull();
    });
});
