import Onyx from 'react-native-onyx';
import type {OnyxUpdate} from 'react-native-onyx';
import * as API from '@libs/API';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getCommandURL} from '@libs/ApiUtils';
import * as ErrorUtils from '@libs/ErrorUtils';
import * as Link from '@userActions/Link';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

/** Merges `previousValue` into `settingPath` on failure; use `null` when that field was unset in Onyx. */
function prepareOnyxDataForFinancialForceUpdate(policyID: string, settingKey: string, settingPath: string[], newValue: unknown, previousValue: unknown) {
    const buildNestedObject = (pathParts: string[], value: unknown): Record<string, unknown> => {
        if (pathParts.length === 0) {
            return {};
        }
        if (pathParts.length === 1) {
            return {[pathParts[0]]: value};
        }
        return {[pathParts[0]]: buildNestedObject(pathParts.slice(1), value)};
    };

    const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    financialforce: {
                        config: {
                            ...buildNestedObject(settingPath, newValue),
                            pendingFields: {
                                [settingKey]: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                            },
                            errorFields: {
                                [settingKey]: null,
                            },
                        },
                    },
                },
            },
        },
    ];

    const failureData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    financialforce: {
                        config: {
                            ...buildNestedObject(settingPath, previousValue),
                            pendingFields: {
                                [settingKey]: null,
                            },
                            errorFields: {
                                [settingKey]: ErrorUtils.getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage'),
                            },
                        },
                    },
                },
            },
        },
    ];

    const successData: Array<OnyxUpdate<typeof ONYXKEYS.COLLECTION.POLICY>> = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
            value: {
                connections: {
                    financialforce: {
                        config: {
                            pendingFields: {
                                [settingKey]: null,
                            },
                            errorFields: {
                                [settingKey]: null,
                            },
                        },
                    },
                },
            },
        },
    ];

    return {optimisticData, failureData, successData};
}

function getFinancialForceSetupLink(policyID: string, isSandbox: boolean) {
    const commandURL = getCommandURL({
        command: READ_COMMANDS.CONNECT_POLICY_TO_FINANCIAL_FORCE,
        shouldSkipWebProxy: true,
    });
    const params = new URLSearchParams({policyID, isSandbox: String(isSandbox)});
    return commandURL + params.toString();
}

function connectPolicyToFinancialForce(policyID: string, isSandbox: boolean, environmentURL: string) {
    Link.openLink(getFinancialForceSetupLink(policyID, isSandbox), environmentURL);
}

function clearFinancialForceErrorField(policyID: string | undefined, fieldName: string) {
    if (!policyID) {
        return;
    }
    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {connections: {financialforce: {config: {errorFields: {[fieldName]: null}}}}});
}

function syncPolicyToFinancialForce(policyID: string) {
    API.read(READ_COMMANDS.SYNC_POLICY_TO_FINANCIAL_FORCE, {policyID}, {});
}

function updateFinancialForceDimension1Mapping(policyID: string, value: string, previousValue: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.CODING_DIMENSION1,
        ['coding', 'dimension1'],
        value,
        previousValue,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_DIMENSION1_MAPPING, {policyID, value}, {optimisticData, failureData, successData});
}

function updateFinancialForceDimension2Mapping(policyID: string, value: string, previousValue: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.CODING_DIMENSION2,
        ['coding', 'dimension2'],
        value,
        previousValue,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_DIMENSION2_MAPPING, {policyID, value}, {optimisticData, failureData, successData});
}

function updateFinancialForceDimension3Mapping(policyID: string, value: string, previousValue: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.CODING_DIMENSION3,
        ['coding', 'dimension3'],
        value,
        previousValue,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_DIMENSION3_MAPPING, {policyID, value}, {optimisticData, failureData, successData});
}

function updateFinancialForceDimension4Mapping(policyID: string, value: string, previousValue: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.CODING_DIMENSION4,
        ['coding', 'dimension4'],
        value,
        previousValue,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_DIMENSION4_MAPPING, {policyID, value}, {optimisticData, failureData, successData});
}

function updateFinancialForceSyncTax(policyID: string, enabled: boolean) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(policyID, CONST.CERTINIA_CONFIG.SYNC_TAX, ['coding', 'syncTax'], enabled, !enabled);
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_SYNC_TAX, {policyID, enabled}, {optimisticData, failureData, successData});
}

function updateFinancialForceExporter(policyID: string, exporter: string, previousExporter: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(policyID, CONST.CERTINIA_CONFIG.EXPORTER, ['export', 'exporter'], exporter, previousExporter);
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_EXPORTER, {policyID, email: exporter}, {optimisticData, failureData, successData});
}

function updateFinancialForceExportStatus(policyID: string, status: string, previousStatus: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.EXPORT_STATUS,
        ['export', 'exportStatus'],
        status,
        previousStatus,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_EXPORT_STATUS, {policyID, value: status}, {optimisticData, failureData, successData});
}

function updateFinancialForceExportDate(policyID: string, date: string, previousDate: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(policyID, CONST.CERTINIA_CONFIG.EXPORT_DATE, ['export', 'exportDate'], date, previousDate);
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_EXPORT_DATE, {policyID, value: date}, {optimisticData, failureData, successData});
}

function updateFinancialForceDefaultVendor(policyID: string, vendorAccountID: string, previousVendorAccountID: string | null) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.VENDOR_ACCOUNT,
        ['export', 'vendorAccount'],
        vendorAccountID,
        previousVendorAccountID,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_DEFAULT_VENDOR, {policyID, vendorID: vendorAccountID}, {optimisticData, failureData, successData});
}

function updateFinancialForceAutoSync(policyID: string, enabled: boolean) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(policyID, CONST.CERTINIA_CONFIG.AUTO_SYNC_ENABLED, ['autoSync', 'enabled'], enabled, !enabled);
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_AUTO_SYNC, {policyID, enabled}, {optimisticData, failureData, successData});
}

function updateFinancialForceSyncReimbursedReports(policyID: string, enabled: boolean) {
    const {optimisticData, failureData, successData} = prepareOnyxDataForFinancialForceUpdate(
        policyID,
        CONST.CERTINIA_CONFIG.SYNC_REIMBURSED_REPORTS,
        ['advanced', 'syncReimbursedReports'],
        enabled,
        !enabled,
    );
    API.write(WRITE_COMMANDS.UPDATE_FINANCIAL_FORCE_SYNC_REIMBURSED_REPORTS, {policyID, enabled}, {optimisticData, failureData, successData});
}

export {
    clearFinancialForceErrorField,
    connectPolicyToFinancialForce,
    syncPolicyToFinancialForce,
    updateFinancialForceDimension1Mapping,
    updateFinancialForceDimension2Mapping,
    updateFinancialForceDimension3Mapping,
    updateFinancialForceDimension4Mapping,
    updateFinancialForceSyncTax,
    updateFinancialForceExporter,
    updateFinancialForceExportStatus,
    updateFinancialForceExportDate,
    updateFinancialForceDefaultVendor,
    updateFinancialForceAutoSync,
    updateFinancialForceSyncReimbursedReports,
};
