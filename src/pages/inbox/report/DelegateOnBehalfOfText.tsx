import {personalDetailsSelector} from '@selectors/PersonalDetails';
import React from 'react';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getPersonalDetailByEmail} from '@libs/PersonalDetailsUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

type DelegateOnBehalfOfTextProps = {
    /** The account ID whose login drives the "on behalf of" name. */
    mainAccountID: number | undefined;

    /** Fallback login if the account is not yet present in personal details. */
    fallbackLogin: string | undefined;
};

function DelegateOnBehalfOfText({mainAccountID, fallbackLogin}: DelegateOnBehalfOfTextProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [resolvedDetail] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {selector: personalDetailsSelector(mainAccountID ?? CONST.DEFAULT_NUMBER_ID)});
    const mainAccountLogin = resolvedDetail?.login ?? fallbackLogin;
    const accountOwnerDetails = getPersonalDetailByEmail(String(mainAccountLogin ?? ''));
    return <Text style={[styles.chatDelegateMessage]}>{translate('delegate.onBehalfOfMessage', accountOwnerDetails?.displayName ?? '')}</Text>;
}

export default DelegateOnBehalfOfText;
