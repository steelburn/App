import React, {useRef} from 'react';
import {InteractionManager, View} from 'react-native';
import NoDropZone from '@components/DragAndDrop/NoDropZone';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {abandonReviewDuplicateTransactions} from '@libs/actions/Transaction';
import {clearTwoFactorAuthData} from '@libs/actions/TwoFactorAuthActions';
import hideKeyboardOnSwipe from '@libs/Navigation/AppNavigator/hideKeyboardOnSwipe';
import * as ModalStackNavigators from '@libs/Navigation/AppNavigator/ModalStackNavigators';
import useCustomScreenOptions from '@libs/Navigation/AppNavigator/useCustomScreenOptions';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {AuthScreensParamList, RightModalNavigatorParamList} from '@navigation/types';
import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import {NarrowPaneContextProvider} from './NarrowPaneContext';
import Overlay from './Overlay';

type RightModalNavigatorProps = PlatformStackScreenProps<AuthScreensParamList, typeof NAVIGATORS.RIGHT_MODAL_NAVIGATOR>;

const Stack = createPlatformStackNavigator<RightModalNavigatorParamList, string>();

function RightModalNavigator({navigation, route}: RightModalNavigatorProps) {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const isExecutingRef = useRef<boolean>(false);

    const screenOptions = useCustomScreenOptions();

    return (
        <NarrowPaneContextProvider>
            <NoDropZone>
                {!shouldUseNarrowLayout && (
                    <Overlay
                        onPress={() => {
                            if (isExecutingRef.current) {
                                return;
                            }
                            isExecutingRef.current = true;
                            navigation.goBack();
                            setTimeout(() => {
                                isExecutingRef.current = false;
                            }, CONST.ANIMATED_TRANSITION);
                        }}
                    />
                )}
                <View style={styles.RHPNavigatorContainer(shouldUseNarrowLayout)}>
                    <Stack.Navigator
                        screenOptions={screenOptions}
                        screenListeners={{
                            blur: () => {
                                if (
                                    // @ts-expect-error There is something wrong with a types here and it's don't see the params list
                                    navigation.getState().routes.find((routes) => routes.name === NAVIGATORS.RIGHT_MODAL_NAVIGATOR)?.params?.screen ===
                                        SCREENS.RIGHT_MODAL.TRANSACTION_DUPLICATE ||
                                    route.params?.screen !== SCREENS.RIGHT_MODAL.TRANSACTION_DUPLICATE
                                ) {
                                    return;
                                }
                                // Delay clearing review duplicate data till the RHP is completely closed
                                // to avoid not found showing briefly in confirmation page when RHP is closing
                                InteractionManager.runAfterInteractions(() => {
                                    abandonReviewDuplicateTransactions();
                                });
                            },
                        }}
                        id={NAVIGATORS.RIGHT_MODAL_NAVIGATOR}
                    >
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SETTINGS}
                            component={ModalStackNavigators.SettingsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.TWO_FACTOR_AUTH}
                            component={ModalStackNavigators.TwoFactorAuthenticatorStackNavigator}
                            listeners={{
                                beforeRemove: () => {
                                    InteractionManager.runAfterInteractions(clearTwoFactorAuthData);
                                },
                            }}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.NEW_CHAT}
                            component={ModalStackNavigators.NewChatModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.PROFILE}
                            component={ModalStackNavigators.ProfileModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.DEBUG}
                            component={ModalStackNavigators.DebugModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.NEW_REPORT_WORKSPACE_SELECTION}
                            component={ModalStackNavigators.NewReportWorkspaceSelectionModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.REPORT_DETAILS}
                            component={ModalStackNavigators.ReportDetailsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.REPORT_CHANGE_WORKSPACE}
                            component={ModalStackNavigators.ReportChangeWorkspaceModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.REPORT_SETTINGS}
                            component={ModalStackNavigators.ReportSettingsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.REPORT_DESCRIPTION}
                            component={ModalStackNavigators.ReportDescriptionModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SETTINGS_CATEGORIES}
                            component={ModalStackNavigators.CategoriesModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SETTINGS_TAGS}
                            component={ModalStackNavigators.TagsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.EXPENSIFY_CARD}
                            component={ModalStackNavigators.ExpensifyCardModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.DOMAIN_CARD}
                            component={ModalStackNavigators.DomainCardModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.PARTICIPANTS}
                            component={ModalStackNavigators.ReportParticipantsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.ROOM_MEMBERS}
                            component={ModalStackNavigators.RoomMembersModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.MONEY_REQUEST}
                            component={ModalStackNavigators.MoneyRequestModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.WORKSPACE_CONFIRMATION}
                            component={ModalStackNavigators.WorkspaceConfirmationModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.NEW_TASK}
                            component={ModalStackNavigators.NewTaskModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.TEACHERS_UNITE}
                            component={ModalStackNavigators.NewTeachersUniteNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.TASK_DETAILS}
                            component={ModalStackNavigators.TaskModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.ENABLE_PAYMENTS}
                            component={ModalStackNavigators.EnablePaymentsStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SPLIT_DETAILS}
                            component={ModalStackNavigators.SplitDetailsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.ADD_PERSONAL_BANK_ACCOUNT}
                            component={ModalStackNavigators.AddPersonalBankAccountModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.WALLET_STATEMENT}
                            component={ModalStackNavigators.WalletStatementStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.FLAG_COMMENT}
                            component={ModalStackNavigators.FlagCommentStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.EDIT_REQUEST}
                            component={ModalStackNavigators.EditRequestStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SIGN_IN}
                            component={ModalStackNavigators.SignInModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.REFERRAL}
                            component={ModalStackNavigators.ReferralModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.PRIVATE_NOTES}
                            component={ModalStackNavigators.PrivateNotesModalStackNavigator}
                            options={hideKeyboardOnSwipe}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.TRANSACTION_DUPLICATE}
                            component={ModalStackNavigators.TransactionDuplicateStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.TRAVEL}
                            component={ModalStackNavigators.TravelModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SEARCH_REPORT}
                            component={ModalStackNavigators.SearchReportModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.RESTRICTED_ACTION}
                            component={ModalStackNavigators.RestrictedActionModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SEARCH_ADVANCED_FILTERS}
                            component={ModalStackNavigators.SearchAdvancedFiltersModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SEARCH_SAVED_SEARCH}
                            component={ModalStackNavigators.SearchSavedSearchModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.MISSING_PERSONAL_DETAILS}
                            component={ModalStackNavigators.MissingPersonalDetailsModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.ADD_UNREPORTED_EXPENSE}
                            component={ModalStackNavigators.AddUnreportedExpenseModalStackNavigator}
                        />
                        <Stack.Screen
                            name={SCREENS.RIGHT_MODAL.SCHEDULE_CALL}
                            component={ModalStackNavigators.ScheduleCallModalStackNavigator}
                        />
                    </Stack.Navigator>
                </View>
            </NoDropZone>
        </NarrowPaneContextProvider>
    );
}

RightModalNavigator.displayName = 'RightModalNavigator';

export default RightModalNavigator;
