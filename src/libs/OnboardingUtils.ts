import type {OnyxEntry} from 'react-native-onyx';
import CONST from '@src/CONST';
import type {OnboardingPurpose} from '@src/types/onyx';

/**
 * Returns true when the onboarding choice is one of the "track" variants
 * (TRACK_BUSINESS, TRACK_PERSONAL, or the legacy PERSONAL_SPEND).
 * Extracted here so that adding a new track-type choice only requires one edit.
 */
function isTrackOnboardingChoice(choice: OnyxEntry<OnboardingPurpose>): choice is OnboardingPurpose {
    return choice === CONST.ONBOARDING_CHOICES.TRACK_BUSINESS || choice === CONST.ONBOARDING_CHOICES.TRACK_PERSONAL || choice === CONST.ONBOARDING_CHOICES.PERSONAL_SPEND;
}

export default isTrackOnboardingChoice;
