import React from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateAgentPrompt} from '@libs/actions/Agent';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {EditAgentPromptForm} from '@src/types/form/EditAgentPromptForm';
import INPUT_IDS from '@src/types/form/EditAgentPromptForm';

type EditPromptPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.AGENTS.EDIT_PROMPT>;

function EditPromptPage({route}: EditPromptPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const accountID = route.params.accountID;
    const [agentPrompt] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`);
    const [promptDraft] = useOnyx(ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM_DRAFT, {selector: (draft: OnyxEntry<EditAgentPromptForm>) => draft?.[INPUT_IDS.PROMPT] ?? ''});

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM> = {};
        if (!values[INPUT_IDS.PROMPT].trim()) {
            errors[INPUT_IDS.PROMPT] = translate('editAgentPromptPage.error.emptyPrompt');
        }
        return errors;
    };

    const handleSubmit = () => {
        updateAgentPrompt(accountID, (promptDraft ?? '').trim(), agentPrompt?.prompt ?? '');
        Navigation.goBack(ROUTES.SETTINGS_AGENTS_EDIT.getRoute(accountID));
    };

    useKeyboardShortcut(CONST.KEYBOARD_SHORTCUTS.CTRL_ENTER, handleSubmit);

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
                validate={validate}
                onSubmit={handleSubmit}
                submitButtonText={translate('common.save')}
                style={[styles.flex1, styles.ph5]}
                shouldUseScrollView={false}
                submitFlexEnabled={false}
                enabledWhenOffline
                shouldHideFixErrorsAlert
                shouldValidateOnChange
                shouldValidateOnBlur
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
                        shouldSaveDraft
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

EditPromptPage.displayName = 'EditPromptPage';

export default EditPromptPage;
