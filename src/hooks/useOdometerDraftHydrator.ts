import {useEffect} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {IOURequestType} from '@userActions/IOU';
import {hydrateOdometerDraftIntoTransaction} from '@userActions/OdometerTransactionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Transaction} from '@src/types/onyx';
import useOnyx from './useOnyx';

type UseOdometerDraftHydratorParams = {
    transaction: OnyxEntry<Transaction>;
    transactionRequestType: IOURequestType | undefined;
    isLoadingTransaction?: boolean;
    isLoadingSelectedTab?: boolean;
};

// Restores save-for-later odometer draft into the active TRANSACTION_DRAFT whenever the user lands
// on DISTANCE_ODOMETER. Web blob URLs in transaction.comment.odometer* die on page reload while
// ODOMETER_DRAFT (base64) survives, so we re-mint blobs from the draft on landing.
//
// Two trigger points: the mount effect catches Cmd+R (no tab change fires); the returned callback
// is invoked from useResetIOUType after initMoneyRequest's rebuild branch wipes the comment.
function useOdometerDraftHydrator({
    transaction,
    transactionRequestType,
    isLoadingTransaction = false,
    isLoadingSelectedTab = false,
}: UseOdometerDraftHydratorParams): (newIOUType: IOURequestType) => void {
    const [odometerDraft] = useOnyx(ONYXKEYS.ODOMETER_DRAFT);

    useEffect(() => {
        if (transactionRequestType !== CONST.IOU.REQUEST_TYPE.DISTANCE_ODOMETER) {
            return;
        }
        if (!odometerDraft) {
            return;
        }
        if (isLoadingTransaction || isLoadingSelectedTab) {
            return;
        }
        hydrateOdometerDraftIntoTransaction(transaction?.transactionID ?? CONST.IOU.OPTIMISTIC_TRANSACTION_ID, odometerDraft, transaction?.comment);
        // Narrow deps: only react to landing-on-odometer signals — transaction.comment changes would re-fire after our own merge.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionRequestType, odometerDraft, isLoadingTransaction, isLoadingSelectedTab]);

    return (newIOUType: IOURequestType) => {
        if (newIOUType !== CONST.IOU.REQUEST_TYPE.DISTANCE_ODOMETER) {
            return;
        }
        hydrateOdometerDraftIntoTransaction(transaction?.transactionID ?? CONST.IOU.OPTIMISTIC_TRANSACTION_ID, odometerDraft, transaction?.comment);
    };
}

export default useOdometerDraftHydrator;
