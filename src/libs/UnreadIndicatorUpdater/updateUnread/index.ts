/**
 * Web browsers have a tab title and favicon which can be updated to show there are unread comments
 */
import CONFIG from '@src/CONFIG';
import type UpdateUnread from './types';

let unreadTotalCount = 0;
let currentPageTitle = '';

/**
 * Set the current page-specific title (called by useDocumentTitle hook)
 * @param title - The page-specific title
 */
function setPageTitle(title: string) {
    currentPageTitle = title;
    updateDocumentTitle();
}

/**
 * Synchronous on purpose. Deferring (setTimeout/queueMicrotask) loses a race with React Navigation's
 * createMemoryHistory popstate handler, which captures and re-asserts document.title — re-applying
 * the stale value if our write hasn't landed yet.
 */
function updateDocumentTitle() {
    if (typeof document === 'undefined') {
        return;
    }
    const hasUnread = unreadTotalCount !== 0;

    // Chrome reverts the tab title to the previous entry on back navigation; blanking it first forces a refresh.
    document.title = '';
    const baseTitle = currentPageTitle || CONFIG.SITE_TITLE;
    document.title = hasUnread ? `(${unreadTotalCount}) ${baseTitle}` : baseTitle;

    const favicon = document.getElementById('favicon');
    if (favicon instanceof HTMLLinkElement) {
        favicon.href = hasUnread ? CONFIG.FAVICON.UNREAD : CONFIG.FAVICON.DEFAULT;
    }
}

/**
 * Set the page title on web
 */
const updateUnread: UpdateUnread = (totalCount) => {
    unreadTotalCount = totalCount;
    updateDocumentTitle();
};

window.addEventListener('popstate', () => {
    updateUnread(unreadTotalCount);
});

export default updateUnread;
export {setPageTitle};
