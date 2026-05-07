import React from 'react';
import Text from '@components/Text';
import Tooltip from '@components/Tooltip';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import DateUtils from '@libs/DateUtils';
import type {OptionData} from '@libs/ReportUtils';
import {isOneOnOneChat} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import type {Report} from '@src/types/onyx';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

type StatusProps = {
    optionItem: OptionData;
    report?: Report;
};

function Status({optionItem, report}: StatusProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();

    const emojiCode = optionItem.status?.emojiCode ?? '';
    if (!emojiCode || !isOneOnOneChat(!isEmptyObject(report) ? report : undefined)) {
        return null;
    }

    const statusText = optionItem.status?.text ?? '';
    const statusClearAfterDate = optionItem.status?.clearAfter ?? '';
    const currentSelectedTimezone = currentUserPersonalDetails?.timezone?.selected ?? CONST.DEFAULT_TIME_ZONE.selected;
    const formattedDate = DateUtils.getStatusUntilDate(translate, statusClearAfterDate, optionItem?.timezone?.selected ?? CONST.DEFAULT_TIME_ZONE.selected, currentSelectedTimezone);
    const statusContent = formattedDate ? `${statusText ? `${statusText} ` : ''}(${formattedDate})` : statusText;

    return (
        <Tooltip
            text={statusContent}
            shiftVertical={-4}
        >
            <Text style={styles.ml1}>{emojiCode}</Text>
        </Tooltip>
    );
}

Status.displayName = 'OptionRow.Status';

export default Status;
