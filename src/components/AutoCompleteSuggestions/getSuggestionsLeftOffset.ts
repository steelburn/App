import type {EdgeInsets} from 'react-native-safe-area-context';

function getLeftOffset(
    x: number,
    insets: EdgeInsets,
    bigScreenLeftOffset: number,
    shouldUseNarrowLayout: boolean,
    menuWidth: number,
    windowWidth: number,
    isInLandscapeMode: boolean,
): number {
    if (isInLandscapeMode) {
        // Some Android devices have issue where they add insets.left to x value, so we need to subtract it to get the correct left offset.
        if (x + insets.left + insets.right + menuWidth > windowWidth) {
            return x - insets.left;
        }

        return x;
    }

    if (shouldUseNarrowLayout) {
        return x;
    }

    return bigScreenLeftOffset;
}

export default getLeftOffset;
