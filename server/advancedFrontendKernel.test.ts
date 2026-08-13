import { describe, expect, it } from 'vitest';
import { analyzeDagStability } from '../client/src/core/dag_engine';
import { discretizeStateSpaceEuler, stepStateSpace } from '../client/src/core/ssm_preloader';
import { createMolecularBlueprint } from '../client/src/domains/molecular_forge';
import { createSnowflakeGeometry } from '../client/src/domains/snowflake_geometry';
import { mapSpatialPoint } from '../client/src/domains/spatial_mapping';
import { createKernelBridge } from '../client/src/infrastructure/trpc_bridge';

describe('advanced frontend kernel', () => {
  it('orders an acyclic render graph and applies redundant-edge savings to the render cost', () => {
    const analysis = analyzeDagStability(
      [
        { id: 'source', weight: 5 },
        { id: 'layout', weight: 7 },
        { id: 'paint', weight: 3 },
      ],
      [
        { from: 'source', to: 'layout' },
        { from: 'layout', to: 'paint', redundantSavings: 2 },
      ],
    );

    expect(analysis.topologicalOrder).toEqual(['source', 'layout', 'paint']);
    expect(analysis.renderCost).toBe(13);
    expect(() => analyzeDagStability([{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }], [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ])).toThrow('directed cycle');
  });

  it('discretizes and advances the supplied state-space formulation', () => {
    const model = discretizeStateSpaceEuler({ A: [[-1]], B: [[2]], C: [[3]], D: [[4]] }, 0.1);
    const step = stepStateSpace(model, [1], [2]);

    expect(model.Abar).toEqual([[0.9]]);
    expect(model.Bbar).toEqual([[0.2]]);
    expect(step.state[0]).toBeCloseTo(1.3);
    expect(step.output[0]).toBeCloseTo(11.9);
  });

  it('connects spatial mapping to the existing 4D engine', () => {
    const result = mapSpatialPoint({ position: [2, 0, 0, 0], thetaXW: 0, thetaYZ: 0, focalDistance: 10 });
    expect(result.rotated).toEqual([2, 0, 0, 0]);
    expect(result.projected).toEqual([2, 0, 0]);
  });

  it('establishes validated molecular and snowflake domain geometry contracts', () => {
    const molecule = createMolecularBlueprint(
      [
        { id: 'h1', element: 'H', atomicNumber: 1, position: [0, 0, 0] },
        { id: 'h2', element: 'H', atomicNumber: 1, position: [1, 0, 0] },
      ],
      [{ from: 'h1', to: 'h2', order: 1 }],
    );
    const snowflake = createSnowflakeGeometry(2);

    expect(molecule.bonds).toHaveLength(1);
    expect(snowflake.arms).toHaveLength(6);
    expect(snowflake.arms[0]).toEqual([2, 0, 0]);
    expect(() => createMolecularBlueprint(molecule.atoms, [{ from: 'h1', to: 'h1', order: 1 }])).toThrow(RangeError);
  });

  it('keeps a type-safe asynchronous boundary for future tRPC procedures', async () => {
    const bridge = createKernelBridge(async (input: { value: number }) => ({ doubled: input.value * 2 }));
    await expect(bridge.run({ value: 4 })).resolves.toEqual({ doubled: 8 });
  });
});
