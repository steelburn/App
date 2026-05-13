import React, {useState} from 'react';
import type {ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import type {OptionRowLHNProps} from '@components/LHNOptionsList/types';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {shouldUseBoldText} from '@libs/OptionsListUtils';
import CONST from '@src/CONST';
import OptionRow from './OptionRow';

/**
 * Sibling variant of `OptionRowLHN` used for archived reports. Strips the product training
 * tooltip layer, all brick-road badges (Error/Info/Onboarding), and the trailing indicator
 * row (Draft/Pin) because none of them apply to a historical, write-locked row.
 */
function ArchivedOptionRowLHN({isOptionFocused = false, onSelectRow = () => {}, optionItem, viewMode = 'default', style, onLayout = () => {}, testID}: OptionRowLHNProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const [hovered, setHovered] = useState(false);

    const isInFocusMode = viewMode === CONST.OPTION_MODE.COMPACT;

    const sidebarInnerRowStyle = StyleSheet.flatten<ViewStyle>(
        isInFocusMode
            ? [styles.chatLinkRowPressable, styles.flexGrow1, styles.optionItemAvatarNameWrapper, styles.optionRowCompact, styles.justifyContentCenter]
            : [styles.chatLinkRowPressable, styles.flexGrow1, styles.optionItemAvatarNameWrapper, styles.optionRow, styles.justifyContentCenter],
    );
    const contentContainerStyles = isInFocusMode
        ? [styles.flex1, styles.flexRow, styles.overflowHidden, StyleUtils.getCompactContentContainerStyles()]
        : [styles.flex1];
    const singleAvatarContainerStyle = [styles.actionAvatar, styles.mr3];

    const hoveredBackgroundColor = !!styles.sidebarLinkHover && 'backgroundColor' in styles.sidebarLinkHover ? styles.sidebarLinkHover.backgroundColor : theme.sidebar;
    const focusedBackgroundColor = styles.sidebarLinkActive.backgroundColor;
    const subscriptAvatarBorderColor = isOptionFocused ? focusedBackgroundColor : theme.sidebar;

    let secondaryAvatarBgColor = theme.sidebar;
    if (isOptionFocused) {
        secondaryAvatarBgColor = focusedBackgroundColor;
    } else if (hovered) {
        secondaryAvatarBgColor = hoveredBackgroundColor;
    }

    const textStyle = isOptionFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText;
    const textUnreadStyle = shouldUseBoldText(optionItem) ? [textStyle, styles.sidebarLinkTextBold] : [textStyle];
    const displayNameStyle = [styles.optionDisplayName, styles.optionDisplayNameCompact, styles.pre, textUnreadStyle, styles.flexShrink0, style];

    return (
        <OptionRow.OfflineWrapper
            pendingAction={optionItem.pendingAction}
            errors={optionItem.allReportErrors}
        >
            <OptionRow.Pressable
                optionItem={optionItem}
                isOptionFocused={isOptionFocused}
                onSelectRow={onSelectRow}
                onLayout={onLayout}
                onHoverIn={() => setHovered(true)}
                onHoverOut={() => setHovered(false)}
            >
                <View style={sidebarInnerRowStyle}>
                    <View style={[styles.flexRow, styles.alignItemsCenter]}>
                        <OptionRow.Avatar
                            optionItem={optionItem}
                            isInFocusMode={isInFocusMode}
                            subscriptAvatarBorderColor={hovered && !isOptionFocused ? hoveredBackgroundColor : subscriptAvatarBorderColor}
                            secondaryAvatarBackgroundColor={secondaryAvatarBgColor}
                            singleAvatarContainerStyle={singleAvatarContainerStyle}
                        />
                        <View style={contentContainerStyles}>
                            <View style={[styles.flexRow, styles.alignItemsCenter, styles.mw100, styles.overflowHidden]}>
                                <OptionRow.Title
                                    optionItem={optionItem}
                                    displayNameStyle={displayNameStyle}
                                    testID={testID}
                                />
                                <OptionRow.Status optionItem={optionItem} />
                            </View>
                            <OptionRow.Subtitle
                                optionItem={optionItem}
                                viewMode={viewMode}
                                isOptionFocused={isOptionFocused}
                                style={style}
                            />
                        </View>
                        <OptionRow.DescriptiveText optionItem={optionItem} />
                    </View>
                </View>
            </OptionRow.Pressable>
        </OptionRow.OfflineWrapper>
    );
}

ArchivedOptionRowLHN.displayName = 'ArchivedOptionRowLHN';

export default React.memo(ArchivedOptionRowLHN);
