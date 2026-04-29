import {filterFeedSelector} from '@components/Search/selectors/Search';
import useAdvancedSearchFilters from '@hooks/useAdvancedSearchFilters';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {createCardFeedKey, getCardFeedKey, getCardFeedNamesWithType, getFeedCountryForDisplay, getWorkspaceCardFeedKey} from '@libs/CardFeedUtils';
import {getCardDescription} from '@libs/CardUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {WorkspaceCardsList} from '@src/types/onyx';
import getEmptyArray from '@src/types/utils/getEmptyArray';

function useFilterCardValue(value: string[]): string {
    const {translate} = useLocalize();
    const {policies, searchCards} = useAdvancedSearchFilters();

    const [feedFilter = getEmptyArray<string>()] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM, {selector: filterFeedSelector});
    const workspaceCardFeeds = Object.entries(searchCards ?? {}).reduce<Record<string, WorkspaceCardsList>>((acc, [cardID, card]) => {
        const feedCountry = getFeedCountryForDisplay(card);
        const feedKey = `${createCardFeedKey(card.fundID, card.bank, feedCountry)}`;
        const workspaceFeedKey = getWorkspaceCardFeedKey(feedKey);
        if (!acc[workspaceFeedKey]) {
            acc[workspaceFeedKey] = {};
        }

        acc[workspaceFeedKey][cardID] = card;
        return acc;
    }, {});

    const cardFeedNamesWithType = getCardFeedNamesWithType({
        workspaceCardFeeds,
        policies,
        translate,
    });

    const cardNames = Object.values(searchCards ?? {})
        .filter((card) => {
            const feedCountry = getFeedCountryForDisplay(card);
            return value.includes(card.cardID.toString()) && !feedFilter.includes(createCardFeedKey(card.fundID, card.bank, feedCountry));
        })
        .map((card) => getCardDescription(card, translate));

    const feedNames = Object.keys(cardFeedNamesWithType)
        .filter((workspaceCardFeedKey) => {
            const feedKey = getCardFeedKey(workspaceCardFeeds, workspaceCardFeedKey);
            return !!feedKey && feedFilter.includes(feedKey);
        })
        .map((cardFeedKey) => cardFeedNamesWithType[cardFeedKey].name);

    return [...feedNames, ...cardNames].join(', ');
}

export default useFilterCardValue;
