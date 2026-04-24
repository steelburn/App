import React from 'react';
import type {PolicyReportField} from '@src/types/onyx';
import SingleSelect from '../SingleSelect';

type ReportFieldListProps = {
    field: PolicyReportField;
    value: string;
    onChange: (newValue: string) => void;
};

function ReportFieldList({field, value, onChange}: ReportFieldListProps) {
    const items = field.values.map((fieldValue) => ({
        value: fieldValue,
        text: fieldValue,
    }));
    const selectedValue = {text: value, value: value};

    return (
        <SingleSelect
            items={items}
            value={selectedValue}
            onChange={onChange}
            hasHeader
        />
    );
}

export default ReportFieldList;
