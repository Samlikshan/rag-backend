import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants/promt";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const client = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
});

export async function callGeminiNonStreaming(
  prompt: string,
  maxTokens = 512,
): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      throw new AppError(
        "GEMINI_API_KEY is missing in environment variables",
        500,
      );
    }

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: maxTokens,
        temperature: 0.0,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    return response?.text?.trim() || "";
  } catch (error: any) {
    logger.error(`Gemini API call failed: ${error.message}`, {
      stack: error.stack,
    });
    throw new AppError("Failed to generate response from Gemini", 502);
  }
}
