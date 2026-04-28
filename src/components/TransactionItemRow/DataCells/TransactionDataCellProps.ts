import type {TransactionWithOptionalSearchFields} from '../types';

type TransactionDataCellProps = {
    transactionItem: TransactionWithOptionalSearchFields;
    shouldShowTooltip: boolean;
    shouldUseNarrowLayout?: boolean;
};

export default TransactionDataCellProps;
