import {render} from '@testing-library/react-native';
import React from 'react';
import useOnyx from '@hooks/useOnyx';
import EditNamePage from '@pages/settings/Agents/Fields/EditNamePage';
import ONYXKEYS from '@src/ONYXKEYS';

jest.mock('@userActions/Agent', () => ({
    updateAgentName: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: (key: string) => key,
    })),
);

jest.mock('@hooks/useThemeStyles', () =>
    jest.fn(
        () =>
            new Proxy(
                {},
                {
                    get: () => ({}),
                },
            ),
    ),
);

jest.mock('@hooks/useOnyx', () => jest.fn(() => [undefined, {status: 'loaded'}]));

jest.mock('@libs/Navigation/Navigation', () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actual = jest.requireActual('@react-navigation/native');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...actual,
        useIsFocused: () => true,
        useRoute: jest.fn(() => ({name: '', key: '', params: {}})),
    };
});

jest.mock('@components/ScreenWrapper', () => {
    function MockScreenWrapper({children}: {children: React.ReactNode}) {
        return children;
    }
    return MockScreenWrapper;
});

jest.mock('@components/HeaderWithBackButton', () => {
    function MockHeader({title}: {title: string}) {
        return title;
    }
    return MockHeader;
});

jest.mock('@components/Form/FormProvider', () => {
    function MockFormProvider({children}: {children: React.ReactNode}) {
        return children;
    }
    return MockFormProvider;
});

jest.mock('@components/Form/InputWrapper', () => {
    function MockInputWrapper({inputID, defaultValue}: {inputID: string; defaultValue?: string}) {
        return `${inputID}::${defaultValue ?? ''}`;
    }
    return MockInputWrapper;
});

const mockUseOnyx = jest.mocked(useOnyx);

const TEST_ACCOUNT_ID = 12345;

describe('EditNamePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseOnyx.mockReturnValue([undefined, {status: 'loaded'}]);
    });

    it('renders page title', () => {
        const {toJSON} = render(<EditNamePage {...({route: {params: {accountID: TEST_ACCOUNT_ID}}} as any)} />);

        expect(JSON.stringify(toJSON())).toContain('editAgentNamePage.title');
    });

    it('renders agent name as default value in InputWrapper', () => {
        mockUseOnyx.mockImplementation((key, options) => {
            if (key === ONYXKEYS.PERSONAL_DETAILS_LIST && options?.selector) {
                return [{displayName: 'Old Name'}, {status: 'loaded'}];
            }
            return [undefined, {status: 'loaded'}];
        });

        const {toJSON} = render(<EditNamePage {...({route: {params: {accountID: TEST_ACCOUNT_ID}}} as any)} />);

        expect(JSON.stringify(toJSON())).toContain('firstName::Old Name');
    });
});
