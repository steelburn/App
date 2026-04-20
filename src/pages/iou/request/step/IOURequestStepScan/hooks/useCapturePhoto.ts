import type {MutableRefObject} from 'react';
import {useCallback} from 'react';
import {Alert} from 'react-native';
import {RESULTS} from 'react-native-permissions';
import type {Camera, PhotoFile} from 'react-native-vision-camera';
import useLocalize from '@hooks/useLocalize';
import {pregenerateThumbnail} from '@hooks/useLocalReceiptThumbnail';
import getPhotoSource from '@libs/fileDownload/getPhotoSource';
import getReceiptsUploadFolderPath from '@libs/getReceiptsUploadFolderPath';
import Log from '@libs/Log';
import {cancelSpan, endSpan, getSpan, startSpan} from '@libs/telemetry/activeSpans';
import captureReceipt from '@pages/iou/request/step/IOURequestStepScan/captureReceipt';
import type {ReceiptFile} from '@pages/iou/request/step/IOURequestStepScan/types';
import {setMoneyRequestReceipt} from '@userActions/IOU/Receipt';
import {buildOptimisticTransactionAndCreateDraft} from '@userActions/TransactionEdit';
import CONST from '@src/CONST';
import type {CurrentUserPersonalDetails} from '@src/types/onyx/PersonalDetails';
import type Transaction from '@src/types/onyx/Transaction';
import type {FileObject} from '@src/types/utils/Attachment';

type UseCapturePhotoParams = {
    cameraRef: MutableRefObject<Camera | null>;
    isCapturingPhotoRef: MutableRefObject<boolean>;
    cameraPermissionStatus: string | null;
    flash: boolean;
    hasFlash: boolean;
    isPlatformMuted: boolean | undefined;
    isInLandscapeMode: boolean;
    askForPermissions: () => void;
    setDidCapturePhoto: (value: boolean) => void;
    isMultiScanEnabled: boolean;
    isEditing: boolean;
    initialTransaction: Transaction | null | undefined;
    initialTransactionID: string;
    currentUserPersonalDetails: CurrentUserPersonalDetails;
    reportID: string;
    receiptFiles: ReceiptFile[];
    setReceiptFiles: (value: ReceiptFile[]) => void;
    updateScanAndNavigate: (file: FileObject, source: string) => void;
    submitReceipts: (files: ReceiptFile[]) => void;
    showBlink: () => void;
};

/**
 * Encapsulates the capturePhoto function: permission guard, telemetry spans,
 * photo capture call, multi-scan vs. single-scan branching, editing vs. new-receipt
 * branching, optimistic transaction creation, and Onyx receipt merges.
 */
