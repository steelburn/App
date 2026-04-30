import React, {useCallback} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getPersonalDetailByEmail} from '@libs/PersonalDetailsUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

type DelegateOnBehalfOfTextProps = {
    /** The account ID whose login drives the "on behalf of" name. */
    mainAccountID: number | undefined;

    /** Fallback login if the account is not yet present in personal details. */
    fallbackLogin: string | undefined;
};

function DelegateOnBehalfOfText({mainAccountID, fallbackLogin}: DelegateOnBehalfOfTextProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const loginSelector = useCallback((list: OnyxEntry<OnyxTypes.PersonalDetailsList>) => (mainAccountID ? list?.[mainAccountID]?.login : undefined), [mainAccountID]);
    const [resolvedLogin] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {selector: loginSelector});
    const mainAccountLogin = resolvedLogin ?? fallbackLogin;
    const accountOwnerDetails = getPersonalDetailByEmail(String(mainAccountLogin ?? ''));
    return <Text style={[styles.chatDelegateMessage]}>{translate('delegate.onBehalfOfMessage', accountOwnerDetails?.displayName ?? '')}</Text>;
}

export default DelegateOnBehalfOfText;
