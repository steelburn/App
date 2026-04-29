import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import AttendeeField from '@components/MoneyRequestConfirmationList/sections/AttendeeField';
import CategoryField from '@components/MoneyRequestConfirmationList/sections/CategoryField';
import DateField from '@components/MoneyRequestConfirmationList/sections/DateField';
import TagFields from '@components/MoneyRequestConfirmationList/sections/TagFields';
import TaxFields from '@components/MoneyRequestConfirmationList/sections/TaxFields';
import type CONST from '@src/CONST';
import type {IOUAction, IOUType} from '@src/CONST';
import type * as OnyxTypes from '@src/types/onyx';

type TagVisibilityEntry = {
    /** Whether this tag list should be displayed */
    shouldShow: boolean;
    /** Whether the tag for this list is required to submit */
    isTagRequired: boolean;
};

type ClassificationFieldsProps = {
    /** Action being performed (drives section navigation targets) */
    action: IOUAction;

    /** Type of IOU being confirmed */
    iouType: Exclude<IOUType, typeof CONST.IOU.TYPE.REQUEST | typeof CONST.IOU.TYPE.SEND>;

    /** ID of the active transaction */
    transactionID: string | undefined;

    /** ID of the report the transaction belongs to */
    reportID: string;

    /** ID of the originating report action when editing */
    reportActionID: string | undefined;

    /** Active transaction */
    transaction: OnyxEntry<OnyxTypes.Transaction>;

    /** Active policy */
    policy: OnyxEntry<OnyxTypes.Policy>;

    /** Resolved policy used when moving an expense off track-expense (drives tax fallback) */
    policyForMovingExpenses: OnyxEntry<OnyxTypes.Policy> | undefined;

    /** Tag lists configured on the policy */
    policyTagLists: Array<ValueOf<OnyxTypes.PolicyTagLists>>;

    /** Per-tag-list visibility (parallel to `policyTagLists` order) */
    tagVisibility: TagVisibilityEntry[];

    /** Previous render's per-tag-list `shouldShow` projection (drives `TagFields` transitions) */
    previousTagsVisibility: boolean[];

    /** Whether the surface is read-only */
    isReadOnly: boolean;

    /** Whether the user has confirmed (locks editable controls) */
    didConfirm: boolean;

    /** Whether the categories field should be displayed */
    shouldShowCategories: boolean;

    /** Whether the categories field is required (drives above-show-more placement) */
    isCategoryRequired: boolean;

    /** Whether the date field should be displayed */
    shouldShowDate: boolean;

    /** Whether the tax field should be displayed */
    shouldShowTax: boolean;

    /** Whether tax field modifications are allowed */
    canModifyTaxFields: boolean;

    /** Whether the attendees field should be displayed */
    shouldShowAttendees: boolean;

    /** Whether to display per-field validation errors */
    shouldDisplayFieldError: boolean;

    /** Whether navigating to upgrade is required to proceed past blocked workspaces */
    shouldNavigateToUpgradePath: boolean;

    /** Whether the user must select a policy before submitting */
    shouldSelectPolicy: boolean;

    /** ISO currency code for the transaction */
    iouCurrencyCode: string;

    /** Pre-formatted amount-per-attendee string for display */
    formattedAmountPerAttendee: string;

    /** Form-level error message */
    formError: string;

    /** When true, suppresses optional fields (only required Category + required Tags render) */
    isCompactMode: boolean;
};

function ClassificationFields({
    action,
    iouType,
    transactionID,
    reportID,
    reportActionID,
    transaction,
    policy,
    policyForMovingExpenses,
    policyTagLists,
    tagVisibility,
    previousTagsVisibility,
    isReadOnly,
    didConfirm,
    shouldShowCategories,
    isCategoryRequired,
    shouldShowDate,
    shouldShowTax,
    canModifyTaxFields,
    shouldShowAttendees,
    shouldDisplayFieldError,
    shouldNavigateToUpgradePath,
    shouldSelectPolicy,
    iouCurrencyCode,
    formattedAmountPerAttendee,
    formError,
    isCompactMode,
}: ClassificationFieldsProps) {
    const showCategory = shouldShowCategories && (isCompactMode ? isCategoryRequired : true);

    const visibleTagEntries = policyTagLists
        .map(({name}, index) => {
            const tagVisibilityItem = tagVisibility.at(index);
            return {
                name,
                index,
                isTagRequired: tagVisibilityItem?.isTagRequired ?? false,
                tagShouldShow: tagVisibilityItem?.shouldShow ?? false,
            };
        })
        .filter(({tagShouldShow, isTagRequired}) => tagShouldShow && (isCompactMode ? isTagRequired : true));

    return (
        <>
            {showCategory && (
                <CategoryField
                    isCategoryRequired={isCategoryRequired}
                    didConfirm={didConfirm}
                    isReadOnly={isReadOnly}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    reportActionID={reportActionID}
                    policy={policy}
                    transaction={transaction}
                    formError={formError}
                    shouldNavigateToUpgradePath={shouldNavigateToUpgradePath}
                    shouldSelectPolicy={shouldSelectPolicy}
                />
            )}

            {!isCompactMode && shouldShowDate && (
                <DateField
                    shouldDisplayFieldError={shouldDisplayFieldError}
                    didConfirm={didConfirm}
                    isReadOnly={isReadOnly}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    reportActionID={reportActionID}
                    transaction={transaction}
                />
            )}

            {visibleTagEntries.map(({name, index, isTagRequired}) => {
                const policyTagList = policyTagLists.at(index);
                if (!policyTagList) {
                    return null;
                }
                return (
                    <TagFields
                        key={`tag_${name}`}
                        tagIndex={index}
                        policyTagList={policyTagList}
                        isTagRequired={isTagRequired}
                        previousShouldShow={previousTagsVisibility.at(index) ?? false}
                        didConfirm={didConfirm}
                        isReadOnly={isReadOnly}
                        transactionID={transactionID}
                        action={action}
                        iouType={iouType}
                        reportID={reportID}
                        reportActionID={reportActionID}
                        transaction={transaction}
                        formError={formError}
                    />
                );
            })}

            {!isCompactMode && shouldShowTax && (
                <TaxFields
                    policy={policy}
                    policyForMovingExpenses={policyForMovingExpenses}
                    transaction={transaction}
                    iouCurrencyCode={iouCurrencyCode}
                    canModifyTaxFields={canModifyTaxFields}
                    didConfirm={didConfirm}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    formError={formError}
                />
            )}

            {!isCompactMode && shouldShowAttendees && (
                <AttendeeField
                    formattedAmountPerAttendee={formattedAmountPerAttendee}
                    isReadOnly={isReadOnly}
                    transactionID={transactionID}
                    action={action}
                    iouType={iouType}
                    reportID={reportID}
                    formError={formError}
                    transaction={transaction}
                />
            )}
        </>
    );
}

export default ClassificationFields;
