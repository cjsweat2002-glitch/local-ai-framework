/** A Cartesian vector in four-dimensional space, ordered as x, y, z, w. */
export type Vector4D = [number, number, number, number];

/** A Cartesian vector in three-dimensional space, ordered as x, y, z. */
export type Vector3D = [number, number, number];

/**
 * Rotates a four-dimensional vector in the XW and YZ planes at the same time.
 * The two plane rotations form a block-diagonal 4×4 rotation matrix.
 */
export function rotate4D(v: Vector4D, thetaXW: number, thetaYZ: number): Vector4D {
  const cosXW = Math.cos(thetaXW);
  const sinXW = Math.sin(thetaXW);
  const cosYZ = Math.cos(thetaYZ);
  const sinYZ = Math.sin(thetaYZ);

  const rotationMatrix: [Vector4D, Vector4D, Vector4D, Vector4D] = [
    [cosXW, 0, 0, -sinXW],
    [0, cosYZ, -sinYZ, 0],
    [0, sinYZ, cosYZ, 0],
    [sinXW, 0, 0, cosXW],
  ];

  const multiplyRow = (row: Vector4D) => row.reduce((sum, coefficient, index) => sum + coefficient * v[index], 0);

  return [
    multiplyRow(rotationMatrix[0]),
    multiplyRow(rotationMatrix[1]),
    multiplyRow(rotationMatrix[2]),
    multiplyRow(rotationMatrix[3]),
  ];
}

/**
 * Projects a four-dimensional point into three-dimensional space using w as
 * the depth axis. A point on the focal hyperplane cannot be projected.
 */
export function project4Dto3D(v: Vector4D, focalDistance: number): Vector3D {
  const denominator = focalDistance - v[3];

  if (denominator === 0) {
    throw new RangeError('Cannot project a 4D point whose w coordinate equals the focal distance.');
  }

  const scale = focalDistance / denominator;
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

/** Converts hyperspherical coordinates (r, theta1, theta2, phi) into a 4D Cartesian vector. */
export function hypersphericalToCartesian(r: number, theta1: number, theta2: number, phi: number): Vector4D {
  const sinTheta1 = Math.sin(theta1);
  const sinTheta2 = Math.sin(theta2);

  return [
    r * Math.cos(theta1),
    r * sinTheta1 * Math.cos(theta2),
    r * sinTheta1 * sinTheta2 * Math.cos(phi),
    r * sinTheta1 * sinTheta2 * Math.sin(phi),
  ];
}

/**
 * Calculates the quadratic interval ds² = Σᵢⱼ gᵢⱼ dqⁱ dqʲ for a 4×4 metric tensor.
 */
export function calculateNonEuclideanDistance(tensorG: number[][], dq: Vector4D): number {
  let interval = 0;

  for (let i = 0; i < 4; i += 1) {
    if (!tensorG[i] || tensorG[i].length < 4) {
      throw new RangeError('Metric tensor must contain at least four rows and four columns.');
    }

    for (let j = 0; j < 4; j += 1) {
      interval += tensorG[i][j] * dq[i] * dq[j];
    }
  }

  return interval;
}
