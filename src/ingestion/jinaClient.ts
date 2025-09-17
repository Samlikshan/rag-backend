import axios from "axios";

const JINA_API_URL =
  process.env.JINA_API_URL || "https://api.jina.ai/v1/embeddings";
const JINA_API_KEY = process.env.JINA_API_KEY || "";
const JINA_MODEL = process.env.JINA_MODEL || "jina-embeddings-v3";

export async function embedTexts(
  texts: string[],
  task:
    | "retrieval.passage"
    | "retrieval.query"
    | "text-matching" = "retrieval.passage",
): Promise<number[][]> {
  if (!texts.length) return [];

  const payload = {
    model: JINA_MODEL,
    task,
    input: texts,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JINA_API_KEY}`,
  };

  const res = await axios.post(JINA_API_URL, payload, {
    headers,
    timeout: 60000,
  });

  if (res.data?.data && Array.isArray(res.data.data)) {
    return res.data.data.map((item: any) => item.embedding as number[]);
  }

  throw new Error(
    "Unexpected response from Jina embeddings API: " + JSON.stringify(res.data),
  );
}
