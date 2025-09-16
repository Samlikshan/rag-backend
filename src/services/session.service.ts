import { v4 as uuidv4 } from "uuid";
import { SessionRepository } from "../repositories/redis/session.repositories";
import { ChatMessage } from "../types/chat";

const sessionRepo = new SessionRepository();

export class SessionService {
  async createNewSession(): Promise<string> {
    const sessionId = uuidv4();
    await sessionRepo.createSession(sessionId);
    return sessionId;
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
    await sessionRepo.saveMessage(sessionId, message);
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    return sessionRepo.getHistory(sessionId);
  }

  async resetSession(sessionId: string): Promise<void> {
    await sessionRepo.clearSession(sessionId);
  }
}
