import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import {PressableWithFeedback} from '@components/Pressable';
import Tooltip from '@components/Tooltip';
import useIsScrollLikelyLayoutTriggered from '@hooks/useIsScrollLikelyLayoutTriggered';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {setIsComposerFullSize} from '@userActions/Report';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {useComposerSendState, useComposerState} from './ComposerContext';

type ExpandCollapseComposerButtonProps = {
    reportID: string;
};

function ComposerExpandCollapseButton({reportID}: ExpandCollapseComposerButtonProps) {
    const {translate} = useLocalize();
    const theme = useTheme();
    const styles = useThemeStyles();
    const icons = useMemoizedLazyExpensifyIcons(['Collapse', 'Expand'] as const);

    const {isBlockedFromConcierge} = useComposerSendState();
    const {raiseIsScrollLayoutTriggered} = useIsScrollLikelyLayoutTriggered();

    const [isComposerFullSize = false] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_IS_COMPOSER_FULL_SIZE}${reportID}`);
    const {isFullComposerAvailable} = useComposerState();

    if (!isFullComposerAvailable && !isComposerFullSize) {
        return null;
    }

    const shouldCollapse = isComposerFullSize;
    const tooltipText = shouldCollapse ? translate('reportActionCompose.collapse') : translate('reportActionCompose.expand');
    const nextComposerFullSizeValue = !shouldCollapse;
    const iconSrc = shouldCollapse ? icons.Collapse : icons.Expand;
    const sentryLabel = shouldCollapse ? CONST.SENTRY_LABEL.REPORT.ATTACHMENT_PICKER_COLLAPSE_BUTTON : CONST.SENTRY_LABEL.REPORT.ATTACHMENT_PICKER_EXPAND_BUTTON;

    const expandCollapseComposerButtonStyles = [styles.flexGrow1, styles.flexShrink0];

    return (
        <View style={expandCollapseComposerButtonStyles}>
            <View>
                <Tooltip
                    text={tooltipText}
                    key={shouldCollapse ? 'composer-collapse' : 'composer-expand'}
                >
                    <PressableWithFeedback
                        onPress={(e) => {
                            e?.preventDefault();
                            raiseIsScrollLayoutTriggered();
                            setIsComposerFullSize(reportID, nextComposerFullSizeValue);
                        }}
                        // Keep focus on the composer when Collapse/Expand button is clicked.
                        onMouseDown={(e) => e.preventDefault()}
                        style={styles.composerSizeButton}
                        disabled={isBlockedFromConcierge}
                        role={CONST.ROLE.BUTTON}
                        accessibilityLabel={tooltipText}
                        sentryLabel={sentryLabel}
                    >
                        <Icon
                            fill={theme.icon}
                            src={iconSrc}
                        />
                    </PressableWithFeedback>
                </Tooltip>
            </View>
        </View>
    );
}

export default ComposerExpandCollapseButton;
