import ONYXKEYS from '@src/ONYXKEYS';
import {hasPoliciesConnectedToCertiniaSelector} from '@src/selectors/Policy';
import useOnyx from './useOnyx';

function useHasPoliciesConnectedToCertinia() {
    const [hasPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: hasPoliciesConnectedToCertiniaSelector});
    return hasPolicies ?? false;
}

export default useHasPoliciesConnectedToCertinia;
