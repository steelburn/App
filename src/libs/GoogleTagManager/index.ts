/* eslint-disable @typescript-eslint/naming-convention */
import Onyx from 'react-native-onyx';
import Log from '@libs/Log';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
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
    rdt?: (method: string, eventType: string, params?: Record<string, string>) => void;
    lintrk?: (method: string, params: Record<string, unknown>) => void;
};

type DataLayerPushParams = {
    event: GoogleTagManagerEvent;
    user_id: number;
    user_data: {email: string};
    gclid?: string;
};

declare const window: WindowWithPixels;

const PIXEL_EVENTS = new Set<GoogleTagManagerEvent>([CONST.ANALYTICS.EVENT.SIGN_UP, CONST.ANALYTICS.EVENT.WORKSPACE_CREATED, CONST.ANALYTICS.EVENT.PAID_ADOPTION]);

const LINKEDIN_CONVERSION_IDS: Partial<Record<GoogleTagManagerEvent, number>> = {
    [CONST.ANALYTICS.EVENT.SIGN_UP]: CONST.ANALYTICS.LINKEDIN_SIGN_UP_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.WORKSPACE_CREATED]: CONST.ANALYTICS.LINKEDIN_WORKSPACE_CREATED_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.PAID_ADOPTION]: CONST.ANALYTICS.LINKEDIN_PAID_ADOPTION_CONVERSION_ID,
};

const REDDIT_CONVERSION_IDS: Partial<Record<GoogleTagManagerEvent, string>> = {
    [CONST.ANALYTICS.EVENT.SIGN_UP]: CONST.ANALYTICS.REDDIT_SIGN_UP_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.WORKSPACE_CREATED]: CONST.ANALYTICS.REDDIT_WORKSPACE_CREATED_CONVERSION_ID,
    [CONST.ANALYTICS.EVENT.PAID_ADOPTION]: CONST.ANALYTICS.REDDIT_PAID_ADOPTION_CONVERSION_ID,
};

let googleClickId: string | null | undefined;
Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_GOOGLE_CLICK_ID,
    callback: (value) => {
        googleClickId = value;
    },
});

function publishEvent(event: GoogleTagManagerEvent, accountID: number, email: string) {
    if (!window.dataLayer) {
        return;
    }

    const params = {event, user_id: accountID, user_data: {email}, gclid: googleClickId ?? undefined};

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

    const eventID = `${accountID}-${event}`;

    // Meta
    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', pixelEventName, undefined, {eventID});
    }

    // Reddit
    const redditConversionID = REDDIT_CONVERSION_IDS[event];
    if (typeof window.rdt === 'function' && redditConversionID) {
        window.rdt('track', redditConversionID, {
            conversionId: eventID,
            email,
        });
    }

    // LinkedIn (uses numeric conversion IDs instead of named events)
    const linkedInConversionID = LINKEDIN_CONVERSION_IDS[event];
    if (typeof window.lintrk === 'function' && linkedInConversionID) {
        window.lintrk('setUserData', {email});
        window.lintrk('track', {conversion_id: linkedInConversionID});
    }
}

const GoogleTagManager: GoogleTagManagerModule = {
    publishEvent,
};

export default GoogleTagManager;
