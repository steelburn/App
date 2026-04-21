import React from 'react';
import type {ValueOf} from 'type-fest';
import ConnectionLayout from '@components/ConnectionLayout';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {areSettingsInErrorFields, settingsPendingAction} from '@libs/PolicyUtils';
import Navigation from '@navigation/Navigation';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';

type SageIntacctSectionType = {
    title?: string;
    description?: string;
    onPress: () => void;
    subscribedSettings: string[];
    pendingAction?: PendingAction;
    brickRoadIndicator?: ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS>;
};

const vendorSetting = [CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_VENDOR];
const payableAccountSetting = [CONST.SAGE_INTACCT_CONFIG.TRAVEL_INVOICING_PAYABLE_ACCOUNT];

function SageIntacctTravelInvoicingConfigurationPage({policy}: WithPolicyConnectionsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const policyID = policy?.id ?? String(CONST.DEFAULT_NUMBER_ID);
    const config = policy?.connections?.intacct?.options?.config;

    const {vendors, payableList} = policy?.connections?.intacct?.options?.data ?? {};
    const travelVendor = vendors?.find((vendor) => vendor.id === config?.travelInvoicingVendorID);
    const travelPayableAccount = payableList?.find((account) => account.id === config?.travelInvoicingPayableAccountID);

    const sections: SageIntacctSectionType[] = [
        {
            title: travelVendor?.value,
            description: translate('workspace.sageIntacct.travelInvoicingVendor'),
            onPress: () => {
                if (!policyID) {
                    return;
                }
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_VENDOR_SELECT.getRoute(policyID));
            },
            subscribedSettings: vendorSetting,
            pendingAction: settingsPendingAction(vendorSetting, config?.pendingFields),
            brickRoadIndicator: areSettingsInErrorFields(vendorSetting, config?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
        },
        {
            title: travelPayableAccount?.name,
            description: translate('workspace.sageIntacct.travelInvoicingPayableAccount'),
            onPress: () => {
                if (!policyID) {
                    return;
                }
                Navigation.navigate(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_TRAVEL_INVOICING_PAYABLE_ACCOUNT_SELECT.getRoute(policyID));
            },
            subscribedSettings: payableAccountSetting,
            pendingAction: settingsPendingAction(payableAccountSetting, config?.pendingFields),
            brickRoadIndicator: areSettingsInErrorFields(payableAccountSetting, config?.errorFields) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
        },
    ];

    return (
        <ConnectionLayout
            displayName="SageIntacctTravelInvoicingConfigurationPage"
            headerTitle="workspace.sageIntacct.travelInvoicing"
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN]}
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
            contentContainerStyle={styles.pb2}
            titleStyle={styles.ph5}
            connectionName={CONST.POLICY.CONNECTIONS.NAME.SAGE_INTACCT}
            onBackButtonPress={() => Navigation.goBack(ROUTES.POLICY_ACCOUNTING_SAGE_INTACCT_EXPORT.getRoute(policyID))}
        >
            {sections.map((section) => (
                <OfflineWithFeedback
                    pendingAction={section.pendingAction}
                    key={section.subscribedSettings.at(0)}
                    errorRowStyles={[styles.ph5]}
                >
                    <MenuItemWithTopDescription
                        title={section.title}
                        description={section.description}
                        onPress={section.onPress}
                        shouldShowRightIcon
                        brickRoadIndicator={section.brickRoadIndicator}
                    />
                </OfflineWithFeedback>
            ))}
        </ConnectionLayout>
    );
}

export default withPolicyConnections(SageIntacctTravelInvoicingConfigurationPage);
