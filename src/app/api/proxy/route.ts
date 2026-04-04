import { NextRequest, NextResponse } from "next/server";
import { proxyFetch } from "@/lib/proxy";

const ALLOWED_HOSTS = ["www.youtube.com", "youtube.com", "m.youtube.com"];

export async function POST(request: NextRequest) {
  try {
    const { url, body: reqBody, method } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    };

    if (reqBody) {
      headers["Content-Type"] = "application/json";
    }

    const res = await proxyFetch(url, {
      method: method || (reqBody ? "POST" : "GET"),
      headers,
      body: reqBody ? JSON.stringify(reqBody) : undefined,
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "text/plain" },
    });
  } catch (e) {
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
}
