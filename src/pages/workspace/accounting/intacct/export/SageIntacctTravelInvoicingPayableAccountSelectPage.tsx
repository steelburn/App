import React from 'react';
import BlockingView from '@components/BlockingViews/BlockingView';
import RadioListItem from '@components/SelectionList/ListItem/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import SelectionScreen from '@components/SelectionScreen';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateSageIntacctTravelInvoicingPayableAccount} from '@libs/actions/connections/SageIntacct';
import {clearSageIntacctErrorField} from '@libs/actions/Policy/Policy';
import {getLatestErrorField} from '@libs/ErrorUtils';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import {settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';
import type {Route} from '@src/ROUTES';

type PayableAccountListItem = ListItem & {
    value: string;
};

type SageIntacctTravelInvoicingPayableAccountSelectPageProps = WithPolicyConnectionsProps & {
    backPath?: Route;
};

function SageIntacctTravelInvoicingPayableAccountSelectPage({policy, backPath}: SageIntacctTravelInvoicingPayableAccountSelectPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Telescope']);

    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const fallbackBackPath = createDynamicRoute(
        DYNAMIC_ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_CONFIGURATION.path,
        ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXPORT.getRoute(policyID),
    );
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
        Navigation.goBack(backPath ?? fallbackBackPath);
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
            title="workspace.common.travelInvoicingPayableAccount"
            data={data}
            listItem={RadioListItem}
            onSelectRow={selectAccount}
            shouldSingleExecuteRowSelect
            initiallyFocusedOptionKey={data.find((option) => option.isSelected)?.keyForList}
            listEmptyContent={listEmptyContent}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            onBackButtonPress={() => Navigation.goBack(backPath ?? fallbackBackPath)}
            pendingAction={settingsPendingAction([CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT], config?.pendingFields)}
            errors={getLatestErrorField(config, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
            errorRowStyles={[styles.ph5, styles.pv3]}
            onClose={() => clearSageIntacctErrorField(policyID, CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT)}
        />
    );
}

export {SageIntacctTravelInvoicingPayableAccountSelectPage};
export default withPolicyConnections(SageIntacctTravelInvoicingPayableAccountSelectPage);
