import {
  project4Dto3D,
  rotate4D,
  type Vector3D,
  type Vector4D,
} from '../../lib/spatialEngine';

export type SpatialMappingRequest = {
  position: Vector4D;
  thetaXW: number;
  thetaYZ: number;
  focalDistance: number;
};

export type SpatialMappingResult = {
  rotated: Vector4D;
  projected: Vector3D;
};

/** Applies the kernel's 4D rotation and perspective projection in one render-safe operation. */
export function mapSpatialPoint(request: SpatialMappingRequest): SpatialMappingResult {
  const rotated = rotate4D(request.position, request.thetaXW, request.thetaYZ);
  return { rotated, projected: project4Dto3D(rotated, request.focalDistance) };
}
