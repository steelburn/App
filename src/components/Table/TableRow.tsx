import PressableWithFeedback, {PressableWithFeedbackProps} from '@components/Pressable/PressableWithFeedback';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

type TableRowProps = Omit<PressableWithFeedbackProps, 'accessible'> & {
    /** When true, indicates that the view is an accessibility element.  By default, all the rows are accessible. */
    accessible?: boolean;

    /** Whether or not the table row is pressable or not */
    interactive: boolean;

    /** Whether this row is the last row in the table */
    isLastRow: boolean;
};

export default function TableRow({children, accessible, isLastRow, interactive, onPress, ...props}: TableRowProps) {
    const styles = useThemeStyles();

    const tableRowStyles = [
        styles.mh5,
        styles.flexRow,
        styles.highlightBG,
        styles.overflowHidden,
        styles.ph3,
        styles.tableRowHeight,
        styles.alignItemsCenter,
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
