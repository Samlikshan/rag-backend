export interface Passage {
  id: string;
  text: string;
  metadata?: {
    title?: string;
    sourceUrl?: string;
    [key: string]: any;
  };
  score?: number;
}

export interface PromptResult {
  prompt: string;
  included: Passage[];
}

export function buildPrompt(
  userQuery: string,
  passages: Passage[],
  maxChars = 15000,
): PromptResult {
  const HEADER = `\n\n--- PASSAGES ---\n`;
  let context = "";
  const included: Passage[] = [];

  for (const passage of passages) {
    const section = `=== PASSAGE id:${passage.id} ===
    Title: ${passage.metadata?.title ?? "N/A"}
    URL: ${passage.metadata?.sourceUrl ?? "N/A"}
    ${passage.text}\n\n`;

    if (
      (HEADER + context + section + `\nUser query: ${userQuery}`).length >
      maxChars
    ) {
      break;
    }

    included.push(passage);
    context += section;
  }

  const prompt =
    `${HEADER}${context}\n` +
    `User question: ${userQuery}\n\n` +
    `Answer (cite urls if used):`;

  return { prompt, included };
}
