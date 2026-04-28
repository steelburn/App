import React, {useState, useTransition} from 'react';
import {View} from 'react-native';
import PulsingView from '@components/PulsingView';
import useTheme from '@hooks/useTheme';
import variables from '@styles/variables';
import ChatBubbleCell from './ChatBubbleCell';

type DeferredChatBubbleCellProps = React.ComponentProps<typeof ChatBubbleCell>;

function DeferredChatBubbleCell(props: DeferredChatBubbleCellProps) {
    const theme = useTheme();
    const [isPending, startTransition] = useTransition();
    const [isReady, setIsReady] = useState(false);

    if (!isReady) {
        startTransition(() => {
            setIsReady(true);
        });
    }

    if (isPending || !isReady) {
        return (
            <PulsingView shouldPulse>
                <View style={{height: variables.iconSizeSmall, width: variables.iconSizeSmall, borderRadius: variables.iconSizeSmall / 2, backgroundColor: theme.highlightBG}} />
            </PulsingView>
        );
    }

    return <ChatBubbleCell {...props} />;
}

export default DeferredChatBubbleCell;
