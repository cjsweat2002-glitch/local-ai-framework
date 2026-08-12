export function providerLabel(provider: string) {
  if (provider === 'built-in-forge') return 'Built-in Forge';
  if (provider === 'google-gemini') return 'Google Gemini';
  return 'Manus';
}
