import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import useConfirmModal from '@hooks/useConfirmModal';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {resetGPSDraftDetails} from '@libs/actions/GPSDraftDetails';
import DistanceRequestUtils from '@libs/DistanceRequestUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import {getFirstGpsPoint, getLastGpsPoint, getTotalGpsTripPoints, isTripStopped as isTripStoppedUtil} from '@src/libs/GPSDraftDetailsUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Unit} from '@src/types/onyx/Policy';

type WaypointsProps = {
    /** Distance unit of the ongoing GPS trip */
    unit: Unit;

    /** Whether the screen is in landscape mode */
    isInLandscapeMode: boolean;
};

function Waypoints({unit, isInLandscapeMode}: WaypointsProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const [gpsDraftDetails] = useOnyx(ONYXKEYS.GPS_DRAFT_DETAILS);
    const {translate} = useLocalize();

    const {showConfirmModal} = useConfirmModal();

    const showDiscardConfirmation = () => {
        showConfirmModal({
            title: translate('gps.discardDistanceTrackingModal.title'),
            prompt: translate('gps.discardDistanceTrackingModal.prompt'),
            danger: true,
            confirmText: translate('gps.discardDistanceTrackingModal.confirm'),
            cancelText: translate('common.cancel'),
        }).then((result) => {
            if (result.action !== ModalActions.CONFIRM) {
                return;
            }

            resetGPSDraftDetails();
        });
    };

    const icons = useMemoizedLazyExpensifyIcons(['Location', 'Crosshair', 'DotIndicatorUnfilled', 'Trashcan']);

    // eslint-disable-next-line rulesdir/no-negated-variables
    const isTripNotInitialized = getTotalGpsTripPoints(gpsDraftDetails) === 0 && !gpsDraftDetails?.isTracking;

    if (isTripNotInitialized) {
        return null;
    }

    const firstPoint = getFirstGpsPoint(gpsDraftDetails);
    const lastPoint = getLastGpsPoint(gpsDraftDetails);

    const isTripStopped = isTripStoppedUtil(gpsDraftDetails);

    const shouldShowLoadingEndAddress = isTripStopped && !lastPoint?.address?.value;
    const shouldShowLoadingStartAddress = !firstPoint?.address?.value;

    const distance = DistanceRequestUtils.convertDistanceUnit(gpsDraftDetails?.distanceInMeters ?? 0, unit).toFixed(1);

    const Wrapper = isInLandscapeMode ? ScrollView : View;

    const getEndAddressTitle = () => {
        if (shouldShowLoadingEndAddress) {
            return '...';
        }

        if (isTripStopped) {
            return lastPoint?.address?.value;
        }

        return translate('gps.trackingDistance');
    };

    return (
        <Wrapper style={[styles.pt2, styles.pb4]}>
            <View style={[styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter, styles.gap3, styles.ph5]}>
                <View style={[styles.flex1]}>
                    <MenuItemWithTopDescription
                        interactive={false}
                        description={translate('common.distance')}
                        titleComponent={
                            <Text style={[styles.iouAmountTextInput, styles.textXLarge, styles.colorMuted, styles.ml3]}>
                                <Text style={[styles.iouAmountTextInput, styles.textXLarge]}>{distance}</Text>
                                {` ${unit}`}
                            </Text>
                        }
                        style={[styles.ph0]}
                        icon={icons.Crosshair}
                        shouldIconUseAutoWidthStyle
                        descriptionTextStyle={StyleUtils.getFontSizeStyle(variables.fontSizeLabel)}
                    />
                </View>

                {isTripStopped && (
                    <PressableWithoutFeedback
                        accessibilityLabel={translate('gps.discard')}
                        accessibilityRole="button"
                        onPress={showDiscardConfirmation}
                        sentryLabel={CONST.SENTRY_LABEL.IOU_REQUEST_STEP.GPS_DISCARD_BUTTON}
                    >
                        <View style={styles.primaryMediumIcon}>
                            <Icon
                                fill={theme.icon}
                                src={icons.Trashcan}
                                width={variables.iconSizeSmall}
                                height={variables.iconSizeSmall}
                            />
                        </View>
                    </PressableWithoutFeedback>
                )}
            </View>

            <MenuItemWithTopDescription
                interactive={false}
                description={translate('gps.start')}
                shouldShowLoadingSpinnerIcon={shouldShowLoadingStartAddress}
                title={shouldShowLoadingStartAddress ? '...' : firstPoint?.address?.value}
                icon={icons.DotIndicatorUnfilled}
                style={styles.pv3}
                shouldIconUseAutoWidthStyle
            />

            <MenuItemWithTopDescription
                interactive={false}
                description={translate('gps.stop')}
                shouldShowLoadingSpinnerIcon={shouldShowLoadingEndAddress}
                title={getEndAddressTitle()}
                icon={icons.Location}
                style={styles.pv3}
                shouldIconUseAutoWidthStyle
            />
        </Wrapper>
    );
}

export default Waypoints;
