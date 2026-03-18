import {defaultSecurityGroupIDSelector, selectGroupByID} from '@selectors/Domain';
import React from 'react';
import MenuItem from '@components/MenuItem';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import useConfirmModal from '@hooks/useConfirmModal';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import Navigation from '@libs/Navigation/Navigation';
import {updateDomainSecurityGroup} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';

type DeleteGroupRowProps = {
    domainAccountID: number;
    groupID: string;
};

function DeleteGroupRow({domainAccountID, groupID}: DeleteGroupRowProps) {
    const icons = useMemoizedLazyExpensifyIcons(['Trashcan'] as const);
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(groupID),
    });
    const [defaultSecurityGroupID] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: defaultSecurityGroupIDSelector,
    });
    const [defaultSecurityGroup] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        selector: selectGroupByID(defaultSecurityGroupID),
    });

    const onDeleteGroupSelect = async () => {
        if (!groupID || !group || groupID === defaultSecurityGroupID) {
            return null;
        }

        const result = await showConfirmModal({
            title: translate('domain.groups.deleteGroupDangerConfirmationModal'),
            prompt: translate('domain.groups.deleteGroupDangerConfirmationModalDescription', defaultSecurityGroup?.name ?? ''),
            confirmText: translate('domain.groups.deleteGroup'),
            cancelText: translate('domain.groups.nevermind'),
            shouldShowCancelButton: true,
            danger: true,
        });

        if (result.action !== ModalActions.CONFIRM) {
            return;
        }

        // placeholder
        updateDomainSecurityGroup(domainAccountID, groupID, group, {}, 'name');
        Navigation.goBack();
    };

    // should i move render logic to DomainGroupDetailsPage or can i leave it here?
    return groupID !== defaultSecurityGroupID ? (
        <MenuItem
            icon={icons.Trashcan}
            title={translate('domain.groups.deleteGroup')}
            onPress={() => {
                onDeleteGroupSelect();
            }}
        />
    ) : null;
}

export default DeleteGroupRow;
