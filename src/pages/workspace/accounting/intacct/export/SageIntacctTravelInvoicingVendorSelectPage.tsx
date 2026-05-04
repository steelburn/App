import React from 'react';
import type {SelectorType} from '@components/SelectionScreen';
import {updateSageIntacctTravelInvoicingVendor} from '@libs/actions/connections/SageIntacct';
import {clearSageIntacctErrorField} from '@libs/actions/Policy/Policy';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import TravelInvoicingVendorSelectPage from '@pages/workspace/accounting/common/TravelInvoicingVendorSelectPage';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';

type SageIntacctTravelInvoicingVendorSelectPageProps = WithPolicyConnectionsProps & {
    backPath: Route;
};

function SageIntacctTravelInvoicingVendorSelectPage({policy, backPath}: SageIntacctTravelInvoicingVendorSelectPageProps) {
    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const config = policy?.connections?.intacct?.config;
    const {vendors} = policy?.connections?.intacct?.data ?? {};
    const selectedVendorID = config?.export?.travelInvoicingVendorID;

    const data: Array<SelectorType<string>> =
        vendors?.map((vendor) => ({
            value: vendor.id,
            text: vendor.value,
            keyForList: vendor.id,
            isSelected: vendor.id === selectedVendorID,
        })) ?? [];

    const selectVendor = (row: SelectorType<string>) => {
        if (row.value !== selectedVendorID) {
            updateSageIntacctTravelInvoicingVendor(policyID, row.value, selectedVendorID);
        }
        Navigation.goBack(backPath);
    };

    return (
        <TravelInvoicingVendorSelectPage
            policyID={policyID}
            displayName="SageIntacctTravelInvoicingVendorSelectPage"
            data={data}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            emptyStateTitle="workspace.sageIntacct.noAccountsFound"
            emptyStateSubtitle="workspace.sageIntacct.noAccountsFoundDescription"
            onSelect={selectVendor}
            onBack={() => Navigation.goBack(backPath)}
            pendingAction={settingsPendingAction([CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR], config?.pendingFields)}
            errors={getLatestErrorField(config, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR)}
            onClose={() => clearSageIntacctErrorField(policyID, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR)}
        />
    );
}

export {SageIntacctTravelInvoicingVendorSelectPage};
