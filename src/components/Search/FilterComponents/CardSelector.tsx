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
import useTheme from '@hooks/useTheme';
import useThemeIllustrations from '@hooks/useThemeIllustrations';
import useThemeStyles from '@hooks/useThemeStyles';
import {openSearchCardFiltersPage} from '@libs/actions/Search';
import {buildCardFeedsData, buildCardsData, generateSelectedCards, getDomainFeedData} from '@libs/CardFeedUtils';
import type {CardFilterItem} from '@libs/CardFeedUtils';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';
import useFilterCountChange from '../hooks/useFilterCountChange';
import type {FilterComponentProps} from './types';

type CardSelectorProps = FilterComponentProps & {
    onChange: (cards: string[]) => void;
};

function CardSelector({onChange, onCountChange}: CardSelectorProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const illustrations = useThemeIllustrations();
    const companyCardFeedIcons = useCompanyCardFeedIcons();

    const [areCardsLoaded] = useOnyx(ONYXKEYS.IS_SEARCH_FILTERS_CARD_DATA_LOADED);
    const [userCardList, userCardListMetadata] = useOnyx(ONYXKEYS.CARD_LIST);
    const [customCardNames] = useOnyx(ONYXKEYS.NVP_EXPENSIFY_COMPANY_CARDS_CUSTOM_NAMES);
    const [workspaceCardFeeds, workspaceCardFeedsMetadata] = useOnyx(ONYXKEYS.COLLECTION.WORKSPACE_CARDS_LIST);
    const [policies, policiesMetadata] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
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

    const domainFeedsData = getDomainFeedData(workspaceCardFeeds);

    const cardFeedsSectionData = buildCardFeedsData(workspaceCardFeeds ?? CONST.EMPTY_OBJECT, domainFeedsData, policies, selectedCards, translate, illustrations, companyCardFeedIcons);

    const shouldShowSearchInput =
        cardFeedsSectionData.selected.length + cardFeedsSectionData.unselected.length + individualCardsSectionData.selected.length + individualCardsSectionData.unselected.length >=
        CONST.STANDARD_LIST_ITEM_LIMIT;

    const searchFunction = (item: CardFilterItem) =>
        !!item.text?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        !!item.lastFourPAN?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        !!item.cardName?.toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()) ||
        (item.isVirtual && translate('workspace.expensifyCard.virtual').toLocaleLowerCase().includes(debouncedSearchTerm.toLocaleLowerCase()));

    let sections: Array<Section<CardFilterItem>> = [];
    let itemCount = 0;

    if (searchAdvancedFiltersForm) {
        const selectedData = [...cardFeedsSectionData.selected, ...individualCardsSectionData.selected, ...closedCardsSectionData.selected];
        const unselectedCardFeedsData = cardFeedsSectionData.unselected;
        const unselectedIndividualCardsData = individualCardsSectionData.unselected;
        const unselectedClosedCardsData = closedCardsSectionData.unselected;

        itemCount = selectedData.length + unselectedCardFeedsData.length + unselectedIndividualCardsData.length + unselectedClosedCardsData.length;

        sections = [
            {
                title: undefined,
                data: selectedData.filter(searchFunction),
                sectionIndex: 0,
            },
            {
                title: translate('search.filters.card.cardFeeds'),
                data: unselectedCardFeedsData.filter(searchFunction),
                sectionIndex: 1,
            },
            {
                title: translate('search.filters.card.individualCards'),
                data: unselectedIndividualCardsData.filter(searchFunction),
                sectionIndex: 2,
            },
            {
                title: translate('search.filters.card.closedCards'),
                data: unselectedClosedCardsData.filter(searchFunction),
                sectionIndex: 3,
            },
        ];
    }

    useFilterCountChange(itemCount, onCountChange);

    const updateNewCards = (item: CardFilterItem) => {
        if (!item.keyForList) {
            return;
        }

        const isCardFeed = item?.isCardFeed && item?.correspondingCards;

        if (item.isSelected) {
            const newCardsObject = selectedCards.filter((card) => (isCardFeed ? !item.correspondingCards?.includes(card) : card !== item.keyForList));
            setSelectedCards(newCardsObject);
            onChange(newCardsObject);
        } else {
            const newCardsObject = isCardFeed ? [...selectedCards, ...(item?.correspondingCards ?? [])] : [...selectedCards, item.keyForList];
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

    const isLoadingOnyxData = isLoadingOnyxValue(userCardListMetadata, workspaceCardFeedsMetadata, searchAdvancedFiltersFormMetadata, policiesMetadata);
    const shouldShowLoadingState = isLoadingOnyxData || (!areCardsLoaded && !isOffline);
    const reasonAttributes: SkeletonSpanReasonAttributes = {context: 'SearchFiltersCardPage', isLoadingFromOnyx: isLoadingOnyxData};

    return shouldShowLoadingState ? (
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
    );
}

export default CardSelector;
