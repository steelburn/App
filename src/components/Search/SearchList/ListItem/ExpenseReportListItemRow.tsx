import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import type {SearchColumnType} from '@components/Search/types';
import type {ReportAction} from '@src/types/onyx';
import ExpenseReportListItemRowNarrow from './ExpenseReportListItemRowNarrow';
import ExpenseReportListItemRowWide from './ExpenseReportListItemRowWide';
import type {ExpenseReportListItemType} from './types';

type ExpenseReportListItemRowProps = {
    item: ExpenseReportListItemType;
    reportActions?: ReportAction[];
    showTooltip: boolean;
    canSelectMultiple?: boolean;
    isActionLoading?: boolean;
    onButtonPress?: () => void;
    onCheckboxPress?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
    isSelectAllChecked?: boolean;
    isIndeterminate?: boolean;
    isDisabledCheckbox?: boolean;
    isHovered?: boolean;
    isFocused?: boolean;
    isPendingDelete?: boolean;
    columns?: SearchColumnType[];
    isLargeScreenWidth?: boolean;
};

function ExpenseReportListItemRow({
    item,
    reportActions,
    showTooltip,
    canSelectMultiple,
    isActionLoading,
    onButtonPress,
    onCheckboxPress,
    containerStyle,
    isSelectAllChecked,
    isIndeterminate,
    isDisabledCheckbox,
    isHovered,
    isFocused,
    isPendingDelete,
    columns,
    isLargeScreenWidth,
}: ExpenseReportListItemRowProps) {
    if (isLargeScreenWidth) {
        return (
            <ExpenseReportListItemRowWide
                item={item}
                reportActions={reportActions}
                showTooltip={showTooltip}
                canSelectMultiple={canSelectMultiple}
                isActionLoading={isActionLoading}
                onButtonPress={onButtonPress}
                onCheckboxPress={onCheckboxPress}
                containerStyle={containerStyle}
                isSelectAllChecked={isSelectAllChecked}
                isIndeterminate={isIndeterminate}
                isDisabledCheckbox={isDisabledCheckbox}
                isHovered={isHovered}
                isFocused={isFocused}
                isPendingDelete={isPendingDelete}
                columns={columns}
            />
        );
    }
    return (
        <ExpenseReportListItemRowNarrow
            item={item}
            showTooltip={showTooltip}
            onCheckboxPress={onCheckboxPress}
            canSelectMultiple={canSelectMultiple}
            isSelectAllChecked={isSelectAllChecked}
            isIndeterminate={isIndeterminate}
            isDisabledCheckbox={isDisabledCheckbox}
        />
    );
}

export default ExpenseReportListItemRow;
export type {ExpenseReportListItemRowProps};
