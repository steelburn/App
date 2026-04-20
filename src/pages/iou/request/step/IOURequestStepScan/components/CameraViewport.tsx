import React from 'react';
import type {MutableRefObject} from 'react';
import type {ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import type {GestureType} from 'react-native-gesture-handler';
import {GestureDetector} from 'react-native-gesture-handler';
import type {AnimatedStyle} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import type {Camera, CameraDevice, CameraDeviceFormat} from 'react-native-vision-camera';
import Icon from '@components/Icon';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type IconAsset from '@src/types/utils/IconAsset';
import NavigationAwareCamera from './NavigationAwareCamera/Camera';

type CameraViewportProps = {
    camera: MutableRefObject<Camera | null>;
    device: CameraDevice;
    format: CameraDeviceFormat | undefined;
    fps: number;
    cameraAspectRatio: number | undefined;
    isInLandscapeMode: boolean;
    tapGesture: GestureType;
    cameraFocusIndicatorAnimatedStyle: AnimatedStyle<ViewStyle>;
    blinkStyle: AnimatedStyle<ViewStyle>;
    isAttachmentPickerActive: boolean;
    didCapturePhoto: boolean;
    onInitialized: () => void;
    canUseMultiScan: boolean;
    flash: boolean;
    hasFlash: boolean;
    setFlash: (updater: (prev: boolean) => boolean) => void;
    boltIcon: IconAsset | undefined;
};

function CameraViewport({
    camera,
    device,
    format,
    fps,
    cameraAspectRatio,
    isInLandscapeMode,
    tapGesture,
    cameraFocusIndicatorAnimatedStyle,
    blinkStyle,
    isAttachmentPickerActive,
    didCapturePhoto,
    onInitialized,
    canUseMultiScan,
    flash,
    hasFlash,
    setFlash,
    boltIcon,
}: CameraViewportProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();

    return (
        <View style={[styles.cameraView, styles.alignItemsCenter]}>
            <GestureDetector gesture={tapGesture}>
                <View style={StyleUtils.getCameraViewfinderStyle(cameraAspectRatio, isInLandscapeMode)}>
                    <NavigationAwareCamera
                        ref={camera}
                        device={device}
                        format={format}
                        fps={fps}
                        style={styles.flex1}
                        zoom={device.neutralZoom}
                        photo
                        cameraTabIndex={1}
                        forceInactive={isAttachmentPickerActive || didCapturePhoto}
                        onInitialized={onInitialized}
                    />
                    <Animated.View style={[styles.cameraFocusIndicator, cameraFocusIndicatorAnimatedStyle]} />
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, StyleUtils.getBackgroundColorStyle(theme.appBG), blinkStyle, styles.zIndex10]}
                    />
                </View>
            </GestureDetector>
            {canUseMultiScan ? (
                <View style={[styles.flashButtonContainer, styles.primaryMediumIcon, flash && styles.bgGreenSuccess, !hasFlash && styles.opacity0]}>
                    <PressableWithFeedback
                        role={CONST.ROLE.BUTTON}
                        accessibilityLabel={translate('receipt.flash')}
                        sentryLabel={CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.FLASH}
                        disabled={!hasFlash}
                        onPress={() => setFlash((prevFlash) => !prevFlash)}
                    >
                        <Icon
                            height={variables.iconSizeSmall}
                            width={variables.iconSizeSmall}
                            src={boltIcon}
                            fill={flash ? theme.white : theme.icon}
                        />
                    </PressableWithFeedback>
                </View>
            ) : null}
        </View>
    );
}

CameraViewport.displayName = 'CameraViewport';

export default CameraViewport;
