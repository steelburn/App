import Onyx from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import {base64ToFile, convertFileObjectOrUriToBase64DataURL} from '@libs/fileDownload/FileUtils';
import getPlatform from '@libs/getPlatform';
import Log from '@libs/Log';
import revokeOdometerImageUri, {getOdometerImageUri} from '@libs/OdometerImageUtils';
import CONST from '@src/CONST';
import type {OdometerImageType} from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OdometerDraft, Transaction} from '@src/types/onyx';
import type {Comment} from '@src/types/onyx/Transaction';
import type {FileObject} from '@src/types/utils/Attachment';
import {setMoneyRequestReceipt} from './IOU/Receipt';
import {removeBackupTransaction} from './TransactionEdit';

type SaveOdometerDraftParams = {
    startReading?: number;
    endReading?: number;
    startImage?: FileObject | string | null;
    endImage?: FileObject | string | null;
};

/**
 * Set the odometer readings for a transaction
 */
function setMoneyRequestOdometerReading(transactionID: string, startReading: number | null, endReading: number | null, isDraft: boolean) {
    Onyx.merge(`${isDraft ? ONYXKEYS.COLLECTION.TRANSACTION_DRAFT : ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
        comment: {
            odometerStart: startReading,
            odometerEnd: endReading,
        },
    });
}

/**
 * Set odometer image for a transaction
 * @param transaction - The transaction or transaction draft
 * @param imageType - 'start' or 'end'
 * @param file - The image file (File object on web, URI string on native)
 * @param isDraft - Whether this is a draft transaction
 * @param shouldRevokeOldImage - Whether to revoke the previous blob URL immediately (always false on native where blob URLs don't exist; false on web when a backup transaction exists making the caller responsible for revoking)
 */
function setMoneyRequestOdometerImage(transaction: OnyxEntry<Transaction>, imageType: OdometerImageType, file: FileObject | string, isDraft: boolean, shouldRevokeOldImage: boolean) {
    const imageKey = imageType === CONST.IOU.ODOMETER_IMAGE_TYPE.START ? 'odometerStartImage' : 'odometerEndImage';
    const normalizedFile: FileObject | string =
        typeof file === 'string'
            ? file
            : {
                  uri: file.uri ?? (typeof URL !== 'undefined' ? URL.createObjectURL(file as Blob) : undefined),
                  name: file.name,
                  type: file.type,
                  size: file.size,
              };
    const transactionID = transaction?.transactionID;
    const existingImage = transaction?.comment?.[imageKey];
    if (shouldRevokeOldImage) {
        revokeOdometerImageUri(existingImage, normalizedFile);
    }
    Onyx.merge(`${isDraft ? ONYXKEYS.COLLECTION.TRANSACTION_DRAFT : ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {
        comment: {
            [imageKey]: normalizedFile,
        },
    });
}

/**
 * Remove odometer image from a transaction
 * @param transaction - The transaction or transaction draft
 * @param imageType - 'start' or 'end'
 * @param isDraft - Whether this is a draft transaction
 * @param shouldRevokeOldImage - Whether to revoke the previous blob URL immediately (always false on native where blob URLs don't exist; false on web when a backup transaction exists making the caller responsible for revoking)
 */
function removeMoneyRequestOdometerImage(transaction: OnyxEntry<Transaction>, imageType: OdometerImageType, isDraft: boolean, shouldRevokeOldImage: boolean) {
    if (!transaction?.transactionID) {
        return;
    }
    const imageKey = imageType === CONST.IOU.ODOMETER_IMAGE_TYPE.START ? 'odometerStartImage' : 'odometerEndImage';
    const existingImage = transaction?.comment?.[imageKey];
    if (shouldRevokeOldImage) {
        revokeOdometerImageUri(existingImage);
    }
    Onyx.merge(`${isDraft ? ONYXKEYS.COLLECTION.TRANSACTION_DRAFT : ONYXKEYS.COLLECTION.TRANSACTION}${transaction?.transactionID}`, {
        comment: {
            [imageKey]: null,
        },
    });
}

function clearOdometerDraftTransactionState(transaction: OnyxEntry<Transaction>): void {
    if (!transaction) {
        return;
    }
    setMoneyRequestReceipt(transaction.transactionID, '', '', true);
    setMoneyRequestOdometerReading(transaction.transactionID, null, null, true);
    removeMoneyRequestOdometerImage(transaction, CONST.IOU.ODOMETER_IMAGE_TYPE.START, true, true);
    removeMoneyRequestOdometerImage(transaction, CONST.IOU.ODOMETER_IMAGE_TYPE.END, true, true);
    removeBackupTransaction(transaction.transactionID);
}

function clearOdometerDraft() {
    Onyx.set(ONYXKEYS.ODOMETER_DRAFT, null);
}

async function serializeOdometerDraftImage(image: FileObject | string | null | undefined): Promise<string | undefined> {
    if (!image) {
        return undefined;
    }

    const imageURI = getOdometerImageUri(image);
    if (!imageURI) {
        return undefined;
    }

    if (getPlatform() !== CONST.PLATFORM.WEB) {
        return imageURI;
    }

    try {
        return await convertFileObjectOrUriToBase64DataURL(image);
    } catch (error) {
        Log.warn('Failed to serialize odometer draft image to base64', {error});
        return imageURI;
    }
}

function deserializeOdometerDraftImage(image: string | undefined, transactionID: string, imageType: OdometerImageType): FileObject | string | undefined {
    if (!image) {
        return undefined;
    }

    if (getPlatform() !== CONST.PLATFORM.WEB || !image.startsWith('data:')) {
        return image;
    }

    try {
        const file = base64ToFile(image, `odometer-${imageType}-${transactionID}.png`);
        return {
            uri: file.uri,
            name: file.name,
            type: file.type,
            size: file.size,
        };
    } catch (error) {
        Log.warn('Failed to deserialize odometer draft image from base64', {error});
        return image;
    }
}

async function saveOdometerDraft({startReading, endReading, startImage, endImage}: SaveOdometerDraftParams): Promise<void> {
    const [serializedStartImage, serializedEndImage] = await Promise.all([serializeOdometerDraftImage(startImage), serializeOdometerDraftImage(endImage)]);
    const hasDraftData = startReading !== undefined || endReading !== undefined || !!serializedStartImage || !!serializedEndImage;

    if (!hasDraftData) {
        clearOdometerDraft();
        return;
    }

    const odometerDraft: OdometerDraft = {
        ...(startReading !== undefined && {odometerStartReading: startReading}),
        ...(endReading !== undefined && {odometerEndReading: endReading}),
        ...(serializedStartImage && {odometerStartImage: serializedStartImage}),
        ...(serializedEndImage && {odometerEndImage: serializedEndImage}),
    };

    Onyx.set(ONYXKEYS.ODOMETER_DRAFT, odometerDraft);
}

function buildOdometerCommentFromDraft(transactionID: string, odometerDraft: OnyxEntry<OdometerDraft>, currentComment?: Partial<Comment>): Partial<Comment> | undefined {
    if (!odometerDraft) {
        return;
    }

    const commentUpdate: Partial<Comment> = {};

    if (odometerDraft.odometerStartReading !== undefined) {
        commentUpdate.odometerStart = odometerDraft.odometerStartReading;
    }

    if (odometerDraft.odometerEndReading !== undefined) {
        commentUpdate.odometerEnd = odometerDraft.odometerEndReading;
    }

    const startImage = deserializeOdometerDraftImage(odometerDraft.odometerStartImage, transactionID, CONST.IOU.ODOMETER_IMAGE_TYPE.START);
    if (startImage !== undefined) {
        revokeOdometerImageUri(currentComment?.odometerStartImage, startImage);
        commentUpdate.odometerStartImage = startImage;
    }

    const endImage = deserializeOdometerDraftImage(odometerDraft.odometerEndImage, transactionID, CONST.IOU.ODOMETER_IMAGE_TYPE.END);
    if (endImage !== undefined) {
        revokeOdometerImageUri(currentComment?.odometerEndImage, endImage);
        commentUpdate.odometerEndImage = endImage;
    }

    if (Object.keys(commentUpdate).length === 0) {
        return;
    }

    return commentUpdate;
}

export {setMoneyRequestOdometerReading, setMoneyRequestOdometerImage, removeMoneyRequestOdometerImage, clearOdometerDraft, saveOdometerDraft, buildOdometerCommentFromDraft};
export default clearOdometerDraftTransactionState;
