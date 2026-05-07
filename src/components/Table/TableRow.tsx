import React from 'react';
import PressableWithFeedback, {PressableWithFeedbackProps} from '@components/Pressable/PressableWithFeedback';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import {useTableContext} from './TableContext';

type TableRowProps = Omit<PressableWithFeedbackProps, 'accessible'> & {
    /** When true, indicates that the view is an accessibility element.  By default, all the rows are accessible. */
    accessible?: boolean;

    /** Whether or not the table row is pressable or not */
    interactive: boolean;

    /** The index of the row in the table */
    rowIndex: number;
};

export default function TableRow({children, accessible, rowIndex, interactive, onPress, ...props}: TableRowProps) {
    const styles = useThemeStyles();
    const {processedData} = useTableContext();
    const {shouldUseNarrowLayout, isMediumScreenWidth} = useResponsiveLayout();

    const rowCount = processedData.length;
    const isFirstRow = rowIndex === 0;
    const isLastRow = rowIndex === rowCount - 1;
    const isSmallView = isMediumScreenWidth || shouldUseNarrowLayout;

    const tableRowStyles = [
        styles.mh5,
        styles.flexRow,
        styles.highlightBG,
        styles.overflowHidden,
        styles.alignItemsCenter,
        isSmallView ? styles.pv4 : styles.pv2,
        isSmallView ? styles.ph4 : styles.ph3,
        isSmallView ? styles.tableRowHeightCompact : styles.tableRowHeight,
        isSmallView && isFirstRow && styles.tableTopRadius,
        isLastRow ? styles.tableBottomRadius : styles.borderBottom,
    ];

    return (
        <PressableWithFeedback
            accessible
            accessibilityLabel="row"
            style={tableRowStyles}
            interactive={interactive}
            pressDimmingValue={interactive ? undefined : 1}
            hoverStyle={interactive && styles.hoveredComponentBG}
            role={interactive ? CONST.ROLE.BUTTON : CONST.ROLE.PRESENTATION}
            onPress={onPress}
            {...props}
        >
            {children}
        </PressableWithFeedback>
    );
}
