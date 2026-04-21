type LoadTestParameters = {
    multiplier?: number;
    expire?: string;
};

let loadTest: LoadTestParameters = {};

/**
 * Parses the X-Load-Test response header JSON and stores multiplier / expire for duplicate request generation.
 * Kept separate from LoadTest.ts so HttpUtils can import this without a circular dependency on HttpUtils.
 */
function setLoadTestParameters(headerString: string | null): void {
    if (!headerString) {
        loadTest = {};
        return;
    }
    try {
        loadTest = JSON.parse(headerString) as LoadTestParameters;
    } catch {
        loadTest = {};
    }
}

/**
 * Returns how many duplicate mock requests to send after each real request (multiplier - 1), or 0 when inactive or expired.
 */
function getDuplicateRequestCount(): number {
    const multiplier = loadTest.multiplier ?? 1;
    const expire = loadTest.expire;
    const expireTime = expire ? new Date(expire).getTime() : Number.NaN;
    if (multiplier > 1 && expire && Number.isFinite(expireTime) && Date.now() < expireTime) {
        return multiplier - 1;
    }
    return 0;
}

export {getDuplicateRequestCount, setLoadTestParameters};
