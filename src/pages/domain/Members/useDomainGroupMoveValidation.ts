import {groupsSelector} from '@selectors/Domain';
import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

function useDomainGroupMoveValidation(domainAccountID: number, targetGroupId: string | undefined) {
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();

    const [targetPolicyID] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: (domain) => {
            const targetGroup = groupsSelector(domain)?.find((g) => g.id === targetGroupId);
            if (!targetGroup?.details.enableRestrictedPrimaryPolicy || !targetGroup?.details.restrictedPrimaryPolicyID) {
                return undefined;
            }
            return targetGroup.details.restrictedPrimaryPolicyID;
        },
    });

    const [isAdminForTargetPolicy] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: (policies) => {
            if (!targetPolicyID) {
                return true;
            }
            const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${targetPolicyID}`];
            return !!policy && policy.role === CONST.POLICY.ROLE.ADMIN;
        },
    });

    const showBlockedModal = () => {
        showConfirmModal({
            title: translate('workspace.distanceRates.oopsNotSoFast'),
            prompt: translate('domain.members.error.moveMemberNotPolicyAdmin'),
            confirmText: translate('common.buttonConfirm'),
            shouldShowCancelButton: false,
        });
    };

    return {isBlocked: !isAdminForTargetPolicy, showBlockedModal};
}

export default useDomainGroupMoveValidation;
