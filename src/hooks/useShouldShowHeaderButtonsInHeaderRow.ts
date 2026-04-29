import useResponsiveLayout from './useResponsiveLayout';

/**
 * Returns true if the header buttons should be shown in the header row (desktop + mobile in landscape mode)
 */
function useShouldShowHeaderButtonsInHeaderRow() {
    const {shouldUseNarrowLayout, isInLandscapeMode} = useResponsiveLayout();
    return !shouldUseNarrowLayout || isInLandscapeMode;
}

export default useShouldShowHeaderButtonsInHeaderRow;
