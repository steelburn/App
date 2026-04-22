import isEmpty from 'lodash/isEmpty';
import React, {useEffect, useRef, useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import useFilterCountChange from '@components/Search/hooks/useFilterCountChange';
import SelectionList from '@components/SelectionList';
import UserSelectionListItem from '@components/SelectionList/ListItem/UserSelectionListItem';
import type {ListItem, SelectionListHandle} from '@components/SelectionList/types';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSearchSelector from '@hooks/useSearchSelector';
import useThemeStyles from '@hooks/useThemeStyles';
import canFocusInputOnScreenFocus from '@libs/canFocusInputOnScreenFocus';
import {getParticipantsOption} from '@libs/OptionsListUtils';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchAdvancedFiltersForm} from '@src/types/form/SearchAdvancedFiltersForm';
import getEmptyArray from '@src/types/utils/getEmptyArray';
import type FilterComponentProps from './types';

type UserSelectorProps = FilterComponentProps & {
    filterKey:
        | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.ASSIGNEE
        | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.ATTENDEE
        | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.TO
        | typeof CONST.SEARCH.SYNTAX_FILTER_KEYS.FROM;
    onChange: (options: string[]) => void;
};

function UserSelector({filterKey, onChange, onCountChange}: UserSelectorProps) {
    const selectionListRef = useRef<SelectionListHandle<ListItem> | null>(null);
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const personalDetails = usePersonalDetails();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const currentUserAccountID = currentUserPersonalDetails.accountID;
    const shouldFocusInputOnScreenFocus = canFocusInputOnScreenFocus();
    const [isSearchingForReports] = useOnyx(ONYXKEYS.RAM_ONLY_IS_SEARCHING_FOR_REPORTS);
    const accountIDsSelector = (searchAdvancedFiltersForm: OnyxEntry<SearchAdvancedFiltersForm>) => searchAdvancedFiltersForm?.[filterKey];
    const [accountIDs = getEmptyArray<string>()] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: accountIDsSelector});
    const initialSelectedOptions = accountIDs.reduce<OptionData[]>((options, id) => {
        const participant = personalDetails?.[id];
        if (!participant) {
            return options;
        }

        const optionData = {
            ...getParticipantsOption(participant, personalDetails),
            isSelected: true,
        };

        if (optionData) {
            options.push(optionData as OptionData);
        }

        return options;
    }, []);

    const {searchTerm, debouncedSearchTerm, setSearchTerm, availableOptions, toggleSelection, areOptionsInitialized, selectedOptionsForDisplay, onListEndReached} = useSearchSelector({
        selectionMode: CONST.SEARCH_SELECTOR.SELECTION_MODE_MULTI,
        searchContext: CONST.SEARCH_SELECTOR.SEARCH_CONTEXT_GENERAL,
        initialSelected: initialSelectedOptions,
        excludeLogins: CONST.EXPENSIFY_EMAILS_OBJECT,
        maxRecentReportsToShow: CONST.IOU.MAX_RECENT_REPORTS_TO_SHOW,
        includeUserToInvite: false,
        includeCurrentUser: true,
        onSelectionChange: (options) => onChange(options.flatMap((option) => (option.accountID ? [option.accountID.toString()] : []))),
    });

    const listData = (() => {
        const personalDetailsList = availableOptions.personalDetails.map((participant) => ({
            ...participant,
            keyForList: String(participant.accountID),
        }));
        const recentReports = availableOptions.recentReports.map((report) => ({
            ...report,
            keyForList: String(report.reportID),
        }));
        const combinedOptions = [...selectedOptionsForDisplay, ...personalDetailsList, ...recentReports];

        // Sort the options so that selected items appear first, and the current user appears right after that, followed by the rest of the options in their original order
        combinedOptions.sort((a, b) => {
            // selected items first
            if (a.isSelected && !b.isSelected) {
                return -1;
            }
            if (!a.isSelected && b.isSelected) {
                return 1;
            }

            // Put the current user at the top of the list
            if (a.accountID === currentUserAccountID) {
                return -1;
            }
            if (b.accountID === currentUserAccountID) {
                return 1;
            }
            return 0;
        });

        const combinedOptionsWithKeyForList = combinedOptions.map((option) => ({
            ...option,
            keyForList: option.keyForList ?? option.login ?? '',
        }));
        return combinedOptionsWithKeyForList;
    })();

    const headerMessage = isEmpty(listData) ? translate('common.noResultsFound') : undefined;

    const selectUser = (option: OptionData) => {
        toggleSelection(option);
        selectionListRef?.current?.scrollToIndex(0);
    };

    const isLoadingNewOptions = !!isSearchingForReports;
    const [totalOptionsCount, setTotalOptionsCount] = useState(() => selectedOptionsForDisplay.length + availableOptions.personalDetails.length + availableOptions.recentReports.length);

    useEffect(() => {
        if (debouncedSearchTerm) {
            return;
        }
        setTotalOptionsCount(selectedOptionsForDisplay.length + availableOptions.personalDetails.length + availableOptions.recentReports.length);
    }, [debouncedSearchTerm, selectedOptionsForDisplay.length, availableOptions.personalDetails.length, availableOptions.recentReports.length]);

    const shouldShowSearchInput = totalOptionsCount >= CONST.STANDARD_LIST_ITEM_LIMIT;

    const textInputOptions = shouldShowSearchInput
        ? {
              value: searchTerm,
              label: translate('selectionList.searchForSomeone'),
              onChangeText: setSearchTerm,
              headerMessage,
              disableAutoFocus: !shouldFocusInputOnScreenFocus,
          }
        : undefined;

    useFilterCountChange(totalOptionsCount, onCountChange);

    return (
        <SelectionList
            data={listData}
            ref={selectionListRef}
            textInputOptions={textInputOptions}
            canSelectMultiple
            ListItem={UserSelectionListItem}
            onSelectRow={selectUser}
            isLoadingNewOptions={isLoadingNewOptions}
            shouldShowLoadingPlaceholder={!areOptionsInitialized}
            onEndReached={onListEndReached}
            style={{contentContainerStyle: [styles.pb0]}}
        />
    );
}

export default UserSelector;
