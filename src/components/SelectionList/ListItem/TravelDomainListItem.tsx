import React from 'react';
import Badge from '@components/Badge';
import TextWithTooltip from '@components/TextWithTooltip';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import SelectableListItem from './SelectableListItem';
import type {ListItem, TravelDomainListItemProps} from './types';

/**
 * A text row with a left-side checkbox and an optional "Recommended" badge. Used in the
 * travel domain selector for choosing booking domains.
 */
function TravelDomainListItem<TItem extends ListItem>({
    item,
    isFocused,
    showTooltip,
    isDisabled,
    canSelectMultiple,
    onSelectRow,
    onCheckboxPress,
    onFocus,
    shouldSyncFocus,
    selectionButtonPosition = CONST.SELECTION_BUTTON_POSITION.LEFT,
}: TravelDomainListItemProps<TItem>) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const showRecommendedTag = item.isRecommended ?? false;

    return (
        <SelectableListItem
            item={item}
            wrapperStyle={[styles.flex1, styles.sidebarLinkInner, styles.userSelectNone, styles.optionRow]}
            isFocused={isFocused}
            isDisabled={isDisabled}
            showTooltip={showTooltip}
            canSelectMultiple={canSelectMultiple}
            onSelectRow={onSelectRow}
            onCheckboxPress={onCheckboxPress}
            keyForList={item.keyForList}
            onFocus={onFocus}
            shouldSyncFocus={shouldSyncFocus}
            rightHandSideComponent={showRecommendedTag ? <Badge text={translate('travel.domainSelector.recommended')} /> : undefined}
            selectionButtonPosition={selectionButtonPosition}
        >
            <TextWithTooltip
                shouldShowTooltip={showTooltip}
                text={item.text ?? ''}
                style={[
                    styles.flex1,
                    styles.optionDisplayName,
                    isFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText,
                    item.isBold !== false && styles.sidebarLinkTextBold,
                    styles.pre,
                ]}
            />
        </SelectableListItem>
    );
}

export default TravelDomainListItem;
