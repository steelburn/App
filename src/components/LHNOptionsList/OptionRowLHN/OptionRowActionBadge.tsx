import React from 'react';
import {View} from 'react-native';
import Badge from '@components/Badge';
import Icon from '@components/Icon';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

type OptionRowActionBadgeProps = {
    severity: 'error' | 'info';
    actionBadgeText: string;
};

function OptionRowActionBadge({severity, actionBadgeText}: OptionRowActionBadgeProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {DotIndicator} = useMemoizedLazyExpensifyIcons(['DotIndicator']);

    if (severity === 'error') {
        return (
            <View style={[styles.alignItemsCenter, styles.justifyContentCenter]}>
                {actionBadgeText ? (
                    <Badge
                        text={actionBadgeText}
                        error
                        isStrong
                    />
                ) : (
                    <Icon
                        testID="RBR Icon"
                        src={DotIndicator}
                        fill={theme.danger}
                    />
                )}
            </View>
        );
    }

    return actionBadgeText ? (
        <Badge
            text={actionBadgeText}
            success
            isStrong
        />
    ) : (
        <View style={styles.ml2}>
            <Icon
                testID="GBR Icon"
                src={DotIndicator}
                fill={theme.success}
            />
        </View>
    );
}

OptionRowActionBadge.displayName = 'OptionRowActionBadge';

export default OptionRowActionBadge;
