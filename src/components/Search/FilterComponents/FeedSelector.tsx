import React, {useEffect} from 'react';
import useFilterFeedData from '@components/Search/hooks/useFilterFeedData';
import useNetwork from '@hooks/useNetwork';
import {openSearchCardFiltersPage} from '@libs/actions/Search';
import MultiSelect from './MultiSelect';

type FeedSelectorProps = {
    onChange: (item: string[]) => void;
};

function FeedSelector({onChange}: FeedSelectorProps) {
    const {isOffline} = useNetwork();
    const {feedOptions, feedValue} = useFilterFeedData();

    useEffect(() => {
        if (isOffline) {
            return;
        }
        openSearchCardFiltersPage();
    }, [isOffline]);

    return (
        <MultiSelect
            value={feedValue.map((feed) => feed.value)}
            items={feedOptions}
            onChange={onChange}
        />
    );
}

export default FeedSelector;
