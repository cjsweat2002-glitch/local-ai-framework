export const ACTIVITY_PULSE_POLL_INTERVAL_MS = 8_000;

export const ACTIVITY_KINDS = ['development', 'interface', 'decision', 'warning', 'task'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  development: 'Development',
  interface: 'Interface',
  decision: 'Decision',
  warning: 'Watch item',
  task: 'Task',
};

export const ACTIVITY_LEVELS = ['info', 'success', 'warning'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export function isActivityKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export function isActivityLevel(value: string): value is ActivityLevel {
  return (ACTIVITY_LEVELS as readonly string[]).includes(value);
}
