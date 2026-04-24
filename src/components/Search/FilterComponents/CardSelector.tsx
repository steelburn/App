import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import ActivityIndicator from '@components/ActivityIndicator';
import {usePersonalDetails} from '@components/OnyxListItemProvider';
import CardListItem from '@components/SelectionList/ListItem/CardListItem';
import SelectionListWithSections from '@components/SelectionList/SelectionListWithSections';
import type {Section} from '@components/SelectionList/SelectionListWithSections/types';
import {useCompanyCardFeedIcons} from '@hooks/useCompanyCardIcons';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeIllustrations from '@hooks/useThemeIllustrations';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import {openSearchCardFiltersPage} from '@libs/actions/Search';
import {buildCardsData, generateSelectedCards} from '@libs/CardFeedUtils';
import type {CardFilterItem} from '@libs/CardFeedUtils';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

type CardSelectorProps = {
    onChange: (cards: string[]) => void;
};

function CardSelector({onChange}: CardSelectorProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const illustrations = useThemeIllustrations();
    const companyCardFeedIcons = useCompanyCardFeedIcons();
    const {windowHeight} = useWindowDimensions();
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {isSmallScreenWidth, isInLandscapeMode} = useResponsiveLayout();

    const [areCardsLoaded] = useOnyx(ONYXKEYS.IS_SEARCH_FILTERS_CARD_DATA_LOADED);
    const [userCardList, userCardListMetadata] = useOnyx(ONYXKEYS.CARD_LIST);
    const [customCardNames] = useOnyx(ONYXKEYS.NVP_EXPENSIFY_COMPANY_CARDS_CUSTOM_NAMES);
    const [workspaceCardFeeds, workspaceCardFeedsMetadata] = useOnyx(ONYXKEYS.COLLECTION.WORKSPACE_CARDS_LIST);
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const [searchAdvancedFiltersForm, searchAdvancedFiltersFormMetadata] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const personalDetails = usePersonalDetails();

    const [selectedCards, setSelectedCards] = useState<string[]>([]);

    useEffect(() => {
        if (isOffline) {
            return;
        }
        openSearchCardFiltersPage();
    }, [isOffline]);

    useEffect(() => {
        const generatedCards = generateSelectedCards(userCardList, workspaceCardFeeds, searchAdvancedFiltersForm?.feed, searchAdvancedFiltersForm?.cardID);
        setSelectedCards(generatedCards);
    }, [searchAdvancedFiltersForm?.feed, searchAdvancedFiltersForm?.cardID, workspaceCardFeeds, userCardList]);

    const individualCardsSectionData = buildCardsData(
        workspaceCardFeeds ?? {},
        userCardList ?? {},
        personalDetails ?? {},
        selectedCards,
        illustrations,
        companyCardFeedIcons,
        false,
        customCardNames,
    );

    const closedCardsSectionData = buildCardsData(
        workspaceCardFeeds ?? {},
        userCardList ?? {},
        personalDetails ?? {},
        selectedCards,
        illustrations,
        companyCardFeedIcons,
        true,
        customCardNames,
    );

    const shouldShowSearchInput = individualCardsSectionData.selected.length + individualCardsSectionData.unselected.length >= CONST.STANDARD_LIST_ITEM_LIMIT;

    const searchFunction = (item: CardFilterItem) =>
        !!item.text?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        !!item.lastFourPAN?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        !!item.cardName?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        (item.isVirtual && translate('workspace.expensifyCard.virtual').toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()));

    let sections: Array<Section<CardFilterItem>> = [];
    let itemCount = 0;
    let sectionHeaderCount = 0;

    if (searchAdvancedFiltersForm) {
        const selectedData = [...individualCardsSectionData.selected, ...closedCardsSectionData.selected].filter(searchFunction);
        const unselectedIndividualCardsData = individualCardsSectionData.unselected.filter(searchFunction);
        const unselectedClosedCardsData = closedCardsSectionData.unselected.filter(searchFunction);

        itemCount = selectedData.length + unselectedIndividualCardsData.length + unselectedClosedCardsData.length;
        sectionHeaderCount = unselectedClosedCardsData.length > 0 ? 1 : 0;

        sections = [
            {
                title: undefined,
                data: selectedData,
                sectionIndex: 0,
            },
            {
                title: undefined,
                data: unselectedIndividualCardsData,
                sectionIndex: 1,
            },
            {
                title: translate('search.filters.card.closedCards'),
                data: unselectedClosedCardsData,
                sectionIndex: 2,
            },
        ];
    }

    const updateNewCards = (item: CardFilterItem) => {
        if (!item.keyForList) {
            return;
        }

        if (item.isSelected) {
            const newCardsObject = selectedCards.filter((card) => card !== item.keyForList);
            setSelectedCards(newCardsObject);
            onChange(newCardsObject);
        } else {
            const newCardsObject = [...selectedCards, item.keyForList];
            setSelectedCards(newCardsObject);
            onChange(newCardsObject);
        }
    };

    const textInputOptions = {
        value: searchTerm,
        label: translate('common.search'),
        onChangeText: setSearchTerm,
        headerMessage: debouncedSearchTerm.trim() && sections.every((section) => !section.data.length) ? translate('common.noResultsFound') : '',
    };

    const isLoadingOnyxData = isLoadingOnyxValue(userCardListMetadata, workspaceCardFeedsMetadata, searchAdvancedFiltersFormMetadata);
    const shouldShowLoadingState = isLoadingOnyxData || (!areCardsLoaded && !isOffline);
    const reasonAttributes: SkeletonSpanReasonAttributes = {context: 'SearchFiltersCardPage', isLoadingFromOnyx: isLoadingOnyxData};

    return (
        <View
            style={[
                styles.getSelectionListPopoverHeight({
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- we want to fallback to 1 when it's 0
                    itemCount: itemCount || 1,
                    itemHeight: variables.optionRowHeight,
                    windowHeight,
                    isInLandscapeMode,
                    hasTitle: isSmallScreenWidth,
                    isSearchable: shouldShowSearchInput,
                    extraHeight: 28 * sectionHeaderCount,
                }),
            ]}
        >
            {shouldShowLoadingState ? (
                <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter, styles.alignItemsCenter]}>
                    <ActivityIndicator
                        color={theme.spinner}
                        size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                        style={[styles.pl3]}
                        reasonAttributes={reasonAttributes}
                    />
                </View>
            ) : (
                <SelectionListWithSections<CardFilterItem>
                    sections={sections}
                    ListItem={CardListItem}
                    onSelectRow={updateNewCards}
                    shouldPreventDefaultFocusOnSelectRow={false}
                    shouldShowTextInput={shouldShowSearchInput}
                    textInputOptions={textInputOptions}
                    shouldStopPropagation
                    canSelectMultiple
                />
            )}
        </View>
    );
}

export default CardSelector;
