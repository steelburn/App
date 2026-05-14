import {PortalProvider} from '@gorhom/portal';
import {NavigationContainer} from '@react-navigation/native';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';
import Onyx from 'react-native-onyx';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';
import * as useResponsiveLayoutModule from '@hooks/useResponsiveLayout';
import type ResponsiveLayoutResult from '@hooks/useResponsiveLayout/types';
import * as useSearchSelectorModule from '@hooks/useSearchSelector';
import Navigation from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import {getEmptyOptions} from '@libs/OptionsListUtils';
import type {SettingsNavigatorParamList} from '@navigation/types';
import DynamicWorkspaceInvitePage from '@pages/workspace/DynamicWorkspaceInvitePage';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import * as LHNTestUtils from '../utils/LHNTestUtils';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@src/components/ConfirmedRoute.tsx');
jest.mock('@pages/workspace/withPolicyAndFullscreenLoading', () => (Component: React.ComponentType) => Component);
jest.mock('@components/withNavigationTransitionEnd', () => (Component: React.ComponentType) => Component);

TestHelper.setupGlobalFetchMock();

const Stack = createPlatformStackNavigator<SettingsNavigatorParamList>();

const renderPage = (policyID: string) => {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, CurrentReportIDContextProvider]}>
            <PortalProvider>
                <NavigationContainer>
                    <Stack.Navigator initialRouteName={SCREENS.WORKSPACE.DYNAMIC_WORKSPACE_INVITE}>
                        <Stack.Screen
                            name={SCREENS.WORKSPACE.DYNAMIC_WORKSPACE_INVITE}
                            component={DynamicWorkspaceInvitePage}
                            initialParams={{policyID}}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </PortalProvider>
        </ComposeProviders>,
    );
};

