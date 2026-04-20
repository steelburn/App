import React from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';
import Navigation from '@libs/Navigation/Navigation';

// eslint-disable-next-line rulesdir/no-negated-variables
function ReportActionNotFoundPage() {
    return (
        <ScreenWrapper testID="ReportActionNotFoundPage">
            <FullPageNotFoundView
                shouldShow
                onBackButtonPress={() => Navigation.goBack()}
            />
        </ScreenWrapper>
    );
}

export default ReportActionNotFoundPage;
