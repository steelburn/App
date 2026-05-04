import {useEffect} from 'react';
import useAutoUpdateTimezone from '@hooks/useAutoUpdateTimezone';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import * as User from '@userActions/User';
import CONST from '@src/CONST';

function clearStatus(currentUserAccountID: number) {
    User.clearCustomStatus(currentUserAccountID);
    User.clearDraftCustomStatus();
}

/**
 * Component that does not render anything and owns the timezone auto-update logic and
 * the status-clear timer effect.
 *
 * Extracted from AuthScreens to isolate the useCurrentUserPersonalDetails
 * context consumption, which fires on any personal details change.
 */
function UserStatusHandler() {
    useAutoUpdateTimezone();

    const currentUserPersonalDetails = useCurrentUserPersonalDetails();

    useEffect(() => {
        if (!currentUserPersonalDetails.status?.clearAfter) {
            return;
        }
        const currentUserAccountID = currentUserPersonalDetails.accountID;
        const currentTime = new Date();
        const clearAfterTime = new Date(currentUserPersonalDetails.status.clearAfter);
        if (Number.isNaN(clearAfterTime.getTime())) {
            return;
        }
        const subMillisecondsTime = clearAfterTime.getTime() - currentTime.getTime();
        if (subMillisecondsTime > 0) {
            let intervalId: NodeJS.Timeout | null = null;
            let timeoutId: NodeJS.Timeout | null = null;

            if (subMillisecondsTime > CONST.LIMIT_TIMEOUT) {
                intervalId = setInterval(() => {
                    const now = new Date();
                    const remainingTime = clearAfterTime.getTime() - now.getTime();

                    if (remainingTime <= 0) {
                        clearStatus(currentUserAccountID);
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                    } else if (remainingTime <= CONST.LIMIT_TIMEOUT) {
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                        timeoutId = setTimeout(() => {
                            clearStatus(currentUserAccountID);
                        }, remainingTime);
                    }
                }, CONST.LIMIT_TIMEOUT);
            } else {
                timeoutId = setTimeout(() => {
                    clearStatus(currentUserAccountID);
                }, subMillisecondsTime);
            }

            return () => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };
        }

        clearStatus(currentUserAccountID);
    }, [currentUserPersonalDetails.accountID, currentUserPersonalDetails.status?.clearAfter]);

    return null;
}

export default UserStatusHandler;
