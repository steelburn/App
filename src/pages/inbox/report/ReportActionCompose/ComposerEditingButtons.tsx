import React from 'react';
import {View} from 'react-native';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
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
        <View
            testID={CONST.COMPOSER.TEST_ID.EDITING_MESSAGE_ACTION_ROW}
            style={editingButtonsContainerStyles}
        >
            <ComposerExpandCollapseButton reportID={reportID} />
            <MessageEditCancelButton
                onCancel={deleteDraft}
                testID={CONST.COMPOSER.TEST_ID.MESSAGE_EDIT_CANCEL_MAIN_COMPOSER}
            />
        </View>
    );
}

export default ComposerEditingButtons;
