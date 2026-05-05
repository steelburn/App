import React, {useMemo} from 'react';
import type {GestureResponderEvent} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {useLHNTooltipContext} from '@components/LHNOptionsList/LHNTooltipContext';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {useSession} from '@components/OnyxListItemProvider';
import {useProductTrainingContext} from '@components/ProductTrainingContext';
import EducationalTooltip from '@components/Tooltip/EducationalTooltip';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {isAdminRoom, isChatUsedForOnboarding as isChatUsedForOnboardingReportUtils, isConciergeChatReport} from '@libs/ReportUtils';
import type {OptionData} from '@libs/ReportUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {Report} from '@src/types/onyx';

type OptionRowTooltipLayerProps = {
    /** Report ID of the row */
    reportID: string | undefined;

    /** Report data of the row, used to determine onboarding eligibility */
    report: OnyxEntry<Report>;

    /** Concierge report ID, used to determine onboarding eligibility */
    conciergeReportID: string | undefined;

    /** Option data, used to forward pendingAction and errors to OfflineWithFeedback */
    optionItem: OptionData;

    /** Press handler forwarded to EducationalTooltip's onTooltipPress and exposed to children via renderChildren */
    onOptionPress: (event: GestureResponderEvent | KeyboardEvent | undefined) => void;

    /** Renders the row content. Receives a press handler that hides the product training tooltip before invoking onOptionPress. */
    renderChildren: (onPress: (event: GestureResponderEvent | KeyboardEvent | undefined) => void) => React.ReactNode;
};

type OptionRowTooltipLayerInnerProps = Pick<OptionRowTooltipLayerProps, 'onOptionPress' | 'renderChildren'>;

function OptionRowTooltipLayerInner({onOptionPress, renderChildren}: OptionRowTooltipLayerInnerProps) {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {isFullscreenVisible, isScreenFocused, isReportsSplitNavigatorLast} = useLHNTooltipContext();

    const {tooltipToRender, shouldShowTooltip} = useMemo(() => {
        // TODO: CONCIERGE_LHN_GBR tooltip will be replaced by a tooltip in the #admins room
        // https://github.com/Expensify/App/issues/57045#issuecomment-2701455668
        const tooltip = CONST.PRODUCT_TRAINING_TOOLTIP_NAMES.CONCIERGE_LHN_GBR;
        const shouldTooltipBeVisible = shouldUseNarrowLayout ? isScreenFocused && isReportsSplitNavigatorLast : isReportsSplitNavigatorLast && !isFullscreenVisible;

        return {
            tooltipToRender: tooltip,
            shouldShowTooltip: shouldTooltipBeVisible,
        };
    }, [isScreenFocused, shouldUseNarrowLayout, isReportsSplitNavigatorLast, isFullscreenVisible]);

    const {shouldShowProductTrainingTooltip, renderProductTrainingTooltip, hideProductTrainingTooltip} = useProductTrainingContext(tooltipToRender, shouldShowTooltip);

    const onPress = (event: GestureResponderEvent | KeyboardEvent | undefined) => {
        hideProductTrainingTooltip();
        onOptionPress(event);
    };

    return (
        <EducationalTooltip
            shouldRender={shouldShowProductTrainingTooltip}
            renderTooltipContent={renderProductTrainingTooltip}
            anchorAlignment={{
                horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
                vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP,
            }}
            shiftHorizontal={variables.gbrTooltipShiftHorizontal}
            shiftVertical={variables.gbrTooltipShiftVertical}
            wrapperStyle={styles.productTrainingTooltipWrapper}
            onTooltipPress={onPress}
            shouldHideOnScroll
        >
            {renderChildren(onPress)}
        </EducationalTooltip>
    );
}

OptionRowTooltipLayerInner.displayName = 'OptionRowTooltipLayerInner';

function OptionRowTooltipLayer({reportID, report, conciergeReportID, optionItem, onOptionPress, renderChildren}: OptionRowTooltipLayerProps) {
    const {firstReportIDWithGBRorRBR, onboardingPurpose, onboarding} = useLHNTooltipContext();
    const session = useSession();

    const shouldShowRBRorGBRTooltip = firstReportIDWithGBRorRBR === reportID;
    const isOnboardingGuideAssigned = onboardingPurpose === CONST.ONBOARDING_CHOICES.MANAGE_TEAM && !session?.email?.includes('+');
    const isChatUsedForOnboarding = isChatUsedForOnboardingReportUtils(report, onboarding, conciergeReportID, onboardingPurpose);
    const shouldShowGetStartedTooltip = isOnboardingGuideAssigned ? isAdminRoom(report) && isChatUsedForOnboarding : isConciergeChatReport(report);

    // Skip the inner component (and its heavy hooks) entirely when the row can never show a tooltip.
    const shouldEvaluateTooltip = shouldShowRBRorGBRTooltip || shouldShowGetStartedTooltip;

    return (
        <OfflineWithFeedback
            pendingAction={optionItem.pendingAction}
            errors={optionItem.allReportErrors}
            shouldShowErrorMessages={false}
            needsOffscreenAlphaCompositing
        >
            {shouldEvaluateTooltip ? (
                <OptionRowTooltipLayerInner
                    onOptionPress={onOptionPress}
                    renderChildren={renderChildren}
                />
            ) : (
                renderChildren(onOptionPress)
            )}
        </OfflineWithFeedback>
    );
}

OptionRowTooltipLayer.displayName = 'OptionRowTooltipLayer';

export default OptionRowTooltipLayer;
