/** Pre-focus guards used by focus-moving systems (auto-focus, initial dialog focus, RETURN restore) to avoid overriding legitimate user focus and to skip elements that can't accept focus. */

/** Attribute-level focusability only. Geometry (display:none, visibility:hidden, zero-size) is caught post-focus via document.activeElement verification. */
function hasFocusableAttributes(el: Element): boolean {
    return !el.matches(':disabled') && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[aria-hidden="true"]') && !el.closest('[inert]');
}

/** Skip AUTO when another element (e.g. a restored RETURN target) already holds focus. Attribute + computed-style checks reject stragglers (inert / aria-hidden / disabled / display:none / visibility:hidden) from a transitioning-out screen. */
function shouldSkipAutoFocusDueToExistingFocus(): boolean {
    if (typeof document === 'undefined' || !document.activeElement || document.activeElement === document.body) {
        return false;
    }
    if (!hasFocusableAttributes(document.activeElement)) {
        return false;
    }
    if (typeof window !== 'undefined' && document.activeElement instanceof HTMLElement) {
        const style = window.getComputedStyle(document.activeElement);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }
    }
    return true;
}

export {shouldSkipAutoFocusDueToExistingFocus, hasFocusableAttributes};
