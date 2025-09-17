import * as cheerio from "cheerio";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { RawArticle } from "../types/ingestion";

async function fetchXml(url: string): Promise<any> {
  const res = await axios.get(url, { timeout: 20000 });
  return parseStringPromise(res.data);
}

export async function fetchFeedUrls(
  feedUrl: string,
  max = 50,
): Promise<string[]> {
  const xml = await fetchXml(feedUrl);
  const urls: string[] = [];

  // Sitemap index: sitemapindex.sitemap -> loc
  try {
    if (xml.sitemapindex && xml.sitemapindex.sitemap) {
      const sitemapUrls: string[] = [];
      for (const s of xml.sitemapindex.sitemap) {
        if (s.loc && s.loc[0]) sitemapUrls.push(s.loc[0]);
      }
      // recursively fetch articles from each sitemap
      const articleUrls: string[] = [];
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
      return Array.from(new Set(articleUrls)).slice(0, max);
    }
  } catch {
    // ignore
  }

  // Atom feed: feed.entry -> link/@href
  try {
    if (xml.feed && xml.feed.entry) {
      for (const entry of xml.feed.entry) {
        if (entry.link && entry.link[0] && entry.link[0].$.href) {
          urls.push(entry.link[0].$.href);
        }
        if (urls.length >= max) break;
      }
    }
  } catch {
    // ignore
  }

  // Sitemap index: urlset.url -> loc
  try {
    if (xml.urlset && xml.urlset.url) {
      for (const u of xml.urlset.url) {
        if (u.loc && u.loc[0]) urls.push(u.loc[0]);
        if (urls.length >= max) break;
      }
    }
  } catch {
    // ignore
  }

  // dedupe & limit
  return Array.from(new Set(urls)).slice(0, max);
}

async function fetchArticleHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://www.google.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
    });
    return res.data;
  } catch (err) {
    console.warn(`Failed to fetch ${url}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Extract article text from HTML. Uses simple heuristic: collect <p> text inside article tags,
 * fallback to concatenation of <p> tags.
 */
function sanitizeHtml(input: any): string | null {
  // Some Reuters responses include JSON blobs — cut them off after </html>
  const endIndex = input.indexOf("</html>");
  console.log(1);
  if (endIndex !== -1) {
    console.log(2);
    console.log(input.slice(0, endIndex + 7));
    return input.slice(0, endIndex + 7);
  }

  console.log(input, "html output");
  return input;
}

export async function fetchArticle(url: string): Promise<RawArticle | null> {
  const rawHtml = await fetchArticleHtml(url);
  if (!rawHtml || typeof rawHtml !== "string") {
    console.warn(`Empty HTML for ${url}`);
    return null;
  }

  const html = rawHtml;
  if (!html) {
    console.warn(`Invalid HTML for ${url}`);
    return null;
  }

  let $;
  try {
    $ = cheerio.load(html);
  } catch (err) {
    console.warn(
      `Cheerio failed to load sanitized HTML for ${url}: ${(err as Error).message}`,
    );
    return null;
  }

  // Try to get title
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").text() ||
    $("h1").first().text() ||
    undefined;

  // Prefer article > p
  let paragraphs: string[] = [];
  try {
    const article = $("article");
    if (article.length) {
      article.find("p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) paragraphs.push(t);
      });
    }
    // fallback to main, section
    if (!paragraphs.length) {
      $("main p, section p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) paragraphs.push(t);
      });
    }
    // fallback to just p tags
    if (!paragraphs.length) {
      $("p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 30) paragraphs.push(t);
      });
    }
  } catch (err) {
    // ignore
  }

  const text = paragraphs
    .join("\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text || text.length < 200) {
    // if article too short, skip
    return null;
  }

  // publishedAt heuristics
  const publishedAt =
    $("meta[property='article:published_time']").attr("content") ||
    $("meta[name='pubdate']").attr("content") ||
    $("meta[name='publish_date']").attr("content") ||
    undefined;

  return {
    url,
    title,
    publishedAt,
    text,
  };
}
