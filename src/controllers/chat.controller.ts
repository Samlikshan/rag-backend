import { NextFunction, Request, Response } from "express";
import { SessionService } from "../services/session.service";
import { QdrantRepository } from "../repositories/qdrant/qdrant.repository";
import { embedTexts } from "../ingestion/jinaClient";
import { buildPrompt } from "../services/prompt.service";
import { callGeminiNonStreaming } from "../services/genAI.service";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

const sessionService = new SessionService();
const qdrantRepo = new QdrantRepository();

export const createSession = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = await sessionService.createNewSession();
    res.json({ sessionId });
  } catch (error) {
    logger.error(`createSession failed: ${(error as Error).message}`);
    next(error);
  }
};

export const queryChat = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId, query } = req.body;

    console.log(sessionId, query);
    if (!sessionId) {
      throw new AppError("Session Id is required", 400);
    }

    if (!query) {
      throw new AppError("Query is required", 400);
    }

    await sessionService.addMessage(sessionId, "user", query);

    const queryEmbeddings = await embedTexts([query], "retrieval.query");

    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      throw new AppError(
        "Failed to get embedding for query, Please try agiain later",
        500,
      );
    }

    const embedding = queryEmbeddings[0];
    const qdrantResult = await qdrantRepo.search(embedding);

    if (!qdrantResult?.length) {
      throw new AppError("No relevant passages found", 404);
    }

    const passages = qdrantResult.map((r: any) => {
      const payload = r.payload || {};
      return {
        id: r.id,
        text: payload.text || "",
        metadata: payload,
        score: r.score,
      };
    });

    const { prompt } = buildPrompt(query, passages);
    const answer = await callGeminiNonStreaming(prompt);

    await sessionService.addMessage(sessionId, "assistant", answer);

    //const history = await sessionService.getSessionHistory(sessionId);
    res.json({ sessionId, response: answer });
  } catch (error) {
    console.log(error, "error");
    logger.error(`queryChat failed: ${(error as Error).message}`);
    next(error);
  }
};

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || sessionId == "false" || sessionId == "undefined") {
      throw new AppError("Session Id is required", 400);
    }

    const history = await sessionService.getSessionHistory(sessionId);
    res.json({ sessionId, history });
  } catch (error) {
    logger.error(`getHistory failed: ${(error as Error).message}`);
    next(error);
  }
};

export const resetSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || sessionId == "false" || sessionId == "undefined") {
      throw new AppError("Session Id is required", 400);
    }

    await sessionService.resetSession(sessionId);
    res.json({ sessionId, reset: true });
  } catch (error) {
    logger.error(`resetSession failed: ${(error as Error).message}`);
    next(error);
  }
};
