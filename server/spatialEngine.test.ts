import { describe, expect, it } from 'vitest';
import {
  calculateNonEuclideanDistance,
  hypersphericalToCartesian,
  project4Dto3D,
  rotate4D,
} from '../client/src/lib/spatialEngine';

describe('four-dimensional spatial engine', () => {
  it('rotates across the XW and YZ planes simultaneously using a 4×4 matrix', () => {
    const rotated = rotate4D([1, 1, 0, 0], Math.PI / 2, Math.PI / 2);

    expect(rotated[0]).toBeCloseTo(0);
    expect(rotated[1]).toBeCloseTo(0);
    expect(rotated[2]).toBeCloseTo(1);
    expect(rotated[3]).toBeCloseTo(1);
  });

  it('projects a four-dimensional point into three-dimensional perspective space and rejects the focal hyperplane', () => {
    expect(project4Dto3D([2, 4, 6, 2], 10)).toEqual([2.5, 5, 7.5]);
    expect(() => project4Dto3D([2, 4, 6, 10], 10)).toThrow(RangeError);
  });

  it('converts hyperspherical coordinates into the expected Cartesian 4D vector', () => {
    const cartesian = hypersphericalToCartesian(2, Math.PI / 2, Math.PI / 2, Math.PI / 2);

    expect(cartesian[0]).toBeCloseTo(0);
    expect(cartesian[1]).toBeCloseTo(0);
    expect(cartesian[2]).toBeCloseTo(0);
    expect(cartesian[3]).toBeCloseTo(2);
  });

  it('sums diagonal and cross-term metric tensor contributions into ds²', () => {
    const metric = [
      [1, 0.5, 0, 0],
      [0.5, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    expect(calculateNonEuclideanDistance(metric, [2, 3, 0, 0])).toBe(19);
    expect(() => calculateNonEuclideanDistance([[1]], [1, 0, 0, 0])).toThrow(RangeError);
  });
});
