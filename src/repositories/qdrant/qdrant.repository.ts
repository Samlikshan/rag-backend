import { QdrantClient } from "@qdrant/js-client-rest";

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
    const exists = await this.client
      .getCollection(COLLECTION)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      await this.client.createCollection(COLLECTION, {
        vectors: { size: vectorSize, distance: "Cosine" },
      });
    }
  }

  async upsertPoints(
    points: { id: string; vector: number[]; payload: Record<string, any> }[],
  ) {
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
  }
  async search(vector: number[], limit = 5) {
    const result = await this.client.search(COLLECTION, {
      vector,
      limit,
      with_payload: true,
    });
    return result;
  }
}
