/** True when the user is keyboard-navigating; false when typing or using a mouse. Typing/printable keys clear; Tab/Escape/Arrow/named navigation keys set true (ensures WCAG 2.4.7 visible focus after keyboard-triggered navigation, even mid-typing). */
let hadTabNavigation = false;
let teardown: (() => void) | null = null;

// Named keys that are unambiguously keyboard navigation intent — pressing any of these should restore keyboard modality even if typing had cleared it.
const KEYBOARD_NAV_KEYS = new Set(['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

function setup(): void {
    if (teardown || typeof document === 'undefined') {
        return;
    }

    const keydownHandler = (e: KeyboardEvent) => {
        // Autofill/password-manager synthetic events can omit `key` — guard before .length access.
        if (typeof e.key !== 'string') {
            return;
        }
        if (e.key === 'Tab' || KEYBOARD_NAV_KEYS.has(e.key)) {
            hadTabNavigation = true;
            return;
        }
        // Cmd/Ctrl/Alt shortcuts preserve modality; AltGraph is excluded because it produces printable chars on international layouts.
        const isAltGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
        if (!isAltGraph && (e.ctrlKey || e.metaKey || e.altKey)) {
            return;
        }
        const isTypingKey = (e.key.length === 1 && e.key !== ' ') || e.key === 'Backspace' || e.key === 'Delete';
        if (isTypingKey) {
            hadTabNavigation = false;
        }
    };
    // pointerdown covers pen/touch; mousedown is the legacy fallback.
    const pointerActivationHandler = () => {
        hadTabNavigation = false;
    };

    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('pointerdown', pointerActivationHandler, true);
    document.addEventListener('mousedown', pointerActivationHandler, true);

    teardown = () => {
        document.removeEventListener('keydown', keydownHandler, true);
        document.removeEventListener('pointerdown', pointerActivationHandler, true);
        document.removeEventListener('mousedown', pointerActivationHandler, true);
        teardown = null;
    };
}

function teardownHadTabNavigation(): void {
    teardown?.();
}

function getHadTabNavigation(): boolean {
    return hadTabNavigation;
}

function resetForTests(): void {
    hadTabNavigation = false;
}

export default getHadTabNavigation;
export {teardownHadTabNavigation, resetForTests, setup as setupHadTabNavigation};
