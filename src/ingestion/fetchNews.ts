import path from "path";
import { spawn } from "child_process";
import { parseStringPromise } from "xml2js";
import axios from "axios";
import { RawArticle } from "../types/ingestion";

async function fetchXml(url: string): Promise<any> {
  const res = await axios.get(url, { timeout: 20000 });
  return parseStringPromise(res.data);
}

export async function fetchFeedUrls(
  feedUrl: string,
  max = 50,
): Promise<{ url: string; lastmod?: string }[]> {
  const xml = await fetchXml(feedUrl);
  const urls: { url: string; lastmod?: string }[] = [];

  // Sitemap index: sitemapindex.sitemap -> loc
  try {
    if (xml.sitemapindex && xml.sitemapindex.sitemap) {
      const sitemapUrls: string[] = [];
      for (const s of xml.sitemapindex.sitemap) {
        if (s.loc && s.loc[0]) sitemapUrls.push(s.loc[0]);
      }
      const articleUrls: { url: string; lastmod?: string }[] = [];
      for (const smUrl of sitemapUrls) {
        try {
          const nestedUrls = await fetchFeedUrls(smUrl, max);
          articleUrls.push(...nestedUrls);
          if (articleUrls.length >= max) break;
        } catch (err) {
          console.warn(
            `Failed to parse nested sitemap ${smUrl}: ${(err as Error).message}`,
          );
        }
      }
      return Array.from(
        new Map(articleUrls.map((a) => [a.url, a])).values(),
      ).slice(0, max);
    }
  } catch {
    // ignore
  }

  // Atom feed: feed.entry -> link/@href
  try {
    if (xml.feed && xml.feed.entry) {
      for (const entry of xml.feed.entry) {
        if (entry.link && entry.link[0] && entry.link[0].$.href) {
          urls.push({ url: entry.link[0].$.href });
        }
        if (urls.length >= max) break;
      }
    }
  } catch {
    // ignore
  }

  // Sitemap index: urlset.url -> loc + lastmod
  try {
    if (xml.urlset && xml.urlset.url) {
      for (const u of xml.urlset.url) {
        if (u.loc && u.loc[0]) {
          urls.push({
            url: u.loc[0],
            lastmod: u.lastmod ? u.lastmod[0] : undefined,
          });
        }
        if (urls.length >= max) break;
      }
    }
  } catch {
    // ignore
  }

  return Array.from(new Map(urls.map((a) => [a.url, a])).values()).slice(
    0,
    max,
  );
}

export async function fetchArticle(
  url: string,
  lastmod?: string,
): Promise<RawArticle | null> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, "news_ingest.py");
    const py = spawn("python3", [scriptPath, url]);

    let data = "";
    py.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    py.on("close", () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.text) {
          resolve({
            url: parsed.url,
            title: parsed.title,
            publishedAt: parsed.publishedAt || lastmod,
            text: parsed.text,
          });
        } else {
          resolve(null);
        }
      } catch (err) {
        console.error("Failed parsing Python output:", err);
        resolve(null);
      }
    });
  });
}
