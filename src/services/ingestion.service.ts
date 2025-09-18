import { fetchFeedUrls, fetchArticle } from "../ingestion/fetchNews";
import { chunkArticleText } from "../ingestion/chunkText";
import { embedTexts } from "../ingestion/jinaClient";
import { QdrantRepository } from "../repositories/qdrant/qdrant.repository";
import { ArticleChunk } from "../types/ingestion";

const DEFAULT_FEEDS = (
  process.env.RSS_FEEDS ||
  "https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml"
)
  .split(",")
  .map((s) => s.trim());

const MAX_ARTICLES = parseInt(process.env.INGEST_MAX_ARTICLES || "50", 10);
const EMBED_BATCH_SIZE = parseInt(process.env.EMBED_BATCH_SIZE || "32", 10);

export class IngestionService {
  qdrant: QdrantRepository;

  constructor() {
    this.qdrant = new QdrantRepository();
  }

  async run() {
    // 1. collect article urls
    console.log("Fetching feed URLs...");
    const allUrls: { url: string; lastmod?: string }[] = [];
    for (const feed of DEFAULT_FEEDS) {
      try {
        const urls = await fetchFeedUrls(feed, MAX_ARTICLES);
        allUrls.push(...urls);
      } catch (err) {
        console.warn(`Failed to parse feed ${feed}: ${(err as Error).message}`);
      }
      if (allUrls.length >= MAX_ARTICLES) break;
    }

    const uniqueUrls = Array.from(
      new Map(allUrls.map((a) => [a.url, a])).values(),
    ).slice(0, MAX_ARTICLES);

    console.log(`Found ${uniqueUrls.length} URLs to fetch.`);

    // 2. fetch articles
    const articles = [];
    for (const { url, lastmod } of uniqueUrls) {
      try {
        const art = await fetchArticle(url, lastmod);
        if (art) articles.push(art);
      } catch (err) {
        console.warn(`Skipping ${url} due to error: ${(err as Error).message}`);
      }
    }
    console.log(`Fetched ${articles.length} articles with usable text.`);

    // 3. chunk articles
    const chunks: ArticleChunk[] = [];
    for (const art of articles) {
      const cs = chunkArticleText(
        art.text,
        art.url,
        art.title,
        art.publishedAt,
        500,
        120,
      );
      chunks.push(...cs);
    }
    console.log(`Split into ${chunks.length} chunks.`);

    if (!chunks.length) {
      console.log("No chunks to index. Exiting.");
      return;
    }

    // 4. embed in batches
    const points: {
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }[] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((c) => c.text);
      console.log(
        `Embedding batch ${i / EMBED_BATCH_SIZE + 1}/${Math.ceil(
          chunks.length / EMBED_BATCH_SIZE,
        )}`,
      );
      const vectors = await embedTexts(texts, "retrieval.passage");

      if (i === 0 && vectors.length > 0) {
        await this.qdrant.ensureCollection(vectors[0].length);
      }
      for (let j = 0; j < batch.length; j++) {
        points.push({
          id: batch[j].id,
          vector: vectors[j],
          payload: {
            sourceUrl: batch[j].sourceUrl,
            title: batch[j].title,
            publishedAt: batch[j].publishedAt,
            chunkIndex: batch[j].chunkIndex,
            text: batch[j].text,
          },
        });
      }
    }

    // 5. upsert to Qdrant
    console.log(`Upserting ${points.length} points to Qdrant...`);
    await this.qdrant.upsertPoints(points);
    console.log("Ingestion finished.");
  }
}
