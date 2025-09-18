import sys, json
import requests
from newspaper import Article

def fetch_article(url):
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
        html = resp.text

        art = Article(url)
        art.download(input_html=html)  # ✅ use input_html here
        art.parse()

        text = art.text.strip() if art.text else ""
        title = art.title.strip() if art.title else ""
        published = art.publish_date.isoformat() if art.publish_date else None

        print(f"[DEBUG] {title[:60]} ({len(text)} chars)", file=sys.stderr, flush=True)

        if not text:
            return None

        return {
            "url": url,
            "title": title,
            "publishedAt": published,
            "text": text,
        }

    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr, flush=True)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({}), flush=True)
        sys.exit(0)

    url = sys.argv[1]
    result = fetch_article(url)
    print(json.dumps(result if result else {}), flush=True)

