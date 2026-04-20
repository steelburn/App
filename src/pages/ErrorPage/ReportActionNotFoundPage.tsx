import React from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

// eslint-disable-next-line rulesdir/no-negated-variables
function ReportActionNotFoundPage() {
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    return (
        <ScreenWrapper testID="ReportActionNotFoundPage">
            <FullPageNotFoundView
                shouldShow
                subtitleKey="notFound.commentYouLookingForCannotBeFound"
                subtitleStyle={[styles.textSupporting]}
                shouldShowBackButton={shouldUseNarrowLayout}
                shouldShowLink
                linkTranslationKey="notFound.goToChatInstead"
                subtitleKeyBelowLink="notFound.contactConcierge"
                onLinkPress={() => {}}
                shouldDisplaySearchRouter
                onBackButtonPress={() => {}}
            />
        </ScreenWrapper>
    );
}

export default ReportActionNotFoundPage;
