import React, {useDeferredValue} from 'react';
import {View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import TransactionItemRowRBR from './TransactionItemRowRBR';

type DeferredTransactionItemRowRBRProps = React.ComponentProps<typeof TransactionItemRowRBR>;

function DeferredTransactionItemRowRBR(props: DeferredTransactionItemRowRBRProps) {
    const styles = useThemeStyles();
    const shouldRender = useDeferredValue(true, false);

    if (!shouldRender) {
        return <View style={props.containerStyles ?? [styles.minHeight4]} />;
    }

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <TransactionItemRowRBR {...props} />;
}

export default DeferredTransactionItemRowRBR;
