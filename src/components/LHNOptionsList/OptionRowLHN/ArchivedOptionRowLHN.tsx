import React from 'react';
import {View} from 'react-native';
import type {OptionRowLHNProps} from '@components/LHNOptionsList/types';
import useThemeStyles from '@hooks/useThemeStyles';
import OptionRow from './OptionRow';
import useOptionRowChrome from './useOptionRowChrome';

/**
 * Sibling variant of `OptionRowLHN` used for archived reports. Strips the product training
 * tooltip layer, all brick-road badges (Error/Info/Onboarding), and the trailing indicator
 * row (Draft/Pin) because none of them apply to a historical, write-locked row.
 */
function ArchivedOptionRowLHN({isOptionFocused = false, onSelectRow = () => {}, optionItem, viewMode = 'default', style, onLayout = () => {}, testID}: OptionRowLHNProps) {
    const styles = useThemeStyles();
    const {setHovered, isInFocusMode, sidebarInnerRowStyle, contentContainerStyles, singleAvatarContainerStyle, avatarBackgroundColor, displayNameStyle} = useOptionRowChrome({
        optionItem,
        isOptionFocused,
        viewMode,
        style,
    });

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
                            subscriptAvatarBorderColor={avatarBackgroundColor}
                            secondaryAvatarBackgroundColor={avatarBackgroundColor}
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

export default ArchivedOptionRowLHN;
