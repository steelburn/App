import {act, renderHook} from '@testing-library/react-native';
import type {OnyxEntry} from 'react-native-onyx';
import useCreateReportAction from '@hooks/useCreateReportAction';
import useOnyx from '@hooks/useOnyx';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Policy} from '@src/types/onyx';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('@hooks/useLocalize', () => () => ({translate: jest.fn((key: string) => key)}));

jest.mock('@hooks/useOnyx', () => jest.fn());
const mockUseOnyx = useOnyx as jest.MockedFunction<typeof useOnyx>;

jest.mock('@hooks/useHasEmptyReportsForPolicy', () => jest.fn(() => false));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseHasEmptyReportsForPolicy = require('@hooks/useHasEmptyReportsForPolicy') as jest.Mock;

const mockOpenCreateReportConfirmation = jest.fn();
jest.mock('@hooks/useCreateEmptyReportConfirmation', () =>
    jest.fn(() => ({
        openCreateReportConfirmation: mockOpenCreateReportConfirmation,
        CreateReportConfirmationModal: null,
    })),
);

const mockShowRedirectToExpensifyClassicModal = jest.fn();
const mockUseRedirectToExpensifyClassic = jest.fn(() => ({
    shouldRedirectToExpensifyClassic: false,
    canRedirectToExpensifyClassic: false,
    canUseAction: true,
    showRedirectToExpensifyClassicModal: mockShowRedirectToExpensifyClassicModal,
}));
jest.mock('@pages/inbox/sidebar/FABPopoverContent/useRedirectToExpensifyClassic', () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    default: () => mockUseRedirectToExpensifyClassic(),
}));

jest.mock('@libs/PolicyUtils', () => ({
    getDefaultChatEnabledPolicy: jest.fn((policies: Array<OnyxEntry<Policy>>) => policies.at(0) ?? undefined),
}));

jest.mock('@libs/interceptAnonymousUser', () => jest.fn((cb: () => void) => cb()));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
}));

const reportIDCounter = {value: 100};
jest.mock('@libs/ReportUtils', () => ({
    generateReportID: jest.fn(() => String(++reportIDCounter.value)),
}));

