import React from 'react';
import type {ReactNode} from 'react';
import ImageSVG from '@components/ImageSVG';
import type {WayPoint} from '@components/MapView/MapViewTypes';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import {getGPSWaypoints, getTotalGpsTripSegments, isTripStopped as isTripStoppedUtil} from '@libs/GPSDraftDetailsUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type IconAsset from '@src/types/utils/IconAsset';

function useGPSWaypointMarkers(): WayPoint[] {
    const theme = useTheme();
    const {DotIndicatorUnfilled, Location, DotIndicator} = useMemoizedLazyExpensifyIcons(['DotIndicatorUnfilled', 'Location', 'DotIndicator']);

    const [gpsDraftDetails] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);

    const isTripStopped = isTripStoppedUtil(gpsDraftDetails);

    const getMarkerComponent = (icon: IconAsset): ReactNode => (
        <ImageSVG
            src={icon}
            width={CONST.MAP_MARKER_SIZE}
            height={CONST.MAP_MARKER_SIZE}
            fill={theme.icon}
        />
    );

    const gpsWaypoints = getGPSWaypoints(gpsDraftDetails);

    const gpsWaypointMarkers = Object.entries(gpsWaypoints).map(([key, waypoint], index): WayPoint | null => {
        const tripSegmentsCount = getTotalGpsTripSegments(gpsDraftDetails);
        let icon = DotIndicator;
        if (index === 0) {
            icon = DotIndicatorUnfilled;
        } else if (index === tripSegmentsCount * 2 - 1) {
            icon = Location;

            if (!isTripStopped) {
                return null;
            }
        }

        return {
            id: key,
            coordinate: [waypoint.lng, waypoint.lat],
            markerComponent: (): ReactNode => getMarkerComponent(icon),
        };
    });

    return gpsWaypointMarkers.filter((waypoint): waypoint is WayPoint => !!waypoint);
}

export default useGPSWaypointMarkers;
