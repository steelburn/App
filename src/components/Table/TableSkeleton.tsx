import React from 'react';
import {View} from 'react-native';
import SkeletonViewContentLoader from '@components/SkeletonViewContentLoader';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useSkeletonSpan, {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import variables from '@styles/variables';

type TableSkeletonProps = {
    /** The number of skeleton rows to render */
    rowCount?: number;

    /** The reason attributes for the skeleton */
    reasonAttributes: SkeletonSpanReasonAttributes;

    /** The element to render within the table row as a skeleton */
    renderSkeletonItem: () => React.ReactNode;
};

export default function TableSkeleton({renderSkeletonItem, reasonAttributes, rowCount = 5}: TableSkeletonProps) {
    useSkeletonSpan('TableSkeleton', reasonAttributes);

    const theme = useTheme();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout, isMediumScreenWidth} = useResponsiveLayout();

    const isSmallView = isMediumScreenWidth || shouldUseNarrowLayout;

    const tableSkeletonRowStyles = [
        styles.flexRow,
        styles.overflowHidden,
        styles.alignItemsCenter,
        styles.highlightBG,
        isSmallView ? styles.ph4 : styles.ph3,
        isSmallView ? styles.tableRowHeightCompact : styles.tableRowHeight,
    ];

    const rows = new Array(rowCount).fill(null).map((_, index) => (
        <View
            key={index}
            style={[tableSkeletonRowStyles, index !== rowCount - 1 && styles.borderBottom]}
        >
            <SkeletonViewContentLoader
                backgroundColor={theme.skeletonLHNIn}
                foregroundColor={theme.skeletonLHNOut}
                height={isSmallView ? variables.tableRowHeightCompact : variables.tableRowHeight}
            >
                {renderSkeletonItem()}
            </SkeletonViewContentLoader>
        </View>
    ));

    return <View style={[styles.flex1, styles.m5, styles.tableBottomRadius, styles.overflowHidden, styles.tableTopRadius]}>{rows}</View>;
}
