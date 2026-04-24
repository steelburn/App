import type {OnyxEntry} from 'react-native-onyx';
import {SKIPPED_FILTERS} from '@components/Search/SearchPageHeader/useSearchFiltersBar';
import {shouldShowFilter} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';
import type {SearchAdvancedFiltersForm} from '@src/types/form';
import type {SearchAdvancedFiltersKey} from '@src/types/form/SearchAdvancedFiltersForm';

const columnsSelector = (form: OnyxEntry<SearchAdvancedFiltersForm>) => form?.columns;

const hasFilterBarsSelector = (form: OnyxEntry<SearchAdvancedFiltersForm>) => {
    const type = form?.type ?? CONST.SEARCH.DATA_TYPES.EXPENSE;
    return !!Object.entries(form ?? {}).filter(([key, value]) => shouldShowFilter(SKIPPED_FILTERS, key as SearchAdvancedFiltersKey, value, type)).length;
};

export {columnsSelector, hasFilterBarsSelector};
