import type {PendingAction} from './OnyxCommon';

/** Represents the continuous reconciliation status for a card. */
type CardContinuousReconciliation = {
    /** Pending action for optimistic UI updates */
    pendingAction?: PendingAction;
};

export default CardContinuousReconciliation;
