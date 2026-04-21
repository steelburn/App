import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {useCurrencyListActions, useCurrencyListState} from '@components/CurrencyListContextProvider';
import useFilterCountChange from '@components/Search/hooks/useFilterCountChange';
import useOnyx from '@hooks/useOnyx';
import {getCurrencyOptions} from '@libs/SearchUIUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchAdvancedFiltersForm} from '@src/types/form';
import type {FILTER_KEYS} from '@src/types/form/SearchAdvancedFiltersForm';
import getEmptyArray from '@src/types/utils/getEmptyArray';
import MultiSelect from './MultiSelect';
import type FilterComponentProps from './types';

type CurrencySelectorProps = FilterComponentProps & {
    filterKey: typeof FILTER_KEYS.CURRENCY | typeof FILTER_KEYS.PURCHASE_CURRENCY;
    onChange: (item: string[]) => void;
};

function CurrencySelector({filterKey, onChange, onCountChange}: CurrencySelectorProps) {
    const {currencyList} = useCurrencyListState();
    const {getCurrencySymbol} = useCurrencyListActions();
    const currencyOptions = getCurrencyOptions(currencyList, getCurrencySymbol);

    const selectedCurrenciesSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) => searchAdvancedFiltersForm?.[filterKey];
    const [selectedCurrencies = getEmptyArray<string>()] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: selectedCurrenciesSelector});

    useFilterCountChange(currencyOptions.length, onCountChange);

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
