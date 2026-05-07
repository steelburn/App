import PressableWithFeedback, {PressableWithFeedbackProps} from '@components/Pressable/PressableWithFeedback';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

type TableRowProps = PressableWithFeedbackProps & {
    /** Whether this row is the last row in the table */
    isLastRow?: boolean;
};

export default function TableRow({children, isLastRow, onPress, ...props}: TableRowProps) {
    const styles = useThemeStyles();
    const isPressable = onPress !== undefined;

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
            accessibilityLabel="row"
            style={tableRowStyles}
            interactive={isPressable}
            pressDimmingValue={isPressable ? undefined : 1}
            hoverStyle={isPressable && styles.hoveredComponentBG}
            role={isPressable ? CONST.ROLE.BUTTON : CONST.ROLE.PRESENTATION}
            onPress={onPress}
            {...props}
        >
            {children}
        </PressableWithFeedback>
    );
}
