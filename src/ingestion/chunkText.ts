import { ArticleChunk } from "../types/ingestion";
import { v4 as uuidv4 } from "uuid";

export function chunkArticleText(
  text: string,
  sourceUrl: string,
  title?: string,
  publishedAt?: string,
  maxChars = 500,
  overlap = 100,
): ArticleChunk[] {
  const cleanText = text.replace(/\n{2,}/g, "\n").trim();
  const chunks: ArticleChunk[] = [];
  let start = 0;
  let idx = 0;
  while (start < cleanText.length) {
    let end = Math.min(start + maxChars, cleanText.length);
    // try to break at sentence/space near end for nicer chunks
    if (end < cleanText.length) {
      const slice = cleanText.slice(start, end);
      const lastPunc = Math.max(
        slice.lastIndexOf("."),
        slice.lastIndexOf("?"),
        slice.lastIndexOf("!"),
      );
      if (lastPunc > Math.floor(slice.length * 0.5)) {
        end = start + lastPunc + 1;
      } else {
        const lastSpace = slice.lastIndexOf(" ");
        if (lastSpace > Math.floor(slice.length * 0.5)) {
          end = start + lastSpace;
        }
      }
    }

    const chunkText = cleanText.slice(start, end).trim();
    if (chunkText.length > 50) {
      chunks.push({
        id: uuidv4(),
        sourceUrl,
        title,
        publishedAt,
        chunkIndex: idx,
        text: chunkText,
      });
      idx++;
    }
    start = Math.max(end - overlap, end);
    if (start < 0) start = 0;
    if (end === cleanText.length) break;
  }

  return chunks;
}
