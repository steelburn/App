import {useState} from 'react';
import type {ColorValue, ViewStyle} from 'react-native';
import {StyleSheet} from 'react-native';
import type {OptionRowLHNProps} from '@components/LHNOptionsList/types';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {shouldUseBoldText} from '@libs/OptionsListUtils';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';

type UseOptionRowChromeParams = {
    /** Option data for the row. Source of `optionItem` flags that drive the bold/unread text style. */
    optionItem: OptionData;

    /** Whether the row is the currently focused/active option. Drives the focused color path. */
    isOptionFocused: boolean;

    /** Display density mode. `COMPACT` switches to the compact layout styles. */
    viewMode: NonNullable<OptionRowLHNProps['viewMode']>;

    /** Optional outer text style override forwarded by the variant to the display name. */
    style: OptionRowLHNProps['style'];
};

/**
 * Shared row-level state and style derivations for `OptionRowLHN` and `ArchivedOptionRowLHN`.
 *
 * Both variants need the same hover state, layout styles, avatar background color, and
 * display-name style. Centralizing avoids drift between the two and keeps each variant a
 * thin wiring file.
 *
 * `avatarBackgroundColor` is a single value: the parent previously passed two separate
 * color props to `LHNAvatar` (`subscriptAvatarBorderColor`, `secondaryAvatarBackgroundColor`)
 * whose values collapsed to the same result in every state. The hook returns one value and
 * variant call sites pass it to both props.
 */
function useOptionRowChrome({optionItem, isOptionFocused, viewMode, style}: UseOptionRowChromeParams) {
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
    const contentContainerStyles = isInFocusMode ? [styles.flex1, styles.flexRow, styles.overflowHidden, StyleUtils.getCompactContentContainerStyles()] : [styles.flex1];
    const singleAvatarContainerStyle = [styles.actionAvatar, styles.mr3];

    const hoveredBackgroundColor = !!styles.sidebarLinkHover && 'backgroundColor' in styles.sidebarLinkHover ? styles.sidebarLinkHover.backgroundColor : theme.sidebar;
    const focusedBackgroundColor = styles.sidebarLinkActive.backgroundColor;

    let avatarBackgroundColor: ColorValue = theme.sidebar;
    if (isOptionFocused) {
        avatarBackgroundColor = focusedBackgroundColor;
    } else if (hovered) {
        avatarBackgroundColor = hoveredBackgroundColor;
    }

    const textStyle = isOptionFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText;
    const textUnreadStyle = shouldUseBoldText(optionItem) ? [textStyle, styles.sidebarLinkTextBold] : [textStyle];
    const displayNameStyle = [styles.optionDisplayName, styles.optionDisplayNameCompact, styles.pre, textUnreadStyle, styles.flexShrink0, style];

    return {
        hovered,
        setHovered,
        isInFocusMode,
        sidebarInnerRowStyle,
        contentContainerStyles,
        singleAvatarContainerStyle,
        avatarBackgroundColor,
        displayNameStyle,
    };
}

export default useOptionRowChrome;
