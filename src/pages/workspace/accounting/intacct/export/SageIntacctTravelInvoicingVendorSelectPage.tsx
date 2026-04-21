// Maybe we dont need this file

import React from 'react';
import BlockingView from '@components/BlockingViews/BlockingView';
import RadioListItem from '@components/SelectionList/ListItem/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearSageIntacctErrorField} from '@libs/actions/Policy/Policy';
import {updateSageIntacctTravelInvoicingVendor} from '@libs/actions/connections/SageIntacct';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

type VendorListItem = ListItem & {
    value: string;
};

function SageIntacctTravelInvoicingVendorSelectPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);

    const {vendors} = policy?.connections?.intacct?.options?.data ?? {};
    const config = policy?.connections?.intacct?.options?.config;

    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const selectedAccountID = config?.travelInvoicingVendorID;

    const data: VendorListItem[] =
        vendors?.map((vendor) => ({
            value: vendor.id,
            text: vendor.name,
            keyForList: vendor.id,
            isSelected: vendor.id === selectedAccountID,
        })) ?? [];

    const selectVendor = (row: VendorListItem) => {
        if (row.value !== selectedAccountID) {
            updateSageIntacctTravelInvoicingVendor(policyID, row.value, selectedAccountID);
        }
        Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID));
    };

    const listEmptyContent = (
        <BlockingView
            icon={illustrations.Telescope}
            iconWidth={variables.emptyListIconWidth}
            iconHeight={variables.emptyListIconHeight}
            title={translate('workspace.sageIntacct.noVendorsFound')}
            subtitle={translate('workspace.sageIntacct.noVendorsFoundDescription')}
            containerStyle={styles.pb10}
        />
    );

    return (
        <SelectionScreen
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            displayName="SageIntacctTravelInvoicingVendorSelectPage"
            title="workspace.sageIntacct.travelInvoicingVendor"
            data={data}
            listItem={RadioListItem}
            onSelectRow={selectVendor}
            shouldSingleExecuteRowSelect
            initiallyFocusedOptionKey={data.find((option) => option.isSelected)?.keyForList}
            listEmptyContent={listEmptyContent}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID))}
            pendingAction={settingsPendingAction([CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR], config?.pendingFields)}
            errors={getLatestErrorField(config, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => clearSageIntacctErrorField(policyID, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR)}
        />
    );
}

export default withPolicyConnections(SageIntacctTravelInvoicingVendorSelectPage);
