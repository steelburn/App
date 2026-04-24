import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {useCurrencyListActions, useCurrencyListState} from '@components/CurrencyListContextProvider';
import useOnyx from '@hooks/useOnyx';
import {getCurrencyOptions} from '@libs/SearchUIUtils';
import type CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchAdvancedFiltersForm} from '@src/types/form';
import getEmptyArray from '@src/types/utils/getEmptyArray';
import MultiSelect from './MultiSelect';

type CurrencySelectorProps = {
    filterKey: typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.CURRENCY | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.PURCHASE_CURRENCY;
    onChange: (item: string[]) => void;
};

function CurrencySelector({filterKey, onChange}: CurrencySelectorProps) {
    const {currencyList} = useCurrencyListState();
    const {getCurrencySymbol} = useCurrencyListActions();
    const currencyOptions = getCurrencyOptions(currencyList, getCurrencySymbol);

    const selectedCurrenciesSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) => searchAdvancedFiltersForm?.[filterKey];
    const [selectedCurrencies = getEmptyArray<string>()] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: selectedCurrenciesSelector});

    return (
        <MultiSelect
            value={selectedCurrencies}
            items={currencyOptions}
            isSearchable
            onChange={onChange}
        />
    );
}

export default CurrencySelector;
