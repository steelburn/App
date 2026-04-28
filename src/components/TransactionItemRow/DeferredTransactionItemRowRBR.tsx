import React, {useState, useTransition} from 'react';
import {View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import TransactionItemRowRBR from './TransactionItemRowRBR';

type DeferredTransactionItemRowRBRProps = React.ComponentProps<typeof TransactionItemRowRBR>;

function DeferredTransactionItemRowRBR(props: DeferredTransactionItemRowRBRProps) {
    const styles = useThemeStyles();
    const [isPending, startTransition] = useTransition();
    const [isReady, setIsReady] = useState(false);

    if (!isReady) {
        startTransition(() => {
            setIsReady(true);
        });
    }

    if (isPending || !isReady) {
        return <View style={[styles.minHeight4]} />;
    }

    return <TransactionItemRowRBR {...props} />;
}

export default DeferredTransactionItemRowRBR;
