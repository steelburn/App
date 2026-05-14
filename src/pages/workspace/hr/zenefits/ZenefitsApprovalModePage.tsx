import React from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import useLocalize from '@hooks/useLocalize';
import Navigation from '@libs/Navigation/Navigation';

// import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
// import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
// import type SCREENS from '@src/SCREENS';

// type ZenefitsApprovalModePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.HR_ZENEFITS_APPROVAL_MODE>;

function ZenefitsApprovalModePage() {
    const {translate} = useLocalize();

    return (
        <ScreenWrapper testID="ZenefitsApprovalModePage">
            <HeaderWithBackButton
                title={translate('workspace.common.hr')}
                onBackButtonPress={() => Navigation.goBack()}
            />
        </ScreenWrapper>
    );
}

export default ZenefitsApprovalModePage;
