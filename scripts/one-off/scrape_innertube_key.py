"""
Scrapes the Innertube API key dynamically from YouTube's live chat page HTML.
Usage: python scrape_innertube_key.py <video_id>
"""

import re
import sys
import json
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.read().decode("utf-8", errors="replace")


def extract_api_key(html: str) -> str | None:
    # YouTube embeds the key in ytcfg as INNERTUBE_API_KEY
    match = re.search(r'"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"', html)
    return match.group(1) if match else None


def extract_initial_data(html: str) -> dict | None:
    for pattern in [
        r'window\["ytInitialData"\]\s*=\s*(\{.+?\});\s*</script>',
        r'var\s+ytInitialData\s*=\s*(\{.+?\});\s*</script>',
    ]:
        match = re.search(pattern, html)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
    return None


def extract_continuation(data: dict) -> tuple[str, int] | None:
    def dig(obj, *keys):
        for k in keys:
            if not isinstance(obj, dict):
                return None
            obj = obj.get(k)
        return obj

    continuations = (
        dig(data, "continuationContents", "liveChatContinuation", "continuations")
        or dig(data, "contents", "liveChatRenderer", "continuations")
    )
    if not isinstance(continuations, list):
        return None

    for c in continuations:
        for key in ("invalidationContinuationData", "timedContinuationData", "reloadContinuationData"):
            ic = c.get(key)
            if ic and isinstance(ic.get("continuation"), str):
                return ic["continuation"], ic.get("timeoutMs", 5000)
    return None


def main():
    video_id = sys.argv[1] if len(sys.argv) > 1 else input("Enter YouTube video ID: ").strip()

    url = f"https://www.youtube.com/live_chat?is_popout=1&v={video_id}"
    print(f"Fetching: {url}")
    html = fetch(url)

    key = extract_api_key(html)
    if key:
        print(f"\nInnertube API key found: {key}")
    else:
        print("\nCould not extract Innertube API key from page.")

    data = extract_initial_data(html)
    if data:
        print("ytInitialData: parsed successfully")
        cont = extract_continuation(data)
        if cont:
            token, timeout_ms = cont
            print(f"Continuation token: {token[:60]}...")
            print(f"Poll interval:      {timeout_ms}ms")
        else:
            print("No continuation found — stream may not be live.")
    else:
        print("Could not parse ytInitialData from page.")


if __name__ == "__main__":
    main()
