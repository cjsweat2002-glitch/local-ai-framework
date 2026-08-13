/** A weighted graph vertex used to estimate render work. */
export type DagNode = {
  id: string;
  weight: number;
};

/** A directed graph edge with an optional cost reduction for a redundant render dependency. */
export type DagEdge = {
  from: string;
  to: string;
  redundantSavings?: number;
};

export type DagRenderAnalysis = {
  topologicalOrder: string[];
  totalNodeWeight: number;
  redundantSavings: number;
  renderCost: number;
};

/**
 * Validates a directed acyclic graph and calculates
 * C_render = Σ w(v) - Σ Δ(e_redundant).
 */
export function analyzeDagStability(nodes: DagNode[], edges: DagEdge[]): DagRenderAnalysis {
  const nodeById = new Map<string, DagNode>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    if (!node.id.trim()) throw new RangeError('Every DAG node requires a non-empty id.');
    if (!Number.isFinite(node.weight) || node.weight < 0) {
      throw new RangeError(`Node "${node.id}" must have a finite non-negative weight.`);
    }
    if (nodeById.has(node.id)) throw new RangeError(`Duplicate DAG node id: "${node.id}".`);

    nodeById.set(node.id, node);
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  let redundantSavings = 0;
  for (const edge of edges) {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new RangeError(`DAG edge "${edge.from} → ${edge.to}" references an unknown node.`);
    }
    if (edge.from === edge.to) throw new RangeError('A DAG edge cannot point to the same node.');
    if (edge.redundantSavings !== undefined && (!Number.isFinite(edge.redundantSavings) || edge.redundantSavings < 0)) {
      throw new RangeError('Redundant edge savings must be finite and non-negative.');
    }

    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    redundantSavings += edge.redundantSavings ?? 0;
  }

  const ready = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const topologicalOrder: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (!current) break;
    topologicalOrder.push(current);

    for (const dependent of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, nextDegree);
      if (nextDegree === 0) ready.push(dependent);
    }
  }

  if (topologicalOrder.length !== nodes.length) {
    throw new RangeError('Graph contains a directed cycle and cannot be scheduled as a DAG.');
  }

  const totalNodeWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
  return {
    topologicalOrder,
    totalNodeWeight,
    redundantSavings,
    renderCost: totalNodeWeight - redundantSavings,
  };
}
