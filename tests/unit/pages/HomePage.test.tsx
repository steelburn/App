/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {render, screen} from '@testing-library/react-native';
import React from 'react';
import Onyx from 'react-native-onyx';
import HomePage from '@pages/home/HomePage';
import OnyxListItemProvider from '@src/components/OnyxListItemProvider';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@hooks/useResponsiveLayout', () => jest.fn(() => ({shouldUseNarrowLayout: true})));
jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: (key: string) => key,
    })),
);
jest.mock('@hooks/useDocumentTitle', () => jest.fn());
jest.mock('@hooks/useConfirmReadyToOpenApp', () => jest.fn());
jest.mock('@libs/Navigation/AppNavigator/usePreloadFullScreenNavigators', () => jest.fn());
jest.mock('@hooks/useThemeStyles', () =>
    jest.fn(() => ({
        flex1: {},
        homePageContentContainer: {},
        homePageMainLayout: () => ({}),
        homePageLeftColumn: {},
        homePageRightColumn: {},
    })),
);

jest.mock('@components/ScreenWrapper', () => {
    const ReactModule = require('react');
    function MockScreenWrapper({children}: {children: React.ReactNode}) {
        return ReactModule.createElement(ReactModule.Fragment, null, children);
    }
    return MockScreenWrapper;
});
jest.mock('@components/ScrollView', () => {
    const ReactModule = require('react');
    function MockScrollView({children}: {children: React.ReactNode}) {
        return ReactModule.createElement(ReactModule.Fragment, null, children);
    }
    return MockScrollView;
});
jest.mock('@components/Navigation/NavigationTabBar', () => {
    function MockNavigationTabBar() {
        return null;
    }
    return MockNavigationTabBar;
});
jest.mock('@components/Navigation/QuickCreationActionsBar', () => {
    function MockQuickCreationActionsBar() {
        return null;
    }
    return MockQuickCreationActionsBar;
});
jest.mock('@components/Navigation/TopBar', () => {
    function MockTopBar() {
        return null;
    }
    return MockTopBar;
});
jest.mock('@components/ReceiptScanDropZone', () => {
    function MockReceiptScanDropZone() {
        return null;
    }
    return MockReceiptScanDropZone;
});

jest.mock('@pages/home/ForYouSection', () => {
    const ReactModule = require('react');
    const {View: RNView} = require('react-native');
    function MockForYouSection() {
        return ReactModule.createElement(RNView, {testID: 'section-ForYouSection'});
    }
    return MockForYouSection;
});
jest.mock('@pages/home/GettingStartedSection', () => {
    const ReactModule = require('react');
    const {View: RNView} = require('react-native');
    function MockGettingStartedSection() {
        return ReactModule.createElement(RNView, {testID: 'section-GettingStartedSection'});
    }
    return MockGettingStartedSection;
});
jest.mock('@pages/home/AnnouncementSection', () => {
    function MockAnnouncementSection() {
        return null;
    }
    return MockAnnouncementSection;
});
jest.mock('@pages/home/AssignedCardsSection', () => {
    function MockAssignedCardsSection() {
        return null;
    }
    return MockAssignedCardsSection;
});
jest.mock('@pages/home/DiscoverSection', () => {
    function MockDiscoverSection() {
        return null;
    }
    return MockDiscoverSection;
});
jest.mock('@pages/home/FreeTrialSection', () => {
    function MockFreeTrialSection() {
        return null;
    }
    return MockFreeTrialSection;
});
jest.mock('@pages/home/SpendOverTimeSection', () => {
    function MockSpendOverTimeSection() {
        return null;
    }
    return MockSpendOverTimeSection;
});
jest.mock('@pages/home/TimeSensitiveSection', () => {
    function MockTimeSensitiveSection() {
        return null;
    }
    return MockTimeSensitiveSection;
});
jest.mock('@pages/home/UpcomingTravelSection', () => {
    function MockUpcomingTravelSection() {
        return null;
    }
    return MockUpcomingTravelSection;
});

const renderHomePage = () =>
    render(
        <OnyxListItemProvider>
            <HomePage />
        </OnyxListItemProvider>,
    );

function getSectionOrder() {
    const forYou = screen.getByTestId('section-ForYouSection');
    const gettingStarted = screen.getByTestId('section-GettingStartedSection');
    const all = screen.getAllByTestId(/^section-/);
    return {
        forYouIndex: all.indexOf(forYou),
        gettingStartedIndex: all.indexOf(gettingStarted),
    };
}

describe('HomePage mobile ordering', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('renders ForYouSection before GettingStartedSection when introSelected.choice is TRACK_WORKSPACE on narrow layout', async () => {
        await Onyx.set(ONYXKEYS.NVP_INTRO_SELECTED, {
            choice: CONST.ONBOARDING_CHOICES.TRACK_WORKSPACE,
        });
        await waitForBatchedUpdates();

        renderHomePage();

        const {forYouIndex, gettingStartedIndex} = getSectionOrder();
        expect(forYouIndex).toBeGreaterThanOrEqual(0);
        expect(gettingStartedIndex).toBeGreaterThanOrEqual(0);
        expect(forYouIndex).toBeLessThan(gettingStartedIndex);
    });

    it('renders ForYouSection before GettingStartedSection when introSelected.choice is undefined but onboardingPurpose is TRACK_WORKSPACE on narrow layout', async () => {
        await Onyx.set(ONYXKEYS.ONBOARDING_PURPOSE_SELECTED, CONST.ONBOARDING_CHOICES.TRACK_WORKSPACE as never);
        await waitForBatchedUpdates();

        renderHomePage();

        const {forYouIndex, gettingStartedIndex} = getSectionOrder();
        expect(forYouIndex).toBeGreaterThanOrEqual(0);
        expect(gettingStartedIndex).toBeGreaterThanOrEqual(0);
        expect(forYouIndex).toBeLessThan(gettingStartedIndex);
    });

    it('keeps GettingStartedSection before ForYouSection when intent is MANAGE_TEAM on narrow layout', async () => {
        await Onyx.set(ONYXKEYS.NVP_INTRO_SELECTED, {
            choice: CONST.ONBOARDING_CHOICES.MANAGE_TEAM,
        });
        await waitForBatchedUpdates();

        renderHomePage();

        const {forYouIndex, gettingStartedIndex} = getSectionOrder();
        expect(forYouIndex).toBeGreaterThanOrEqual(0);
        expect(gettingStartedIndex).toBeGreaterThanOrEqual(0);
        expect(gettingStartedIndex).toBeLessThan(forYouIndex);
    });
});
