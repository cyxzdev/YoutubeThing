import { ProxyAgent } from "undici";

let agent: ProxyAgent | null = null;

function getAgent(): ProxyAgent | null {
  if (agent) return agent;
  const url = process.env.PROXY_URL;
  if (!url) return null;
  try {
    agent = new ProxyAgent(url);
    return agent;
  } catch {
    return null;
  }
}

/**
 * Fetch through configured residential proxy, falling back to direct if
 * the proxy request fails or no proxy is configured.
 */
export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const pa = getAgent();
  if (pa) {
    try {
      const res = await fetch(url, { ...init, dispatcher: pa } as never);
      if (res.ok || res.status < 500) return res;
    } catch { /* proxy failed — fall through to direct */ }
  }
  return fetch(url, init);
}
