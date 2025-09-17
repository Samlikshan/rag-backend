import dotenv from "dotenv";
dotenv.config();

import { embedTexts } from "./jinaClient";
import { QdrantRepository } from "../repositories/qdrant/qdrant.repository";

async function test() {
  const repo = new QdrantRepository();

  // 1. Choose a query (something related to your ingested article)
  const query = "what happened with china yestery?";

  // 2. Embed query
  const vectors = await embedTexts([query], "retrieval.passage");
  const queryVector = vectors[0];

  // 3. Search Qdrant
  const results = await repo.search(queryVector, 3);

  // 4. Print results
  console.log("Top matches:");
  for (const r of results) {
    console.log({
      score: r.score,
      title: r.payload?.title,
      snippet: r.payload?.text,
      url: r.payload?.sourceUrl,
    });
  }
}

test().catch((err) => {
  console.error("Search test failed:", err);
});
