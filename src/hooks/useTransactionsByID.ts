import {useCallback, useMemo} from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction} from '@src/types/onyx';
import useOnyx from './useOnyx';

function useTransactionsByID(transactionIDs: string[] | undefined) {
    const transactionIDsKey = transactionIDs?.join('|') ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transactionIDsKey is a primitive proxy for transactionIDs to avoid changing the selector on referential-only changes
    const stableTransactionIDs = useMemo(() => transactionIDs ?? [], [transactionIDsKey]);

    const transactionsSelector = useCallback(
        (transactions: OnyxCollection<Transaction>) => stableTransactionIDs.map((id) => transactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${id}`]),
        [stableTransactionIDs],
    );

    const [transactions] = useOnyx(
        ONYXKEYS.COLLECTION.TRANSACTION,
        {
            selector: transactionsSelector,
        },
        [transactionsSelector],
    );

    return [transactions];
}

export default useTransactionsByID;
