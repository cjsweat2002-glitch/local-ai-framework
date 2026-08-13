export type DesignEngineId =
  | 'signal-canvas'
  | 'identity-forge'
  | 'layout-reactor'
  | 'narrative-frame'
  | 'prototype-bridge'
  | 'market-lens';

export type DesignEngine = {
  id: DesignEngineId;
  index: string;
  name: string;
  category: string;
  description: string;
  outputs: string[];
  workspace: 'Research' | 'Content Creation' | 'Design & UI' | 'Code Generation' | 'Gemini Developer' | 'System Factory';
  accent: 'cyan' | 'pink' | 'violet' | 'amber' | 'coral' | 'green';
};

export const DESIGN_ENGINES: DesignEngine[] = [
  {
    id: 'signal-canvas',
    index: '01',
    name: 'Signal Canvas',
    category: 'Research → visual intent',
    description: 'Translates audience signals, cultural references, and project constraints into a visual territory worth owning.',
    outputs: ['Design opportunity map', 'Reference signals', 'Creative north star'],
    workspace: 'Research',
    accent: 'cyan',
  },
  {
    id: 'identity-forge',
    index: '02',
    name: 'Identity Forge',
    category: 'Brand system engine',
    description: 'Builds a coherent identity grammar across naming, color behavior, typography, shape, and motion principles.',
    outputs: ['Identity principles', 'Color logic', 'Typography roles'],
    workspace: 'Design & UI',
    accent: 'pink',
  },
  {
    id: 'layout-reactor',
    index: '03',
    name: 'Layout Reactor',
    category: 'Composition engine',
    description: 'Converts ideas into spatial systems, expressive grids, responsive compositions, and interaction hierarchy.',
    outputs: ['Page architecture', 'Responsive composition', 'Interaction rhythm'],
    workspace: 'Design & UI',
    accent: 'violet',
  },
  {
    id: 'narrative-frame',
    index: '04',
    name: 'Narrative Frame',
    category: 'Editorial engine',
    description: 'Aligns visual sequences, campaign language, content modules, and emotional pacing into one story system.',
    outputs: ['Campaign sequence', 'Content modules', 'Voice and pacing'],
    workspace: 'Content Creation',
    accent: 'amber',
  },
  {
    id: 'prototype-bridge',
    index: '05',
    name: 'Prototype Bridge',
    category: 'Design → build engine',
    description: 'Turns visual direction into component behavior, implementation priorities, and code-ready interface decisions.',
    outputs: ['Component blueprint', 'Interaction states', 'Build handoff'],
    workspace: 'Gemini Developer',
    accent: 'coral',
  },
  {
    id: 'market-lens',
    index: '06',
    name: 'Market Lens',
    category: 'Differentiation engine',
    description: 'Keeps the creative system distinct by mapping competitive conventions, audience expectations, and protected territory.',
    outputs: ['Differentiation thesis', 'Constraint ledger', 'Market signal brief'],
    workspace: 'System Factory',
    accent: 'green',
  },
];

export function getEnginePrompts(engine: DesignEngine, projectBrief: string) {
  const brief = projectBrief.trim() || 'a future-facing creative product with a clear point of view';
  return [
    `Use the ${engine.name} engine for ${brief}. Create a concise but specific ${engine.category.toLowerCase()} brief with decisions I can make today.`,
    `For ${brief}, produce three differentiated art directions through the ${engine.name} engine. Include visual tension, audience feeling, and where each direction should not be used.`,
    `Turn the ${engine.name} engine output for ${brief} into a buildable design system: hierarchy, layout, color behavior, typography, motion, and the first interface to prototype.`,
  ];
}
