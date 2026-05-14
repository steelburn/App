/**
 * Base Navigation mock shared across all tests.
 * The global mock in jest/setup.ts uses this directly.
 * Test files with custom Navigation needs can spread it and add overrides:
 *
 *   jest.mock('@libs/Navigation/Navigation', () => ({
 *       ...require('@testUtils/createNavigationMock').default,
 *       customProp: jest.fn(),
 *   }));
 */
const baseNavigationMock = {
    getActiveRouteWithoutParams: jest.fn(() => ''),
    isNavigationReady: jest.fn(() => Promise.resolve()),
    navigate: jest.fn(),
    goBack: jest.fn(),
    getActiveRoute: jest.fn(() => ''),
    dismissModal: jest.fn(),
    dismissModalWithReport: jest.fn(),
    setNavigationActionToMicrotaskQueue: jest.fn((callback: () => void) => callback?.()),
};

export default baseNavigationMock;
