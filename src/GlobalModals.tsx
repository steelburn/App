import React, {Suspense, useEffect, useState} from 'react';
import DelegateNoAccessModalProvider from './components/DelegateNoAccessModalProvider';
import EmojiPicker from './components/EmojiPicker/EmojiPicker';
import GrowlNotification from './components/GrowlNotification';
import * as EmojiPickerAction from './libs/actions/EmojiPickerAction';
import {growlRef} from './libs/Growl';
import * as ReportActionContextMenu from './pages/inbox/report/ContextMenu/ReportActionContextMenu';

// React.lazy with a no-op fallback if the chunk fails to load (e.g. stale cache, network blip).
// These modals are non-critical and surface only on rare conditions, so a chunk-load failure must
// not throw to the nearest error boundary and crash the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithNullFallback<T extends React.ComponentType<any>>(factory: () => Promise<{default: T}>): React.LazyExoticComponent<T> {
    return React.lazy(() => factory().catch(() => ({default: (() => null) as unknown as T})));
}

const LazyPopoverReportActionContextMenu = lazyWithNullFallback(() => import('./pages/inbox/report/ContextMenu/PopoverReportActionContextMenu'));
const LazyUpdateAppModal = lazyWithNullFallback(() => import('./components/UpdateAppModal'));
const LazyScreenShareRequestModal = lazyWithNullFallback(() => import('./components/ScreenShareRequestModal'));
const LazyProactiveAppReviewModalManager = lazyWithNullFallback(() => import('./components/ProactiveAppReviewModalManager'));

// Maximum time (ms) the context menu mount can stay deferred before requestIdleCallback forces it to run,
// guaranteeing mount even if the main thread never becomes idle.
const IDLE_CALLBACK_TIMEOUT_MS = 2000;

/**
 * Renders global modals and overlays that are mounted once at the top level.
 */
function GlobalModals() {
    const [shouldRenderContextMenu, setShouldRenderContextMenu] = useState(false);
    const [shouldRenderDeferredModals, setShouldRenderDeferredModals] = useState(false);

    useEffect(() => {
        // Defer loading the context menu and rare-condition modals until after startup to avoid
        // pulling in their dependencies (ContextMenuActions, ReportUtils, ModifiedExpenseMessage,
        // ProactiveAppReviewModal, etc.) and their useOnyx subscriptions during the ManualAppStartup span.
        const id = requestIdleCallback(
            () => {
                setShouldRenderContextMenu(true);
                setShouldRenderDeferredModals(true);
            },
            {timeout: IDLE_CALLBACK_TIMEOUT_MS},
        );

        // Allow showContextMenu() to force eager mount if the user interacts before the idle callback fires.
        ReportActionContextMenu.registerEnsureContextMenuMounted(() => setShouldRenderContextMenu(true));

        return () => {
            cancelIdleCallback(id);
            ReportActionContextMenu.registerEnsureContextMenuMounted(null);
        };
    }, []);

    return (
        <>
            {shouldRenderDeferredModals && (
                <Suspense fallback={null}>
                    <LazyUpdateAppModal />
                </Suspense>
            )}
            {/* Those below are only available to the authenticated user. */}
            <GrowlNotification ref={growlRef} />
            <DelegateNoAccessModalProvider>
                {shouldRenderContextMenu && (
                    <Suspense fallback={null}>
                        {/* eslint-disable-next-line react-hooks/refs -- module-level createRef, safe to pass as ref prop */}
                        <LazyPopoverReportActionContextMenu ref={ReportActionContextMenu.contextMenuRef} />
                    </Suspense>
                )}
            </DelegateNoAccessModalProvider>
            {/* eslint-disable-next-line react-hooks/refs -- module-level createRef, safe to pass as ref prop */}
            <EmojiPicker ref={EmojiPickerAction.emojiPickerRef} />
            {shouldRenderDeferredModals && (
                <>
                    {/* Each modal lives in its own Suspense boundary so an unrelated chunk's load latency
                        or failure cannot delay or suppress the others (e.g. an incoming screen-share request). */}
                    <Suspense fallback={null}>
                        {/* Proactive app review modal shown when user has completed a trigger action */}
                        <LazyProactiveAppReviewModalManager />
                    </Suspense>
                    <Suspense fallback={null}>
                        <LazyScreenShareRequestModal />
                    </Suspense>
                </>
            )}
        </>
    );
}

export default GlobalModals;
