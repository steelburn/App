import React from 'react';
import useDynamicBackPath from '@hooks/useDynamicBackPath';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import {SageIntacctTravelInvoicingVendorSelectPage} from './SageIntacctTravelInvoicingVendorSelectPage';

function DynamicSageIntacctTravelInvoicingVendorSelectPage(props: WithPolicyConnectionsProps) {
    const backPath = useDynamicBackPath(DYNAMIC_ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_VENDOR_SELECT.path);

    return (
        <SageIntacctTravelInvoicingVendorSelectPage
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            backPath={backPath}
        />
    );
}

export default withPolicyConnections(DynamicSageIntacctTravelInvoicingVendorSelectPage);
