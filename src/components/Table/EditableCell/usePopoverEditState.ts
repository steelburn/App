import {useEffect, useRef, useState} from 'react';
import type {View} from 'react-native';
import type {ValueOf} from 'type-fest';
import useWindowDimensions from '@hooks/useWindowDimensions';
import CONST from '@src/CONST';

type PopoverPosition = {
    horizontal: number;
    vertical: number;
};

type UsePopoverEditStateOptions = {
    /** Whether editing is currently permitted. When false, editing will be cancelled. */
    canEdit: boolean | undefined;

    /** Height of the popover content (used for overflow detection). Defaults to CONST.POPOVER_DATE_MAX_HEIGHT */
    popoverHeight?: number;

    /** Padding between the anchor and the popover */
    padding?: number;

    /**
     * Which horizontal edge of the anchor to use as the popover's x-origin.
     */
    anchorEdge?: ValueOf<typeof CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL>;

    /** Minimum height for the popover when space is limited. */
    minPopoverHeight?: number;
};

/**
 * Hook for managing popover-based editing state (date picker, category picker, etc.).
 *
 * Handles:
 *   - Anchor ref for popover positioning
 *   - measureInWindow-based position calculation
 *   - Overflow detection (inverts when too close to bottom)
 *   - Adaptive height calculation (shrinks popover when space is limited)
 *   - Auto-open after layout via InteractionManager
 *   - isEditing + isPopoverVisible toggling
 *   - Auto-cancel when canEdit becomes false
 */
function usePopoverEditState({
    canEdit,
    popoverHeight = CONST.POPOVER_DROPDOWN_MAX_HEIGHT,
    padding = CONST.MODAL.POPOVER_MENU_PADDING,
    anchorEdge = CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT,
    minPopoverHeight = CONST.POPOVER_MIN_ADJUSTED_HEIGHT,
}: UsePopoverEditStateOptions) {
    const {windowHeight} = useWindowDimensions();
    const anchorRef = useRef<View>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({horizontal: 0, vertical: 0});
    const [isInverted, setIsInverted] = useState(false);
    const [adjustedPopoverHeight, setAdjustedPopoverHeight] = useState(popoverHeight);

    const openPopover = () => {
        anchorRef.current?.measureInWindow((x, y, width, height) => {
            const availableSpaceBelow = windowHeight - (y + height + padding);
            const availableSpaceAbove = y - padding;

            const largerSpaceIsBelow = availableSpaceBelow >= availableSpaceAbove;
            const shouldInvert = !largerSpaceIsBelow;
            const availableSpace = largerSpaceIsBelow ? availableSpaceBelow : availableSpaceAbove;
            let finalHeight = popoverHeight;

            if (availableSpace >= popoverHeight) {
                finalHeight = popoverHeight;
            } else {
                // Not enough space — shrink to fit with buffer
                finalHeight = Math.max(Math.min(popoverHeight, availableSpace * CONST.POPOVER_ADAPTIVE_HEIGHT_BUFFER), minPopoverHeight);
            }

            setIsInverted(shouldInvert);
            setAdjustedPopoverHeight(finalHeight);
            setPopoverPosition({
                horizontal: anchorEdge === CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT ? x : x + width,
                vertical: y + (shouldInvert ? 0 : height + padding),
            });
            setIsPopoverVisible(true);
        });
    };

    const startEditing = () => {
        setIsEditing(true);
        // EditableCell renders conditionally based on isEditing, defer measurement until that render completes and the anchor is laid out
        requestAnimationFrame(() => {
            openPopover();
        });
    };

    const cancelEditing = () => {
        setIsPopoverVisible(false);
        setIsEditing(false);
    };

    // Cancel editing when permission is revoked (e.g., transaction status changed)
    useEffect(() => {
        if (canEdit || !isEditing) {
            return;
        }
        queueMicrotask(() => {
            cancelEditing();
        });
    }, [canEdit, isEditing]);

    return {
        isEditing,
        anchorRef,
        isPopoverVisible,
        popoverPosition,
        isInverted,
        adjustedPopoverHeight,
        startEditing,
        cancelEditing,
    };
}

export default usePopoverEditState;
