import React, {useEffect, useState, useTransition} from 'react';
import {View} from 'react-native';
import PulsingView from '@components/PulsingView';
import useTheme from '@hooks/useTheme';
import variables from '@styles/variables';
import ChatBubbleCell from './ChatBubbleCell';

type DeferredChatBubbleCellProps = React.ComponentProps<typeof ChatBubbleCell>;

function DeferredChatBubbleCell(props: DeferredChatBubbleCellProps) {
    const theme = useTheme();
    const [shouldRender, setShouldRender] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => setShouldRender(true));
    }, []);

    if (!shouldRender) {
        return (
            <PulsingView shouldPulse>
                <View style={{height: variables.iconSizeSmall, width: variables.iconSizeSmall, borderRadius: variables.iconSizeSmall / 2, backgroundColor: theme.skeletonLHNIn}} />
            </PulsingView>
        );
    }

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <ChatBubbleCell {...props} />;
}

export default DeferredChatBubbleCell;
