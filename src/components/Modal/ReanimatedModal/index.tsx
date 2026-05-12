import noop from 'lodash/noop';
import React, {useEffect, useEffectEvent, useRef, useState} from 'react';
import type {NativeEventSubscription, ViewStyle} from 'react-native';
// eslint-disable-next-line no-restricted-imports
import {BackHandler, InteractionManager, Modal, StyleSheet, View} from 'react-native';
import {LayoutAnimationConfig} from 'react-native-reanimated';
import FocusTrapForModal from '@components/FocusTrap/FocusTrapForModal';
import KeyboardAvoidingView from '@components/KeyboardAvoidingView';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import blurActiveElement from '@libs/Accessibility/blurActiveElement';
import getPlatform from '@libs/getPlatform';
// eslint-disable-next-line no-restricted-imports
import TransitionTracker from '@libs/Navigation/TransitionTracker';
// eslint-disable-next-line no-restricted-imports
import type {TransitionHandle} from '@libs/Navigation/TransitionTracker';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import Backdrop from './Backdrop';
import Container from './Container';
import type ReanimatedModalProps from './types';

function ReanimatedModal({
    testID,
    animationInDelay,
    animationInTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_OUT,
    animationIn = 'fadeIn',
    animationOut = 'fadeOut',
    avoidKeyboard = false,
    coverScreen = true,
    children,
    hasBackdrop = true,
    backdropColor = 'black',
    backdropOpacity = variables.overlayOpacity,
    customBackdrop = null,
    isVisible = false,
    onModalWillShow = noop,
    onModalShow = noop,
    onModalWillHide = noop,
    onModalHide = noop,
    onDismiss,
    onBackdropPress = noop,
    onBackButtonPress = noop,
    style,
    type,
    statusBarTranslucent = false,
    onSwipeComplete,
    swipeDirection,
    swipeThreshold,
    shouldPreventScrollOnFocus,
    initialFocus,
    shouldIgnoreBackHandlerDuringTransition = false,
    shouldEnableNewFocusManagement,
    shouldReturnFocus,
    ...props
}: ReanimatedModalProps) {
    const [isContainerOpen, setIsContainerOpen] = useState(false);
    const isTransitioning = isVisible !== isContainerOpen;
    const {windowWidth, windowHeight} = useWindowDimensions();

    const backHandlerListener = useRef<NativeEventSubscription | null>(null);
    const handleRef = useRef<number | undefined>(undefined);
    const transitionHandleRef = useRef<TransitionHandle | null>(null);

    const styles = useThemeStyles();

    const onBackButtonPressHandler = () => {
        if (shouldIgnoreBackHandlerDuringTransition && isVisible !== isContainerOpen) {
            return false;
        }
        if (isVisible) {
            onBackButtonPress();
            return true;
        }
        return false;
    };

    const handleEscape = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || onBackButtonPressHandler() !== true) {
            return;
        }
        e.stopImmediatePropagation();
    };

    useEffect(() => {
        if (getPlatform() === CONST.PLATFORM.WEB) {
            document.body.addEventListener('keyup', handleEscape, {capture: true});
        } else {
            backHandlerListener.current = BackHandler.addEventListener('hardwareBackPress', onBackButtonPressHandler);
        }

        return () => {
            if (getPlatform() === CONST.PLATFORM.WEB) {
                document.body.removeEventListener('keyup', handleEscape, {capture: true});
            } else {
                backHandlerListener.current?.remove();
            }
        };
    }, [handleEscape, onBackButtonPressHandler]);

    useEffect(() => {
        if (isVisible !== isContainerOpen) {
            handleRef.current = InteractionManager.createInteractionHandle();
            transitionHandleRef.current = TransitionTracker.startTransition();
        }

        return () => {
            if (handleRef.current) {
                InteractionManager.clearInteractionHandle(handleRef.current);
                handleRef.current = undefined;
            }
            if (transitionHandleRef.current) {
                TransitionTracker.endTransition(transitionHandleRef.current);
                transitionHandleRef.current = null;
            }
        };
    }, [isVisible, isContainerOpen]);

    const fireTransitionCallbacks = useEffectEvent(() => {
        if (isVisible && !isContainerOpen) {
            onModalWillShow();
        } else if (!isVisible && isContainerOpen) {
            onModalWillHide();
            blurActiveElement();
        }
    });

    useEffect(() => {
        fireTransitionCallbacks();
    }, [isVisible, isContainerOpen]);

    const backdropStyle: ViewStyle = {width: windowWidth, height: windowHeight, backgroundColor: backdropColor};

    const onOpenCallBack = () => {
        setIsContainerOpen(true);
        if (handleRef.current) {
            InteractionManager.clearInteractionHandle(handleRef.current);
            handleRef.current = undefined;
        }
        if (transitionHandleRef.current) {
            TransitionTracker.endTransition(transitionHandleRef.current);
            transitionHandleRef.current = null;
        }
        onModalShow();
    };

    const onCloseCallBack = () => {
        setIsContainerOpen(false);
        if (handleRef.current) {
            InteractionManager.clearInteractionHandle(handleRef.current);
            handleRef.current = undefined;
        }
        if (transitionHandleRef.current) {
            TransitionTracker.endTransition(transitionHandleRef.current);
            transitionHandleRef.current = null;
        }

        // Because on Android, the Modal's onDismiss callback does not work reliably. There's a reported issue at:
        // https://stackoverflow.com/questions/58937956/react-native-modal-ondismiss-not-invoked
        // Therefore, we manually call onModalHide() here for Android.
        if (getPlatform() === CONST.PLATFORM.ANDROID) {
            onModalHide();
        }
    };

    const modalStyle = {zIndex: StyleSheet.flatten(style)?.zIndex};

    const containerView = (
        <Container
            pointerEvents="box-none"
            animationInTiming={animationInTiming}
            animationOutTiming={animationOutTiming}
            animationInDelay={animationInDelay}
            onOpenCallBack={onOpenCallBack}
            onCloseCallBack={onCloseCallBack}
            animationIn={animationIn}
            animationOut={animationOut}
            style={style}
            type={type}
            onSwipeComplete={onSwipeComplete}
            swipeDirection={swipeDirection}
        >
            {children}
        </Container>
    );

    const backdropView = (
        <Backdrop
            isBackdropVisible={isVisible}
            style={backdropStyle}
            customBackdrop={customBackdrop}
            onBackdropPress={onBackdropPress}
            animationInTiming={animationInTiming}
            animationOutTiming={animationOutTiming}
            animationInDelay={animationInDelay}
            backdropOpacity={backdropOpacity}
        />
    );

    if (!coverScreen && isVisible) {
        return (
            <View
                pointerEvents="box-none"
                style={[styles.modalBackdrop, styles.modalContainerBox]}
            >
                {hasBackdrop && backdropView}
                {containerView}
            </View>
        );
    }
    const isBackdropMounted = isVisible || (isTransitioning && getPlatform() === CONST.PLATFORM.WEB);
    const modalVisibility = isVisible || isTransitioning;
    return (
        <LayoutAnimationConfig skipExiting={getPlatform() !== CONST.PLATFORM.WEB}>
            <Modal
                transparent
                animationType="none"
                visible={modalVisibility}
                onRequestClose={onBackButtonPressHandler}
                statusBarTranslucent={statusBarTranslucent}
                testID={testID}
                onDismiss={() => {
                    onDismiss?.();
                    if (getPlatform() !== CONST.PLATFORM.ANDROID) {
                        onModalHide();
                    }
                }}
                style={modalStyle}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
            >
                {isBackdropMounted && hasBackdrop && backdropView}
                {avoidKeyboard ? (
                    <KeyboardAvoidingView
                        behavior="padding"
                        pointerEvents="box-none"
                        style={[style, {margin: 0}]}
                    >
                        {isVisible && containerView}
                    </KeyboardAvoidingView>
                ) : (
                    <FocusTrapForModal
                        active={modalVisibility}
                        initialFocus={initialFocus}
                        shouldReturnFocus={shouldReturnFocus ?? !shouldEnableNewFocusManagement}
                        shouldPreventScroll={shouldPreventScrollOnFocus}
                    >
                        {isVisible && containerView}
                    </FocusTrapForModal>
                )}
            </Modal>
        </LayoutAnimationConfig>
    );
}

export default ReanimatedModal;
