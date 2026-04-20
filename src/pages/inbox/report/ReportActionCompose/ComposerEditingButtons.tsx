import React from 'react';
import {View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import {useComposerEditActions} from './ComposerContext';
import ComposerExpandCollapseButton from './ComposerExpandCollapseButton';
import MessageEditCancelButton from './MessageEditCancelButton';

type ComposerEditingButtonsProps = {
    reportID: string;
};

function ComposerEditingButtons({reportID}: ComposerEditingButtonsProps) {
    const styles = useThemeStyles();

    const {deleteDraft} = useComposerEditActions();

    const editingButtonsContainerStyles = [
        styles.dFlex,
        styles.alignItemsCenter,
        styles.flexWrap,
        styles.justifyContentCenter,
        {paddingVertical: styles.composerSizeButton.marginHorizontal},
    ];
    return (
        <View style={editingButtonsContainerStyles}>
            <ComposerExpandCollapseButton reportID={reportID} />
            <MessageEditCancelButton onCancel={deleteDraft} />
        </View>
    );
}

export default ComposerEditingButtons;
