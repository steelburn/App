function getLeftOffset(x: number, leftInset: number, bigScreenLeftOffset: number, shouldUseNarrowLayout: boolean, isInLandscapeMode: boolean): number {
    if (shouldUseNarrowLayout) {
        return isInLandscapeMode ? x - leftInset : x;
    }
    return bigScreenLeftOffset;
}

export default getLeftOffset;
