export type DevConsumerBridgeParameters = {
  couplingWeightLambda: number;
  maxAllowableDivergence: number;
  targetMetrics: {
    maxDevMemoryRatio: number;
    maxConsumerLatencyMs: number;
  };
};

/** Defaults supplied by the omni-parameter module v1.0.0. */
export const DEFAULT_DEV_CONSUMER_PARAMETERS: Readonly<DevConsumerBridgeParameters> = Object.freeze({
  couplingWeightLambda: 0.5,
  maxAllowableDivergence: 0.001,
  targetMetrics: Object.freeze({
    maxDevMemoryRatio: 0.25,
    maxConsumerLatencyMs: 45,
  }),
});

export type DevConsumerEvaluation = {
  omniObjective: number;
  sideBySideDivergence: number;
  divergenceWithinLimit: boolean;
  devMemoryWithinTarget: boolean;
  consumerLatencyWithinTarget: boolean;
  isHealthy: boolean;
};

function assertFinite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite number.`);
}

function validateParameters(parameters: DevConsumerBridgeParameters) {
  assertFinite(parameters.couplingWeightLambda, 'couplingWeightLambda');
  assertFinite(parameters.maxAllowableDivergence, 'maxAllowableDivergence');
  assertFinite(parameters.targetMetrics.maxDevMemoryRatio, 'maxDevMemoryRatio');
  assertFinite(parameters.targetMetrics.maxConsumerLatencyMs, 'maxConsumerLatencyMs');

  if (parameters.couplingWeightLambda < 0 || parameters.couplingWeightLambda > 1) {
    throw new RangeError('couplingWeightLambda must be between 0 and 1.');
  }
  if (parameters.maxAllowableDivergence < 0 || parameters.targetMetrics.maxDevMemoryRatio < 0 || parameters.targetMetrics.maxConsumerLatencyMs < 0) {
    throw new RangeError('Bridge thresholds must be non-negative.');
  }
}

/** Calculates L_omni = λL_dev + (1 - λ)L_cons. */
export function calculateOmniObjective(devLoss: number, consumerLoss: number, couplingWeightLambda = DEFAULT_DEV_CONSUMER_PARAMETERS.couplingWeightLambda): number {
  assertFinite(devLoss, 'devLoss');
  assertFinite(consumerLoss, 'consumerLoss');
  validateParameters({ ...DEFAULT_DEV_CONSUMER_PARAMETERS, couplingWeightLambda });

  return couplingWeightLambda * devLoss + (1 - couplingWeightLambda) * consumerLoss;
}

/**
 * Calculates D_side_by_side = mean(||f_dev - g_cons||₂) across matched output vectors.
 */
export function calculateSideBySideDivergence(devOutputs: number[][], consumerOutputs: number[][]): number {
  if (devOutputs.length === 0 || devOutputs.length !== consumerOutputs.length) {
    throw new RangeError('Dev and consumer output sequences must be non-empty and have equal length.');
  }

  const totalDistance = devOutputs.reduce((sum, devVector, index) => {
    const consumerVector = consumerOutputs[index];
    if (!consumerVector || devVector.length === 0 || devVector.length !== consumerVector.length) {
      throw new RangeError('Each dev and consumer output pair must have the same non-zero dimension.');
    }

    const squaredDistance = devVector.reduce((vectorSum, devValue, coordinate) => {
      const consumerValue = consumerVector[coordinate];
      assertFinite(devValue, 'dev output');
      assertFinite(consumerValue, 'consumer output');
      return vectorSum + (devValue - consumerValue) ** 2;
    }, 0);

    return sum + Math.sqrt(squaredDistance);
  }, 0);

  return totalDistance / devOutputs.length;
}

/** Evaluates objective alignment, divergence tolerance, memory, and latency as a single bridge health record. */
export function evaluateDevConsumerBridge(input: {
  devLoss: number;
  consumerLoss: number;
  devOutputs: number[][];
  consumerOutputs: number[][];
  devMemoryRatio: number;
  consumerLatencyMs: number;
  parameters?: DevConsumerBridgeParameters;
}): DevConsumerEvaluation {
  const parameters = input.parameters ?? DEFAULT_DEV_CONSUMER_PARAMETERS;
  validateParameters(parameters);
  assertFinite(input.devMemoryRatio, 'devMemoryRatio');
  assertFinite(input.consumerLatencyMs, 'consumerLatencyMs');

  const omniObjective = calculateOmniObjective(input.devLoss, input.consumerLoss, parameters.couplingWeightLambda);
  const sideBySideDivergence = calculateSideBySideDivergence(input.devOutputs, input.consumerOutputs);
  const divergenceWithinLimit = sideBySideDivergence <= parameters.maxAllowableDivergence;
  const devMemoryWithinTarget = input.devMemoryRatio < parameters.targetMetrics.maxDevMemoryRatio;
  const consumerLatencyWithinTarget = input.consumerLatencyMs < parameters.targetMetrics.maxConsumerLatencyMs;

  return {
    omniObjective,
    sideBySideDivergence,
    divergenceWithinLimit,
    devMemoryWithinTarget,
    consumerLatencyWithinTarget,
    isHealthy: divergenceWithinLimit && devMemoryWithinTarget && consumerLatencyWithinTarget,
  };
}
