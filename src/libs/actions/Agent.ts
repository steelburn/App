import Onyx from 'react-native-onyx';
import {read, write} from '@libs/API';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';

function openAgentsPage() {
    read(READ_COMMANDS.OPEN_AGENTS_PAGE, null);
}

function createAgent(firstName: string | undefined, prompt: string, customExpensifyAvatarID?: string) {
    const optimisticAccountID = -Math.round(Math.random() * 1000000);

    const optimisticData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: {
                    accountID: optimisticAccountID,
                    displayName: firstName,
                    isOptimisticPersonalDetail: true,
                },
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: {prompt, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD},
        },
    ];

    const successData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: null,
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: null,
        },
    ];

    const failureData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [optimisticAccountID]: {
                    accountID: optimisticAccountID,
                    displayName: firstName,
                    isOptimisticPersonalDetail: true,
                },
            },
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`,
            value: {
                prompt,
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD,
                errors: getMicroSecondOnyxErrorWithTranslationKey('agentsPage.error.genericAdd'),
            },
        },
    ];

    write(WRITE_COMMANDS.CREATE_AGENT, {firstName, prompt, customExpensifyAvatarID}, {optimisticData, successData, failureData});
}

function clearAgentError(optimisticAccountID: number) {
    Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {[optimisticAccountID]: null});
    Onyx.set(`${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${optimisticAccountID}`, null);
}

function updateAgentName(accountID: number, firstName: string, originalFirstName: string) {
    const optimisticData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_NAME_FORM,
            value: {isLoading: true, errors: null},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [accountID]: {displayName: firstName},
            },
        },
    ];

    const successData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_NAME_FORM,
            value: {isLoading: false},
        },
    ];

    const failureData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_NAME_FORM,
            value: {isLoading: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [accountID]: {displayName: originalFirstName},
            },
        },
    ];

    write(WRITE_COMMANDS.UPDATE_AGENT_NAME, {accountID, firstName}, {optimisticData, successData, failureData});
}

function updateAgentPrompt(accountID: number, prompt: string, originalPrompt: string) {
    const optimisticData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM,
            value: {isLoading: true, errors: null},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`,
            value: {prompt},
        },
    ];

    const successData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM,
            value: {isLoading: false},
        },
    ];

    const failureData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.EDIT_AGENT_PROMPT_FORM,
            value: {isLoading: false, errors: getMicroSecondOnyxErrorWithTranslationKey('common.genericErrorMessage')},
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`,
            value: {prompt: originalPrompt},
        },
    ];

    write(WRITE_COMMANDS.UPDATE_AGENT_PROMPT, {accountID, prompt}, {optimisticData, successData, failureData});
}

function deleteAgent(accountID: number) {
    const optimisticData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.SET,
            key: `${ONYXKEYS.COLLECTION.SHARED_NVP_AGENT_PROMPT}${accountID}`,
            value: null,
        },
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {[accountID]: null},
        },
    ];

    const successData: AnyOnyxUpdate[] = [];

    const failureData: AnyOnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {[accountID]: {accountID}},
        },
    ];

    write(WRITE_COMMANDS.DELETE_AGENT, {accountID}, {optimisticData, successData, failureData});
    Navigation.navigate(ROUTES.SETTINGS_AGENTS);
}

export {openAgentsPage, createAgent, clearAgentError, updateAgentName, updateAgentPrompt, deleteAgent};
