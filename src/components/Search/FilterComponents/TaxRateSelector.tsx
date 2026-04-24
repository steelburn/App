import React from 'react';
import useOnyx from '@hooks/useOnyx';
import {getAllTaxRates} from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import MultiSelect from './MultiSelect';

type TaxRateSelectorProps = {
    onChange: (taxRates: string[]) => void;
};

function TaxRateSelector({onChange}: TaxRateSelectorProps) {
    const [searchAdvancedFiltersForm] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);

    const taxRates = searchAdvancedFiltersForm?.taxRate;
    const policyIDs = searchAdvancedFiltersForm?.policyID;
    const allTaxRates = getAllTaxRates(policies);
    const selectedPoliciesMap = policyIDs?.reduce<Record<string, Policy>>((acc, policyID) => {
        const key = `${ONYXKEYS.COLLECTION.POLICY}${policyID}`;
        const policy = policies?.[key];
        if (policy) {
            acc[key] = policy;
        }
        return acc;
    }, {});
    const scopedTaxRates = !selectedPoliciesMap || Object.keys(selectedPoliciesMap).length === 0 ? allTaxRates : getAllTaxRates(selectedPoliciesMap);
    const taxItems = Object.entries(scopedTaxRates).map(([taxRateName, taxRateKeys]) => ({
        text: taxRateName,
        value: taxRateKeys.toString(),
    }));

    return (
        <MultiSelect
            value={taxRates ?? []}
            items={taxItems}
            isSearchable={taxItems.length >= CONST.STANDARD_LIST_ITEM_LIMIT}
            onChange={onChange}
        />
    );
}

export default TaxRateSelector;
