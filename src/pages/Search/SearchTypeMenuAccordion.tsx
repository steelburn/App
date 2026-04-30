import React, {useState} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedReaction, withTiming} from 'react-native-reanimated';
import {useAnimatedStyle} from 'react-native-reanimated';
import {useSharedValue} from 'react-native-reanimated';
import Accordion from '@components/Accordion';
import Badge from '@components/Badge';
import Icon from '@components/Icon';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';
import useAccordionAnimation from '@hooks/useAccordionAnimation';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import type ChildrenProps from '@src/types/utils/ChildrenProps';
import variables from '@styles/variables';

type SearchTypeMenuAccordionProps = ChildrenProps & {
    title: string;
    defaultExpanded?: boolean;
    badgeText?: string;
};

function getBadgeOpacity(isExpanded: boolean) {
    return Number(!isExpanded);
}

function getBadgeOffsetY(isExpanded: boolean): `${number}%` | number {
    return isExpanded ? '50%' : 0;
}

function getArrowRotation(isExpanded: boolean) {
    return isExpanded ? 0 : 180;
}

function SearchTypeMenuAccordion({title, defaultExpanded = true, badgeText, children}: SearchTypeMenuAccordionProps) {
    const icons = useMemoizedLazyExpensifyIcons(['UpArrow']);
    const theme = useTheme();
    const styles = useThemeStyles();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const {isAccordionExpanded, shouldAnimateAccordionSection} = useAccordionAnimation(isExpanded);

    const toggleSection = () => {
        setIsExpanded((prevIsExpanded) => !prevIsExpanded);
    };

    const badgeOpacity = useSharedValue(!!badgeText ? getBadgeOpacity(defaultExpanded) : 0);
    const badgeOffsetY = useSharedValue(!!badgeText ? getBadgeOffsetY(defaultExpanded) : 0);
    const arrowRotation = useSharedValue(getArrowRotation(defaultExpanded));

    useAnimatedReaction(
        () => isAccordionExpanded.get(),
        (isExpanded) => {
            if (badgeText) {
                badgeOpacity.set(withTiming(getBadgeOpacity(isExpanded), {duration: CONST.ANIMATED_TRANSITION}));
                badgeOffsetY.set(withTiming(getBadgeOffsetY(isExpanded), {duration: CONST.ANIMATED_TRANSITION}));
            }

            const rotateDegree = getArrowRotation(isExpanded);
            arrowRotation.set(withTiming(rotateDegree, {duration: CONST.ANIMATED_TRANSITION}));
        },
    );

    const badgeAnimatedStyle = useAnimatedStyle(() => ({
        opacity: badgeOpacity.get(),
        transform: [{translateY: badgeOffsetY.get()}],
    }));
    const arrowAnimatedStyle = useAnimatedStyle(() => ({transform: [{rotate: `${arrowRotation.get()}deg`}]}));

    return (
        <View>
            <PressableWithFeedback
                onPress={toggleSection}
                style={[styles.flexRow, styles.p2, styles.gap1, styles.alignItemsCenter, styles.br2]}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={title}
                sentryLabel={CONST.SENTRY_LABEL.ACCORDION_SECTION.TOGGLE}
                hoverStyle={styles.activeComponentBG}
            >
                <Text
                    style={[styles.flex1, styles.textLabelSupporting]}
                    accessibilityRole={CONST.ROLE.HEADER}
                >
                    {title}
                </Text>
                {!!badgeText && (
                    <Animated.View style={[badgeAnimatedStyle]}>
                        <Badge
                            text={badgeText}
                            badgeStyles={styles.todoBadge}
                            success
                        />
                    </Animated.View>
                )}
                <Animated.View style={[arrowAnimatedStyle]}>
                    <Icon
                        fill={theme.icon}
                        src={icons.UpArrow}
                        width={variables.iconSizeSemiSmall}
                        height={variables.iconSizeSemiSmall}
                    />
                </Animated.View>
            </PressableWithFeedback>
            <Accordion
                isExpanded={isAccordionExpanded}
                isToggleTriggered={shouldAnimateAccordionSection}
            >
                {children}
            </Accordion>
        </View>
    );
}

export default SearchTypeMenuAccordion;
