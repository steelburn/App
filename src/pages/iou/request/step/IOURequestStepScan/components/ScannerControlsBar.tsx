import React from 'react';
import {View} from 'react-native';
import {RESULTS} from 'react-native-permissions';
import AttachmentPicker from '@components/AttachmentPicker';
import Icon from '@components/Icon';
import ImageSVG from '@components/ImageSVG';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';
import type IconAsset from '@src/types/utils/IconAsset';

type ScannerControlsBarProps = {
    isInLandscapeMode: boolean;
    isMultiScanEnabled: boolean;
    canUseMultiScan: boolean;
    shouldAcceptMultipleFiles: boolean;
    cameraPermissionStatus: string | null;
    flash: boolean;
    hasFlash: boolean;
    setFlash: (updater: (prev: boolean) => boolean) => void;
    setIsAttachmentPickerActive: (value: boolean) => void;
    setIsLoaderVisible: (value: boolean) => void;
    validateFiles: (files: FileObject[], items?: DataTransferItem[]) => void;
    capturePhoto: () => void;
    toggleMultiScan: () => void;
    shutterIllustration: IconAsset | undefined;
    galleryIcon: IconAsset | undefined;
    receiptMultipleIcon: IconAsset | undefined;
    boltIcon: IconAsset | undefined;
    boltSlashIcon: IconAsset | undefined;
};

function ScannerControlsBar({
    isInLandscapeMode,
    isMultiScanEnabled,
    canUseMultiScan,
    shouldAcceptMultipleFiles,
    cameraPermissionStatus,
    flash,
    hasFlash,
    setFlash,
    setIsAttachmentPickerActive,
    setIsLoaderVisible,
    validateFiles,
    capturePhoto,
    toggleMultiScan,
    shutterIllustration,
    galleryIcon,
    receiptMultipleIcon,
    boltIcon,
    boltSlashIcon,
}: ScannerControlsBarProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <View style={[styles.justifyContentAround, styles.alignItemsCenter, styles.p3, !isInLandscapeMode && styles.flexRow]}>
            <AttachmentPicker
                onOpenPicker={() => {
                    setIsAttachmentPickerActive(true);
                    setIsLoaderVisible(true);
                }}
                fileLimit={shouldAcceptMultipleFiles ? CONST.API_ATTACHMENT_VALIDATIONS.MAX_FILE_LIMIT : 1}
                shouldValidateImage={false}
            >
                {({openPicker}) => (
                    <PressableWithFeedback
                        role={CONST.ROLE.BUTTON}
                        accessibilityLabel={translate('receipt.gallery')}
                        sentryLabel={shouldAcceptMultipleFiles ? CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.CHOOSE_FILES : CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.CHOOSE_FILE}
                        style={[styles.alignItemsStart, isMultiScanEnabled && styles.opacity0]}
                        onPress={() => {
                            openPicker({
                                onPicked: (data) => validateFiles(data),
                                onCanceled: () => setIsLoaderVisible(false),
                                // makes sure the loader is not visible anymore e.g. when there is an error while uploading a file
                                onClosed: () => {
                                    setIsAttachmentPickerActive(false);
                                    setIsLoaderVisible(false);
                                },
                            });
                        }}
                    >
                        <Icon
                            height={variables.iconSizeMenuItem}
                            width={variables.iconSizeMenuItem}
                            src={galleryIcon}
                            fill={theme.textSupporting}
                        />
                    </PressableWithFeedback>
                )}
            </AttachmentPicker>
            <PressableWithFeedback
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={translate('receipt.shutter')}
                sentryLabel={CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.SHUTTER}
                style={[styles.alignItemsCenter]}
                onPress={capturePhoto}
            >
                <ImageSVG
                    contentFit="contain"
                    src={shutterIllustration}
                    width={CONST.RECEIPT.SHUTTER_SIZE}
                    height={CONST.RECEIPT.SHUTTER_SIZE}
                />
            </PressableWithFeedback>
            {canUseMultiScan ? (
                <PressableWithFeedback
                    accessibilityRole="button"
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={translate('receipt.multiScan')}
                    sentryLabel={CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.MULTI_SCAN}
                    style={styles.alignItemsEnd}
                    onPress={toggleMultiScan}
                >
                    <Icon
                        height={variables.iconSizeMenuItem}
                        width={variables.iconSizeMenuItem}
                        src={receiptMultipleIcon}
                        fill={isMultiScanEnabled ? theme.iconMenu : theme.textSupporting}
                    />
                </PressableWithFeedback>
            ) : (
                <PressableWithFeedback
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={translate('receipt.flash')}
                    sentryLabel={CONST.SENTRY_LABEL.REQUEST_STEP.SCAN.FLASH}
                    style={[styles.alignItemsEnd, !hasFlash && styles.opacity0]}
                    disabled={cameraPermissionStatus !== RESULTS.GRANTED || !hasFlash}
                    onPress={() => setFlash((prevFlash) => !prevFlash)}
                >
                    <Icon
                        height={variables.iconSizeMenuItem}
                        width={variables.iconSizeMenuItem}
                        src={flash ? boltIcon : boltSlashIcon}
                        fill={theme.textSupporting}
                    />
                </PressableWithFeedback>
            )}
        </View>
    );
}

ScannerControlsBar.displayName = 'ScannerControlsBar';

export default ScannerControlsBar;
