import React from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {getCleanedTagName, getTagNamesFromTagsLists} from '@libs/PolicyUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import passthroughPolicyTagListSelector from '@src/selectors/PolicyTagList';
import type {PolicyTagLists} from '@src/types/onyx';
import {getEmptyObject} from '@src/types/utils/EmptyObject';
import MultiSelect from './MultiSelect';

type TagSelectorProps = {
    onChange: (tags: string[]) => void;
};

function TagSelector({onChange}: TagSelectorProps) {
    const {translate} = useLocalize();
    const [searchAdvancedFiltersForm] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const policyIDs = searchAdvancedFiltersForm?.policyID ?? [];
    const selectedTagsItems = searchAdvancedFiltersForm?.tag ?? [];

    const [allPolicyTagLists = getEmptyObject<NonNullable<OnyxCollection<PolicyTagLists>>>()] = useOnyx(ONYXKEYS.COLLECTION.POLICY_TAGS, {selector: passthroughPolicyTagListSelector});
    const selectedPoliciesTagLists = Object.keys(allPolicyTagLists ?? {})
        .filter((key) => policyIDs?.map((policyID) => `${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`)?.includes(key))
        ?.map((key) => getTagNamesFromTagsLists(allPolicyTagLists?.[key] ?? {}))
        .flat();

    const tagItems = [{text: translate('search.noTag'), value: CONST.SEARCH.TAG_EMPTY_VALUE as string}];
    const uniqueTagNames = new Set<string>();
    if (policyIDs?.length === 0) {
        const tagListsUnpacked = Object.values(allPolicyTagLists ?? {}).filter((item) => !!item);
        for (const tag of tagListsUnpacked.map(getTagNamesFromTagsLists).flat()) {
            uniqueTagNames.add(tag);
        }
    } else if (selectedPoliciesTagLists.length > 0) {
        for (const tag of selectedPoliciesTagLists) {
            uniqueTagNames.add(tag);
        }
    }
    tagItems.push(...Array.from(uniqueTagNames).map((tagName) => ({text: getCleanedTagName(tagName), value: tagName})));

    return (
        <MultiSelect
            value={selectedTagsItems}
            items={tagItems}
            isSearchable={tagItems.length >= CONST.STANDARD_LIST_ITEM_LIMIT}
            onChange={onChange}
        />
    );
}

export default TagSelector;
