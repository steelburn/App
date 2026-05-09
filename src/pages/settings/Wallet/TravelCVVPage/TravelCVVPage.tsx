import React, {useEffect} from 'react';
import {View} from 'react-native';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {useLockedAccountActions, useLockedAccountState} from '@components/LockedAccountModalProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {resetValidateActionCodeSent} from '@libs/actions/User';
import Clipboard from '@libs/Clipboard';
import Navigation from '@libs/Navigation/Navigation';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {useTravelCVVActions, useTravelCVVState} from './TravelCVVContextProvider';

/**
 * TravelCVVPage - Displays the Travel CVV reveal interface.
 * Shows a description of the travel card and allows users to reveal the CVV.
 * CVV is stored only in React Context state and never persisted in Onyx.
 */
function TravelCVVPage() {
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Copy']);

    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const {isAccountLocked} = useLockedAccountState();
    const {showLockedAccountModal} = useLockedAccountActions();

    // Get CVV from context - shared with TravelCVVVerifyAccountPage
    const {cvv} = useTravelCVVState();
    const {setCvv} = useTravelCVVActions();
    const hasRevealedCVV = !!cvv;

    const CVV_LENGTH = cvv?.length ?? 3;
    const MASKED_CVV = '•'.repeat(CVV_LENGTH);
    const cvvDigits = (cvv ?? MASKED_CVV).split('');

    // Clear CVV when the page unmounts (e.g. backdrop close) so it doesn't
    // remain visible the next time the page is opened
    useEffect(() => () => setCvv(null), [setCvv]);

    const isSignedInAsDelegate = !!account?.delegatedAccess?.delegate || false;

    const handleRevealDetailsPress = () => {
        if (isSignedInAsDelegate) {
            return;
        }
        if (isAccountLocked) {
            showLockedAccountModal();
            return;
        }

        // ValidateCodeActionContent only sends a magic code when validateCodeSent is false
        // so we need to reset it to ensure a code is always sent
        resetValidateActionCodeSent();
        // Navigate to the verify account page
        Navigation.navigate(ROUTES.SETTINGS_WALLET_TRAVEL_CVV_VERIFY_ACCOUNT);
    };

    let actionButton: React.ReactNode = null;
    if (hasRevealedCVV) {
        actionButton = (
            <Button
                icon={icons.Copy}
                text={translate('cardPage.cardDetails.copyCvv')}
                onPress={() => Clipboard.setString(cvv)}
                style={[styles.mt10, styles.w100]}
            />
        );
    } else if (!isSignedInAsDelegate) {
        actionButton = (
            <Button
                text={translate('cardPage.cardDetails.revealDetails')}
                onPress={handleRevealDetailsPress}
                isDisabled={isOffline}
                style={[styles.mt10, styles.w100]}
                success
            />
        );
    }

    return (
        <ScreenWrapper
            testID="TravelCVVPage"
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButton
                title={translate('walletPage.travelCVV.title')}
                shouldShowBackButton
            />
            <FullPageOfflineBlockingView>
                <ScrollView contentContainerStyle={[styles.flexGrow1, styles.ph5]}>
                    <View style={[styles.mt5, styles.mb8]}>
                        <Text style={[styles.textNormal, styles.textSupporting]}>{translate('walletPage.travelCVV.description')}</Text>
                    </View>

                    <View style={[styles.mt0Half, styles.flexRow, styles.justifyContentCenter, styles.gap1]}>
                        {cvvDigits.map((digit, index) => (
                            <View
                                // eslint-disable-next-line react/no-array-index-key -- CVV digits are a fixed-length display-only array that is never reordered
                                key={`${digit}-${index}`}
                                style={[styles.alignItemsCenter, styles.justifyContentCenter, styles.travelCVVDigitBox]}
                            >
                                <Text style={[styles.textXXXLarge, styles.travelCVVDigitText, hasRevealedCVV ? styles.travelCVVDigitTextRevealed : styles.travelCVVDigitTextMasked]}>
                                    {digit}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {actionButton}
                </ScrollView>
            </FullPageOfflineBlockingView>
        </ScreenWrapper>
    );
}

export default TravelCVVPage;
