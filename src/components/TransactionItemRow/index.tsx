import React, {useMemo} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import {getCompanyCardDescription} from '@libs/CardUtils';
import {getDecodedCategoryName, isCategoryMissing} from '@libs/CategoryUtils';
import {getIOUActionForTransactionID} from '@libs/ReportActionsUtils';
import {isExpenseReport, isSettled} from '@libs/ReportUtils';
import StringUtils from '@libs/StringUtils';
import {
    getAmount,
    getAttendees,
    getDescription,
    getExchangeRate,
    getMerchant,
    getCreated as getTransactionCreated,
    hasMissingSmartscanFields,
    isAmountMissing,
    isDeletedTransaction as isDeletedTransactionUtil,
    isMerchantMissing,
    isScanning,
    shouldShowAttendees as shouldShowAttendeesUtils,
} from '@libs/TransactionUtils';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import TransactionItemRowNarrow from './TransactionItemRowNarrow';
import TransactionItemRowWide from './TransactionItemRowWide';
import type {TransactionItemRowProps, TransactionWithOptionalSearchFields} from './types';

const EMPTY_ACTIVE_STYLE: StyleProp<ViewStyle> = [];

function getMerchantName(transactionItem: TransactionWithOptionalSearchFields, translate: (key: TranslationPaths) => string) {
    const shouldShowMerchant = transactionItem.shouldShowMerchant ?? true;

    let merchant = transactionItem?.formattedMerchant ?? getMerchant(transactionItem);

    if (isScanning(transactionItem) && shouldShowMerchant) {
        merchant = translate('iou.receiptStatusTitle');
    }

    const merchantName = StringUtils.getFirstLine(merchant);
    return merchantName !== CONST.TRANSACTION.PARTIAL_TRANSACTION_MERCHANT && merchantName !== CONST.TRANSACTION.DEFAULT_MERCHANT ? merchantName : '';
}

