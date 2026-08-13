import type { Vector3D } from '../../lib/spatialEngine';

export type SnowflakeGeometry = {
  center: Vector3D;
  armLength: number;
  arms: Vector3D[];
};

/** Generates the six primary radial arms of a planar snowflake scaffold. */
export function createSnowflakeGeometry(armLength: number, center: Vector3D = [0, 0, 0]): SnowflakeGeometry {
  if (!Number.isFinite(armLength) || armLength <= 0) throw new RangeError('Snowflake arm length must be finite and positive.');
  if (center.length !== 3 || center.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new RangeError('Snowflake center must be a finite 3D coordinate.');
  }

  const arms: Vector3D[] = Array.from({ length: 6 }, (_, index) => {
    const angle = (index * Math.PI) / 3;
    return [center[0] + armLength * Math.cos(angle), center[1] + armLength * Math.sin(angle), center[2]];
  });

  return { center: [...center] as Vector3D, armLength, arms };
}
