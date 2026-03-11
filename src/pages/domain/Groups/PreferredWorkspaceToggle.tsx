import {domainSecurityGroupSettingErrorsSelector, domainSecurityGroupSettingPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import {policyNameSelector} from '@selectors/Policy';
import React from 'react';
import {View} from 'react-native';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import HTMLMessagesRow from '@pages/domain/Groups/HTMLMessagesRow';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {clearDomainSecurityGroupSettingError, updateDomainSecurityGroup} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

type PreferredWorkspaceToggleProps = {
    domainAccountID: number;
    groupID: string;
};

function PreferredWorkspaceToggle({domainAccountID, groupID}: PreferredWorkspaceToggleProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(groupID),
    });

    const isEnabled = !!group?.enableRestrictedPrimaryPolicy;
    const preferredPolicyID = group?.restrictedPrimaryPolicyID;

    const [preferredPolicyName] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${preferredPolicyID}`, {selector: policyNameSelector});

    const [enableRestrictedPrimaryPolicyPendingAction] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingPendingActionSelector('enableRestrictedPrimaryPolicy', groupID),
    });
    const [enableRestrictedPrimaryPolicyErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingErrorsSelector('enableRestrictedPrimaryPolicyErrors', groupID),
    });

    const [restrictedPrimaryPolicyIDPendingAction] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingPendingActionSelector('restrictedPrimaryPolicyID', groupID),
    });
    const [restrictedPrimaryPolicyIDErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingErrorsSelector('restrictedPrimaryPolicyIDErrors', groupID),
    });

    return (
        <>
            <View style={styles.mv3}>
                <ToggleSettingOptionRow
                    title={translate('domain.groups.preferredWorkspace')}
                    subtitle={translate('domain.groups.preferredWorkspaceDescription', isEnabled)}
                    switchAccessibilityLabel={translate('domain.groups.preferredWorkspace')}
                    shouldPlaceSubtitleBelowSwitch
                    isActive={isEnabled}
                    onToggle={(enabled) => {
                        if (!group?.name) {
                            return;
                        }
                        updateDomainSecurityGroup(domainAccountID, groupID, group, {enableRestrictedPrimaryPolicy: enabled}, 'enableRestrictedPrimaryPolicy');
                    }}
                    wrapperStyle={[styles.ph5]}
                    pendingAction={enableRestrictedPrimaryPolicyPendingAction}
                />
                <HTMLMessagesRow
                    errors={enableRestrictedPrimaryPolicyErrors}
                    onDismiss={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'enableRestrictedPrimaryPolicyErrors')}
                />
            </View>
            {isEnabled && (
                <OfflineWithFeedback pendingAction={restrictedPrimaryPolicyIDPendingAction}>
                    <MenuItemWithTopDescription
                        description={translate('domain.groups.preferredWorkspace')}
                        title={preferredPolicyName ?? ''}
                        shouldShowRightIcon
                        onPress={() => Navigation.navigate(ROUTES.DOMAIN_SECURITY_GROUPS_PREFERRED_WORKSPACE.getRoute(domainAccountID, groupID))}
                    />
                    <HTMLMessagesRow
                        errors={restrictedPrimaryPolicyIDErrors}
                        onDismiss={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'restrictedPrimaryPolicyIDErrors')}
                    />
                </OfflineWithFeedback>
            )}
        </>
    );
}

export default PreferredWorkspaceToggle;
