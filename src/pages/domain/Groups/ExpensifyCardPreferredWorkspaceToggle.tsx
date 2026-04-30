import {domainSecurityGroupSettingErrorsSelector, domainSecurityGroupSettingPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import React from 'react';
import {View} from 'react-native';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {filterInactiveCards} from '@libs/CardUtils';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {clearDomainSecurityGroupSettingError, updateDomainSecurityGroup} from '@userActions/Domain';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

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

    const preferredPolicyID = group?.restrictedPrimaryPolicyID;
    const isPreferredPolicyEnabled = !!group?.enableRestrictedPrimaryPolicy && !!preferredPolicyID;

    const [preferredPolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${preferredPolicyID}`);
    const workspaceAccountID = preferredPolicy?.workspaceAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const [cardsList] = useOnyx(`${ONYXKEYS.COLLECTION.WORKSPACE_CARDS_LIST}${workspaceAccountID}_${CONST.EXPENSIFY_CARD.BANK}`, {
        selector: filterInactiveCards,
    });
    const hasWorkspaceCard = !!preferredPolicy?.areExpensifyCardsEnabled && !isEmptyObject(cardsList);

    const isDisabled = !isPreferredPolicyEnabled || !hasWorkspaceCard;
    const isActive = !!group?.overridePreferredPolicyWithCardPolicy;

    return (
        <View style={styles.mv3}>
            <ToggleSettingOptionRow
                title={translate('domain.groups.ExpensifyCardPreferredWorkspace')}
                subtitle={translate('domain.groups.ExpensifyCardPreferredWorkspaceDescription')}
                switchAccessibilityLabel={translate('domain.groups.ExpensifyCardPreferredWorkspace')}
                shouldPlaceSubtitleBelowSwitch
                disabled={isDisabled}
                isActive={isActive}
                onToggle={(enabled) => {
                    if (!group) {
                        return;
                    }
                    updateDomainSecurityGroup(domainAccountID, groupID, group, {overridePreferredPolicyWithCardPolicy: enabled}, 'overridePreferredPolicyWithCardPolicy');
                }}
                wrapperStyle={styles.ph5}
                pendingAction={overridePreferredPolicyWithCardPolicyPendingAction}
                errors={overridePreferredPolicyWithCardPolicyErrors}
                onCloseError={() => clearDomainSecurityGroupSettingError(domainAccountID, groupID, 'overridePreferredPolicyWithCardPolicyErrors')}
            />
        </View>
    );
}

export default ExpensifyCardPreferredWorkspaceToggle;
