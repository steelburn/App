import {hasStartedLocationUpdatesAsync, reverseGeocodeAsync, stopLocationUpdatesAsync} from 'expo-location';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';
import type {SetRequired} from 'type-fest';
import {BACKGROUND_LOCATION_TRACKING_TASK_NAME} from '@pages/iou/request/step/IOURequestStepDistanceGPS/const';
import {stopGpsTripNotification} from '@pages/iou/request/step/IOURequestStepDistanceGPS/GPSNotifications';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GpsDraftDetails} from '@src/types/onyx';
import type {Unit} from '@src/types/onyx/Policy';
import type {Routes, Waypoint} from '@src/types/onyx/Transaction';
import {isLastSegmentEmptyOrHasOnlyOnePoint, setEndAddress, setIsTracking} from './actions/GPSDraftDetails';
import DistanceRequestUtils from './DistanceRequestUtils';
import {roundToTwoDecimalPlaces} from './NumberUtils';

type GPSWaypointCollection = Record<string, SetRequired<Waypoint, 'keyForList' | 'lat' | 'lng' | 'address'>>;

function getGPSWaypoints(gpsDraftDetails: GpsDraftDetails | undefined): GPSWaypointCollection {
    const gpsCoordinates = getGpsPoints(gpsDraftDetails);

    const waypointCollection: GPSWaypointCollection = {};
    let waypointsCounter = 0;

    for (const point of gpsCoordinates.flat()) {
        if (!point.address) {
            continue;
        }

        const key = `gps${waypointsCounter}`;
        waypointsCounter++;

        waypointCollection[`waypoint${waypointsCounter}`] = {
            keyForList: key,
            lat: point.lat,
            lng: point.long,
            address: point.address.value || coordinatesToString(point),
        };
    }

    return waypointCollection;
}

function getGPSRoutes(gpsDraftDetails: GpsDraftDetails | undefined): Routes {
    const distanceInMeters = roundToTwoDecimalPlaces(gpsDraftDetails?.distanceInMeters ?? 0);
    const gpsCoordinates = getGpsPoints(gpsDraftDetails);
    const coordinates: Array<Array<[number, number]>> = gpsCoordinates.map((points) => points.map(({lat, long}) => [long, lat]));

    return {
        route0: {
            distance: distanceInMeters,
            geometry: {
                type: 'LineString',
                coordinates,
            },
        },
    };
}

function getGPSCoordinates(gpsDraftDetails: GpsDraftDetails | undefined): string | undefined {
    return gpsDraftDetails?.gpsPoints ? JSON.stringify(gpsDraftDetails.gpsPoints.map((points) => points.map(({lat, long}) => ({lng: long, lat})))) : undefined;
}

function calculateGPSDistance(distanceInMeters: number, unit: Unit): number {
    return DistanceRequestUtils.convertDistanceUnit(distanceInMeters, unit);
}

function getGPSConvertedDistance(gpsDraftDetails: GpsDraftDetails | undefined, unit: Unit): number {
    const distanceInMeters = gpsDraftDetails?.distanceInMeters ?? 0;
    return calculateGPSDistance(distanceInMeters, unit);
}

async function addressFromGpsPoint(gpsPoint: {lat: number; long: number}): Promise<string | null> {
    try {
        const [location] = await reverseGeocodeAsync({latitude: gpsPoint.lat, longitude: gpsPoint.long});

        if (!location) {
            return null;
        }

        const address: string = location?.formattedAddress ?? [location?.name, location?.city, location?.region].filter(Boolean).join(', ');

        return address;
    } catch (error) {
        console.error('[GPS distance request] Failed to reverse geocode location to postal address: ', error);
        return null;
    }
}

function coordinatesToString(gpsPoint: {lat: number; long: number}): string {
    return `${gpsPoint.lat},${gpsPoint.long}`;
}

async function getLastPoint() {
    const gpsTrip = await OnyxUtils.get(ONYXKEYS.GPS_DRAFT_DETAILS);

    return gpsTrip?.gpsPoints?.at(-1)?.at(-1);
}

async function stopGpsTrip(isOffline: boolean, gpsPoints: GpsDraftDetails['gpsPoints'], skipLastPointAddressFetching = false) {
    const isBackgroundTaskRunning = await hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME);

    if (isBackgroundTaskRunning) {
        await stopLocationUpdatesAsync(BACKGROUND_LOCATION_TRACKING_TASK_NAME).catch((error) => console.error('[GPS distance request] Failed to stop location tracking', error));
    }

    setIsTracking(false);
    stopGpsTripNotification();

    if (isLastSegmentEmptyOrHasOnlyOnePoint(gpsPoints)) {
        return;
    }

    if (skipLastPointAddressFetching) {
        const lastPoint = await getLastPoint();

        if (!lastPoint) {
            return;
        }

        const formattedCoordinates = coordinatesToString(lastPoint);
        setEndAddress({value: formattedCoordinates, type: 'coordinates'}, gpsPoints);
        return;
    }

    const lastPoint = await getLastPoint();

    if (!lastPoint) {
        return;
    }

    if (!isOffline) {
        const endAddress = await addressFromGpsPoint(lastPoint);

        if (endAddress !== null) {
            setEndAddress({value: endAddress, type: 'address'}, gpsPoints);
            return;
        }
    }

    const formattedCoordinates = coordinatesToString(lastPoint);
    setEndAddress({value: formattedCoordinates, type: 'coordinates'}, gpsPoints);
}

function getTotalGpsTripPoints(gpsDraftDetails: GpsDraftDetails | undefined): number {
    return gpsDraftDetails?.gpsPoints?.flat().length ?? 0;
}

function getTotalGpsTripPointsInLastSegment(gpsDraftDetails: GpsDraftDetails | undefined): number {
    return gpsDraftDetails?.gpsPoints?.at(-1)?.length ?? 0;
}

function isTripStopped(gpsDraftDetails: GpsDraftDetails | undefined): boolean {
    return !gpsDraftDetails?.isTracking && getTotalGpsTripPoints(gpsDraftDetails) > 0;
}

function getGpsPoints(gpsDraftDetails: GpsDraftDetails | undefined): GpsDraftDetails['gpsPoints'] {
    return gpsDraftDetails?.gpsPoints ?? [[]];
}

function getFirstGpsPoint(gpsDraftDetails: GpsDraftDetails | undefined): GpsDraftDetails['gpsPoints'][number][number] | undefined {
    return gpsDraftDetails?.gpsPoints?.at(0)?.at(0);
}

function getLastGpsPoint(gpsDraftDetails: GpsDraftDetails | undefined): GpsDraftDetails['gpsPoints'][number][number] | undefined {
    return gpsDraftDetails?.gpsPoints?.at(-1)?.at(-1);
}

export {
    getGPSRoutes,
    getGPSWaypoints,
    stopGpsTrip,
    getGPSConvertedDistance,
    getGPSCoordinates,
    addressFromGpsPoint,
    coordinatesToString,
    calculateGPSDistance,
    isTripStopped,
    getTotalGpsTripPoints,
    getTotalGpsTripPointsInLastSegment,
    getGpsPoints,
    getFirstGpsPoint,
    getLastGpsPoint,
};
