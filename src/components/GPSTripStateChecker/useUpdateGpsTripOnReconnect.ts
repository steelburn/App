import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import {setEndAddress, setStartWaypointAddress} from '@libs/actions/GPSDraftDetails';
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

        for (const tripSegment of gpsPoints) {
            for (const [index, point] of tripSegment.entries()) {
                if (point.address?.type === 'coordinates') {
                    continue;
                }

                if (index === 0) {
                    updateAddressToHumanReadable(point, (address) => setStartWaypointAddress(address, 0, gpsDraftDetails));
                } else if (index === tripSegment.length - 1) {
                    updateAddressToHumanReadable(point, (address) => setEndAddress(address, gpsDraftDetails.gpsPoints));
                }
            }
        }
    };

    // This is intentional to use async/await pattern for better readability

    useNetwork({onReconnect: updateAddressesToHumanReadable});
}

export default useUpdateGpsTripOnReconnect;
