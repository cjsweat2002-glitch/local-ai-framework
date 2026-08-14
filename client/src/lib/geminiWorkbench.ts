export const GEMINI_WORKBENCH_MODES = [
  {
    id: 'build',
    label: 'Build',
    description: 'Shape a feature into implementation-ready steps and code.',
    starter: 'Turn this project intent into a small, reviewable implementation sequence.',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Inspect an interface or code decision for quality, risk, and clarity.',
    starter: 'Review this project intent as a senior interface and code reviewer. Identify the highest-value changes first.',
  },
  {
    id: 'diagnose',
    label: 'Diagnose',
    description: 'Trace a failure or interaction problem without guessing at credentials.',
    starter: 'Diagnose this project intent. State the likely cause, the evidence to collect, and the safest fix path.',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Turn a broad product direction into a governed proposal brief.',
    starter: 'Convert this project intent into a concise, staged proposal with validation gates before any code change.',
  },
] as const;

export type GeminiWorkbenchMode = typeof GEMINI_WORKBENCH_MODES[number]['id'];
export type GeminiResponseFocus = 'interface' | 'implementation' | 'review';

export const GEMINI_RESPONSE_FOCUSES: ReadonlyArray<{ id: GeminiResponseFocus; label: string; detail: string }> = [
  { id: 'interface', label: 'Interface', detail: 'Interaction behavior, layout, states, and accessibility.' },
  { id: 'implementation', label: 'Implementation', detail: 'Types, components, data flow, and testable code paths.' },
  { id: 'review', label: 'Review', detail: 'Risks, acceptance criteria, and a reviewable GitHub proposal.' },
];

const SENSITIVE_ASSIGNMENT = /\b(DATABASE_URL|JWT_SECRET|OWNER_OPEN_ID|MANUS_API_KEY|BUILT_IN_FORGE_API_KEY|GEMINI_API_KEY|OAUTH_SERVER_URL|VITE_APP_ID|VITE_OAUTH_PORTAL_URL|ACTIVITY_PULSE_OIDC_AUDIENCE)\b\s*[:=]\s*([^\s,;]+)/gi;

export function redactSensitiveWorkspaceValues(value: string) {
  return value.replace(SENSITIVE_ASSIGNMENT, '$1=[redacted]');
}

export function getGeminiWorkbenchMode(mode: GeminiWorkbenchMode) {
  return GEMINI_WORKBENCH_MODES.find((item) => item.id === mode) ?? GEMINI_WORKBENCH_MODES[0];
}

export function getGeminiWorkbenchStarters(mode: GeminiWorkbenchMode, projectIntent: string) {
  const project = redactSensitiveWorkspaceValues(projectIntent.trim()) || 'the active Autonomous AI Hub project';
  const activeMode = getGeminiWorkbenchMode(mode);
  return [
    `${activeMode.starter}\n\nProject intent: ${project}`,
    `Use the active project context to propose the next smallest change for ${project}. Keep the response reviewable and explicit about validation.`,
    `For ${project}, identify what should remain in the hosted app, what belongs in a GitHub proposal, and what should never be exposed to the browser.`,
  ];
}

export function buildGeminiWorkbenchContext(input: {
  mode: GeminiWorkbenchMode;
  responseFocus: GeminiResponseFocus;
  projectIntent: string;
  mirrorName?: string;
  mirrorContext?: string;
}) {
  const mode = getGeminiWorkbenchMode(input.mode);
  const focus = GEMINI_RESPONSE_FOCUSES.find((item) => item.id === input.responseFocus) ?? GEMINI_RESPONSE_FOCUSES[0];
  const projectIntent = redactSensitiveWorkspaceValues(input.projectIntent.trim());
  const mirrorContext = redactSensitiveWorkspaceValues(input.mirrorContext?.trim() || '');

  return [
    'Gemini Project Workstation context',
    `Creation mode: ${mode.label} — ${mode.description}`,
    `Response focus: ${focus.label} — ${focus.detail}`,
    projectIntent ? `Project intent: ${projectIntent}` : 'Project intent: not set; ask for the smallest useful clarification when required.',
    input.mirrorName ? `Private mirror selected: ${input.mirrorName}` : 'Private mirror selected: none.',
    mirrorContext ? `Private mirror material (user supplied):\n${mirrorContext}` : '',
    'Safety boundary: never request, reveal, or rely on production database, OAuth, owner, Manus, Forge, Gemini, or deployment credentials. Propose changes as reviewable GitHub work; do not claim to deploy or merge.',
  ].filter(Boolean).join('\n\n');
}
