import type { Vector3D } from '../../lib/spatialEngine';

export type MolecularAtom = {
  id: string;
  element: string;
  atomicNumber: number;
  position: Vector3D;
};

export type MolecularBond = {
  from: string;
  to: string;
  order: 1 | 2 | 3;
};

export type MolecularBlueprint = {
  atoms: MolecularAtom[];
  bonds: MolecularBond[];
};

/** Validates a lightweight molecular scene before it reaches a geometry renderer. */
export function createMolecularBlueprint(atoms: MolecularAtom[], bonds: MolecularBond[]): MolecularBlueprint {
  const atomIds = new Set<string>();
  for (const atom of atoms) {
    if (!atom.id.trim() || !atom.element.trim() || !Number.isInteger(atom.atomicNumber) || atom.atomicNumber <= 0) {
      throw new RangeError('Atoms require an id, element, and positive integer atomic number.');
    }
    if (atomIds.has(atom.id)) throw new RangeError(`Duplicate molecular atom id: "${atom.id}".`);
    if (atom.position.length !== 3 || atom.position.some((coordinate) => !Number.isFinite(coordinate))) {
      throw new RangeError(`Atom "${atom.id}" requires a finite 3D position.`);
    }
    atomIds.add(atom.id);
  }

  for (const bond of bonds) {
    if (bond.from === bond.to || !atomIds.has(bond.from) || !atomIds.has(bond.to)) {
      throw new RangeError('Bonds must join two distinct atoms in the blueprint.');
    }
  }

  return {
    atoms: atoms.map((atom) => ({ ...atom, position: [...atom.position] as Vector3D })),
    bonds: bonds.map((bond) => ({ ...bond })),
  };
}
