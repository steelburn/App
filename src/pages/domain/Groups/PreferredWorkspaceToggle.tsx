import {defaultSecurityGroupIDErrorsSelector, defaultSecurityGroupIDPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import {policyNameSelector} from '@selectors/Policy';
import React from 'react';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {updateDomainSecurityGroup} from '@userActions/Domain';
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

    const [defaultSecurityGroupIDPendingAction] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        selector: defaultSecurityGroupIDPendingActionSelector(groupID),
    });
    const [defaultSecurityGroupIDErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {selector: defaultSecurityGroupIDErrorsSelector(groupID)});

    return (
        <>
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
                    updateDomainSecurityGroup(domainAccountID, groupID, group.name, group, {enableRestrictedPrimaryPolicy: enabled}, 'enableRestrictedPrimaryPolicy');
                }}
                wrapperStyle={[styles.mv3, styles.ph5]}
                // pendingAction={}
            />
            {isEnabled && (
                <MenuItemWithTopDescription
                    description={translate('domain.groups.preferredWorkspace')}
                    title={preferredPolicyName ?? ''}
                    shouldShowRightIcon
                    onPress={() => Navigation.navigate(ROUTES.DOMAIN_SECURITY_GROUPS_PREFERRED_WORKSPACE.getRoute(domainAccountID, groupID))}
                />
            )}
        </>
    );
}

export default PreferredWorkspaceToggle;
