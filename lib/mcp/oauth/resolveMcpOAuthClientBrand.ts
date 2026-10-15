export type McpOAuthClientBrand = 'claude' | 'cursor' | 'generic' | 'openai';

/** Infer a display brand from OAuth client_name / client_uri for consent UI. */
export function resolveMcpOAuthClientBrand(input: {
  clientName?: string | null;
  clientUri?: string | null;
}): McpOAuthClientBrand {
  const haystack = `${input.clientName ?? ''} ${input.clientUri ?? ''}`.toLowerCase();
  if (haystack.includes('cursor')) {
    return 'cursor';
  }
  if (haystack.includes('claude') || haystack.includes('anthropic')) {
    return 'claude';
  }
  if (
    haystack.includes('openai') ||
    haystack.includes('chatgpt') ||
    haystack.includes('gpt')
  ) {
    return 'openai';
  }
  return 'generic';
}
