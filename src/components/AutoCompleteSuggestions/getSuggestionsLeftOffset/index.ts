// leftInset and isInLandscapeMode are only needed to calculate the left offset for the suggestions menu on iOS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getLeftOffset(x: number, leftInset: number, bigScreenLeftOffset: number, shouldUseNarrowLayout: boolean, isInLandscapeMode: boolean): number {
    if (shouldUseNarrowLayout) {
        return x;
    }
    return bigScreenLeftOffset;
}

export default getLeftOffset;
