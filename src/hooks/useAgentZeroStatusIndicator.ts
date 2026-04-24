import agentZeroProcessingIndicatorSelector from '@selectors/ReportNameValuePairs';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import {clearAgentZeroProcessingIndicator, getNewerActions, subscribeToReportReasoningEvents, unsubscribeFromReportReasoningChannel} from '@libs/actions/Report';
import AgentZeroOptimisticStore, {MAX_AGE_MS as OPTIMISTIC_MAX_AGE_MS} from '@libs/AgentZeroOptimisticStore';
import ConciergeReasoningStore from '@libs/ConciergeReasoningStore';
import type {ReasoningEntry} from '@libs/ConciergeReasoningStore';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportActions} from '@src/types/onyx/ReportAction';
import useLocalize from './useLocalize';
import useNetwork from './useNetwork';
import useOnyx from './useOnyx';

type AgentZeroStatusState = {
    isProcessing: boolean;
    reasoningHistory: ReasoningEntry[];
    statusLabel: string;
    kickoffWaitingIndicator: () => void;
};

type NewestReportAction = {
    reportActionID: string;
    actorAccountID?: number;
};

/**
 * Polling interval for fetching missed Concierge responses while the thinking indicator is visible.
 *
 * While the indicator is active, we poll getNewerActions every 30s to recover from
 * WebSocket drops or missed Pusher events. If a Concierge reply arrives (via Pusher
 * or the poll response), the normal Onyx update clears the indicator automatically.
 *
 * A hard safety clear at MAX_POLL_DURATION_MS ensures the indicator doesn't stay
 * forever if something goes wrong.
 */
const POLL_INTERVAL_MS = 30000;

/**
 * Maximum duration to poll before hard-clearing the indicator (safety net).
 * After this time, if we're online and no response has arrived, we clear the indicator.
 * Shared with AgentZeroOptimisticStore so the cross-mount remaining window stays consistent.
 */
const MAX_POLL_DURATION_MS = OPTIMISTIC_MAX_AGE_MS;

// Minimum time to display a label before allowing change (prevents rapid flicker)
const MIN_DISPLAY_TIME = 300; // ms
// Debounce delay for server label updates
const DEBOUNCE_DELAY = 150; // ms

/**
 * Selector that extracts the newest report action ID and actor from the report actions collection.
 *
 * Sorts by `created` timestamp (ISO strings compare chronologically), with reportActionID as a
 * tiebreaker. reportActionID alone is unreliable because optimistic actions use random IDs, so
 * a purely numeric comparison can rank them ahead of real server actions.
 */
function selectNewestReportAction(reportActions: OnyxEntry<ReportActions>): NewestReportAction | undefined {
    if (!reportActions) {
        return undefined;
    }
    const actions = Object.values(reportActions).filter(Boolean);
    if (actions.length === 0) {
        return undefined;
    }
    const newest = actions.reduce((a, b) => {
        const createdA = a.created ?? '';
        const createdB = b.created ?? '';
        if (createdA !== createdB) {
            return createdA > createdB ? a : b;
        }
        return a.reportActionID > b.reportActionID ? a : b;
    });
    return {
        reportActionID: newest.reportActionID,
        actorAccountID: newest.actorAccountID,
    };
}

/**
 * Hook to manage AgentZero status indicator for chats where AgentZero responds.
 *
 * Callers must gate this hook at the mount level (only mount for AgentZero-enabled chats:
 * Concierge DMs or policy #admins rooms). The outer `AgentZeroStatusProvider` already
 * enforces this, so the hook assumes it's always running for an AgentZero chat.
 *
 * @param reportID - The report ID to monitor
 */
