import {domainSecurityGroupSettingErrorsSelector, domainSecurityGroupSettingPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import {createAdminPoliciesSelector, policyNameSelector} from '@selectors/Policy';
import React from 'react';
import {View} from 'react-native';
import ErrorMessageRow from '@components/ErrorMessageRow';
import FormHelpMessage from '@components/FormHelpMessage';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
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
    const {translate, localeCompare} = useLocalize();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(groupID),
    });

    const [adminPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: createAdminPoliciesSelector(undefined)});
    const firstAdminPolicy = Object.values(adminPolicies ?? {})
        .sort((a, b) => localeCompare(a?.created ?? '', b?.created ?? ''))
        .at(0);
    const firstAdminPolicyID = firstAdminPolicy?.id;
    const firstAdminPolicyName = firstAdminPolicy?.name;
    const hasAdminPolicies = !!firstAdminPolicyID;

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
                    disabled={!hasAdminPolicies}
                    onToggle={(enabled) => {
                        if (!group?.name) {
                            return;
                        }
                        if (enabled && !preferredPolicyID && firstAdminPolicyID) {
                            updateDomainSecurityGroup(
                                domainAccountID,
                                groupID,
                                group,
                                {enableRestrictedPrimaryPolicy: enabled, restrictedPrimaryPolicyID: firstAdminPolicyID},
                                'enableRestrictedPrimaryPolicy',
                            );
                            return;
                        }
                        updateDomainSecurityGroup(domainAccountID, groupID, group, {enableRestrictedPrimaryPolicy: enabled}, 'enableRestrictedPrimaryPolicy');
                    }}
                    wrapperStyle={[styles.ph5]}
                    pendingAction={enableRestrictedPrimaryPolicyPendingAction}
                />
                {!hasAdminPolicies && (
                    <FormHelpMessage
                        style={[styles.ph5]}
                        message={translate('domain.groups.noWorkspacesMessage')}
                    />
                )}
                <ErrorMessageRow
                    errors={enableRestrictedPrimaryPolicyErrors}
                    onDismiss={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'enableRestrictedPrimaryPolicyErrors')}
                    errorRowStyles={[styles.mh5, styles.mt3]}
                />
            </View>
            {hasAdminPolicies && (
                <OfflineWithFeedback pendingAction={restrictedPrimaryPolicyIDPendingAction}>
                    <MenuItemWithTopDescription
                        description={translate('domain.groups.preferredWorkspace')}
                        title={preferredPolicyName ?? firstAdminPolicyName ?? ''}
                        shouldShowRightIcon
                        onPress={() => Navigation.navigate(ROUTES.DOMAIN_SECURITY_GROUPS_PREFERRED_WORKSPACE.getRoute(domainAccountID, groupID))}
                        disabled={!isEnabled}
                    />
                    <ErrorMessageRow
                        errors={restrictedPrimaryPolicyIDErrors}
                        onDismiss={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'restrictedPrimaryPolicyIDErrors')}
                        errorRowStyles={[styles.mh5, styles.mt3]}
                    />
                </OfflineWithFeedback>
            )}
        </>
    );
}

export default PreferredWorkspaceToggle;
