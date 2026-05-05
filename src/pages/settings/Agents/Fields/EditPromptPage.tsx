import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateAgentPrompt} from '@libs/actions/Agent';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import {clearErrors} from '@userActions/FormActions';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/EditAgentPromptForm';

type EditPromptPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.AGENTS.EDIT_PROMPT>;

function EditPromptPage({route}: EditPromptPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const accountID = route.params.accountID;
    const [agentPrompt] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`);
    const [formIsLoading] = useOnyx(ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM, {selector: (form) => form?.isLoading});
    const [formErrors] = useOnyx(ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM, {selector: (form) => form?.errors});
    const hasSubmittedRef = useRef(false);

    useEffect(() => {
        clearErrors(ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM);
    }, []);

    useEffect(() => {
        if (!hasSubmittedRef.current || formIsLoading || formErrors) {
            return;
        }
        Navigation.goBack(ROUTES.SETTINGS_AGENTS_EDIT.getRoute(accountID));
        hasSubmittedRef.current = false;
    }, [formIsLoading, formErrors, accountID]);

    const handleSubmit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM>) => {
        hasSubmittedRef.current = true;
        updateAgentPrompt(accountID, values[INPUT_IDS.PROMPT].trim(), agentPrompt?.prompt ?? '');
    };

    return (
        <ScreenWrapper
            testID={EditPromptPage.displayName}
            includeSafeAreaPaddingBottom
            offlineIndicatorStyle={styles.mtAuto}
        >
            <HeaderWithBackButton
                title={translate('editAgentPromptPage.title')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_AGENTS_EDIT.getRoute(accountID))}
            />
            <FormProvider
                formID={ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM}
                onSubmit={handleSubmit}
                submitButtonText={translate('common.save')}
                style={[styles.flex1, styles.ph5]}
                shouldUseScrollView={false}
                submitFlexEnabled={false}
                enabledWhenOffline
                shouldHideFixErrorsAlert
            >
                <View style={[styles.flex1]}>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.PROMPT}
                        label={translate('editAgentPage.instructions')}
                        accessibilityLabel={translate('editAgentPage.instructions')}
                        role={CONST.ROLE.PRESENTATION}
                        defaultValue={agentPrompt?.prompt ?? ''}
                        multiline
                        containerStyles={[styles.flex1]}
                        touchableInputWrapperStyle={[styles.flex1]}
                        textInputContainerStyles={[styles.flex1]}
                        inputStyle={[styles.flex1, styles.textAlignVerticalTop]}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

EditPromptPage.displayName = 'EditPromptPage';

export default EditPromptPage;
