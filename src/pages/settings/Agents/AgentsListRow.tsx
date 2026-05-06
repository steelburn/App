import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Errors, PendingAction} from '@src/types/onyx/OnyxCommon';
import AgentInfoRow from './AgentInfoRow';

type AgentsListRowProps = {
    /** Account ID of the agent */
    accountID: number;

    /** Display name of the agent */
    displayName: string;

    /** Login email of the agent */
    login: string;

    /** Pending action for offline feedback */
    pendingAction?: PendingAction | null;

    /** Errors to display on the row */
    errors?: Errors | null;

    /** Called when the user dismisses the error */
    onErrorClose?: () => void;
};

function AgentsListRow({accountID, displayName, login, pendingAction, errors, onErrorClose}: AgentsListRowProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const navigateToEdit = () => Navigation.navigate(ROUTES.SETTINGS_AGENTS_EDIT.getRoute(accountID));

    return (
        <OfflineWithFeedback
            pendingAction={pendingAction}
            errors={errors}
            onClose={onErrorClose}
            errorRowStyles={[styles.ph5, styles.pb5]}
        >
            {shouldUseNarrowLayout ? (
                <PressableWithFeedback
                    style={[styles.selectionListPressableItemWrapper, styles.mb2, styles.gap3]}
                    onPress={navigateToEdit}
                    accessibilityLabel={displayName}
                    role={CONST.ROLE.BUTTON}
                    sentryLabel="AgentsListRow-Edit"
                >
                    <AgentInfoRow
                        accountID={accountID}
                        displayName={displayName}
                        login={login}
                    />
                </PressableWithFeedback>
            ) : (
                <View style={[styles.selectionListPressableItemWrapper, styles.mb2, styles.gap3]}>
                    <AgentInfoRow
                        accountID={accountID}
                        displayName={displayName}
                        login={login}
                    />
                    <Button
                        small
                        text={translate('common.edit')}
                        onPress={navigateToEdit}
                    />
                </View>
            )}
        </OfflineWithFeedback>
    );
}

export default AgentsListRow;
