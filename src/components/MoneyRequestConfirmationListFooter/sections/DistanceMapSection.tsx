import React from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import ConfirmedRoute from '@components/ConfirmedRoute';
import shouldShowDistanceMap from '@components/MoneyRequestConfirmationListFooter/shouldShowDistanceMap';
import useThemeStyles from '@hooks/useThemeStyles';
import type CONST from '@src/CONST';
import type {IOUType} from '@src/CONST';
import type {Transaction} from '@src/types/onyx';

type DistanceMapSectionProps = {
    transaction: OnyxEntry<Transaction>;
    isDistanceRequest: boolean;
    isManualDistanceRequest: boolean;
    isOdometerDistanceRequest: boolean;
    iouType: Exclude<IOUType, typeof CONST.IOU.TYPE.REQUEST | typeof CONST.IOU.TYPE.SEND>;
    isReadOnly: boolean;
};

function DistanceMapSection({transaction, isDistanceRequest, isManualDistanceRequest, isOdometerDistanceRequest, iouType, isReadOnly}: DistanceMapSectionProps) {
    const styles = useThemeStyles();

    const shouldShowMap = shouldShowDistanceMap({transaction, isDistanceRequest, isManualDistanceRequest, isOdometerDistanceRequest, iouType, isReadOnly});

    if (!shouldShowMap) {
        return null;
    }

    return (
        <View style={styles.confirmationListMapItem}>
            <ConfirmedRoute transaction={transaction ?? ({} as Transaction)} />
        </View>
    );
}

export default DistanceMapSection;
