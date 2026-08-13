import { describe, expect, it } from 'vitest';
import {
  calculateOmniObjective,
  calculateSideBySideDivergence,
  DEFAULT_DEV_CONSUMER_PARAMETERS,
  evaluateDevConsumerBridge,
} from '../client/src/infrastructure/dev_consumer_bridge';

describe('Dev–Consumer Bridge', () => {
  it('preserves the supplied default parameters and evaluates the blended omni objective', () => {
    expect(DEFAULT_DEV_CONSUMER_PARAMETERS).toMatchObject({
      couplingWeightLambda: 0.5,
      maxAllowableDivergence: 0.001,
      targetMetrics: { maxDevMemoryRatio: 0.25, maxConsumerLatencyMs: 45 },
    });
    expect(calculateOmniObjective(2, 4)).toBe(3);
    expect(calculateOmniObjective(2, 4, 0.25)).toBe(3.5);
    expect(() => calculateOmniObjective(1, 1, 1.1)).toThrow(RangeError);
  });

  it('calculates mean side-by-side L2 divergence and validates aligned vectors', () => {
    expect(calculateSideBySideDivergence([[0, 0], [3, 4]], [[0, 0], [0, 0]])).toBe(2.5);
    expect(() => calculateSideBySideDivergence([[1]], [[1], [2]])).toThrow(RangeError);
  });

  it('reports bridge health only when divergence, memory, and latency all satisfy their budgets', () => {
    const healthy = evaluateDevConsumerBridge({
      devLoss: 1,
      consumerLoss: 3,
      devOutputs: [[0.0005]],
      consumerOutputs: [[0]],
      devMemoryRatio: 0.24,
      consumerLatencyMs: 44.9,
    });
    const overBudget = evaluateDevConsumerBridge({
      devLoss: 1,
      consumerLoss: 3,
      devOutputs: [[0.0011]],
      consumerOutputs: [[0]],
      devMemoryRatio: 0.25,
      consumerLatencyMs: 45,
    });

    expect(healthy).toMatchObject({ omniObjective: 2, sideBySideDivergence: 0.0005, isHealthy: true });
    expect(overBudget).toMatchObject({
      divergenceWithinLimit: false,
      devMemoryWithinTarget: false,
      consumerLatencyWithinTarget: false,
      isHealthy: false,
    });
  });
});
