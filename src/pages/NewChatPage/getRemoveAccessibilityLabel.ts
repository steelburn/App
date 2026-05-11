import type {LocalizedTranslate} from '@components/LocaleContextProvider';

function getRemoveAccessibilityLabel(translate: LocalizedTranslate, text?: string): string {
    return `${translate('common.remove')} ${text ?? ''}`;
}

export default getRemoveAccessibilityLabel;
