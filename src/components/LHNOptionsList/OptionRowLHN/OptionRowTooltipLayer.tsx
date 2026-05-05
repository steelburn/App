import type {RefObject} from 'react';
import React, {useCallback, useMemo} from 'react';
import type {GestureResponderEvent, View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {useLHNTooltipContext} from '@components/LHNOptionsList/LHNTooltipContext';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {useSession} from '@components/OnyxListItemProvider';
import {useProductTrainingContext} from '@components/ProductTrainingContext';
import EducationalTooltip from '@components/Tooltip/EducationalTooltip';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {isAdminRoom, isChatUsedForOnboarding as isChatUsedForOnboardingReportUtils, isConciergeChatReport} from '@libs/ReportUtils';
import type {OptionData} from '@libs/ReportUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {OptionRowLHNCorePressHandler} from './OptionRowPressable';
import {useOptionRowLHNCorePress} from './OptionRowPressable';

type OptionRowTooltipLayerProps = {
    /** Report ID of the row */
    reportID: string;

    /** Report data of the row, used to determine onboarding eligibility */
    report: OnyxEntry<Report>;

    /** Option data, used to forward pendingAction and errors to OfflineWithFeedback */
    optionItem: OptionData;

    /** Selection handler forwarded into core press behavior */
    onSelectRow: (optionItem: OptionData, popoverAnchor: RefObject<View | null>) => void;

    popoverAnchor: RefObject<View | null>;

    /** Renders pressable row content with the resolved press handler (tooltip hide + core press when applicable). */
    renderChildren: (onPress: OptionRowLHNCorePressHandler) => React.ReactNode;
};

type OptionRowTooltipLayerInnerProps = {
    corePress: OptionRowLHNCorePressHandler;
    renderChildren: (onPress: OptionRowLHNCorePressHandler) => React.ReactNode;
};

function OptionRowTooltipLayerInner({corePress, renderChildren}: OptionRowTooltipLayerInnerProps) {
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

    const wrappedPress = useCallback(
        (event: GestureResponderEvent | KeyboardEvent | undefined) => {
            hideProductTrainingTooltip();
            corePress(event);
        },
        [hideProductTrainingTooltip, corePress],
    );

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
            onTooltipPress={wrappedPress}
            shouldHideOnScroll
        >
            {renderChildren(wrappedPress)}
        </EducationalTooltip>
    );
}

OptionRowTooltipLayerInner.displayName = 'OptionRowTooltipLayerInner';

function OptionRowTooltipLayer({reportID, report, optionItem, onSelectRow, popoverAnchor, renderChildren}: OptionRowTooltipLayerProps) {
    const {firstReportIDWithGBRorRBR, onboardingPurpose, onboarding} = useLHNTooltipContext();
    const session = useSession();
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);

    const shouldShowRBRorGBRTooltip = firstReportIDWithGBRorRBR === reportID;
    const isOnboardingGuideAssigned = onboardingPurpose === CONST.ONBOARDING_CHOICES.MANAGE_TEAM && !session?.email?.includes('+');
    const isChatUsedForOnboarding = isChatUsedForOnboardingReportUtils(report, onboarding, conciergeReportID, onboardingPurpose);
    const shouldShowGetStartedTooltip = isOnboardingGuideAssigned ? isAdminRoom(report) && isChatUsedForOnboarding : isConciergeChatReport(report);

    // Skip the inner component (and its heavy hooks) entirely when the row can never show a tooltip.
    const shouldEvaluateTooltip = shouldShowRBRorGBRTooltip || shouldShowGetStartedTooltip;

    const corePress = useOptionRowLHNCorePress({
        reportID,
        optionItem,
        popoverAnchor,
        onSelectRow,
    });

    return (
        <OfflineWithFeedback
            pendingAction={optionItem.pendingAction}
            errors={optionItem.allReportErrors}
            shouldShowErrorMessages={false}
            needsOffscreenAlphaCompositing
        >
            {shouldEvaluateTooltip ? (
                <OptionRowTooltipLayerInner
                    corePress={corePress}
                    renderChildren={renderChildren}
                />
            ) : (
                renderChildren(corePress)
            )}
        </OfflineWithFeedback>
    );
}

OptionRowTooltipLayer.displayName = 'OptionRowTooltipLayer';

export default OptionRowTooltipLayer;
