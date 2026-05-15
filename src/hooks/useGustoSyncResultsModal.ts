import {useEffect} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import GustoSyncResultsModal from '@components/GustoSyncResultsModal';
import {useModal} from '@components/Modal/Global/ModalContext';
import CONST from '@src/CONST';
import type {PolicyConnectionSyncProgress} from '@src/types/onyx/Policy';
import usePrevious from './usePrevious';

function useGustoSyncResultsModal(policyID: string, connectionSyncProgress: OnyxEntry<PolicyConnectionSyncProgress>, isFocused: boolean) {
    const {showModal} = useModal();
    const previousSyncProgress = usePrevious(connectionSyncProgress);

    useEffect(() => {
        const syncResult = connectionSyncProgress?.result;
        const isGustoSyncDoneWithResult =
            connectionSyncProgress?.connectionName === CONST.POLICY.CONNECTIONS.NAME.GUSTO &&
            connectionSyncProgress?.stageInProgress === CONST.POLICY.CONNECTIONS.SYNC_STAGE_NAME.JOB_DONE &&
            !!syncResult;
        const wasSameGustoResultAlreadyHandled =
            previousSyncProgress?.connectionName === CONST.POLICY.CONNECTIONS.NAME.GUSTO &&
            previousSyncProgress?.stageInProgress === CONST.POLICY.CONNECTIONS.SYNC_STAGE_NAME.JOB_DONE &&
            previousSyncProgress?.timestamp === connectionSyncProgress?.timestamp &&
            !!previousSyncProgress?.result;
        const didGustoSyncComplete = isFocused && isGustoSyncDoneWithResult && !wasSameGustoResultAlreadyHandled;

        if (!didGustoSyncComplete || !syncResult) {
            return;
        }

        showModal({
            component: GustoSyncResultsModal,
            props: {result: syncResult},
            id: `gusto-sync-results-${policyID}`,
        });
    }, [
        connectionSyncProgress?.connectionName,
        connectionSyncProgress?.result,
        connectionSyncProgress?.stageInProgress,
        connectionSyncProgress?.timestamp,
        isFocused,
        policyID,
        previousSyncProgress?.connectionName,
        previousSyncProgress?.result,
        previousSyncProgress?.stageInProgress,
        previousSyncProgress?.timestamp,
        showModal,
    ]);
}

export default useGustoSyncResultsModal;
