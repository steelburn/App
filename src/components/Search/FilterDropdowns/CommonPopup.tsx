import React, {useState} from 'react';
import FilterComponents from '@components/Search/FilterComponents';
import type {SearchAmountFilterKeys, SearchDateFilterKeys, SyntaxFilterKey} from '@components/Search/types';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import type {SearchFilter} from '@libs/SearchUIUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {SearchAdvancedFiltersForm} from '@src/types/form/SearchAdvancedFiltersForm';
import BasePopup from './BasePopup';
import type {PopoverComponentProps} from './DropdownButton';

type CommonPopupProps = {
    filterKey: Exclude<SearchFilter['key'], SearchAmountFilterKeys | SearchDateFilterKeys | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.REPORT_FIELD>;
    searchAdvancedFiltersForm: Partial<SearchAdvancedFiltersForm>;
    label: string;
    policyIDQuery: string[] | undefined;
    closeOverlay: PopoverComponentProps['closeOverlay'];
    updateFilterForm: (value: Partial<SearchAdvancedFiltersForm>) => void;
};

function getFilterApplySentryLabel(filterKey: CommonPopupProps['filterKey']) {
    return `Search-FilterPopupApply-${filterKey}`;
}

function getFilterResetSentryLabel(filterKey: CommonPopupProps['filterKey']) {
    return `Search-FilterPopupReset-${filterKey}`;
}

function getItemHeight(filterKey: SyntaxFilterKey) {
    if (filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.IN) {
        return variables.optionRowHeight;
    }
    return variables.optionRowHeightCompact;
}

function getIsSearchable(filterKey: SyntaxFilterKey, itemCount: number) {
    if (filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.IN || filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.CURRENCY || filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.PURCHASE_CURRENCY) {
        return true;
    }

    return itemCount >= CONST.STANDARD_LIST_ITEM_LIMIT;
}

function CommonPopup({filterKey, searchAdvancedFiltersForm, label, policyIDQuery, updateFilterForm, closeOverlay}: CommonPopupProps) {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout, isInLandscapeMode} = useResponsiveLayout();
    const {windowHeight} = useWindowDimensions();
    const [values, setValues] = useState(() => searchAdvancedFiltersForm[filterKey]);
    const [itemCount, setItemCount] = useState(1);

    const applyChanges = () => {
        updateFilterForm({[filterKey]: values} as Partial<SearchAdvancedFiltersForm>);
        closeOverlay();
    };

    const resetChanges = () => {
        updateFilterForm({[filterKey]: undefined});
        closeOverlay();
    };

    return (
        <BasePopup
            label={label}
            onApply={applyChanges}
            onReset={resetChanges}
            applySentryLabel={getFilterApplySentryLabel(filterKey)}
            resetSentryLabel={getFilterResetSentryLabel(filterKey)}
            style={[
                styles.getCommonSelectionListPopoverHeight(
                    itemCount,
                    getItemHeight(filterKey),
                    windowHeight,
                    shouldUseNarrowLayout,
                    isInLandscapeMode,
                    getIsSearchable(filterKey, itemCount),
                ),
            ]}
        >
            <FilterComponents
                onCountChange={setItemCount}
                filterKey={filterKey}
                policyIDQuery={policyIDQuery}
                onChange={setValues}
            />
        </BasePopup>
    );
}

export default CommonPopup;
