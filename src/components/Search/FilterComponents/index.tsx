import React, {useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {FILTER_LABEL_MAP, getMultiSelectFilterOptions, getSingleSelectFilterOptions} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import FILTER_KEYS from '@src/types/form/SearchAdvancedFiltersForm';
import type {SearchAdvancedFiltersForm} from '@src/types/form/SearchAdvancedFiltersForm';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';
import useFilterCountChange from '../hooks/useFilterCountChange';
import type {SyntaxFilterKey} from '../types';
import CardSelector from './CardSelector';
import CategorySelector from './CategorySelector';
import CurrencySelector from './CurrencySelector';
import ExportedToSelector from './ExportedToSelector';
import FeedSelector from './FeedSelector';
import InSelector from './InSelector';
import MultiSelect from './MultiSelect';
import SingleSelect from './SingleSelect';
import TagSelector from './TagSelector';
import TaxRateSelector from './TaxRateSelector';
import type {FilterComponentProps} from './types';
import TypeSelector from './TypeSelector';
import UserSelector from './UserSelector';
import WorkspaceSelector from './WorkspaceSelector';

type FilterComponentsProps = FilterComponentProps & {
    filterKey: SyntaxFilterKey;
    policyIDQuery: string[] | undefined;
    onChange: (value: string | string[]) => void;
};

type TextInputFilterComponentsProps = {
    filterKey:
        | typeof FILTER_KEYS.MERCHANT
        | typeof FILTER_KEYS.DESCRIPTION
        | typeof FILTER_KEYS.REPORT_ID
        | typeof FILTER_KEYS.KEYWORD
        | typeof FILTER_KEYS.TITLE
        | typeof FILTER_KEYS.WITHDRAWAL_ID;
    onChange: (value: string) => void;
};

type SingleSelectFilterComponentsProps = FilterComponentProps & {
    filterKey: typeof FILTER_KEYS.BILLABLE | typeof FILTER_KEYS.REIMBURSABLE | typeof FILTER_KEYS.WITHDRAWAL_TYPE;
    onChange: (value: string) => void;
};

type MultiSelectFilterComponentsProps = FilterComponentProps & {
    filterKey: typeof FILTER_KEYS.HAS | typeof FILTER_KEYS.IS | typeof FILTER_KEYS.EXPENSE_TYPE | typeof FILTER_KEYS.STATUS;
    onChange: (values: string[] | string) => void;
};

function TextInputFilterComponents({filterKey, onChange}: TextInputFilterComponentsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const formValueSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) => searchAdvancedFiltersForm?.[filterKey];
    const [formValue] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: formValueSelector});

    const [value, setValue] = useState(formValue);

    const label = translate(FILTER_LABEL_MAP[filterKey]);
    return (
        <TextInput
            placeholder={label}
            value={value}
            onChangeText={(newValue) => {
                setValue(newValue);
                onChange(newValue);
            }}
            accessibilityLabel={label}
            role={CONST.ROLE.PRESENTATION}
            containerStyles={[styles.ph5]}
        />
    );
}

function SingleSelectFilterComponents({filterKey, onChange, onCountChange}: SingleSelectFilterComponentsProps) {
    const {translate} = useLocalize();
    const formValueSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) => searchAdvancedFiltersForm?.[filterKey];
    const [formValue] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: formValueSelector});
    const items = getSingleSelectFilterOptions(filterKey, translate);

    useFilterCountChange(items.length, onCountChange);

    return (
        <SingleSelect
            items={items}
            value={items.find((option) => option.value === formValue)}
            onChange={onChange}
        />
    );
}

function MultiSelectFilterComponents({filterKey, onChange, onCountChange}: MultiSelectFilterComponentsProps) {
    const {translate} = useLocalize();
    const formValuesSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>): [SearchDataTypes | undefined, string[] | undefined] => {
        const values = searchAdvancedFiltersForm?.[filterKey];
        const type = searchAdvancedFiltersForm?.type;

        if (!values) {
            return [type, undefined];
        }

        return [type, Array.isArray(values) ? values : values.split(',')];
    };
    const [[type = CONST.SEARCH.DATA_TYPES.EXPENSE, formValues = []] = []] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: formValuesSelector});
    const items = getMultiSelectFilterOptions(filterKey, type, translate);

    useFilterCountChange(items.length, onCountChange);

    return (
        <MultiSelect
            items={items}
            value={formValues}
            onChange={(selectedItems) => {
                if (filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS) {
                    onChange(selectedItems.length > 0 ? selectedItems : CONST.SEARCH.STATUS.EXPENSE.ALL);
                    return;
                }
                onChange(selectedItems);
            }}
        />
    );
}

function FilterComponents({filterKey, policyIDQuery, onChange, onCountChange}: FilterComponentsProps) {
    switch (filterKey) {
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.TYPE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.FEED:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.CARD_ID:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.IN:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.TAX_RATE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.EXPORTED_TO:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.TAG:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.CATEGORY: {
            const Component = {
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.TYPE]: TypeSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.FEED]: FeedSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.CARD_ID]: CardSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.IN]: InSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.TAX_RATE]: TaxRateSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.EXPORTED_TO]: ExportedToSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.TAG]: TagSelector,
                [CONST.SEARCH.SYNTAX_FILTER_KEYS.CATEGORY]: CategorySelector,
            }[filterKey];
            return (
                <Component
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
        }
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.MERCHANT:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.DESCRIPTION:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.REPORT_ID:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.KEYWORD:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.TITLE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.WITHDRAWAL_ID: {
            return (
                <TextInputFilterComponents
                    key={filterKey}
                    filterKey={filterKey}
                    onChange={onChange}
                />
            );
        }
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.CURRENCY:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.PURCHASE_CURRENCY: {
            return (
                <CurrencySelector
                    key={filterKey}
                    filterKey={filterKey}
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
        }
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.BILLABLE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.REIMBURSABLE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.WITHDRAWAL_TYPE: {
            return (
                <SingleSelectFilterComponents
                    key={filterKey}
                    filterKey={filterKey}
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
        }
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.HAS:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.IS:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.EXPENSE_TYPE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS: {
            return (
                <MultiSelectFilterComponents
                    key={filterKey}
                    filterKey={filterKey}
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
        }
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.ASSIGNEE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.ATTENDEE:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.TO:
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.FROM:
            return (
                <UserSelector
                    key={filterKey}
                    filterKey={filterKey}
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
        case CONST.SEARCH.SYNTAX_FILTER_KEYS.POLICY_ID:
            return (
                <WorkspaceSelector
                    policyIDQuery={policyIDQuery}
                    onChange={onChange}
                    onCountChange={onCountChange}
                />
            );
    }
}

export default FilterComponents;
