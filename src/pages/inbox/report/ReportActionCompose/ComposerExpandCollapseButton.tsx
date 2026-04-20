import React from 'react';
import useIsScrollLikelyLayoutTriggered from '@hooks/useIsScrollLikelyLayoutTriggered';
import useOnyx from '@hooks/useOnyx';
import {setIsComposerFullSize} from '@userActions/Report';
import ONYXKEYS from '@src/ONYXKEYS';
import {useComposerSendState, useComposerState} from './ComposerContext';
import ExpandCollapseButton from './ExpandCollapseButton';

type ComposerExpandCollapseButtonProps = {
    reportID: string;
};

function ComposerExpandCollapseButton({reportID}: ComposerExpandCollapseButtonProps) {
    const {isBlockedFromConcierge} = useComposerSendState();
    const {raiseIsScrollLayoutTriggered} = useIsScrollLikelyLayoutTriggered();

    const [isComposerFullSize = false] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_IS_COMPOSER_FULL_SIZE}${reportID}`);
    const {isFullComposerAvailable} = useComposerState();

    return (
        <ExpandCollapseButton
            isFullComposerAvailable={isFullComposerAvailable}
            isComposerFullSize={isComposerFullSize}
            reportID={reportID}
            raiseIsScrollLikelyLayoutTriggered={raiseIsScrollLayoutTriggered}
            setIsComposerFullSize={setIsComposerFullSize}
            disabled={isBlockedFromConcierge}
        />
    );
}

export default ComposerExpandCollapseButton;
