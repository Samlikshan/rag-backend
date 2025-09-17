import { v4 as uuidv4 } from "uuid";
import { SessionRepository } from "../repositories/redis/session.repositories";
import { ChatMessage } from "../types/chat";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

const sessionRepo = new SessionRepository();

export class SessionService {
  async createNewSession(): Promise<string> {
    try {
      const sessionId = uuidv4();
      await sessionRepo.createSession(sessionId);
      return sessionId;
    } catch (error: any) {
      logger.error(`Failed to create new session: ${error.message}`);
      throw new AppError("Failed to create new session", 500);
    }
  }

  async addMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
    };
    try {
      await sessionRepo.saveMessage(sessionId, message);
    } catch (error: any) {
      logger.error(
        `Failed to save message for session ${sessionId}: ${error.message}`,
      );
      throw new AppError("Failed to save session message", 500);
    }
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      return sessionRepo.getHistory(sessionId);
    } catch (error: any) {
      logger.error(
        `Failed to fetch history for session ${sessionId}: ${error.message}`,
      );
      throw new AppError("Failed to fetch session history", 500);
    }
  }

  async resetSession(sessionId: string): Promise<void> {
    try {
      await sessionRepo.clearSession(sessionId);
    } catch (error: any) {
      logger.error(`Failed to reset session ${sessionId}: ${error.message}`);
      throw new AppError("Failed to reset session", 500);
    }
  }
}
