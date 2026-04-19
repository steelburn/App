/** Pre-focus guards used by focus-moving systems (auto-focus, initial dialog focus, RETURN restore) to avoid overriding legitimate user focus and to skip elements that can't accept focus. */

/** Attribute-level focusability only. Geometry (display:none, visibility:hidden, zero-size) is caught post-focus via document.activeElement verification. */
function hasFocusableAttributes(el: Element): boolean {
    return !el.matches(':disabled') && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[aria-hidden="true"]') && !el.closest('[inert]');
}

/** AUTO's async chain can outlive RETURN_HOLD_MS; skip when another element (e.g. a restored RETURN target) already holds focus. Stale focus on a transitioning-out screen (inert / aria-hidden / disabled ancestor) isn't a real competing target, so only block when the active element is attribute-focusable. */
function shouldSkipAutoFocusDueToExistingFocus(): boolean {
    if (typeof document === 'undefined' || !document.activeElement || document.activeElement === document.body) {
        return false;
    }
    return hasFocusableAttributes(document.activeElement);
}

export {shouldSkipAutoFocusDueToExistingFocus, hasFocusableAttributes};
