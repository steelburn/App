import NetInfo from '@react-native-community/netinfo';
import type {LocationObject} from 'expo-location';
import {defineTask} from 'expo-task-manager';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';
import {addGpsPoints, setStartWaypointAddress} from '@libs/actions/GPSDraftDetails';
import {addressFromGpsPoint, coordinatesToString, getGpsPoints, getTotalGpsTripPointsInLastSegment} from '@libs/GPSDraftDetailsUtils';
import {BACKGROUND_LOCATION_TRACKING_TASK_NAME} from '@pages/iou/request/step/IOURequestStepDistanceGPS/const';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GpsDraftDetails} from '@src/types/onyx';

type BackgroundLocationTrackingTaskData = {locations: LocationObject[]};

defineTask<BackgroundLocationTrackingTaskData>(BACKGROUND_LOCATION_TRACKING_TASK_NAME, async ({data, error}) => {
    if (error) {
        console.error('[GPS distance request] Long-running task error: ', {error, data});
        return;
    }

    // Use NetInfo.fetch() instead of the in-memory NetworkState.isOffline() because this
    // background task may run in a headless JS context (Android) where module-level state
    // in NetworkState.ts hasn't been populated via Onyx/NetInfo subscribers.
    const [gpsDraftDetailsPromiseResult, netInfoState] = await Promise.all([OnyxUtils.get(ONYXKEYS.GPS_DRAFT_DETAILS).catch(() => undefined), NetInfo.fetch()]);
    const gpsDraftDetails = gpsDraftDetailsPromiseResult ?? undefined;
    const isOffline = netInfoState.isConnected === false;

    updateStartAddress(gpsDraftDetails, data.locations.at(0), isOffline);

    const newGpsPoints = data.locations.map((location) => ({lat: location.coords.latitude, long: location.coords.longitude}));

    addGpsPoints(gpsDraftDetails, newGpsPoints);
});

async function updateStartAddress(gpsDraftDetails: GpsDraftDetails | undefined, startPoint: LocationObject | undefined, isOffline: boolean) {
    // If the last segment is not empty or the start point is not provided, return
    if (getTotalGpsTripPointsInLastSegment(gpsDraftDetails) !== 0 || !startPoint) {
        return;
    }

    // Get the index of the current (last) segment
    const tripSegmentIndex = (gpsDraftDetails?.gpsPoints?.length ?? 0) - 1;

    if (tripSegmentIndex === -1) {
        return;
    }

    if (!isOffline) {
        const address = await addressFromGpsPoint({lat: startPoint.coords.latitude, long: startPoint.coords.longitude});

        if (address !== null) {
            setStartWaypointAddress({value: address, type: 'address'}, tripSegmentIndex, getGpsPoints(gpsDraftDetails));
            return;
        }
    }

    setStartWaypointAddress(
        {value: coordinatesToString({lat: startPoint.coords.latitude, long: startPoint.coords.longitude}), type: 'coordinates'},
        tripSegmentIndex,
        getGpsPoints(gpsDraftDetails),
    );
}
