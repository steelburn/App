import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import useAdvancedSearchFilters from '@hooks/useAdvancedSearchFilters';
import useOnyx from '@hooks/useOnyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchAdvancedFiltersForm} from '@src/types/form';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import type {MultiSelectItem} from './MultiSelect';
import MultiSelect from './MultiSelect';
import type FilterComponentProps from './types';

type WorkspaceSelectorProps = {
    policyIDQuery: string[] | undefined;
    onChange: (item: string[]) => void;
};

function filterPolicyIDSelector(searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) {
    return searchAdvancedFiltersForm?.policyID;
}

function WorkspaceSelector({policyIDQuery, onChange}: WorkspaceSelectorProps) {
    const {workspaces, shouldShowWorkspaceSearchInput} = useAdvancedSearchFilters();
    const [policyID] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: filterPolicyIDSelector});
    const workspaceOptions: Array<MultiSelectItem<string>> = workspaces
        .flatMap((section) => section.data)
        .filter((workspace): workspace is typeof workspace & {policyID: string; icons: Icon[]} => !!workspace.policyID && !!workspace.icons)
        .map((workspace) => ({
            text: workspace.text,
            value: workspace.policyID,
            icons: workspace.icons,
        }));

    const policyIDs = policyID ?? policyIDQuery ?? [];

    return (
        <MultiSelect
            items={workspaceOptions}
            value={policyIDs}
            onChange={onChange}
            isSearchable={shouldShowWorkspaceSearchInput}
        />
    );
}

export default WorkspaceSelector;
