import React from 'react';
import useFilterFeedData from '@components/Search/hooks/useFilterFeedData';
import useFilterCountChange from '../hooks/useFilterCountChange';
import MultiSelect from './MultiSelect';
import type {FilterComponentProps} from './types';

type FeedSelectorProps = FilterComponentProps & {
    onChange: (item: string[]) => void;
};

function FeedSelector({onChange, onCountChange}: FeedSelectorProps) {
    const {feedOptions, feedValue} = useFilterFeedData();

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
