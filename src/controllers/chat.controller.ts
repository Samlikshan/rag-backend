import { Request, Response } from "express";
import { SessionService } from "../services/session.service";

const sessionService = new SessionService();

export const createSession = async (req: Request, res: Response) => {
  const sessionId = await sessionService.createNewSession();
  res.json({ sessionId });
};

export const queryChat = async (req: Request, res: Response) => {
  const { sessionId, query } = req.body;

  if (!sessionId || !query) {
    return res.status(400).json({ error: "sessionId and query are required" });
  }

  await sessionService.addMessage(sessionId, "user", query);
  await sessionService.addMessage(
    sessionId,
    "assistant",
    "This is a placeholder response.",
  );

  const history = await sessionService.getSessionHistory(sessionId);
  res.json({ sessionId, history });
};

export const getHistory = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const history = await sessionService.getSessionHistory(sessionId);
  res.json({ sessionId, history });
};

export const resetSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  await sessionService.resetSession(sessionId);
  res.json({ sessionId, reset: true });
};
