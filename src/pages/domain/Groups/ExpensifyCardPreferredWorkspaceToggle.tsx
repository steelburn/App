import {domainSecurityGroupSettingErrorsSelector, domainSecurityGroupSettingPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import React from 'react';
import {View} from 'react-native';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {clearDomainSecurityGroupSettingError, updateDomainSecurityGroup} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import HTMLMessagesRow from './HTMLMessagesRow';

type ExpensifyCardPreferredWorkspaceToggleProps = {
    domainAccountID: number;
    groupID: string;
};

function ExpensifyCardPreferredWorkspaceToggle({domainAccountID, groupID}: ExpensifyCardPreferredWorkspaceToggleProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(groupID),
    });

    const [overridePreferredPolicyWithCardPolicyPendingAction] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingPendingActionSelector('overridePreferredPolicyWithCardPolicy', groupID),
    });
    const [overridePreferredPolicyWithCardPolicyErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {
        selector: domainSecurityGroupSettingErrorsSelector('overridePreferredPolicyWithCardPolicyErrors', groupID),
    });

    const isEnabled = !!group?.overridePreferredPolicyWithCardPolicy;

    return (
        <View style={styles.mv3}>
            <ToggleSettingOptionRow
                title={translate('domain.groups.ExpensifyCardPreferredWorkspace')}
                subtitle={translate('domain.groups.ExpensifyCardPreferredWorkspaceDescription')}
                switchAccessibilityLabel={translate('domain.groups.ExpensifyCardPreferredWorkspace')}
                shouldPlaceSubtitleBelowSwitch
                isActive={isEnabled}
                onToggle={(enabled) => {
                    if (!group?.name) {
                        return;
                    }
                    updateDomainSecurityGroup(domainAccountID, groupID, group, {overridePreferredPolicyWithCardPolicy: enabled}, 'overridePreferredPolicyWithCardPolicy');
                }}
                wrapperStyle={[styles.ph5]}
                pendingAction={overridePreferredPolicyWithCardPolicyPendingAction}
            />
            <HTMLMessagesRow
                errors={overridePreferredPolicyWithCardPolicyErrors}
                onDismiss={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'overridePreferredPolicyWithCardPolicyErrors')}
            />
        </View>
    );
}

export default ExpensifyCardPreferredWorkspaceToggle;
