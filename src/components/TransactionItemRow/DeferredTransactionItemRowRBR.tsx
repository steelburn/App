import React, {useEffect, useState, useTransition} from 'react';
import {View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import TransactionItemRowRBR from './TransactionItemRowRBR';

type DeferredTransactionItemRowRBRProps = React.ComponentProps<typeof TransactionItemRowRBR>;

function DeferredTransactionItemRowRBR(props: DeferredTransactionItemRowRBRProps) {
    const styles = useThemeStyles();
    const [shouldRender, setShouldRender] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => setShouldRender(true));
    }, []);

    if (!shouldRender) {
        return <View style={[styles.minHeight4]} />;
    }

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <TransactionItemRowRBR {...props} />;
}

export default DeferredTransactionItemRowRBR;
