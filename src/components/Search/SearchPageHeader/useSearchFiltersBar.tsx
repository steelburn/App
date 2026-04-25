import React from 'react';
import type {ReactNode} from 'react';
import {ListFilterHeightContextProvider} from '@components/Search/FilterComponents/ListFilterHeightContext';
import AmountPopup from '@components/Search/FilterDropdowns/AmountPopup';
import CommonPopup from '@components/Search/FilterDropdowns/CommonPopup';
import type {PopoverComponentProps} from '@components/Search/FilterDropdowns/DropdownButton';
import ReportFieldPopup from '@components/Search/FilterDropdowns/ReportFieldPopup';
import useUpdateFilterQuery from '@components/Search/hooks/useUpdateFilterQuery';
import {useSearchStateContext} from '@components/Search/SearchContext';
import type {ReportFieldKey, SearchFilterKey, SearchQueryJSON} from '@components/Search/types';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import {FILTER_LABEL_MAP, isAmountFilterKey, isDateFilterKey, mapFiltersFormToLabelValueList} from '@libs/SearchUIUtils';
import type {SearchFilter} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchAdvancedFiltersForm} from '@src/types/form';
import FILTER_KEYS from '@src/types/form/SearchAdvancedFiltersForm';
import type {SearchAdvancedFiltersKey} from '@src/types/form/SearchAdvancedFiltersForm';
import {getEmptyObject} from '@src/types/utils/EmptyObject';
import type WithSentryLabel from '@src/types/utils/SentryLabel';
import DatePickerFilterPopup from './DatePickerFilterPopup';

type FilterItem = WithSentryLabel & {
    PopoverComponent: (props: PopoverComponentProps) => ReactNode;
};

type UseSearchFiltersBarResult = {
    filters: Array<SearchFilter & FilterItem>;
    hasErrors: boolean;
    shouldShowFiltersBarLoading: boolean;
};

type FilterPopupProps = {
    filterKey: SearchFilter['key'];
    searchAdvancedFiltersForm: Partial<SearchAdvancedFiltersForm>;
    queryJSON: SearchQueryJSON;
    closeOverlay: () => void;
    setPopoverWidth: PopoverComponentProps['setPopoverWidth'];
};

const SKIPPED_FILTERS = new Set<SearchAdvancedFiltersKey>([
    FILTER_KEYS.GROUP_BY,
    FILTER_KEYS.GROUP_CURRENCY,
    FILTER_KEYS.LIMIT,
    FILTER_KEYS.TYPE,
    FILTER_KEYS.VIEW,
    FILTER_KEYS.PAYER,
    FILTER_KEYS.ACTION,
    FILTER_KEYS.COLUMNS,
]);

function getFilterSentryLabel(filterKey: SearchAdvancedFiltersKey | SearchFilterKey | ReportFieldKey) {
    return `Search-Filter-${filterKey}`;
}

function FilterPopup({filterKey, searchAdvancedFiltersForm, queryJSON, closeOverlay, setPopoverWidth}: FilterPopupProps) {
    const {translate} = useLocalize();
    const label = translate(FILTER_LABEL_MAP[filterKey]);

    const updateFilterForm = useUpdateFilterQuery(queryJSON, true);

    if (isAmountFilterKey(filterKey)) {
        const value = {
            [CONST.SEARCH.AMOUNT_MODIFIERS.EQUAL_TO]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.AMOUNT_MODIFIERS.EQUAL_TO}`],
            [CONST.SEARCH.AMOUNT_MODIFIERS.GREATER_THAN]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.AMOUNT_MODIFIERS.GREATER_THAN}`],
            [CONST.SEARCH.AMOUNT_MODIFIERS.LESS_THAN]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.AMOUNT_MODIFIERS.LESS_THAN}`],
        };
        return (
            <AmountPopup
                filterKey={filterKey}
                value={value}
                closeOverlay={closeOverlay}
                label={label}
                updateFilterForm={updateFilterForm}
            />
        );
    }

    if (isDateFilterKey(filterKey)) {
        const value = {
            [CONST.SEARCH.DATE_MODIFIERS.ON]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.DATE_MODIFIERS.ON}`],
            [CONST.SEARCH.DATE_MODIFIERS.AFTER]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.DATE_MODIFIERS.AFTER}`],
            [CONST.SEARCH.DATE_MODIFIERS.BEFORE]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.DATE_MODIFIERS.BEFORE}`],
            [CONST.SEARCH.DATE_MODIFIERS.RANGE]: searchAdvancedFiltersForm[`${filterKey}${CONST.SEARCH.DATE_MODIFIERS.RANGE}`],
        };
        return (
            <DatePickerFilterPopup
                closeOverlay={closeOverlay}
                setPopoverWidth={setPopoverWidth}
                filterKey={filterKey}
                value={value}
                label={label}
                updateFilterForm={updateFilterForm}
            />
        );
    }

    if (filterKey === CONST.SEARCH.REPORT_FIELD.GLOBAL_PREFIX) {
        return (
            <ReportFieldPopup
                closeOverlay={closeOverlay}
                updateFilterForm={updateFilterForm}
            />
        );
    }

    return (
        <CommonPopup
            filterKey={filterKey}
            searchAdvancedFiltersForm={searchAdvancedFiltersForm}
            label={label}
            policyIDQuery={queryJSON.policyID}
            closeOverlay={closeOverlay}
            updateFilterForm={updateFilterForm}
        />
    );
}

function useSearchFiltersBar(queryJSON: SearchQueryJSON): UseSearchFiltersBarResult {
    const [searchAdvancedFiltersForm = getEmptyObject<Partial<SearchAdvancedFiltersForm>>()] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const {translate, localeCompare} = useLocalize();
    const {isOffline} = useNetwork();
    const {shouldShowFiltersBarLoading, currentSearchResults} = useSearchStateContext();
    const filters = mapFiltersFormToLabelValueList<FilterItem>(searchAdvancedFiltersForm, queryJSON.policyID, SKIPPED_FILTERS, translate, localeCompare, (filterKey) => ({
        PopoverComponent: ({closeOverlay, setPopoverWidth}) => (
            <ListFilterHeightContextProvider>
                <FilterPopup
                    filterKey={filterKey}
                    searchAdvancedFiltersForm={searchAdvancedFiltersForm}
                    queryJSON={queryJSON}
                    closeOverlay={closeOverlay}
                    setPopoverWidth={setPopoverWidth}
                />
            </ListFilterHeightContextProvider>
        ),
        sentryLabel: getFilterSentryLabel(filterKey),
    }));

    return {
        filters,
        hasErrors: Object.keys(currentSearchResults?.errors ?? {}).length > 0 && !isOffline,
        shouldShowFiltersBarLoading,
    };
}

export default useSearchFiltersBar;
export type {FilterItem};
export {SKIPPED_FILTERS};
