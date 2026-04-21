import React, {useEffect} from 'react';
import useFilterCountChange from '@components/Search/hooks/useFilterCountChange';
import useFilterFeedData from '@components/Search/hooks/useFilterFeedData';
import useNetwork from '@hooks/useNetwork';
import {openSearchCardFiltersPage} from '@libs/actions/Search';
import MultiSelect from './MultiSelect';
import type FilterComponentProps from './types';

type FeedSelectorProps = FilterComponentProps & {
    onChange: (item: string[]) => void;
};

function FeedSelector({onChange, onCountChange}: FeedSelectorProps) {
    const {isOffline} = useNetwork();
    const {feedOptions, feedValue} = useFilterFeedData();

    useEffect(() => {
        if (isOffline) {
            return;
        }
        openSearchCardFiltersPage();
    }, [isOffline]);

    useFilterCountChange(feedOptions.length, onCountChange);

    return (
        <MultiSelect
            value={feedValue.map((feed) => feed.value)}
            items={feedOptions}
            onChange={onChange}
        />
    );
}

export default FeedSelector;
