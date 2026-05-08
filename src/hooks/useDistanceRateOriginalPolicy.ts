import {useMemo} from 'react';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {getDistanceRateCustomUnit} from '@libs/PolicyUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import useOnyx from './useOnyx';

/**
 * Finds the policy that owns the given customUnitRateID using a selector that returns
 * only the policyID (a primitive), so re-renders are suppressed unless the actual match changes.
 * Then subscribes to just that one policy to get the full object.
 */
function useDistanceRateOriginalPolicy(customUnitRateID: string | undefined): OnyxEntry<Policy> {
    const [distanceRatePolicyID] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: (policies: OnyxCollection<Policy>) => {
            if (!customUnitRateID) {
                return undefined;
            }
            return Object.values(policies ?? {}).find((p) => {
                const distanceUnit = getDistanceRateCustomUnit(p);
                return !!distanceUnit?.rates && customUnitRateID in distanceUnit.rates;
            })?.id;
        },
    });

    const [distanceOriginalPolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${getNonEmptyStringOnyxID(distanceRatePolicyID)}`);

    return useMemo(() => {
        if (!distanceRatePolicyID) {
            return undefined;
        }
        return distanceOriginalPolicy;
    }, [distanceRatePolicyID, distanceOriginalPolicy]);
}

export default useDistanceRateOriginalPolicy;
