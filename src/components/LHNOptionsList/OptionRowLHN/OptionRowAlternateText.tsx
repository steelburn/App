import React from 'react';
import type {StyleProp, TextStyle} from 'react-native';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {containsCustomEmoji as containsCustomEmojiUtils, containsOnlyCustomEmoji} from '@libs/EmojiUtils';
import type {ForwardedFSClassProps} from '@libs/Fullstory/types';
import TextWithEmojiFragment from '@pages/inbox/report/comment/TextWithEmojiFragment';

type OptionRowAlternateTextProps = ForwardedFSClassProps & {
    alternateText: string | undefined;
    style: StyleProp<TextStyle>;
};

function OptionRowAlternateText({alternateText, style, forwardedFSClass}: OptionRowAlternateTextProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    if (!alternateText) {
        return null;
    }

    const containsCustomEmojiWithText = containsCustomEmojiUtils(alternateText) && !containsOnlyCustomEmoji(alternateText);

    return (
        <Text
            style={style}
            numberOfLines={1}
            accessibilityLabel={translate('accessibilityHints.lastChatMessagePreview')}
            fsClass={forwardedFSClass}
        >
            {containsCustomEmojiWithText ? (
                <TextWithEmojiFragment
                    message={alternateText}
                    style={[style, styles.mh0]}
                    alignCustomEmoji
                />
            ) : (
                alternateText
            )}
        </Text>
    );
}

OptionRowAlternateText.displayName = 'OptionRowAlternateText';

export default OptionRowAlternateText;
