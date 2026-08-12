import { describe, expect, it } from 'vitest';
import { assertGovernedCooldown, assertWatcherReviewEligibility, GOVERNANCE_COOLDOWNS } from './governancePolicy';

describe('governance policy safeguards', () => {
  it('requires explicit parent consent before a watcher can propose a change', () => {
    expect(() => assertWatcherReviewEligibility({ watcherConsent: false, integrityScore: 80, noiseScore: 10 }))
      .toThrow('Enable watcher consent');
  });

  it('only permits meaningful, low-noise watcher signals', () => {
    expect(() => assertWatcherReviewEligibility({ watcherConsent: true, integrityScore: 54, noiseScore: 10 }))
      .toThrow('signal quality threshold');
    expect(() => assertWatcherReviewEligibility({ watcherConsent: true, integrityScore: 80, noiseScore: 46 }))
      .toThrow('signal quality threshold');
    expect(() => assertWatcherReviewEligibility({ watcherConsent: true, integrityScore: 55, noiseScore: 45 })).not.toThrow();
  });

  it('rate limits owner-created exchanges, market signals, and watcher proposals', () => {
    const now = Date.UTC(2026, 7, 12, 23, 20, 0);
    expect(() => assertGovernedCooldown(new Date(now - 60_000), 'exchange.created', GOVERNANCE_COOLDOWNS.exchange, now))
      .toThrow('rate-limited');
    expect(() => assertGovernedCooldown(new Date(now - 4 * 60_000), 'market_signal.created', GOVERNANCE_COOLDOWNS.marketSignal, now))
      .toThrow('rate-limited');
    expect(() => assertGovernedCooldown(new Date(now - 14 * 60_000), 'watcher.proposed', GOVERNANCE_COOLDOWNS.watcherProposal, now))
      .toThrow('rate-limited');
    expect(() => assertGovernedCooldown(new Date(now - 15 * 60_000), 'watcher.proposed', GOVERNANCE_COOLDOWNS.watcherProposal, now)).not.toThrow();
  });
});
