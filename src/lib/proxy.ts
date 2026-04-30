/**
 * Server-side fetch to external URLs (direct; no HTTP proxy).
 * Named proxyFetch for call sites that previously routed via PROXY_URL.
 */
export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init);
}
