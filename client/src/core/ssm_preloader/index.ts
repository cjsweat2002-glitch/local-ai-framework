export type NumericVector = number[];
export type NumericMatrix = number[][];

export type ContinuousStateSpaceModel = {
  A: NumericMatrix;
  B: NumericMatrix;
  C: NumericMatrix;
  D: NumericMatrix;
};

export type DiscreteStateSpaceModel = {
  Abar: NumericMatrix;
  Bbar: NumericMatrix;
  C: NumericMatrix;
  D: NumericMatrix;
};

export type StateSpaceStep = {
  state: NumericVector;
  output: NumericVector;
};

function assertMatrix(matrix: NumericMatrix, name: string): { rows: number; columns: number } {
  if (matrix.length === 0 || matrix[0]?.length === 0) throw new RangeError(`${name} must not be empty.`);
  const columns = matrix[0].length;
  if (matrix.some((row) => row.length !== columns || row.some((value) => !Number.isFinite(value)))) {
    throw new RangeError(`${name} must be rectangular and contain finite numbers.`);
  }
  return { rows: matrix.length, columns };
}

function multiplyMatrixVector(matrix: NumericMatrix, vector: NumericVector): NumericVector {
  return matrix.map((row) => row.reduce((sum, coefficient, index) => sum + coefficient * vector[index], 0));
}

function addVectors(left: NumericVector, right: NumericVector): NumericVector {
  return left.map((value, index) => value + right[index]);
}

function validateDimensions(stateMatrix: NumericMatrix, inputMatrix: NumericMatrix, outputMatrix: NumericMatrix, feedthroughMatrix: NumericMatrix) {
  const state = assertMatrix(stateMatrix, 'state transition');
  const input = assertMatrix(inputMatrix, 'input mapping');
  const output = assertMatrix(outputMatrix, 'C');
  const feedthrough = assertMatrix(feedthroughMatrix, 'D');

  if (state.rows !== state.columns || input.rows !== state.rows || output.columns !== state.rows) {
    throw new RangeError('State-space matrices must have compatible state dimensions.');
  }
  if (feedthrough.rows !== output.rows || feedthrough.columns !== input.columns) {
    throw new RangeError('D must map the same input to the same output dimensions as B and C.');
  }
}

/**
 * Produces Euler-discretized coefficients: Ā = I + ΔtA and B̄ = ΔtB.
 * This yields hₖ = Āhₖ₋₁ + B̄xₖ for the supplied continuous model.
 */
export function discretizeStateSpaceEuler(model: ContinuousStateSpaceModel, deltaT: number): DiscreteStateSpaceModel {
  if (!Number.isFinite(deltaT) || deltaT <= 0) throw new RangeError('deltaT must be a finite positive number.');
  validateDimensions(model.A, model.B, model.C, model.D);

  const Abar = model.A.map((row, rowIndex) => row.map((value, columnIndex) => (rowIndex === columnIndex ? 1 : 0) + deltaT * value));
  const Bbar = model.B.map((row) => row.map((value) => deltaT * value));

  return { Abar, Bbar, C: model.C.map((row) => [...row]), D: model.D.map((row) => [...row]) };
}

/** Calculates one discrete hidden-state update and its output prediction. */
export function stepStateSpace(model: DiscreteStateSpaceModel, previousState: NumericVector, input: NumericVector): StateSpaceStep {
  validateDimensions(model.Abar, model.Bbar, model.C, model.D);
  const stateDimension = model.Abar.length;
  const inputDimension = model.Bbar[0].length;

  if (previousState.length !== stateDimension || input.length !== inputDimension) {
    throw new RangeError('State and input vectors must match the model dimensions.');
  }
  if (previousState.some((value) => !Number.isFinite(value)) || input.some((value) => !Number.isFinite(value))) {
    throw new RangeError('State and input vectors must contain finite numbers.');
  }

  const state = addVectors(multiplyMatrixVector(model.Abar, previousState), multiplyMatrixVector(model.Bbar, input));
  const output = addVectors(multiplyMatrixVector(model.C, state), multiplyMatrixVector(model.D, input));
  return { state, output };
}
