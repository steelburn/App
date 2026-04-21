import {getDuplicateRequestCount, setLoadTestParameters} from '@libs/Network/LoadTestState';

const FUTURE = '2099-01-01T00:00:00';
const PAST = '2000-01-01T00:00:00';

describe('LoadTestState', () => {
    beforeEach(() => {
        setLoadTestParameters(null);
    });

    describe('setLoadTestParameters', () => {
        it('parses a valid JSON header and stores multiplier/expire', () => {
            // Given a valid X-Load-Test JSON payload with multiplier 5 and a future expiry
            // When we set it on the load-test state
            setLoadTestParameters(JSON.stringify({multiplier: 5, expire: FUTURE}));

            // Then getDuplicateRequestCount returns multiplier - 1
            expect(getDuplicateRequestCount()).toBe(4);
        });

        it('clears state when given a null header', () => {
            // Given an active load-test configuration
            setLoadTestParameters(JSON.stringify({multiplier: 5, expire: FUTURE}));
            expect(getDuplicateRequestCount()).toBe(4);

            // When we receive a response with no X-Load-Test header (null)
            setLoadTestParameters(null);

            // Then load testing is turned off
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('clears state when given an empty string', () => {
            // Given an active load-test configuration
            setLoadTestParameters(JSON.stringify({multiplier: 5, expire: FUTURE}));

            // When we receive an empty header value
            setLoadTestParameters('');

            // Then load testing is turned off
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('resets state when JSON is malformed', () => {
            // Given an active load-test configuration
            setLoadTestParameters(JSON.stringify({multiplier: 5, expire: FUTURE}));

            // When the next response carries an unparseable X-Load-Test header
            setLoadTestParameters('not-json');

            // Then load testing is turned off (we should never crash on bad JSON)
            expect(getDuplicateRequestCount()).toBe(0);
        });
    });

    describe('getDuplicateRequestCount', () => {
        it('returns 0 when no parameters have been set', () => {
            // Given a fresh state with no X-Load-Test ever received
            // When we ask for the duplicate count
            // Then no duplicates should fire
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns 0 when multiplier is 1', () => {
            // Given a load-test configuration with multiplier 1 (i.e. just the real request, no duplicates)
            setLoadTestParameters(JSON.stringify({multiplier: 1, expire: FUTURE}));

            // When we ask for the duplicate count
            // Then no duplicates should fire
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns 0 when multiplier is missing even if expire is in the future', () => {
            // Given a load-test payload that only has expire and no multiplier
            setLoadTestParameters(JSON.stringify({expire: FUTURE}));

            // When we ask for the duplicate count
            // Then no duplicates should fire (a missing multiplier is treated as 1)
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns 0 when expire is in the past', () => {
            // Given a load-test payload whose expire timestamp has already passed
            setLoadTestParameters(JSON.stringify({multiplier: 10, expire: PAST}));

            // When we ask for the duplicate count
            // Then duplicates should NOT fire (this is the DDOS-protection guarantee)
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns 0 when expire is missing', () => {
            // Given a load-test payload with multiplier but no expire field
            setLoadTestParameters(JSON.stringify({multiplier: 10}));

            // When we ask for the duplicate count
            // Then duplicates should NOT fire (the safety check requires an explicit expire)
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns 0 when expire is unparseable', () => {
            // Given a load-test payload whose expire is not a valid date
            setLoadTestParameters(JSON.stringify({multiplier: 10, expire: 'not-a-date'}));

            // When we ask for the duplicate count
            // Then duplicates should NOT fire
            expect(getDuplicateRequestCount()).toBe(0);
        });

        it('returns multiplier - 1 when active and not expired', () => {
            // Given an active load-test configuration with multiplier 3
            setLoadTestParameters(JSON.stringify({multiplier: 3, expire: FUTURE}));

            // When we ask for the duplicate count
            // Then we should fan out to 2 duplicate requests per real request
            expect(getDuplicateRequestCount()).toBe(2);

            // And given we change the multiplier to 10
            setLoadTestParameters(JSON.stringify({multiplier: 10, expire: FUTURE}));

            // Then the duplicate count updates accordingly
            expect(getDuplicateRequestCount()).toBe(9);
        });
    });
});
