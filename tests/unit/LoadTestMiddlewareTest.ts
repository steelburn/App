import Onyx from 'react-native-onyx';
import HttpUtils from '@src/libs/HttpUtils';
import LoadTest from '@src/libs/Middleware/LoadTest';
import {setLoadTestParameters} from '@src/libs/Network/LoadTestState';
import * as MainQueue from '@src/libs/Network/MainQueue';
import * as NetworkStore from '@src/libs/Network/NetworkStore';
import * as SequentialQueue from '@src/libs/Network/SequentialQueue';
import * as Request from '@src/libs/Request';
import ONYXKEYS from '@src/ONYXKEYS';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import waitForNetworkPromises from '../utils/waitForNetworkPromises';

const FUTURE = '2099-01-01T00:00:00';
const PAST = '2000-01-01T00:00:00';

const TEST_COMMAND = 'OpenReport';
const TEST_URL = 'https://www.expensify.com.dev/api/OpenReport?';

Onyx.init({
    keys: ONYXKEYS,
});

beforeAll(() => {
    global.fetch = TestHelper.getGlobalFetchMock();
});

beforeEach(async () => {
    await Onyx.clear();
    await waitForBatchedUpdates();
    SequentialQueue.resetQueue();
    MainQueue.clear();
    HttpUtils.cancelPendingRequests();
    NetworkStore.checkRequiredData();
    await waitForNetworkPromises();
    jest.clearAllMocks();
    Request.clearMiddlewares();
    setLoadTestParameters(null);
});

function getMockCallsForTestUrl() {
    return (global.fetch as jest.Mock).mock.calls.filter((call) => call[0] === TEST_URL);
}

