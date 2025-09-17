export interface RawArticle {
  url: string;
  title?: string;
  publishedAt?: string;
  text: string;
}

export interface ArticleChunk {
  id: string;
  sourceUrl: string;
  title?: string;
  publishedAt?: string;
  chunkIndex: number;
  text: string;
}
