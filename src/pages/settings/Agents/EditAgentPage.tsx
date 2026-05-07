import React, {useState} from 'react';
import {View} from 'react-native';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ReportActionAvatars from '@components/ReportActionAvatars';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearAgentUpdateError, deleteAgent} from '@libs/actions/Agent';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type EditAgentPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.AGENTS.EDIT>;

function EditAgentPage({route}: EditAgentPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const icons = useMemoizedLazyExpensifyIcons(['Trashcan']);
    const accountID = route.params.accountID;
    const [agent] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {selector: (list) => list?.[accountID]});
    const StyleUtils = useStyleUtils();
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const handleDeleteAgent = () => {
        setIsDeleteModalVisible(false);
        deleteAgent(accountID, agent, personalDetails);
    };

    return (
        <ScreenWrapper
            testID={EditAgentPage.displayName}
            includeSafeAreaPaddingBottom
            offlineIndicatorStyle={styles.mtAuto}
        >
            <HeaderWithBackButton
                title={translate('editAgentPage.title')}
                onBackButtonPress={() => Navigation.goBack()}
            />
            <ScrollView contentContainerStyle={styles.flexGrow1}>
                <View style={[styles.alignItemsCenter, styles.pv5]}>
                    <ReportActionAvatars
                        accountIDs={[accountID]}
                        size={CONST.AVATAR_SIZE.X_LARGE}
                        shouldShowTooltip={false}
                        singleAvatarContainerStyle={[StyleUtils.getWidthAndHeightStyle(variables.avatarSizeXLarge)]}
                    />
                </View>
                <OfflineWithFeedback
                    errors={agent?.errors}
                    errorRowStyles={styles.mh5}
                    onClose={() => clearAgentUpdateError(accountID)}
                >
                    <MenuItemWithTopDescription
                        description={translate('editAgentPage.agentName')}
                        title={personalDetails?.displayName ?? ''}
                        shouldShowRightIcon
                        onPress={() => Navigation.navigate(ROUTES.SETTINGS_AGENTS_EDIT_NAME.getRoute(accountID))}
                    />
                    <MenuItemWithTopDescription
                        description={translate('editAgentPage.instructions')}
                        title={agent?.prompt ?? ''}
                        shouldShowRightIcon
                        onPress={() => Navigation.navigate(ROUTES.SETTINGS_AGENTS_EDIT_PROMPT.getRoute(accountID))}
                        numberOfLinesTitle={10}
                    />
                </OfflineWithFeedback>
                <MenuItem
                    title={translate('editAgentPage.deleteAgent')}
                    icon={icons.Trashcan}
                    onPress={() => setIsDeleteModalVisible(true)}
                />
            </ScrollView>
            <ConfirmModal
                isVisible={isDeleteModalVisible}
                onConfirm={handleDeleteAgent}
                onCancel={() => setIsDeleteModalVisible(false)}
                title={translate('editAgentPage.deleteAgentTitle')}
                prompt={translate('editAgentPage.deleteAgentMessage')}
                confirmText={translate('common.delete')}
                cancelText={translate('common.cancel')}
                danger
            />
        </ScreenWrapper>
    );
}

EditAgentPage.displayName = 'EditAgentPage';

export default EditAgentPage;
