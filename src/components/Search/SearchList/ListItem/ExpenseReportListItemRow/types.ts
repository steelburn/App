import type {StyleProp, ViewStyle} from 'react-native';
import type {SearchColumnType} from '@components/Search/types';
import type {ReportAction} from '@src/types/onyx';
import type {ExpenseReportListItemType} from '../types';

type ExpenseReportListItemRowNarrowProps = {
    item: ExpenseReportListItemType;
    canSelectMultiple?: boolean;
    onCheckboxPress?: () => void;
    isSelectAllChecked?: boolean;
    isIndeterminate?: boolean;
    isDisabledCheckbox?: boolean;
};

type ExpenseReportListItemRowWideProps = {
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
};

type ExpenseReportListItemRowProps = (ExpenseReportListItemRowNarrowProps & {isLargeScreenWidth?: false}) | (ExpenseReportListItemRowWideProps & {isLargeScreenWidth: true});

export type {ExpenseReportListItemRowProps, ExpenseReportListItemRowNarrowProps, ExpenseReportListItemRowWideProps};
