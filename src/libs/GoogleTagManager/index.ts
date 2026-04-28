/* eslint-disable @typescript-eslint/naming-convention */
import Log from '@libs/Log';
import CONST from '@src/CONST';
import type {GoogleTagManagerEvent} from './types';
import type GoogleTagManagerModule from './types';

/**
 * The dataLayer is added with a js snippet from Google in web/thirdPartyScripts.js. Set USE_THIRD_PARTY_SCRIPTS to true
 * in your .env to enable this
 */
type WindowWithPixels = Window & {
    dataLayer?: {
        push: (params: DataLayerPushParams) => void;
    };
    fbq?: (method: string, eventName: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;
    rdt?: (method: string, eventName: string, params?: Record<string, unknown>) => void;
    lintrk?: (method: string, params: Record<string, unknown>) => void;
};

type DataLayerPushParams = {
    event: GoogleTagManagerEvent;
    user_id: number;
    user_data: {email: string};
};

declare const window: WindowWithPixels;

const PIXEL_EVENTS = new Set<GoogleTagManagerEvent>([CONST.ANALYTICS.EVENT.SIGN_UP, CONST.ANALYTICS.EVENT.WORKSPACE_CREATED, CONST.ANALYTICS.EVENT.PAID_ADOPTION]);

const LINKEDIN_CONVERSION_IDS: Partial<Record<GoogleTagManagerEvent, number>> = {
    [CONST.ANALYTICS.EVENT.SIGN_UP]: CONST.ANALYTICS.LINKEDIN_SIGN_UP_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.WORKSPACE_CREATED]: CONST.ANALYTICS.LINKEDIN_WORKSPACE_CREATED_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.PAID_ADOPTION]: CONST.ANALYTICS.LINKEDIN_PAID_ADOPTION_CONVERSION_ID,
};

function publishEvent(event: GoogleTagManagerEvent, accountID: number, email: string) {
    if (!window.dataLayer) {
        return;
    }

    const params = {event, user_id: accountID, user_data: {email}};

    // Pass a copy of params here since the dataLayer modifies the object
    window.dataLayer.push({...params});

    Log.info('[GTM] event published', false, params);

    if (!PIXEL_EVENTS.has(event)) {
        return;
    }

    // Events in Meta & Reddit are currently being set in CamelCase from OldDot
    const pixelEventName = (event as string)
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');

    // Meta
    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', pixelEventName);
    }

    // Reddit
    if (typeof window.rdt === 'function') {
        window.rdt('track', pixelEventName);
    }

    // LinkedIn (uses numeric conversion IDs instead of named events)
    const linkedInConversionId = LINKEDIN_CONVERSION_IDS[event];
    if (typeof window.lintrk === 'function' && linkedInConversionId) {
        window.lintrk('track', {conversion_id: linkedInConversionId});
    }
}

const GoogleTagManager: GoogleTagManagerModule = {
    publishEvent,
};

export default GoogleTagManager;
