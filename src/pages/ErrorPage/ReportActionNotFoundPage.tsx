import {useNavigation, useRoute} from '@react-navigation/core';
import React from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import useThemeStyles from '@hooks/useThemeStyles';
import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

// eslint-disable-next-line rulesdir/no-negated-variables
function ReportActionNotFoundPage() {
    const styles = useThemeStyles();
    const route = useRoute();
    const navigation = useNavigation();

    const routeParams = route.params as {reportID?: string; reportActionID?: string} | undefined;
    const reportIDFromRoute = getNonEmptyStringOnyxID(routeParams?.reportID);

    const goBackToReport = () => Navigation.goBack(ROUTES.REPORT_WITH_ID.getRoute(reportIDFromRoute));
    const goBack = () => (navigation.canGoBack() ? Navigation.goBack() : goBackToReport());

    return (
        <ScreenWrapper testID="ReportActionNotFoundPage">
            <FullPageNotFoundView
                shouldShow
                subtitleKey="notFound.commentYouLookingForCannotBeFound"
                subtitleStyle={[styles.textSupporting]}
                shouldShowLink
                linkTranslationKey="notFound.goToChatInstead"
                subtitleKeyBelowLink="notFound.contactConcierge"
                onLinkPress={goBackToReport}
                shouldDisplaySearchRouter
                onBackButtonPress={goBack}
            />
        </ScreenWrapper>
    );
}

export default ReportActionNotFoundPage;
