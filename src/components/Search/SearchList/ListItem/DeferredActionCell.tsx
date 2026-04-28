import React, {useState, useTransition} from 'react';
import {View} from 'react-native';
import PulsingView from '@components/PulsingView';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import ActionCell from './ActionCell';
import type {ActionCellProps} from './ActionCell';

function DeferredActionCell(props: ActionCellProps) {
    const styles = useThemeStyles();
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
                <View style={[styles.br2, {height: 28, width: '100%', backgroundColor: theme.highlightBG}]} />
            </PulsingView>
        );
    }

    return <ActionCell {...props} />;
}

export default DeferredActionCell;
