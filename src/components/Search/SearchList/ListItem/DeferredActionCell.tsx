import React, {useEffect, useState, useTransition} from 'react';
import {View} from 'react-native';
import PulsingView from '@components/PulsingView';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import ActionCell from './ActionCell';
import type {ActionCellProps} from './ActionCell';

function DeferredActionCell(actionCellProps: ActionCellProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const [shouldRender, setShouldRender] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => setShouldRender(true));
    }, []);

    if (!shouldRender) {
        const sizeStyle = actionCellProps.extraSmall ? styles.buttonExtraSmall : styles.buttonSmall;
        return (
            <PulsingView
                shouldPulse
                style={styles.w100}
            >
                <View style={[styles.w100, sizeStyle, {backgroundColor: theme.skeletonLHNIn}]} />
            </PulsingView>
        );
    }

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <ActionCell {...actionCellProps} />;
}

export default DeferredActionCell;
