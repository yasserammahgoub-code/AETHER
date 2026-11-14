/** Voice activation phrase and matching. Pure, so it can be tested without a browser. */
export const ACTIVATION_PHRASE = "AETHER, Emergency Situation.";

/**
 * Activates on the word "emergency" anywhere in recognized speech, so the full phrase is not required.
 * Whole word only: "emergencies" or "emergent" do not trigger it.
 */
export function matchesActivationPhrase(heard: string): boolean {
  return /\bemergency\b/i.test(heard);
}
