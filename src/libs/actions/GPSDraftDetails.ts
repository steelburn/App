import Onyx from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import {getGpsPoints} from '@libs/GPSDraftDetailsUtils';
import {GPS_DISTANCE_INTERVAL_METERS} from '@pages/iou/request/step/IOURequestStepDistanceGPS/const';
import {updateGpsTripNotificationDistance} from '@pages/iou/request/step/IOURequestStepDistanceGPS/GPSNotifications';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GpsDraftDetails} from '@src/types/onyx';
import type {Unit} from '@src/types/onyx/Policy';
import geodesicDistance from '@src/utils/geodesicDistance';
import {setUserLocation} from './UserLocation';

function resetGPSDraftDetails() {
    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, null);
}

type GPSPoint = GpsDraftDetails['gpsPoints'][number][number];

function setStartWaypointAddress(startAddress: GPSPoint['address'], tripSegmentIndex: number, gpsDraftDetails: OnyxEntry<GpsDraftDetails>) {
    const gpsPoints = getGpsPoints(gpsDraftDetails);
    const tripSegment = gpsPoints.at(tripSegmentIndex);
    const firstPoint = tripSegment?.at(0);

    if (!firstPoint || !tripSegment) {
        return;
    }

    const newGpsPoints = [...gpsPoints];
    newGpsPoints.splice(tripSegmentIndex, 1, [{...firstPoint, address: startAddress}, ...tripSegment.slice(1)]);

    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        gpsPoints: newGpsPoints,
    });
}

function setEndAddress(endAddress: GPSPoint['address'], gpsPoints: GpsDraftDetails['gpsPoints']) {
    const lastSegment = gpsPoints.at(-1);
    const lastPoint = lastSegment?.at(-1);

    if (!lastPoint || !lastSegment) {
        return;
    }

    const newLastSegment = [...lastSegment.slice(0, -1), {...lastPoint, address: endAddress}];
    const newGpsPoints = [...gpsPoints.slice(0, -1), newLastSegment];

    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        gpsPoints: newGpsPoints,
    });
}

function isLastSegmentEmptyOrHasOnlyOnePoint(gpsPoints: GpsDraftDetails['gpsPoints']): boolean {
    if (gpsPoints.length <= 1) {
        return false;
    }

    const lastSegment = gpsPoints.at(-1);

    if (!lastSegment) {
        return false;
    }

    // If the last segment (which is not the only one) is empty is only has one point, remove it
    if (lastSegment.length <= 1) {
        const newGpsPoints = [...gpsPoints];
        newGpsPoints.pop();

        Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
            gpsPoints: newGpsPoints,
        });

        return true;
    }

    return false;
}

function initGpsDraft(reportID: string, unit: Unit) {
    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        gpsPoints: [[]],
        isTracking: true,
        distanceInMeters: 0,
        reportID,
        unit,
    });
}

function resumeGpsTrip(gpsDraftDetails: OnyxEntry<GpsDraftDetails>) {
    if (!gpsDraftDetails) {
        return;
    }

    const lastTripSegment = gpsDraftDetails.gpsPoints.at(-1);
    const gpsPoints = gpsDraftDetails.gpsPoints;

    if (lastTripSegment && lastTripSegment.length !== 0) {
        gpsPoints.push([]);
    }

    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        gpsPoints,
        isTracking: true,
    });
}

function setIsTracking(isTracking: boolean) {
    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        isTracking,
    });
}

function addGpsPoints(gpsDraftDetails: OnyxEntry<GpsDraftDetails>, newGpsPoints: GpsDraftDetails['gpsPoints'][number]) {
    const capturedPoints = getGpsPoints(gpsDraftDetails);
    const lastTripSegment = capturedPoints.at(-1);

    if (!lastTripSegment) {
        return;
    }

    let previousPoint: GPSPoint | undefined = lastTripSegment.at(-1);
    let distanceToAdd = 0;
    const gpsPointsToAdd: GPSPoint[] = [];

    for (const point of newGpsPoints) {
        if (!previousPoint) {
            previousPoint = point;
            gpsPointsToAdd.push(point);
            continue;
        }

        const distanceBetweenPoints = geodesicDistance(point, previousPoint);

        if (distanceBetweenPoints >= GPS_DISTANCE_INTERVAL_METERS) {
            distanceToAdd += distanceBetweenPoints;
            previousPoint = point;
            gpsPointsToAdd.push(point);
        }
    }

    const capturedDistance = gpsDraftDetails?.distanceInMeters ?? 0;

    const updatedDistance = capturedDistance + distanceToAdd;

    capturedPoints.splice(capturedPoints.length - 1, 1, [...lastTripSegment, ...gpsPointsToAdd]);

    const latestPoint = capturedPoints.at(-1)?.at(-1);

    if (latestPoint) {
        setUserLocation({longitude: latestPoint.long, latitude: latestPoint.lat});
    }

    if (updatedDistance > 0) {
        updateGpsTripNotificationDistance(updatedDistance);
    }

    Onyx.merge(ONYXKEYS.GPS_DRAFT_DETAILS, {
        gpsPoints: capturedPoints,
        distanceInMeters: updatedDistance,
    });
}

export {resetGPSDraftDetails, initGpsDraft, setStartWaypointAddress, setEndAddress, addGpsPoints, setIsTracking, resumeGpsTrip, isLastSegmentEmptyOrHasOnlyOnePoint};
