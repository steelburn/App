import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import FS from '@libs/Fullstory';
import type {Report} from '@src/types/onyx';

type DescriptiveTextProps = {
    descriptiveText: string | undefined;
    report?: Report;
};

function DescriptiveText({descriptiveText, report}: DescriptiveTextProps) {
    const styles = useThemeStyles();

    if (!descriptiveText) {
        return null;
    }

    return (
        <View
            style={[styles.flexWrap]}
            fsClass={FS.getChatFSClass(report)}
        >
            <Text style={[styles.textLabel]}>{descriptiveText}</Text>
        </View>
    );
}

DescriptiveText.displayName = 'OptionRow.DescriptiveText';

export default DescriptiveText;
