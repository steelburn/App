import React from 'react';
import type {ColorValue, ViewStyle} from 'react-native';
import LHNAvatar from '@components/LHNOptionsList/LHNAvatar';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import {shouldOptionShowTooltip} from '@libs/OptionsListUtils';
import {getDelegateAccountIDFromReportAction} from '@libs/ReportActionsUtils';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';

type AvatarProps = {
    /** Option data for the row. Source of avatar icons, subscript flag, tooltip eligibility, and delegate metadata. */
    optionItem: OptionData;

    /** Whether the row is in compact mode. Switches the avatar size between `SMALL` and `DEFAULT`. */
    isInFocusMode: boolean;

    /** Border color for the subscript icon. Matches the row background so the subscript blends in. */
    subscriptAvatarBorderColor: ColorValue;

    /** Background color for the secondary avatar in a multi-avatar group. Matches the row background. */
    secondaryAvatarBackgroundColor: ColorValue;

    /** Layout style applied when the row renders a single avatar (no group). */
    singleAvatarContainerStyle: ViewStyle[];
};

function AvatarInner({optionItem, isInFocusMode, subscriptAvatarBorderColor, secondaryAvatarBackgroundColor, singleAvatarContainerStyle}: AvatarProps) {
    const personalDetails = usePersonalDetails();

    const delegateAccountID = getDelegateAccountIDFromReportAction(optionItem?.parentReportAction);

    // Match the header's delegate avatar logic: when a delegate exists on the
    // parent report action, the header (useReportActionAvatars) shows the
    // delegate's avatar as primary instead of the report owner's.
    const skipDelegate = optionItem?.type === CONST.REPORT.TYPE.INVOICE || (optionItem?.isTaskReport && !optionItem?.chatReportID);

    let icons = optionItem?.icons ?? [];
    if (!skipDelegate && delegateAccountID && personalDetails && icons.length > 0) {
        const delegateDetails = personalDetails[delegateAccountID];
        if (delegateDetails) {
            const updatedIcons = [...icons];
            const firstDelegateIcon = updatedIcons.at(0);
            if (firstDelegateIcon) {
                updatedIcons[0] = {
                    ...firstDelegateIcon,
                    source: delegateDetails.avatar ?? '',
                    name: delegateDetails.displayName ?? '',
                    id: delegateAccountID,
                };
            }
            icons = updatedIcons;
        }
    }

    let delegateTooltipAccountID: number | undefined;
    if (!skipDelegate && delegateAccountID && personalDetails?.[delegateAccountID] && optionItem?.icons?.length) {
        delegateTooltipAccountID = Number(optionItem.icons.at(0)?.id ?? CONST.DEFAULT_NUMBER_ID);
    }

    return (
        <LHNAvatar
            icons={icons}
            shouldShowSubscript={!!optionItem.shouldShowSubscript}
            size={isInFocusMode ? CONST.AVATAR_SIZE.SMALL : CONST.AVATAR_SIZE.DEFAULT}
            subscriptAvatarBorderColor={subscriptAvatarBorderColor}
            useMidSubscriptSize={isInFocusMode}
            secondaryAvatarBackgroundColor={secondaryAvatarBackgroundColor}
            singleAvatarContainerStyle={singleAvatarContainerStyle}
            shouldShowTooltip={shouldOptionShowTooltip(optionItem)}
            delegateAccountID={skipDelegate ? undefined : delegateAccountID}
            delegateTooltipAccountID={delegateTooltipAccountID}
        />
    );
}

AvatarInner.displayName = 'OptionRow.AvatarInner';

function Avatar({optionItem, isInFocusMode, subscriptAvatarBorderColor, secondaryAvatarBackgroundColor, singleAvatarContainerStyle}: AvatarProps) {
    // Bail out before subscribing to personal details when the row has no avatar to render.
    if (!optionItem.icons?.length || !optionItem.icons.at(0)) {
        return null;
    }
    return (
        <AvatarInner
            optionItem={optionItem}
            isInFocusMode={isInFocusMode}
            subscriptAvatarBorderColor={subscriptAvatarBorderColor}
            secondaryAvatarBackgroundColor={secondaryAvatarBackgroundColor}
            singleAvatarContainerStyle={singleAvatarContainerStyle}
        />
    );
}

Avatar.displayName = 'OptionRow.Avatar';

export default Avatar;
