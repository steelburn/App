import React, {Activity, useState} from 'react';
import {View} from 'react-native';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem, SelectionListStyle} from '@components/SelectionList/types';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';

type SingleSelectItem<T> = {
    text: string;
    value: T;
};

type SingleSelectProps<T> = {
    /** The list of all items to show up in the list */
    items: Array<SingleSelectItem<T>>;

    /** The currently selected item */
    value: SingleSelectItem<T> | undefined;

    /** Function to call when changes are applied */
    onChange: (item: T) => void;

    /** Whether the search input should be displayed */
    isSearchable?: boolean;

    /** Search input place holder */
    searchPlaceholder?: string;

    /** Custom styles for the SelectionList */
    selectionListStyle?: SelectionListStyle;

    /** Whether SelectionList of popup should stay mounted when popup is not visible. */
    shouldShowList?: boolean;

    hasTitle?: boolean;
    hasHeader?: boolean;
};

function SingleSelect<T extends string>({value, items, isSearchable, searchPlaceholder, selectionListStyle, shouldShowList = true, hasTitle, hasHeader, onChange}: SingleSelectProps<T>) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth, isInLandscapeMode} = useResponsiveLayout();
    const {windowHeight} = useWindowDimensions();
    const [selectedItem, setSelectedItem] = useState(value);
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');

    const {options, noResultsFound} = (() => {
        // If the selection is searchable, we push the initially selected item into its own section and display it at the top
        if (isSearchable) {
            const initiallySelectedOption = value?.text.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                ? [{text: value.text, keyForList: value.value, isSelected: selectedItem?.value === value.value}]
                : [];
            const remainingOptions = items
                .filter((item) => item.value !== value?.value && item.text.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
                .map((item) => ({
                    text: item.text,
                    keyForList: item.value,
                    isSelected: selectedItem?.value === item.value,
                }));
            const allOptions = [...initiallySelectedOption, ...remainingOptions];
            const isEmpty = allOptions.length === 0;
            return {
                options: allOptions,
                noResultsFound: isEmpty,
            };
        }

        return {
            options: items.map((item) => ({
                text: item.text,
                keyForList: item.value,
                isSelected: item.value === selectedItem?.value,
            })),
            noResultsFound: false,
        };
    })();

    const updateSelectedItem = (item: ListItem<T>) => {
        const newItem = items.find((i) => i.value === item.keyForList);
        setSelectedItem(newItem);
        onChange(item.keyForList);
    };

    const textInputOptions = {
        value: searchTerm,
        label: isSearchable ? (searchPlaceholder ?? translate('common.search')) : undefined,
        onChangeText: setSearchTerm,
        headerMessage: noResultsFound ? translate('common.noResultsFound') : undefined,
    };

    return (
        <View
            style={[
                styles.getSelectionListPopoverHeight({
                    itemCount: options.length || 1,
                    windowHeight,
                    isInLandscapeMode,
                    hasTitle: hasTitle && isSmallScreenWidth,
                    hasHeader,
                    isSearchable: isSearchable ?? false,
                }),
            ]}
        >
            <Activity mode={shouldShowList ? 'visible' : 'hidden'}>
                <SelectionList
                    data={options}
                    shouldSingleExecuteRowSelect
                    ListItem={SingleSelectListItem}
                    onSelectRow={updateSelectedItem}
                    textInputOptions={textInputOptions}
                    style={{contentContainerStyle: [styles.pb0], ...selectionListStyle}}
                    shouldUpdateFocusedIndex={isSearchable}
                    initiallyFocusedItemKey={isSearchable ? value?.value : undefined}
                    shouldShowLoadingPlaceholder={!noResultsFound}
                />
            </Activity>
        </View>
    );
}

export type {SingleSelectItem};
export default SingleSelect;