function TransactionItemRow({
    transactionItem,
    report,
    policy,
    shouldUseNarrowLayout,
    isSelected,
    shouldShowTooltip,
    dateColumnSize,
    submittedColumnSize,
    approvedColumnSize,
    postedColumnSize,
    exportedColumnSize,
    amountColumnSize,
    taxAmountColumnSize,
    onCheckboxPress = () => {},
    shouldShowCheckbox = false,
    columns,
    onButtonPress = () => {},
    style,
    isReportItemChild = false,
    isActionLoading,
    isInSingleTransactionReport = false,
    shouldShowRadioButton = false,
    onRadioButtonPress = () => {},
    shouldShowErrors = true,
    shouldHighlightItemWhenSelected = true,
    isDisabled = false,
    violations,
    shouldShowBottomBorder,
    onArrowRightPress,
    isHover = false,
    shouldShowArrowRightOnNarrowLayout,
    reportActions,
    checkboxSentryLabel,
    nonPersonalAndWorkspaceCards = {},
    isLargeScreenWidth: isLargeScreenWidthProp,
    policyForMovingExpenses,
    isActionColumnWide: isActionColumnWideProp,
}: TransactionItemRowProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const StyleUtils = useStyleUtils();
    const isLargeScreenWidth = isLargeScreenWidthProp ?? !shouldUseNarrowLayout;
    const createdAt = getTransactionCreated(transactionItem);
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const transactionThreadReportID = reportActions ? getIOUActionForTransactionID(reportActions, transactionItem.transactionID)?.childReportID : undefined;
    const isDeletedTransaction = isDeletedTransactionUtil(transactionItem);

    const bgActiveStyles = useMemo(() => {
        if (!isSelected || !shouldHighlightItemWhenSelected) {
            return EMPTY_ACTIVE_STYLE;
        }
        return styles.activeComponentBG;
    }, [isSelected, styles.activeComponentBG, shouldHighlightItemWhenSelected]);

    const merchant = useMemo(() => getMerchantName(transactionItem, translate) ?? '', [transactionItem, translate]);
    const description = getDescription(transactionItem);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const merchantOrDescription = merchant || description;

    const missingFieldError = useMemo(() => {
        if (isSettled(report)) {
            return '';
        }

        const hasFieldErrors = hasMissingSmartscanFields(transactionItem, report);
        if (hasFieldErrors) {
            const amountMissing = isAmountMissing(transactionItem);
            const merchantMissing = isMerchantMissing(transactionItem);
            let error = '';

            if (amountMissing && merchantMissing) {
                error = translate('violations.reviewRequired');
            } else if (amountMissing) {
                error = translate('iou.missingAmount');
            } else if (merchantMissing && !isSettled(report)) {
                error = translate('iou.missingMerchant');
            }

            return error;
        }
    }, [transactionItem, translate, report]);

    const exchangeRateMessage = getExchangeRate(transactionItem, report?.currency);
    const cardName = getCompanyCardDescription(translate, transactionItem?.cardName, transactionItem?.cardID, nonPersonalAndWorkspaceCards);
    const transactionAttendees = useMemo(() => getAttendees(transactionItem, currentUserPersonalDetails), [transactionItem, currentUserPersonalDetails]);

    const isUnreported = transactionItem.reportID === CONST.REPORT.UNREPORTED_REPORT_ID;
    const shouldShowAttendees = shouldShowAttendeesUtils(CONST.IOU.TYPE.SUBMIT, isUnreported ? policyForMovingExpenses : policy) && transactionAttendees.length > 0;

    const totalPerAttendee = useMemo(() => {
        const attendeesCount = transactionAttendees.length ?? 0;
        const totalAmount = getAmount(transactionItem, isExpenseReport(report));

        if (!attendeesCount || totalAmount === undefined) {
            return undefined;
        }

        return totalAmount / attendeesCount;
    }, [report, transactionAttendees.length, transactionItem]);

    const shouldRenderChatBubbleCell = useMemo(() => {
        return columns?.includes(CONST.SEARCH.TABLE_COLUMNS.COMMENTS) ?? false;
    }, [columns]);

    const categoryForDisplay = isCategoryMissing(transactionItem?.category) ? '' : getDecodedCategoryName(transactionItem?.category ?? '');

    const computedData = {
        bgActiveStyles,
        merchant,
        merchantOrDescription,
        description,
        missingFieldError,
        exchangeRateMessage,
        cardName,
        transactionAttendees,
        isUnreported,
        shouldShowAttendees,
        totalPerAttendee,
        categoryForDisplay,
        createdAt,
        isDeletedTransaction,
        transactionThreadReportID,
        shouldRenderChatBubbleCell,
    };

    const sharedProps = {
        transactionItem,
        report,
        policy,
        isSelected,
        shouldShowTooltip,
        dateColumnSize,
        submittedColumnSize,
        approvedColumnSize,
        postedColumnSize,
        exportedColumnSize,
        amountColumnSize,
        taxAmountColumnSize,
        onCheckboxPress,
        shouldShowCheckbox,
        columns,
        onButtonPress,
        style,
        isReportItemChild,
        isActionLoading,
        isInSingleTransactionReport,
        shouldShowRadioButton,
        onRadioButtonPress,
        shouldShowErrors,
        shouldHighlightItemWhenSelected,
        isDisabled,
        violations,
        shouldShowBottomBorder,
        onArrowRightPress,
        isHover,
        shouldShowArrowRightOnNarrowLayout,
        reportActions,
        checkboxSentryLabel,
        nonPersonalAndWorkspaceCards,
        isLargeScreenWidth,
        policyForMovingExpenses,
        isActionColumnWide: isActionColumnWideProp,
    };

    if (shouldUseNarrowLayout) {
        return (
            <TransactionItemRowNarrow
                {...sharedProps}
                {...computedData}
            />
        );
    }

    return (
        <TransactionItemRowWide
            {...sharedProps}
            {...computedData}
        />
    );
}

export default TransactionItemRow;
export type {TransactionWithOptionalSearchFields, TransactionItemRowProps};