function useCapturePhoto({
    cameraRef,
    isCapturingPhotoRef,
    cameraPermissionStatus,
    flash,
    hasFlash,
    isPlatformMuted,
    isInLandscapeMode,
    askForPermissions,
    setDidCapturePhoto,
    isMultiScanEnabled,
    isEditing,
    initialTransaction,
    initialTransactionID,
    currentUserPersonalDetails,
    reportID,
    receiptFiles,
    setReceiptFiles,
    updateScanAndNavigate,
    submitReceipts,
    showBlink,
}: UseCapturePhotoParams) {
    const {translate} = useLocalize();

    const maybeCancelShutterSpan = useCallback(() => {
        if (isMultiScanEnabled) {
            return;
        }

        cancelSpan(CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE);
        cancelSpan(CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION);
    }, [isMultiScanEnabled]);

    const capturePhoto = useCallback(() => {
        if (!isMultiScanEnabled) {
            startSpan(CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION, {
                name: CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION,
                op: CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION,
                attributes: {[CONST.TELEMETRY.ATTRIBUTE_PLATFORM]: 'native'},
            });
        }

        if (!cameraRef.current && (cameraPermissionStatus === RESULTS.DENIED || cameraPermissionStatus === RESULTS.BLOCKED)) {
            maybeCancelShutterSpan();
            askForPermissions();
            return;
        }

        const showCameraAlert = () => {
            Alert.alert(translate('receipt.cameraErrorTitle'), translate('receipt.cameraErrorMessage'));
        };

        if (!cameraRef.current) {
            maybeCancelShutterSpan();
            showCameraAlert();
            return;
        }

        if (isCapturingPhotoRef.current) {
            maybeCancelShutterSpan();
            return;
        }

        startSpan(CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE, {
            name: CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE,
            op: CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE,
            parentSpan: getSpan(CONST.TELEMETRY.SPAN_SHUTTER_TO_CONFIRMATION),
            attributes: {[CONST.TELEMETRY.ATTRIBUTE_PLATFORM]: 'native'},
        });

        // eslint-disable-next-line no-param-reassign -- isCapturingPhotoRef is a React ref passed from the parent component
        isCapturingPhotoRef.current = true;
        showBlink();

        const path = getReceiptsUploadFolderPath();

        captureReceipt(cameraRef.current, {flash, hasFlash, isPlatformMuted, path, isInLandscapeMode})
            .then((photo: PhotoFile) => {
                setDidCapturePhoto(true);

                const transaction =
                    isMultiScanEnabled && initialTransaction?.receipt?.source
                        ? buildOptimisticTransactionAndCreateDraft({
                              initialTransaction,
                              currentUserPersonalDetails,
                              reportID,
                          })
                        : initialTransaction;
                const transactionID = transaction?.transactionID ?? initialTransactionID;
                const source = getPhotoSource(photo.path);
                const filename = photo.path;

                endSpan(CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE);

                const cameraFile = {
                    uri: source,
                    name: filename,
                    type: 'image/jpeg',
                    source,
                };

                if (isEditing) {
                    setMoneyRequestReceipt(transactionID, source, filename, !isEditing, 'image/jpeg');
                    updateScanAndNavigate(cameraFile as FileObject, source);
                    return;
                }

                const newReceiptFiles = [...receiptFiles, {file: cameraFile as FileObject, source, transactionID}];
                setReceiptFiles(newReceiptFiles);

                if (isMultiScanEnabled) {
                    setMoneyRequestReceipt(transactionID, source, filename, !isEditing, 'image/jpeg');
                    setDidCapturePhoto(false);
                    // eslint-disable-next-line no-param-reassign -- isCapturingPhotoRef is a React ref passed from the parent component
                    isCapturingPhotoRef.current = false;
                    return;
                }

                // Fire Onyx merge immediately (non-blocking) while we await thumbnail generation.
                // Both run in parallel — navigation proceeds once the thumbnail is cached.
                setMoneyRequestReceipt(transactionID, source, filename, !isEditing, 'image/jpeg');
                pregenerateThumbnail(source).then(() => {
                    submitReceipts(newReceiptFiles);
                });
            })
            .catch((error: string) => {
                // eslint-disable-next-line no-param-reassign -- isCapturingPhotoRef is a React ref passed from the parent component
                isCapturingPhotoRef.current = false;
                cancelSpan(CONST.TELEMETRY.SPAN_RECEIPT_CAPTURE);
                maybeCancelShutterSpan();
                showCameraAlert();
                Log.warn('Error taking photo', error);
            });
    }, [
        isMultiScanEnabled,
        cameraRef,
        isCapturingPhotoRef,
        cameraPermissionStatus,
        maybeCancelShutterSpan,
        askForPermissions,
        translate,
        showBlink,
        flash,
        hasFlash,
        isPlatformMuted,
        isInLandscapeMode,
        setDidCapturePhoto,
        initialTransaction,
        currentUserPersonalDetails,
        reportID,
        initialTransactionID,
        isEditing,
        updateScanAndNavigate,
        receiptFiles,
        setReceiptFiles,
        submitReceipts,
    ]);

    return {capturePhoto};
}

export default useCapturePhoto;