describe('LoadTest middleware', () => {
    it('does not fire any duplicate requests when load testing is inactive', async () => {
        // Given the LoadTest middleware is registered and no X-Load-Test parameters are set
        Request.addMiddleware(LoadTest);

        // When we process a single request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then only the real request should fire and no duplicates should be triggered
        expect(getMockCallsForTestUrl()).toHaveLength(1);
    });

    it('fires multiplier - 1 duplicate requests with X-Mock-Request header when active', async () => {
        // Given the LoadTest middleware is registered and load testing is active with multiplier 3
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 3, expire: FUTURE}));

        // When we process a single request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then we should see 1 real request + 2 duplicates (multiplier - 1)
        const calls = getMockCallsForTestUrl();
        expect(calls).toHaveLength(3);

        // And the real request should NOT carry an X-Mock-Request header
        const realRequestHeaders = (calls.at(0) as [string, RequestInit])[1].headers;
        expect(realRequestHeaders).toBeUndefined();

        // And every duplicate should carry X-Mock-Request: true so the server treats them as load-test traffic
        const firstDuplicateHeaders = (calls.at(1) as [string, RequestInit])[1].headers;
        const secondDuplicateHeaders = (calls.at(2) as [string, RequestInit])[1].headers;
        expect(firstDuplicateHeaders).toEqual({'X-Mock-Request': 'true'});
        expect(secondDuplicateHeaders).toEqual({'X-Mock-Request': 'true'});
    });

    it('does not duplicate when the load-test window has expired', async () => {
        // Given the LoadTest middleware is registered and the load-test expire timestamp has already passed
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 5, expire: PAST}));

        // When we process a single request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then only the real request should fire (the expire window guards against accidentally DDOSing ourselves)
        expect(getMockCallsForTestUrl()).toHaveLength(1);
    });

    it('still fires duplicates when the real request fails (matches .finally semantics)', async () => {
        // Given the LoadTest middleware is registered, load testing is active, and the real request will fail
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 3, expire: FUTURE}));
        (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('network down')));

        // When we process a request whose fetch call rejects
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}}).catch(() => {
            // Swallow the rejection here so the test can continue.
        });
        await waitForNetworkPromises();

        // Then duplicates should still have been fired (mirrors Web-Expensify's deferred.always behavior)
        const calls = getMockCallsForTestUrl();
        expect(calls).toHaveLength(3);
        expect((calls.at(1) as [string, RequestInit])[1].headers).toEqual({'X-Mock-Request': 'true'});
        expect((calls.at(2) as [string, RequestInit])[1].headers).toEqual({'X-Mock-Request': 'true'});
    });

    it('duplicates do not themselves trigger another round of duplicates (no infinite loop)', async () => {
        // Given the LoadTest middleware is registered and load testing is active with multiplier 4
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 4, expire: FUTURE}));

        // When we process a single request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then we expect exactly 1 real + 3 duplicates = 4 calls.
        // If duplicates went back through the middleware pipeline, we would observe 4 + 4*3 = 16 calls instead.
        expect(getMockCallsForTestUrl()).toHaveLength(4);
    });

    it('preserves the original request command and forwards the same parameters to duplicates', async () => {
        // Given the LoadTest middleware is registered and load testing is active with multiplier 2
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 2, expire: FUTURE}));

        // When we process a request with a specific reportID
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '99'}});
        await waitForNetworkPromises();

        // Then the duplicate should hit the same URL and carry the same form data as the real request
        const calls = getMockCallsForTestUrl();
        expect(calls).toHaveLength(2);
        TestHelper.assertFormDataMatchesObject({reportID: '99'}, ((calls.at(0) as [string, {body: TestHelper.FormData}])[1] as {body: TestHelper.FormData}).body);
        TestHelper.assertFormDataMatchesObject({reportID: '99'}, ((calls.at(1) as [string, {body: TestHelper.FormData}])[1] as {body: TestHelper.FormData}).body);
    });

    it('reads the X-Load-Test response header and applies it to subsequent fan-out', async () => {
        // Given the LoadTest middleware is registered and load testing starts disabled
        Request.addMiddleware(LoadTest);

        // And the next response will carry an X-Load-Test header advertising multiplier 3
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                headers: new Headers({'X-Load-Test': JSON.stringify({multiplier: 3, expire: FUTURE})}),
                json: () => Promise.resolve({jsonCode: 200}),
            }),
        );

        // When we process the first request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then the first request itself fans out to 1 real + 2 duplicates because the header is parsed in
        // HttpUtils.processHTTPRequest before the LoadTest middleware's .finally runs (matches Web-Expensify's
        // setLoadTestParametersCallback running before duplicateMockPostRequest in api.js).
        expect(getMockCallsForTestUrl()).toHaveLength(3);

        // And when we process a second request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '2'}});
        await waitForNetworkPromises();

        // Then it should also fan out to 3 calls (1 real + 2 duplicates) using the previously stored multiplier
        expect(getMockCallsForTestUrl()).toHaveLength(3 + 3);
    });

    it('clears the multiplier when a subsequent response omits the X-Load-Test header', async () => {
        // Given the LoadTest middleware is registered and load testing is active with multiplier 3
        Request.addMiddleware(LoadTest);
        setLoadTestParameters(JSON.stringify({multiplier: 3, expire: FUTURE}));

        // When we process a request whose mocked response carries no Headers object (state should remain intact)
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '1'}});
        await waitForNetworkPromises();

        // Then it should fan out to 3 calls (1 real + 2 duplicates)
        expect(getMockCallsForTestUrl()).toHaveLength(3);

        // And given the next response explicitly returns Headers without an X-Load-Test entry
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                headers: new Headers({}),
                json: () => Promise.resolve({jsonCode: 200}),
            }),
        );

        // When we process a second request
        await Request.processWithMiddleware({command: TEST_COMMAND, data: {authToken: 'testToken', reportID: '2'}});
        await waitForNetworkPromises();

        // Then load testing is disabled (state cleared) and only the real request is sent (3 + 1 total)
        expect(getMockCallsForTestUrl()).toHaveLength(4);
    });
});
