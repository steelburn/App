import Onyx from 'react-native-onyx';
import {clearShareBankAccountErrors} from '@libs/actions/BankAccounts';
import ONYXKEYS from '@src/ONYXKEYS';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

describe('clearShareBankAccountErrors', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(() => {
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    it('should clear SHARE_BANK_ACCOUNT errors when called without bankAccountID', async () => {
        await Onyx.merge(ONYXKEYS.SHARE_BANK_ACCOUNT, {
            errors: {123456789: 'Some error'},
        });
        await waitForBatchedUpdates();

        clearShareBankAccountErrors();
        await waitForBatchedUpdates();

        const connection = Onyx.connect({
            key: ONYXKEYS.SHARE_BANK_ACCOUNT,
            callback: (value) => {
                Onyx.disconnect(connection);
                expect(value?.errors).toBeNull();
            },
        });
    });

    it('should clear both SHARE_BANK_ACCOUNT and BANK_ACCOUNT_LIST errors when called with bankAccountID', async () => {
        const bankAccountID = 9053259;
        await Onyx.merge(ONYXKEYS.SHARE_BANK_ACCOUNT, {
            errors: {123456789: 'Some error'},
        });
        await Onyx.merge(ONYXKEYS.BANK_ACCOUNT_LIST, {
            [bankAccountID]: {
                errors: {123456789: 'Auth ShareBankAccount returned an error'},
            },
        });
        await waitForBatchedUpdates();

        clearShareBankAccountErrors(bankAccountID);
        await waitForBatchedUpdates();

        const shareBankAccountConnection = Onyx.connect({
            key: ONYXKEYS.SHARE_BANK_ACCOUNT,
            callback: (value) => {
                Onyx.disconnect(shareBankAccountConnection);
                expect(value?.errors).toBeNull();
            },
        });

        const bankAccountListConnection = Onyx.connect({
            key: ONYXKEYS.BANK_ACCOUNT_LIST,
            callback: (value) => {
                Onyx.disconnect(bankAccountListConnection);
                expect(value?.[bankAccountID]?.errors).toBeNull();
            },
        });
    });

    it('should not modify BANK_ACCOUNT_LIST when called without bankAccountID', async () => {
        const bankAccountID = 9053259;
        const existingErrors = {123456789: 'Auth ShareBankAccount returned an error'};
        await Onyx.merge(ONYXKEYS.SHARE_BANK_ACCOUNT, {
            errors: {123456789: 'Some error'},
        });
        await Onyx.merge(ONYXKEYS.BANK_ACCOUNT_LIST, {
            [bankAccountID]: {errors: existingErrors},
        });
        await waitForBatchedUpdates();

        clearShareBankAccountErrors();
        await waitForBatchedUpdates();

        const connection = Onyx.connect({
            key: ONYXKEYS.BANK_ACCOUNT_LIST,
            callback: (value) => {
                Onyx.disconnect(connection);
                expect(value?.[bankAccountID]?.errors).toEqual(existingErrors);
            },
        });
    });
});