function useAgentZeroStatusIndicator(reportID: string): AgentZeroStatusState {
    // Server-driven processing label from report name-value pairs (e.g. "Looking up categories...")
    // Uses selector to only re-render when the specific field changes, not on any NVP change.
    const [serverLabel] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`, {selector: agentZeroProcessingIndicatorSelector});

    // Track the newest report action so we can fetch missed actions and detect actual Concierge replies.
    const [newestReportAction] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`, {selector: selectNewestReportAction});
    const newestReportActionRef = useRef<NewestReportAction | undefined>(newestReportAction);
    useEffect(() => {
        newestReportActionRef.current = newestReportAction;
    }, [newestReportAction]);

    // Track pending optimistic requests with a counter, backed by a module-level store so
    // the state survives ReportScreen remounts (switching chats and coming back). Each
    // kickoffWaitingIndicator() call increments the counter; when a Concierge reply is
    // detected (via polling, Pusher, reconnect, or safety timeout), the entry is cleared —
    // any signal that a response arrived resolves all pending requests (optimistic state
    // is a display signal, not a queue).
    const subscribeToOptimisticStore = (onStoreChange: () => void) =>
        AgentZeroOptimisticStore.subscribe((updatedReportID) => {
            if (updatedReportID !== reportID) {
                return;
            }
            onStoreChange();
        });
    const getOptimisticSnapshot = () => AgentZeroOptimisticStore.getEntry(reportID);
    const optimisticEntry = useSyncExternalStore(subscribeToOptimisticStore, getOptimisticSnapshot, getOptimisticSnapshot);
    const pendingOptimisticRequests = optimisticEntry?.count ?? 0;
    // Debounced label shown to the user — smooths rapid server label changes.
    // displayedLabelRef mirrors state so the label-sync effect can read the current value
    // without including displayedLabel in its dependency array (avoids extra effect cycles).
    const displayedLabelRef = useRef<string>('');
    const [displayedLabel, setDisplayedLabel] = useState<string>('');
    const {translate} = useLocalize();
    const prevServerLabelRef = useRef<string>(serverLabel ?? '');
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isOfflineRef = useRef<boolean>(false);
    // Newest reportActionID at the moment the indicator became active (raw state, ignoring
    // offline). Lets us distinguish "a pre-existing Concierge action was already the newest"
    // (common in Concierge DMs, where the previous reply is still the latest action) from
    // "a new Concierge reply arrived after the indicator started." Without this, sending a
    // message in a Concierge DM would immediately clear the just-activated indicator.
    //
    // Seeded from the optimistic store so a remount mid-thinking (chat switch) restores the
    // original baseline instead of capturing the current newest action — otherwise a reply
    // that landed while the provider was unmounted would be adopted as the baseline and go
    // undetected. `initialRestoredEntry` is read on every render (cheap Map lookup), but the
    // refs only consume the first-render value.
    const initialRestoredEntry = AgentZeroOptimisticStore.getEntry(reportID);
    const restoredOptimisticOnMountRef = useRef<ReturnType<typeof AgentZeroOptimisticStore.getEntry>>(initialRestoredEntry);
    const indicatorBaselineActionIDRef = useRef<string | null>(initialRestoredEntry?.baselineActionID ?? null);
    const wasIndicatorActiveRef = useRef<boolean>(!!initialRestoredEntry);

    /**
     * Clear the polling interval and safety timer. Called when the indicator clears normally,
     * when a new processing cycle starts, or when the component unmounts.
     *
     * Kept in useCallback because it's referenced in several useEffect dep arrays below. The
     * react-compiler-compat ESLint processor (which would otherwise suppress the exhaustive-deps
     * false positive) only runs on .tsx/.jsx files, not .ts.
     */
    const clearPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (pollSafetyTimerRef.current) {
            clearTimeout(pollSafetyTimerRef.current);
            pollSafetyTimerRef.current = null;
        }
    }, []);

    /**
     * Hard-clear the indicator by resetting local state and clearing the Onyx NVP.
     * Called as a safety net after MAX_POLL_DURATION_MS if no response has arrived.
     */
    const hardClearIndicator = useCallback(() => {
        // If offline, don't clear — the response may arrive when reconnected
        if (isOfflineRef.current) {
            return;
        }
        clearPolling();
        AgentZeroOptimisticStore.clear(reportID);
        displayedLabelRef.current = '';
        setDisplayedLabel('');
        clearAgentZeroProcessingIndicator(reportID);
        getNewerActions(reportID, newestReportActionRef.current?.reportActionID);
    }, [clearPolling, reportID]);

    /**
     * Start polling for missed actions every POLL_INTERVAL_MS. Every time processing
     * becomes active or the server label changes (renewal), the existing polling is
     * cleared and restarted.
     *
     * - Every 30s: call getNewerActions to fetch any missed Concierge responses
     * - After MAX_POLL_DURATION_MS: hard-clear the indicator if still showing (safety net)
     *
     * Polling stops when: indicator clears, component unmounts, or user goes offline.
     */
    const startPolling = useCallback(
        (safetyDurationMs: number = MAX_POLL_DURATION_MS) => {
            clearPolling();

            if (safetyDurationMs <= 0) {
                // Entry is already past the safety window (e.g. remount after >2 min) — skip
                // polling and hard-clear immediately. The normal path runs the 30s poll and
                // 120s safety timer, but there's no point starting either if the window is
                // already spent.
                hardClearIndicator();
                return;
            }

            // Poll every 30s for missed actions. Track the newest action ID before polling
            // so we can detect if new actions arrived (meaning Concierge responded).
            // If new actions arrive but the NVP CLEAR was missed via Pusher, we clear
            // the indicator client-side.
            const prePollingActionID = newestReportActionRef.current?.reportActionID;
            pollIntervalRef.current = setInterval(() => {
                if (isOfflineRef.current) {
                    return;
                }
                const currentNewestReportAction = newestReportActionRef.current;
                const didConciergeReplyAfterPollingStarted =
                    currentNewestReportAction?.actorAccountID === CONST.ACCOUNT_ID.CONCIERGE && currentNewestReportAction.reportActionID !== prePollingActionID;

                if (didConciergeReplyAfterPollingStarted) {
                    clearAgentZeroProcessingIndicator(reportID);
                    clearPolling();
                    AgentZeroOptimisticStore.clear(reportID);
                    return;
                }
                getNewerActions(reportID, currentNewestReportAction?.reportActionID);
            }, POLL_INTERVAL_MS);

            // Safety net: hard-clear after the remaining window elapses
            pollSafetyTimerRef.current = setTimeout(() => {
                hardClearIndicator();
            }, safetyDurationMs);
        },
        [clearPolling, hardClearIndicator, reportID],
    );

    // On reconnect, defensively clear any stale NVP, refetch missed actions, and keep polling
    // running through the reconnect window.
    //
    // If the server SET+CLEARED the NVP while Pusher was disconnected, Onyx sync can deliver
    // only the stale SET on reconnect. Clearing the NVP locally when we were optimistic-only
    // prevents a stuck label.
    //
    // Polling must continue even when only optimistic state is active (no server label yet).
    // If the client reconnected before the server wrote any label and Pusher events keep
    // getting missed, polling via getNewerActions is our only way to catch the eventual reply.
    // The safety timer inside startPolling is the hard backstop.
    const {isOffline} = useNetwork({
        onReconnect: () => {
            const wasOptimistic = pendingOptimisticRequests > 0;

            if (wasOptimistic) {
                clearAgentZeroProcessingIndicator(reportID);
            }

            // Fetch missed actions so the Onyx-driven Concierge-reply detection can fire.
            getNewerActions(reportID, newestReportActionRef.current?.reportActionID);

            if (serverLabel || wasOptimistic) {
                startPolling();
            }
        },
    });

    // Subscribe to ConciergeReasoningStore using useSyncExternalStore for correct
    // synchronization with React's render cycle. React Compiler memoizes these closures
    // based on reportID, so useSyncExternalStore doesn't unsubscribe/resubscribe on every render.
    const subscribeToReasoningStore = (onStoreChange: () => void) => {
        const unsubscribe = ConciergeReasoningStore.subscribe((updatedReportID) => {
            if (updatedReportID !== reportID) {
                return;
            }
            onStoreChange();
        });
        return unsubscribe;
    };
    const getReasoningSnapshot = () => ConciergeReasoningStore.getReasoningHistory(reportID);
    const reasoningHistory = useSyncExternalStore(subscribeToReasoningStore, getReasoningSnapshot, getReasoningSnapshot);

    useEffect(() => {
        subscribeToReportReasoningEvents(reportID);

        // Cleanup: unsubscribeFromReportReasoningChannel handles Pusher unsubscribing,
        // clearing reasoning history from ConciergeReasoningStore, and subscription tracking
        return () => {
            unsubscribeFromReportReasoningChannel(reportID);
        };
    }, [reportID]);

    // Synchronize the displayed label with debounce and minimum display time.
    // displayedLabelRef mirrors state so the effect can check the current value without depending on displayedLabel.
    useEffect(() => {
        const hadServerLabel = !!prevServerLabelRef.current;
        const hasServerLabel = !!serverLabel;

        let targetLabel = '';
        if (hasServerLabel) {
            targetLabel = serverLabel ?? '';
        } else if (pendingOptimisticRequests > 0) {
            targetLabel = translate('common.thinking');
        }

        // Start/reset polling when server label arrives (acts as a lease renewal). Keep the
        // optimistic store entry alive — the server NVP can briefly go truthy→falsy→truthy
        // between processing phases (e.g., "thinking..." → (gap) → "searching documentation..."),
        // and clearing the optimistic floor here means a chat-switch during the gap lands on
        // "no optimistic, no serverLabel → no indicator." The optimistic entry is cleared by
        // authoritative signals only: the reply-detection effect (new Concierge action newer
        // than baseline), the 120s safety timeout, or the onReconnect handler.
        if (hasServerLabel) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- startPolling transitively updates displayedLabel via the safety timeout; the synchronous call here only schedules timers
            startPolling();
        }
        // Clear polling when processing ends
        else if (pendingOptimisticRequests === 0) {
            clearPolling();
            if (hadServerLabel && reasoningHistory.length > 0) {
                ConciergeReasoningStore.clearReasoning(reportID);
            }
        }

        // Use ref to check current value without depending on displayedLabel in deps
        if (displayedLabelRef.current === targetLabel) {
            prevServerLabelRef.current = serverLabel ?? '';
            return;
        }

        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        const remainingMinTime = Math.max(0, MIN_DISPLAY_TIME - timeSinceLastUpdate);

        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
        }

        // Immediate update when enough time has passed or when clearing the label
        if (remainingMinTime === 0 || targetLabel === '') {
            displayedLabelRef.current = targetLabel;
            // eslint-disable-next-line react-hooks/set-state-in-effect -- guarded by displayedLabelRef check above; fires once per serverLabel/optimistic transition
            setDisplayedLabel(targetLabel);
            lastUpdateTimeRef.current = now;
        } else {
            // Schedule update after debounce + remaining min display time
            const delay = DEBOUNCE_DELAY + remainingMinTime;
            updateTimerRef.current = setTimeout(() => {
                displayedLabelRef.current = targetLabel;
                setDisplayedLabel(targetLabel);
                lastUpdateTimeRef.current = Date.now();
                updateTimerRef.current = null;
            }, delay);
        }

        prevServerLabelRef.current = serverLabel ?? '';

        return () => {
            if (!updateTimerRef.current) {
                return;
            }
            clearTimeout(updateTimerRef.current);
        };
    }, [serverLabel, reasoningHistory.length, reportID, pendingOptimisticRequests, translate, startPolling, clearPolling]);

    useEffect(() => {
        isOfflineRef.current = isOffline;
    }, [isOffline]);

    // Clean up polling on unmount (and if clearPolling identity changes — no-op when no timers)
    useEffect(
        () => () => {
            clearPolling();
        },
        [clearPolling],
    );

    // If we restored optimistic state from a previous mount (e.g. user switched chats and
    // came back mid-thinking), resume polling with whatever time remains on the safety
    // window. If a server label is also present on mount, the label-sync effect runs in
    // the same commit and restarts polling with a fresh window — `startPolling` clears any
    // prior timer, so that restart wins naturally.
    //
    // `startPolling` is a stable useCallback (keyed by reportID), so this effect runs once
    // per mount and doesn't re-fire on unrelated renders.
    useEffect(() => {
        const restored = restoredOptimisticOnMountRef.current;
        if (!restored) {
            return;
        }
        const elapsed = Date.now() - restored.startedAt;
        const remaining = MAX_POLL_DURATION_MS - elapsed;
        startPolling(remaining);
    }, [startPolling]);

    const kickoffWaitingIndicator = () => {
        AgentZeroOptimisticStore.increment(reportID, newestReportActionRef.current?.reportActionID ?? null);
        startPolling();
    };

    // Capture the newest reportActionID as a baseline whenever the indicator transitions
    // from inactive to active (serverLabel or optimistic). The baseline survives offline
    // cycles (it tracks raw active state, not UI-visible isProcessing) so a new Concierge
    // reply that arrives during offline → online is still detected as "new" on reconnect.
    const isIndicatorActive = !!serverLabel || pendingOptimisticRequests > 0;
    useEffect(() => {
        if (isIndicatorActive && !wasIndicatorActiveRef.current) {
            indicatorBaselineActionIDRef.current = newestReportActionRef.current?.reportActionID ?? null;
        } else if (!isIndicatorActive) {
            indicatorBaselineActionIDRef.current = null;
        }
        wasIndicatorActiveRef.current = isIndicatorActive;
    }, [isIndicatorActive]);

    // Immediately clear the indicator when a *new* Concierge response arrives while processing.
    // In a Concierge DM, the newest action is usually already from Concierge (the previous reply),
    // so we only clear when the newest action ID is different from the baseline captured when
    // the indicator activated. This eliminates the 30s delay waiting for the next poll cycle.
    const newestActorAccountID = newestReportAction?.actorAccountID;
    const newestActionID = newestReportAction?.reportActionID;
    useEffect(() => {
        if (newestActorAccountID !== CONST.ACCOUNT_ID.CONCIERGE) {
            return;
        }
        if (!serverLabel && pendingOptimisticRequests === 0) {
            return;
        }
        if (!newestActionID || newestActionID === indicatorBaselineActionIDRef.current) {
            return;
        }
        clearAgentZeroProcessingIndicator(reportID);
        clearPolling();
        AgentZeroOptimisticStore.clear(reportID);
    }, [newestActorAccountID, newestActionID, serverLabel, pendingOptimisticRequests, reportID, clearPolling]);

    const isProcessing = !isOffline && isIndicatorActive;

    return {
        isProcessing,
        reasoningHistory,
        statusLabel: displayedLabel,
        kickoffWaitingIndicator,
    };
}

export default useAgentZeroStatusIndicator;
export type {AgentZeroStatusState};
