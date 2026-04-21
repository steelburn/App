import Onyx from 'react-native-onyx';
import {updateSageIntacctTravelInvoicingPayableAccount, updateSageIntacctTravelInvoicingVendor} from '@libs/actions/connections/SageIntacct';
// eslint-disable-next-line no-restricted-syntax -- this is required to allow mocking
import * as API from '@libs/API';
import type {WriteCommand} from '@libs/API/types';
import {WRITE_COMMANDS} from '@libs/API/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {AnyOnyxData} from '@src/types/onyx/Request';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@libs/API');

const writeSpy = jest.spyOn(API, 'write');

const MOCK_POLICY_ID = 'MOCK_POLICY_ID';

function getFirstWriteCall(): {command: WriteCommand; onyxData?: AnyOnyxData} {
    const call = writeSpy.mock.calls.at(0);
    if (!call) {
        throw new Error('API.write was not called');
    }
    const [command, , onyxData] = call;
    return {command, onyxData};
}

describe('actions/connections/SageIntacct', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    describe('updateSageIntacctTravelInvoicingVendor', () => {
        it('writes the UpdateManyPolicyConnectionConfigs command with travelInvoicingVendorID', () => {
            updateSageIntacctTravelInvoicingVendor(MOCK_POLICY_ID, 'vendor-123', 'old-vendor');

            const {command} = getFirstWriteCall();
            expect(command).toBe(WRITE_COMMANDS.UPDATE_MANY_POLICY_CONNECTION_CONFIGS);

            const call = writeSpy.mock.calls.at(0);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API.write's params argument is typed as a broad union, so narrow to the shape this command sends
            const params = call?.[1] as {connectionName: string; configUpdate: string; policyID: string};
            expect(params.policyID).toBe(MOCK_POLICY_ID);
            expect(params.connectionName).toBe(CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT);
            expect(JSON.parse(params.configUpdate)).toEqual({[CONST.SAGE_INTACCT_CONFIG.EXPORT]: {[CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR]: 'vendor-123'}});
        });

        it('merges travelInvoicingVendorID optimistically onto the Sage Intacct export config', () => {
            updateSageIntacctTravelInvoicingVendor(MOCK_POLICY_ID, 'vendor-123', 'old-vendor');

            const {onyxData} = getFirstWriteCall();
            const optimisticUpdate = onyxData?.optimisticData?.at(0);
            expect(optimisticUpdate?.key).toBe(`${ONYXKEYS.COLLECTION.POLICY}${MOCK_POLICY_ID}`);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- optimisticData values are typed as unknown; narrow to the partial Policy shape this update writes
            const value = optimisticUpdate?.value as {connections: {intacct: {config: {export: Record<string, unknown>}}}};
            expect(value.connections.intacct.config.export[CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR]).toBe('vendor-123');
        });
    });

    describe('updateSageIntacctTravelInvoicingPayableAccount', () => {
        it('writes the UpdateManyPolicyConnectionConfigs command with travelInvoicingPayableAccountID', () => {
            updateSageIntacctTravelInvoicingPayableAccount(MOCK_POLICY_ID, 'account-123', 'old-account');

            const {command} = getFirstWriteCall();
            expect(command).toBe(WRITE_COMMANDS.UPDATE_MANY_POLICY_CONNECTION_CONFIGS);

            const call = writeSpy.mock.calls.at(0);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API.write's params argument is typed as a broad union, so narrow to the shape this command sends
            const params = call?.[1] as {connectionName: string; configUpdate: string; policyID: string};
            expect(params.policyID).toBe(MOCK_POLICY_ID);
            expect(params.connectionName).toBe(CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT);
            expect(JSON.parse(params.configUpdate)).toEqual({[CONST.SAGE_INTACCT_CONFIG.EXPORT]: {[CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT]: 'account-123'}});
        });

        it('merges travelInvoicingPayableAccountID optimistically onto the Sage Intacct export config', () => {
            updateSageIntacctTravelInvoicingPayableAccount(MOCK_POLICY_ID, 'account-123', 'old-account');

            const {onyxData} = getFirstWriteCall();
            const optimisticUpdate = onyxData?.optimisticData?.at(0);
            expect(optimisticUpdate?.key).toBe(`${ONYXKEYS.COLLECTION.POLICY}${MOCK_POLICY_ID}`);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- optimisticData values are typed as unknown; narrow to the partial Policy shape this update writes
            const value = optimisticUpdate?.value as {connections: {intacct: {config: {export: Record<string, unknown>}}}};
            expect(value.connections.intacct.config.export[CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT]).toBe('account-123');
        });
    });
});
