import React, {useState} from 'react';
import FilterComponents from '@components/Search/FilterComponents';
import type {SearchAmountFilterKeys, SearchDateFilterKeys} from '@components/Search/types';
import type {SearchFilter} from '@libs/SearchUIUtils';
import type {SearchAdvancedFiltersForm} from '@src/types/form/SearchAdvancedFiltersForm';
import BasePopup from './BasePopup';
import type {PopoverComponentProps} from './DropdownButton';

type CommonPopupProps = {
    filterKey: Exclude<SearchFilter['key'], SearchAmountFilterKeys | SearchDateFilterKeys>;
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

function CommonPopup({filterKey, searchAdvancedFiltersForm, label, policyIDQuery, updateFilterForm, closeOverlay}: CommonPopupProps) {
    const [values, setValues] = useState(() => searchAdvancedFiltersForm[filterKey]);

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
        >
            <FilterComponents
                filterKey={filterKey}
                policyIDQuery={policyIDQuery}
                onChange={setValues}
            />
        </BasePopup>
    );
}

export default CommonPopup;
