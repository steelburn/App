import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import {setEndWaypointAddress, setStartWaypointAddress} from '@libs/actions/GPSDraftDetails';
import {addressFromGpsPoint, getGpsPoints} from '@libs/GPSDraftDetailsUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GPSPoint, GPSPointAddress} from '@src/types/onyx/GpsDraftDetails';

function useUpdateGpsTripOnReconnect() {
    const [gpsDraftDetails] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);

    const updateAddressToHumanReadable = async (gpsPoint: GPSPoint | undefined, setAddress: (address: GPSPointAddress) => void) => {
        if (!gpsPoint) {
            return;
        }

        const address = await addressFromGpsPoint(gpsPoint);

        if (address !== null) {
            setAddress({value: address, type: 'address'});
        }
    };

    const updateAddressesToHumanReadable = () => {
        if (!gpsDraftDetails) {
            return;
        }

        const gpsPoints = getGpsPoints(gpsDraftDetails);

        for (const [segmentIndex, tripSegment] of gpsPoints.entries()) {
            for (const [pointIndex, point] of tripSegment.entries()) {
                // If the address is not a coordinates (already human readable), we don't need to update it
                if (point.address?.type === 'address') {
                    continue;
                }

                if (pointIndex === 0) {
                    updateAddressToHumanReadable(point, (address) => setStartWaypointAddress(address, segmentIndex, gpsPoints));
                } else if (pointIndex === tripSegment.length - 1) {
                    updateAddressToHumanReadable(point, (address) => setEndWaypointAddress(address, gpsPoints, segmentIndex));
                }
            }
        }
    };

    // This is intentional to use async/await pattern for better readability

    useNetwork({onReconnect: updateAddressesToHumanReadable});
}

export default useUpdateGpsTripOnReconnect;
