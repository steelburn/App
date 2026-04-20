import type {RefObject} from 'react';
import {createContext, useContext} from 'react';
import type {BlurEvent, TextInputSelectionChangeEvent, View} from 'react-native';
import type {Emoji} from '@assets/emojis/types';
import type {Mention} from '@components/MentionSuggestions';
import type {FileObject} from '@src/types/utils/Attachment';
import type {ComposerWithSuggestionsRef} from './ComposerWithSuggestions';

type SuggestionsRef = {
    resetSuggestions: () => void;
    onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
    triggerHotkeyActions: (event: KeyboardEvent) => boolean | undefined;
    updateShouldShowSuggestionMenuToFalse: (shouldShowSuggestionMenu?: boolean) => void;
    setShouldBlockSuggestionCalc: (shouldBlock: boolean) => void;
    getSuggestions: () => Mention[] | Emoji[];
    getIsSuggestionsMenuVisible: () => boolean;
};

// Hot — changes on every keystroke
type ComposerText = string;

// Warm — changes on interaction
type ComposerState = {
    isFocused: boolean;
    isMenuVisible: boolean;
    isFullComposerAvailable: boolean;
    didResetComposerHeight: boolean;
};

type ComposerEditState = {
    isEditingInComposer: boolean;
    editingReportActionID: string | null;
    editingMessage: string | null;
    editingState: 'off' | 'editing' | 'submitted';
};

// Warm — changes based on content + policy
type ComposerSendState = {
    isSendDisabled: boolean;
    debouncedCommentMaxLengthValidation: (value: string) => void;
    isExceedingMaxLength: boolean;
    exceededMaxLength: number | null;
    isBlockedFromConcierge: boolean;
    isTaskTitle: boolean;
};

// Frozen — stable references, never changes after mount
type ComposerActions = {
    setText: (v: string) => void;
    setMenuVisibility: (v: boolean) => void;
    setIsFullComposerAvailable: (v: boolean) => void;
    setComposerRef: (ref: ComposerWithSuggestionsRef | null) => void;
    onBlur: (event: BlurEvent) => void;
    onFocus: () => void;
    onAddActionPressed: () => void;
    onItemSelected: () => void;
    onTriggerAttachmentPicker: () => void;
    clearComposer: () => void;
};

type ComposerEditActions = {
    publishDraft: (draftMessage: string) => void;
    deleteDraft: () => void;
};

// Infrequent — changes only when send logic changes
type ComposerSendActions = {
    validateAndSubmitDraft: (draftMessage: string) => void;
    submitDraftAndClearComposer: () => void;
    onValueChange: (value: string) => void;
};

// Frozen — stable refs, set once
type ComposerMeta = {
    containerRef: RefObject<View | null>;
    composerRef: RefObject<ComposerWithSuggestionsRef | null>;
    suggestionsRef: RefObject<SuggestionsRef | null>;
    actionButtonRef: RefObject<View | HTMLDivElement | null>;
    isNextModalWillOpenRef: RefObject<boolean>;
    attachmentFileRef: RefObject<FileObject | FileObject[] | null>;
};

const noop = () => {};

const ComposerTextContext = createContext<ComposerText>('');

const defaultState: ComposerState = {
    isFocused: false,
    isMenuVisible: false,
    isFullComposerAvailable: false,
    didResetComposerHeight: false,
};
const ComposerStateContext = createContext<ComposerState>(defaultState);

const defaultSendState: ComposerSendState = {
    isSendDisabled: true,
    debouncedCommentMaxLengthValidation: noop,
    isExceedingMaxLength: false,
    exceededMaxLength: null,
    isBlockedFromConcierge: false,
    isTaskTitle: false,
};

const defaultEditState: ComposerEditState = {
    isEditingInComposer: false,
    editingReportActionID: null,
    editingMessage: null,
    editingState: 'off',
};
const ComposerEditStateContext = createContext<ComposerEditState>(defaultEditState);

const ComposerSendStateContext = createContext<ComposerSendState>(defaultSendState);

const defaultActions: ComposerActions = {
    setText: noop,
    setMenuVisibility: noop,
    setIsFullComposerAvailable: noop,
    setComposerRef: noop,
    onBlur: noop,
    onFocus: noop,
    onAddActionPressed: noop,
    onItemSelected: noop,
    onTriggerAttachmentPicker: noop,
    clearComposer: noop,
};
const ComposerActionsContext = createContext<ComposerActions>(defaultActions);

const defaultEditActions: ComposerEditActions = {
    publishDraft: noop,
    deleteDraft: noop,
};
const ComposerEditActionsContext = createContext<ComposerEditActions>(defaultEditActions);

const defaultSendActions: ComposerSendActions = {
    validateAndSubmitDraft: noop,
    submitDraftAndClearComposer: noop,
    onValueChange: noop,
};
const ComposerSendActionsContext = createContext<ComposerSendActions>(defaultSendActions);

const ComposerMetaContext = createContext<ComposerMeta | null>(null);

function useComposerText() {
    return useContext(ComposerTextContext);
}

function useComposerState() {
    return useContext(ComposerStateContext);
}

function useComposerEditState() {
    return useContext(ComposerEditStateContext);
}

function useComposerSendState() {
    return useContext(ComposerSendStateContext);
}

function useComposerActions() {
    return useContext(ComposerActionsContext);
}

function useComposerEditActions() {
    return useContext(ComposerEditActionsContext);
}

function useComposerSendActions() {
    return useContext(ComposerSendActionsContext);
}

function useComposerMeta() {
    const ctx = useContext(ComposerMetaContext);
    if (!ctx) {
        throw new Error('useComposerMeta must be used inside ComposerProvider');
    }
    return ctx;
}

export {
    ComposerTextContext,
    ComposerStateContext,
    ComposerEditStateContext,
    ComposerSendStateContext,
    ComposerActionsContext,
    ComposerEditActionsContext,
    ComposerSendActionsContext,
    ComposerMetaContext,
    useComposerText,
    useComposerState,
    useComposerEditState,
    useComposerSendState,
    useComposerActions,
    useComposerEditActions,
    useComposerSendActions,
    useComposerMeta,
};
export type {SuggestionsRef, ComposerText, ComposerState, ComposerSendState, ComposerActions, ComposerSendActions, ComposerMeta};
