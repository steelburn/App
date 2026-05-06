import {useEffect, useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import CONST from '@src/CONST';
import type {Report} from '@src/types/onyx';

/**
 * After an expense is created optimistically, `transactionThreadReportID` is derived from
 * report actions immediately, but `useOnyx` for the thread report needs one more render cycle
 * to re-subscribe and deliver data. This hook detects that transient gap and signals whether
 * a loading skeleton should be shown, bounded by `CONST.SKELETON_LOADING_TIMEOUT_MS` so the
 * view is never blocked indefinitely.
 */
function useTransactionThreadPendingSkeleton(
    isSingleExpense: boolean,
    transactionThreadReportID: string | undefined,
    transactionThreadReport: OnyxEntry<Report>,
    isOffline: boolean,
): boolean {
    // Separate the data-readiness check from the offline check so that the timeout
    // keeps running while offline. This prevents a timeout restart when connectivity
    // toggles — the timer is a safety valve that should fire exactly once per report ID.
    const isDataPending = isSingleExpense && !!transactionThreadReportID && transactionThreadReportID !== CONST.FAKE_REPORT_ID && !transactionThreadReport?.reportID;

    const [timedOutID, setTimedOutID] = useState<string | undefined>();

    useEffect(() => {
        if (!isDataPending) {
            return;
        }

        const timeoutID = setTimeout(() => {
            setTimedOutID(transactionThreadReportID);
        }, CONST.SKELETON_LOADING_TIMEOUT_MS);

        return () => clearTimeout(timeoutID);
    }, [isDataPending, transactionThreadReportID]);

    return isDataPending && !isOffline && timedOutID !== transactionThreadReportID;
}

export default useTransactionThreadPendingSkeleton;
