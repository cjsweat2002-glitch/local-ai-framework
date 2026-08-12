export const GOVERNANCE_COOLDOWNS = {
  exchange: 2,
  marketSignal: 5,
  watcherProposal: 15,
} as const;

export function assertGovernedCooldown(lastActionAt: Date | null | undefined, action: string, cooldownMinutes: number, now = Date.now()) {
  if (lastActionAt && now - lastActionAt.getTime() < cooldownMinutes * 60_000) {
    throw new Error(`${action} is rate-limited for ${cooldownMinutes} minute(s) to prevent noise`);
  }
}

export function assertWatcherReviewEligibility(input: { watcherConsent: boolean; integrityScore: number; noiseScore: number }) {
  if (!input.watcherConsent) throw new Error('Enable watcher consent on the parent before running a review');
  if (input.integrityScore < 55 || input.noiseScore > 45) {
    throw new Error('Watcher review was deferred because the signal quality threshold was not met');
  }
}