describe('DynamicWorkspaceInvitePage', () => {
    const ownerAccountID = 1;
    const ownerEmail = 'owner@example.com';
    const selfAccountID = 1206;
    const selfEmail = 'self@example.com';
    const inviteeEmail = 'invitee@example.com';
    const inviteeAccountID = 9999;

    const policy = {
        ...LHNTestUtils.getFakePolicy(),
        role: CONST.POLICY.ROLE.ADMIN,
        owner: ownerEmail,
        ownerAccountID,
        employeeList: {
            [ownerEmail]: {email: ownerEmail, role: CONST.POLICY.ROLE.ADMIN},
            [selfEmail]: {email: selfEmail, role: CONST.POLICY.ROLE.ADMIN},
        },
    };

    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(async () => {
        await TestHelper.signInWithTestUser(selfAccountID, selfEmail, undefined, 'Self');
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.EN);
            await Onyx.set(ONYXKEYS.PERSONAL_DETAILS_LIST, {
                [ownerAccountID]: TestHelper.buildPersonalDetails(ownerEmail, ownerAccountID, 'Owner'),
                [selfAccountID]: TestHelper.buildPersonalDetails(selfEmail, selfAccountID, 'Self'),
            });
            await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policy.id}`, policy);
        });
        jest.spyOn(useResponsiveLayoutModule, 'default').mockReturnValue({
            isSmallScreenWidth: false,
            shouldUseNarrowLayout: false,
        } as ResponsiveLayoutResult);
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        jest.clearAllMocks();
    });

    it('should dismiss keyboard before navigating when inviting users', async () => {
        const keyboardDismissSpy = jest.spyOn(Keyboard, 'dismiss');
        const navigateSpy = jest.spyOn(Navigation, 'navigate');

        // Mock useSearchSelector to return a selected option (simulating a user having selected an invitee)
        jest.spyOn(useSearchSelectorModule, 'default').mockReturnValue({
            searchTerm: '',
            debouncedSearchTerm: '',
            setSearchTerm: jest.fn(),
            searchOptions: getEmptyOptions(),
            availableOptions: getEmptyOptions(),
            selectedOptions: [{login: inviteeEmail, accountID: inviteeAccountID, selected: true, text: inviteeEmail}],
            selectedOptionsForDisplay: [{login: inviteeEmail, accountID: inviteeAccountID, selected: true, text: inviteeEmail}],
            setSelectedOptions: jest.fn(),
            toggleSelection: jest.fn(),
            areOptionsInitialized: true,
            onListEndReached: jest.fn(),
        });

        const {unmount} = renderPage(policy.id);
        await waitForBatchedUpdatesWithAct();

        // Press the "Next" button to trigger inviteUser
        await waitFor(() => {
            expect(screen.getByText('Next')).toBeOnTheScreen();
        });

        fireEvent.press(screen.getByText('Next'));
        await waitForBatchedUpdatesWithAct();

        // Verify Keyboard.dismiss was called
        expect(keyboardDismissSpy).toHaveBeenCalled();

        // Verify navigation happened after keyboard dismiss
        expect(navigateSpy).toHaveBeenCalled();

        // Verify keyboard was dismissed before navigation
        const keyboardDismissOrder = keyboardDismissSpy.mock.invocationCallOrder.at(0);
        const navigateOrder = navigateSpy.mock.invocationCallOrder.at(0);
        expect(keyboardDismissOrder).toBeDefined();
        expect(navigateOrder).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(keyboardDismissOrder!).toBeLessThan(navigateOrder!);

        unmount();
        keyboardDismissSpy.mockRestore();
        navigateSpy.mockRestore();
        await waitForBatchedUpdatesWithAct();
    });

    it('should disable the Next button when no users are selected', async () => {
        // Mock useSearchSelector to return no selected options
        jest.spyOn(useSearchSelectorModule, 'default').mockReturnValue({
            searchTerm: '',
            debouncedSearchTerm: '',
            setSearchTerm: jest.fn(),
            searchOptions: getEmptyOptions(),
            availableOptions: getEmptyOptions(),
            selectedOptions: [],
            selectedOptionsForDisplay: [],
            setSelectedOptions: jest.fn(),
            toggleSelection: jest.fn(),
            areOptionsInitialized: true,
            onListEndReached: jest.fn(),
        });

        const {unmount} = renderPage(policy.id);
        await waitForBatchedUpdatesWithAct();

        await waitFor(() => {
            expect(screen.getByText('Next')).toBeOnTheScreen();
        });

        // The Next button should be disabled when no users are selected
        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeOnTheScreen();

        unmount();
        await waitForBatchedUpdatesWithAct();
    });

    it('should save invited emails to account IDs draft when inviting users', async () => {
        // Mock useSearchSelector with a selected option
        jest.spyOn(useSearchSelectorModule, 'default').mockReturnValue({
            searchTerm: '',
            debouncedSearchTerm: '',
            setSearchTerm: jest.fn(),
            searchOptions: getEmptyOptions(),
            availableOptions: getEmptyOptions(),
            selectedOptions: [{login: inviteeEmail, accountID: inviteeAccountID, selected: true, text: inviteeEmail}],
            selectedOptionsForDisplay: [{login: inviteeEmail, accountID: inviteeAccountID, selected: true, text: inviteeEmail}],
            setSelectedOptions: jest.fn(),
            toggleSelection: jest.fn(),
            areOptionsInitialized: true,
            onListEndReached: jest.fn(),
        });

        const {unmount} = renderPage(policy.id);
        await waitForBatchedUpdatesWithAct();

        await waitFor(() => {
            expect(screen.getByText('Next')).toBeOnTheScreen();
        });

        fireEvent.press(screen.getByText('Next'));
        await waitForBatchedUpdatesWithAct();

        // Verify the draft was saved with the correct email-to-accountID mapping
        const draftKey = `${ONYXKEYS.COLLECTION.WORKSPACE_INVITE_MEMBERS_DRAFT}${policy.id}`;
        const connection = Onyx.connect({
            key: draftKey,
            callback: (value) => {
                expect(value).toEqual({[inviteeEmail]: inviteeAccountID});
                Onyx.disconnect(connection);
            },
        });

        unmount();
        await waitForBatchedUpdatesWithAct();
    });
});