const mockShouldRestrictUserBillableActions = jest.fn(() => false);
jest.mock('@libs/SubscriptionUtils', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    shouldRestrictUserBillableActions: (...args: Parameters<typeof mockShouldRestrictUserBillableActions>) => mockShouldRestrictUserBillableActions(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const POLICY_ID = 'policy-123';

function makePaidPolicy(id = POLICY_ID): OnyxEntry<Policy> {
    return {
        id,
        name: 'Test Workspace',
        role: CONST.POLICY.ROLE.ADMIN,
        type: CONST.POLICY.TYPE.TEAM,
        isPolicyExpenseChatEnabled: true,
        owner: 'test@test.com',
        ownerAccountID: 1,
        outputCurrency: 'USD',
        employeeList: {},
    } as OnyxEntry<Policy>;
}

function setupUseOnyx(overrides: Record<string, unknown> = {}) {
    const impl = ((key: string, options?: {selector?: (value: unknown) => unknown}) => {
        const rawValue = key in overrides ? overrides[key] : undefined;
        const value = options?.selector ? options.selector(rawValue) : rawValue;
        return [value, {status: 'loaded'}];
    }) as typeof useOnyx;
    mockUseOnyx.mockImplementation(impl);
}

function setupRedirectToExpensifyClassic({shouldRedirect = false, canRedirect = false}: {shouldRedirect?: boolean; canRedirect?: boolean} = {}) {
    mockUseRedirectToExpensifyClassic.mockReturnValue({
        shouldRedirectToExpensifyClassic: shouldRedirect,
        canRedirectToExpensifyClassic: canRedirect,
        canUseAction: !shouldRedirect || canRedirect,
        showRedirectToExpensifyClassicModal: mockShowRedirectToExpensifyClassicModal,
    });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useCreateReportAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        reportIDCounter.value = 100;
        mockShouldRestrictUserBillableActions.mockReturnValue(false);
        mockUseHasEmptyReportsForPolicy.mockReturnValue(false);
        setupUseOnyx();
        setupRedirectToExpensifyClassic();
    });

    describe('upgrade path (no policies)', () => {
        it('navigates to upgrade path when user has no group policies', () => {
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(Navigation.navigate).toHaveBeenCalledTimes(1);
            const navigateArg = jest.mocked(Navigation.navigate).mock.calls.at(0)?.at(0) as string;
            expect(navigateArg).toContain('upgrade');
            expect(navigateArg).toContain(CONST.UPGRADE_PATHS.REPORTS);
            expect(onCreateReport).not.toHaveBeenCalled();
        });
    });

    describe('redirect to Expensify Classic', () => {
        it('shows classic redirect modal when shouldRedirectToExpensifyClassic is true', () => {
            setupRedirectToExpensifyClassic({shouldRedirect: true, canRedirect: true});
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(mockShowRedirectToExpensifyClassicModal).toHaveBeenCalledTimes(1);
            expect(onCreateReport).not.toHaveBeenCalled();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });

    describe('workspace selection', () => {
        it('navigates to workspace selector when default policy ID is not available', () => {
            const onCreateReport = jest.fn();
            // Pass array with undefined so getDefaultChatEnabledPolicy returns undefined
            const policies = [undefined] as Array<OnyxEntry<Policy>>;

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.NEW_REPORT_WORKSPACE_SELECTION.getRoute());
            expect(onCreateReport).not.toHaveBeenCalled();
        });

        it('navigates to workspace selector when restricted with multiple workspaces', () => {
            mockShouldRestrictUserBillableActions.mockReturnValue(true);
            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy('p1'), makePaidPolicy('p2')];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.NEW_REPORT_WORKSPACE_SELECTION.getRoute());
        });
    });

    describe('direct report creation', () => {
        it('calls onCreateReport directly when workspace is valid and no confirmation needed', () => {
            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy()];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(onCreateReport).toHaveBeenCalledWith(false);
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('opens empty report confirmation when policy has empty reports', () => {
            mockUseHasEmptyReportsForPolicy.mockReturnValue(true);
            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy()];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(mockOpenCreateReportConfirmation).toHaveBeenCalledTimes(1);
            expect(onCreateReport).not.toHaveBeenCalled();
        });
    });

    describe('restricted action', () => {
        it('navigates to restricted action when single workspace is billing-restricted', () => {
            mockShouldRestrictUserBillableActions.mockReturnValue(true);
            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy()];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.RESTRICTED_ACTION.getRoute(POLICY_ID));
            expect(onCreateReport).not.toHaveBeenCalled();
        });
    });

    describe('decision flow priority', () => {
        it('classic redirect takes priority over upgrade path', () => {
            setupRedirectToExpensifyClassic({shouldRedirect: true, canRedirect: true});
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(mockShowRedirectToExpensifyClassicModal).toHaveBeenCalledTimes(1);
            // Should NOT navigate to upgrade
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('upgrade path takes priority over workspace selection when no policies exist', () => {
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            const navigateArg = jest.mocked(Navigation.navigate).mock.calls.at(0)?.at(0) as string;
            expect(navigateArg).toContain('upgrade');
        });
    });

    describe('policies loaded with valid workspace', () => {
        it('does not navigate to upgrade path when user has a workspace', () => {
            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy()];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            // Should call onCreateReport directly, not navigate to upgrade
            expect(onCreateReport).toHaveBeenCalledWith(false);
            const calls = jest.mocked(Navigation.navigate).mock.calls;
            const navigatedToUpgrade = calls.some((call) => {
                const firstArg = call.at(0);
                return typeof firstArg === 'string' && firstArg.includes('upgrade');
            });
            expect(navigatedToUpgrade).toBe(false);
        });
    });

    describe('empty report confirmation dismissed', () => {
        it('calls onCreateReport directly when confirmation was previously dismissed', () => {
            mockUseHasEmptyReportsForPolicy.mockReturnValue(true);
            setupUseOnyx({
                [ONYXKEYS.NVP_EMPTY_REPORTS_CONFIRMATION_DISMISSED]: true,
            });

            const onCreateReport = jest.fn();
            const policies = [makePaidPolicy()];

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: policies,
                }),
            );

            act(() => {
                result.current.createReportAction();
            });

            expect(onCreateReport).toHaveBeenCalledWith(false);
            expect(mockOpenCreateReportConfirmation).not.toHaveBeenCalled();
        });
    });

    describe('returns', () => {
        it('returns createReportAction function and isVisible flag', () => {
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            expect(typeof result.current.createReportAction).toBe('function');
            expect(typeof result.current.isVisible).toBe('boolean');
        });

        it('isVisible is true when policies exist', () => {
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [makePaidPolicy()],
                }),
            );

            expect(result.current.isVisible).toBe(true);
        });

        it('isVisible is true when classic redirect is available', () => {
            setupRedirectToExpensifyClassic({shouldRedirect: true, canRedirect: true});
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            expect(result.current.isVisible).toBe(true);
        });

        it('isVisible is false when classic redirect is required but not usable', () => {
            setupRedirectToExpensifyClassic({shouldRedirect: true, canRedirect: false});
            const onCreateReport = jest.fn();

            const {result} = renderHook(() =>
                useCreateReportAction({
                    onCreateReport,
                    groupPoliciesWithChatEnabled: [],
                }),
            );

            expect(result.current.isVisible).toBe(false);
        });
    });
});
