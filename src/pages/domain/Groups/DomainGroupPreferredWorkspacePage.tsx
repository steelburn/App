import {selectGroupByID} from '@selectors/Domain';
import {createAdminPoliciesSelector} from '@selectors/Policy';
import React, {useState} from 'react';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import UserListItem from '@components/SelectionList/ListItem/UserListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getDefaultWorkspaceAvatar} from '@libs/ReportUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import DomainNotFoundPageWrapper from '@pages/domain/DomainNotFoundPageWrapper';
import {updateDomainSecurityGroup} from '@userActions/Domain';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WorkspaceListItem = {
    policyID: string;
    created?: string;
} & ListItem;

type DomainGroupPreferredWorkspacePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.SECURITY_GROUPS_PREFERRED_WORKSPACE>;

function DomainGroupPreferredWorkspacePage({route}: DomainGroupPreferredWorkspacePageProps) {
    const {domainAccountID, groupID} = route.params;

    const styles = useThemeStyles();
    const {translate, localeCompare} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['FallbackWorkspaceAvatar']);

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(groupID),
    });

    const currentPolicyID = group?.restrictedPrimaryPolicyID;

    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: createAdminPoliciesSelector(currentPolicyID)});
    const [selectedPolicyID, setSelectedPolicyID] = useState<string | undefined>(currentPolicyID);
    const [shouldShowError, setShouldShowError] = useState(false);

    const workspaceOptions: WorkspaceListItem[] = [];
    for (const policy of Object.values(policies ?? {})) {
        if (!policy?.name || !policy?.id) {
            continue;
        }

        workspaceOptions.push({
            text: policy.name,
            policyID: policy.id,
            created: policy.created,
            keyForList: policy.id,
            isSelected: selectedPolicyID === policy.id,
            icons: [
                {
                    source: policy.avatarURL ?? getDefaultWorkspaceAvatar(policy.name),
                    fallbackIcon: icons.FallbackWorkspaceAvatar,
                    name: policy.name,
                    type: CONST.ICON_TYPE_WORKSPACE,
                    id: policy.id,
                },
            ],
        });
    }

    const handleSubmit = () => {
        if (!group) {
            return;
        }

        if (!selectedPolicyID) {
            setShouldShowError(true);
            return;
        }

        updateDomainSecurityGroup(domainAccountID, groupID, group, {restrictedPrimaryPolicyID: selectedPolicyID}, 'restrictedPrimaryPolicyID');
        Navigation.goBack(ROUTES.DOMAIN_GROUP_DETAILS.getRoute(domainAccountID, groupID));
    };

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                shouldEnableMaxHeight
                testID="DomainGroupPreferredWorkspacePage"
                includeSafeAreaPaddingBottom
            >
                <HeaderWithBackButton
                    title={translate('domain.groups.preferredWorkspace')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.DOMAIN_GROUP_DETAILS.getRoute(domainAccountID, groupID))}
                />
                <Text style={[styles.ph5, styles.mb3]}>{translate('domain.groups.preferredWorkspaceSelectDescription')}</Text>
                <SelectionList<WorkspaceListItem>
                    data={workspaceOptions.sort((a, b) => localeCompare(a.created ?? '', b.created ?? ''))}
                    ListItem={UserListItem}
                    onSelectRow={(item: WorkspaceListItem) => {
                        setSelectedPolicyID(item.policyID);
                        setShouldShowError(false);
                    }}
                    initiallyFocusedItemKey={currentPolicyID}
                    shouldUpdateFocusedIndex
                    footerContent={
                        <FormAlertWithSubmitButton
                            buttonText={translate('common.save')}
                            onSubmit={handleSubmit}
                            isAlertVisible={shouldShowError}
                            containerStyles={[!shouldShowError && styles.mt5]}
                            message={translate('common.error.pleaseSelectOne')}
                            enabledWhenOffline
                        />
                    }
                />
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

export default DomainGroupPreferredWorkspacePage;
