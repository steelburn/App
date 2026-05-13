import React from 'react';
import type {ColorValue} from 'react-native';
import LHNAvatar from '@components/LHNOptionsList/LHNAvatar';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {shouldOptionShowTooltip} from '@libs/OptionsListUtils';
import {getDelegateAccountIDFromReportAction} from '@libs/ReportActionsUtils';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';

type AvatarProps = {
    optionItem: OptionData;
    isInFocusMode: boolean;
    hovered: boolean;
    isOptionFocused: boolean;
};

function AvatarInner({optionItem, isInFocusMode, hovered, isOptionFocused}: AvatarProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const personalDetails = usePersonalDetails();

    const hoveredBackgroundColor = !!styles.sidebarLinkHover && 'backgroundColor' in styles.sidebarLinkHover ? styles.sidebarLinkHover.backgroundColor : theme.sidebar;
    const focusedBackgroundColor = styles.sidebarLinkActive.backgroundColor;

    let backgroundColor: ColorValue = theme.sidebar;
    if (isOptionFocused) {
        backgroundColor = focusedBackgroundColor;
    } else if (hovered) {
        backgroundColor = hoveredBackgroundColor;
    }

    const singleAvatarContainerStyle = [styles.actionAvatar, styles.mr3];

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
            subscriptAvatarBorderColor={backgroundColor}
            useMidSubscriptSize={isInFocusMode}
            secondaryAvatarBackgroundColor={backgroundColor}
            singleAvatarContainerStyle={singleAvatarContainerStyle}
            shouldShowTooltip={shouldOptionShowTooltip(optionItem)}
            delegateAccountID={skipDelegate ? undefined : delegateAccountID}
            delegateTooltipAccountID={delegateTooltipAccountID}
        />
    );
}

AvatarInner.displayName = 'OptionRow.AvatarInner';

function Avatar({optionItem, isInFocusMode, hovered, isOptionFocused}: AvatarProps) {
    // Bail out before subscribing to personal details when the row has no avatar to render.
    if (!optionItem.icons?.length || !optionItem.icons.at(0)) {
        return null;
    }
    return (
        <AvatarInner
            optionItem={optionItem}
            isInFocusMode={isInFocusMode}
            hovered={hovered}
            isOptionFocused={isOptionFocused}
        />
    );
}

Avatar.displayName = 'OptionRow.Avatar';

export default Avatar;
