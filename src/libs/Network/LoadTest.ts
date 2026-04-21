import type {OnyxKey} from 'react-native-onyx';
import HttpUtils from '@libs/HttpUtils';
import type Request from '@src/types/onyx/Request';
import type {PaginatedRequest} from '@src/types/onyx/Request';
import enhanceParameters from './enhanceParameters';
import {getDuplicateRequestCount} from './LoadTestState';

const MOCK_REQUEST_HEADER_KEY = 'X-Mock-Request';
const MOCK_REQUEST_HEADER_VALUE = 'true';

/**
 * Fires N-1 duplicate API calls with X-Mock-Request for server-side load testing.
 * Bypasses the middleware pipeline so duplicates do not apply Onyx updates or recurse.
 */
function triggerDuplicates<TKey extends OnyxKey>(request: Request<TKey> | PaginatedRequest<TKey>): void {
    const count = getDuplicateRequestCount();
    if (count === 0) {
        return;
    }

    const finalParameters = enhanceParameters(request.command, request.data ?? {});

    for (let i = 0; i < count; i++) {
        // Use HttpUtils.xhr directly to bypass the middleware pipeline ensuring that there is no infinite loop where the duplicate
        // request triggers more and more duplicates.
        HttpUtils.xhr(request.command, finalParameters, request.type, request.shouldUseSecure, request.initiatedOffline, {
            [MOCK_REQUEST_HEADER_KEY]: MOCK_REQUEST_HEADER_VALUE,
        }).catch(() => {
            // Load-test mock traffic is fire-and-forget; failures should not affect the app.
        });
    }
}

export {getDuplicateRequestCount, setLoadTestParameters} from './LoadTestState';
export {triggerDuplicates};
