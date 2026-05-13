import React, {useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import Icon from '@components/Icon';
import Modal from '@components/Modal';
import type {ModalProps} from '@components/Modal/Global/ModalContext';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type {GustoSyncResult, GustoSyncResultUser} from '@libs/API/GustoSyncResult';
import CONST from '@src/CONST';

type GustoSyncResultsModalProps = ModalProps & {
    /** Sync result returned by the completed Gusto sync job */
    result: GustoSyncResult;
};

function getResultCount(users?: GustoSyncResultUser[]) {
    return users?.length ?? 0;
}

function GustoSyncResultsModal({result, closeModal}: GustoSyncResultsModalProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow', 'Sync']);
    const illustrations = useMemoizedLazyIllustrations(['NewUser']);
    const [isSkippedSectionExpanded, setIsSkippedSectionExpanded] = useState(false);

    const addedCount = getResultCount(result.added);
    const removedCount = getResultCount(result.removed);
    const skippedCount = getResultCount(result.skipped);
    const closeResultsModal = () => closeModal();

    const renderResultSummary = (label: string, count: number) => (
        <View style={[styles.mb6]}>
            <Text style={[styles.textSupporting, styles.mb1]}>{label}</Text>
            <Text style={[styles.textNormalThemeText, styles.textStrong]}>{translate('workspace.hr.gusto.syncResults.employeeCount', {count})}</Text>
        </View>
    );

    return (
        <Modal
            type={CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED}
            isVisible
            onClose={closeResultsModal}
            shouldHandleNavigationBack
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <ScreenWrapper
                includePaddingTop={false}
                enableEdgeToEdgeBottomSafeAreaPadding
                testID="GustoSyncResultsModal"
            >
                <HeaderWithBackButton
                    title={translate('workspace.hr.gusto.syncResults.title')}
                    onBackButtonPress={closeResultsModal}
                />
                <ScrollView contentContainerStyle={[styles.flexGrow1, styles.ph5]}>
                    <View style={[styles.alignItemsCenter, styles.mt8, styles.mb8, styles.pRelative]}>
                        <Icon
                            src={illustrations.NewUser}
                            width={88}
                            height={88}
                        />
                        <View style={[styles.pAbsolute, styles.rn3, styles.b0]}>
                            <Icon
                                src={icons.Sync}
                                fill={theme.success}
                                width={36}
                                height={36}
                            />
                        </View>
                    </View>
                    <Text style={[styles.textHeadlineH1, styles.mb8]}>{translate('workspace.hr.gusto.syncResults.successTitle')}</Text>
                    {renderResultSummary(translate('workspace.hr.gusto.syncResults.added'), addedCount)}
                    {renderResultSummary(translate('workspace.hr.gusto.syncResults.removed'), removedCount)}
                    <PressableWithoutFeedback
                        accessibilityLabel={translate('workspace.hr.gusto.syncResults.skipped')}
                        role={CONST.ROLE.BUTTON}
                        onPress={() => setIsSkippedSectionExpanded((isExpanded) => !isExpanded)}
                        style={[styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter]}
                    >
                        <View>
                            <Text style={[styles.textSupporting, styles.mb1]}>{translate('workspace.hr.gusto.syncResults.skipped')}</Text>
                            <Text style={[styles.textNormalThemeText, styles.textStrong]}>{translate('workspace.hr.gusto.syncResults.employeeCount', {count: skippedCount})}</Text>
                        </View>
                        <Icon
                            src={icons.DownArrow}
                            fill={theme.icon}
                            additionalStyles={isSkippedSectionExpanded ? {transform: [{rotate: '180deg'}]} : undefined}
                        />
                    </PressableWithoutFeedback>
                    {isSkippedSectionExpanded &&
                        result.skipped?.map((user) => (
                            <View
                                key={user.email}
                                style={[styles.mt4]}
                            >
                                <Text style={[styles.textNormalThemeText, styles.textStrong]}>{user.displayName ?? user.email}</Text>
                                <Text style={[styles.textSupporting]}>{user.reason}</Text>
                            </View>
                        ))}
                </ScrollView>
                <FixedFooter>
                    <Button
                        large
                        success
                        text={translate('common.buttonConfirm')}
                        onPress={closeResultsModal}
                    />
                </FixedFooter>
            </ScreenWrapper>
        </Modal>
    );
}

export default GustoSyncResultsModal;
