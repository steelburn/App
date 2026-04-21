import React from 'react';
import BlockingView from '@components/BlockingViews/BlockingView';
import RadioListItem from '@components/SelectionList/ListItem/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearSageIntacctErrorField} from '@libs/actions/Policy/Policy';
import {updateSageIntacctTravelInvoicingPayableAccount} from '@libs/actions/connections/SageIntacct';
import {getLatestErrorField} from '@libs/ErrorUtils';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

type PayableAccountListItem = ListItem & {
    value: string;
};

function SageIntacctTravelInvoicingPayableAccountSelectPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);

    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const config = policy?.connections?.intacct?.config;
    const {bankAccounts} = policy?.connections?.intacct?.data ?? {};
    const selectedAccountID = config?.export?.travelInvoicingPayableAccountID;

    const data: PayableAccountListItem[] =
        bankAccounts?.map((account) => ({
            value: account.id,
            text: account.name,
            keyForList: account.id,
            isSelected: account.id === selectedAccountID,
        })) ?? [];

    const selectAccount = (row: PayableAccountListItem) => {
        if (row.value !== selectedAccountID) {
            updateSageIntacctTravelInvoicingPayableAccount(policyID, row.value, selectedAccountID);
        }
        Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID));
    };

    const listEmptyContent = (
        <BlockingView
            icon={illustrations.Telescope}
            iconWidth={variables.emptyListIconWidth}
            iconHeight={variables.emptyListIconHeight}
            title={translate('workspace.sageIntacct.noAccountsFound')}
            subtitle={translate('workspace.sageIntacct.noAccountsFoundDescription')}
            containerStyle={styles.pb10}
        />
    );

    return (
        <SelectionScreen
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            displayName="SageIntacctTravelInvoicingPayableAccountSelectPage"
            title="workspace.sageIntacct.travelInvoicingPayableAccount"
            data={data}
            listItem={RadioListItem}
            onSelectRow={selectAccount}
            shouldSingleExecuteRowSelect
            initiallyFocusedOptionKey={data.find((option) => option.isSelected)?.keyForList}
            listEmptyContent={listEmptyContent}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION.getRoute(policyID))}
            pendingAction={settingsPendingAction([CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT], config?.pendingFields)}
            errors={getLatestErrorField(config, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => clearSageIntacctErrorField(policyID, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
        />
    );
}

export default withPolicyConnections(SageIntacctTravelInvoicingPayableAccountSelectPage);
