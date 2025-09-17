import { QdrantClient } from "@qdrant/js-client-rest";
import { AppError } from "../../utils/appError";
import { logger } from "../../utils/logger";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || "news_chunks";

export class QdrantRepository {
  client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
  }

  async ensureCollection(vectorSize: number) {
    try {
      const exists = await this.client
        .getCollection(COLLECTION)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        await this.client.createCollection(COLLECTION, {
          vectors: { size: vectorSize, distance: "Cosine" },
        });
      }
    } catch (error: any) {
      logger.error(`Failed to ensure collection: ${error.message}`);
      throw new AppError("Qdrant collection setup failed", 500);
    }
  }

  async upsertPoints(
    points: { id: string; vector: number[]; payload: Record<string, any> }[],
  ) {
    try {
      const BATCH = 64;
      for (let i = 0; i < points.length; i += BATCH) {
        const batch = points.slice(i, i + BATCH);
        await this.client.upsert(COLLECTION, {
          wait: true,
          points: batch.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload,
          })),
        });
      }
    } catch (error: any) {
      logger.error(`Failed to upsert points: ${error.message}`);
      throw new AppError("Qdrant upsert failed", 500);
    }
  }
  async search(vector: number[], limit = 5) {
    try {
      const result = await this.client.search(COLLECTION, {
        vector,
        limit,
        with_payload: true,
      });
      return result;
    } catch (error: any) {
      logger.error(`Qdrant search failed: ${error.message}`);
      throw new AppError("Qdrant search failed", 500);
    }
  }
}
