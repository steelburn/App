import React from 'react';
import type {SelectorType} from '@components/SelectionScreen';
import {updateSageIntacctTravelInvoicingPayableAccount} from '@libs/actions/connections/SageIntacct';
import {clearSageIntacctErrorField} from '@libs/actions/Policy/Policy';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import TravelInvoicingPayableAccountSelectPage from '@pages/workspace/accounting/common/TravelInvoicingPayableAccountSelectPage';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';

type SageIntacctTravelInvoicingPayableAccountSelectPageProps = WithPolicyConnectionsProps & {
    backPath: Route;
};

function SageIntacctTravelInvoicingPayableAccountSelectPage({policy, backPath}: SageIntacctTravelInvoicingPayableAccountSelectPageProps) {
    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const config = policy?.connections?.intacct?.config;
    const {bankAccounts} = policy?.connections?.intacct?.data ?? {};
    const selectedAccountID = config?.export?.travelInvoicingPayableAccountID;

    const data: Array<SelectorType<string>> =
        bankAccounts?.map((account) => ({
            value: account.id,
            text: account.name,
            keyForList: account.id,
            isSelected: account.id === selectedAccountID,
        })) ?? [];

    const selectAccount = (row: SelectorType<string>) => {
        if (row.value !== selectedAccountID) {
            updateSageIntacctTravelInvoicingPayableAccount(policyID, row.value, selectedAccountID);
        }
        Navigation.goBack(backPath);
    };

    return (
        <TravelInvoicingPayableAccountSelectPage
            policyID={policyID}
            displayName="SageIntacctTravelInvoicingPayableAccountSelectPage"
            data={data}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            emptyStateTitle="workspace.sageIntacct.noAccountsFound"
            emptyStateSubtitle="workspace.sageIntacct.noAccountsFoundDescription"
            onSelect={selectAccount}
            onBack={() => Navigation.goBack(backPath)}
            pendingAction={settingsPendingAction([CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT], config?.pendingFields)}
            errors={getLatestErrorField(config, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
            onClose={() => clearSageIntacctErrorField(policyID, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
        />
    );
}

export {SageIntacctTravelInvoicingPayableAccountSelectPage};
